import "server-only";
import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/client";
import {
  auditLogs,
  categories,
  coupons,
  proDocuments,
  proProfiles,
  regions,
  serviceRequests,
  sessions,
  users,
} from "../db/schema";
import type { Actor } from "../domain/actor";
import { forbidden, invalid, notFound } from "../domain/errors";
import { audit } from "./audit";
import { openProProfile } from "./pro-pii";
import { emitIntegrationEvent, proAdminUrl } from "./integrations";
import { notify } from "./notifications";

function requireAdmin(actor: Actor): asserts actor is Extract<Actor, { kind: "user" }> {
  if (actor.kind !== "user" || actor.role !== "admin") throw forbidden();
}

/**
 * Indicadores operacionais e financeiros. Todos calculados a partir de dados
 * reais do banco — nada estimado aqui. Período padrão: últimos 30 dias.
 */
export async function getMetrics(actor: Actor, days = 30) {
  requireAdmin(actor);
  // Passado como texto ISO com cast explícito: o driver não serializa Date em SQL bruto.
  const since = sql`${new Date(Date.now() - days * 86400_000).toISOString()}::timestamptz`;
  const [ops] = await db.execute<{
    total: number;
    open: number;
    scheduled: number;
    in_progress: number;
    awaiting: number;
    completed: number;
    cancelled: number;
    expired: number;
    disputed: number;
    with_quote: number;
    median_first_quote_min: number | null;
    gmv_cents: number | null;
    avg_ticket_cents: number | null;
  }>(sql`
    with req as (select * from service_requests where created_at >= ${since} and is_demo = false),
    first_quote as (
      select q.request_id, min(q.created_at) as at from quotes q join req on req.id = q.request_id group by q.request_id
    )
    select
      count(*)::int as total,
      count(*) filter (where status = 'open')::int as open,
      count(*) filter (where status = 'scheduled')::int as scheduled,
      count(*) filter (where status = 'in_progress')::int as in_progress,
      count(*) filter (where status = 'awaiting_confirmation')::int as awaiting,
      count(*) filter (where status = 'completed')::int as completed,
      count(*) filter (where status = 'cancelled')::int as cancelled,
      count(*) filter (where status = 'expired')::int as expired,
      count(*) filter (where status = 'disputed')::int as disputed,
      (select count(*)::int from first_quote) as with_quote,
      (select percentile_cont(0.5) within group (order by extract(epoch from (fq.at - r.created_at)) / 60)
         from first_quote fq join req r on r.id = fq.request_id) as median_first_quote_min,
      sum(final_amount_cents) filter (where status = 'completed')::bigint as gmv_cents,
      avg(final_amount_cents) filter (where status = 'completed')::int as avg_ticket_cents
    from req
  `);
  const [fin] = await db.execute<{ commission_recorded: number | null; commission_waived: number | null }>(sql`
    select
      sum(commission_cents) filter (where s.status <> 'waived')::bigint as commission_recorded,
      sum(commission_cents) filter (where s.status = 'waived')::bigint as commission_waived
    from settlements s join service_requests r on r.id = s.request_id
    where s.created_at >= ${since} and r.is_demo = false
  `);
  const [people] = await db.execute<{
    clients: number;
    pros_approved: number;
    pros_pending: number;
    tickets_open: number;
    no_shows: number;
    reviews_avg: number | null;
    reviews_flagged: number;
  }>(sql`
    select
      (select count(*)::int from users where role = 'client' and status = 'active' and is_demo = false) as clients,
      (select count(*)::int from pro_profiles p join users u on u.id = p.user_id where p.verification_status = 'approved' and u.is_demo = false) as pros_approved,
      (select count(*)::int from pro_profiles where verification_status = 'pending_review') as pros_pending,
      (select count(*)::int from support_tickets where status in ('open','in_progress','waiting_user')) as tickets_open,
      (select count(*)::int from request_events where type = 'report_pro_no_show' and created_at >= ${since}) as no_shows,
      (select avg(rating)::numeric(3,2) from reviews where status = 'published' and is_demo = false and created_at >= ${since}) as reviews_avg,
      (select count(*)::int from reviews where status = 'flagged') as reviews_flagged
  `);
  const funnel = await db.execute<{ name: string; n: number }>(sql`
    select name, count(*)::int as n from analytics_events
    where created_at >= ${since} and name in ('landing_view','request_started','signup','request_created','quote_accepted','request_completed')
    group by name
  `);
  const bySource = await db.execute<{ source: string; requests: number; completed: number }>(sql`
    select coalesce(utm_source, '(direto)') as source, count(*)::int as requests,
      count(*) filter (where status = 'completed')::int as completed
    from service_requests where created_at >= ${since} and is_demo = false
    group by 1 order by 2 desc limit 10
  `);
  const finished = ops.completed + ops.cancelled + ops.expired;
  return {
    days,
    ops,
    fin,
    people,
    funnel: Object.fromEntries(funnel.map((f) => [f.name, f.n])),
    bySource,
    rates: {
      quoteCoverage: ops.total ? ops.with_quote / ops.total : null,
      completion: finished ? ops.completed / finished : null,
    },
  };
}

export async function listUsers(actor: Actor, opts: { role?: "client" | "pro" | "admin"; q?: string }) {
  requireAdmin(actor);
  const q = opts.q?.trim();
  return db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      phone: users.phone,
      role: users.role,
      status: users.status,
      createdAt: users.createdAt,
      isDemo: users.isDemo,
      verification: proProfiles.verificationStatus,
    })
    .from(users)
    .leftJoin(proProfiles, eq(proProfiles.userId, users.id))
    .where(
      and(
        opts.role ? eq(users.role, opts.role) : undefined,
        q ? or(ilike(users.name, `%${q}%`), ilike(users.email, `%${q}%`)) : undefined,
      ),
    )
    .orderBy(desc(users.createdAt))
    .limit(200);
}

export async function setUserStatus(actor: Actor, userId: string, status: "active" | "suspended", reason: string) {
  requireAdmin(actor);
  if (userId === actor.id) throw invalid("Você não pode alterar o status da sua própria conta.");
  if (reason.trim().length < 5) throw invalid("Registre o motivo.");
  await db.transaction(async (tx) => {
    const [u] = await tx.select().from(users).where(eq(users.id, userId));
    if (!u || u.status === "deleted") throw notFound("Usuário");
    await tx.update(users).set({ status, updatedAt: new Date() }).where(eq(users.id, userId));
    if (status === "suspended") await tx.delete(sessions).where(eq(sessions.userId, userId));
    await audit(tx, actor, `user.${status === "suspended" ? "suspend" : "reactivate"}`, "user", userId, { reason });
  });
}

export async function getProForAdmin(actor: Actor, proId: string) {
  requireAdmin(actor);
  if (!z.uuid().safeParse(proId).success) throw notFound("Profissional");
  const [row] = await db
    .select({ profile: proProfiles, user: users })
    .from(proProfiles)
    .innerJoin(users, eq(users.id, proProfiles.userId))
    .where(eq(proProfiles.userId, proId));
  if (!row) throw notFound("Profissional");
  const [docs, cats, regs, sameCpf] = await Promise.all([
    db.select().from(proDocuments).where(eq(proDocuments.proId, proId)).orderBy(desc(proDocuments.createdAt)),
    db.execute<{ name: string }>(
      sql`select c.name from pro_categories pc join categories c on c.id = pc.category_id where pc.pro_id = ${proId}`,
    ),
    db.execute<{ name: string }>(
      sql`select r.name from pro_regions pr join regions r on r.id = pr.region_id where pr.pro_id = ${proId}`,
    ),
    // Outros cadastros com o mesmo CPF (pelo índice cego, sem decifrar): sinal de conta duplicada.
    row.profile.cpfHash
      ? db
          .select({ id: proProfiles.userId, displayName: proProfiles.displayName })
          .from(proProfiles)
          .where(and(eq(proProfiles.cpfHash, row.profile.cpfHash), sql`${proProfiles.userId} <> ${proId}`))
      : Promise.resolve([]),
  ]);
  await audit(db, actor, "pro.view_sensitive", "pro_profile", proId); // acesso a CPF/documentos fica registrado
  const { passwordHash: _ph, totpSecret: _ts, ...user } = row.user;
  void _ph;
  void _ts;
  return {
    profile: openProProfile(row.profile),
    user,
    documents: docs,
    categories: cats.map((c) => c.name),
    regions: regs.map((r) => r.name),
    sameCpf,
  };
}

export async function listProsByVerification(actor: Actor, status?: (typeof proProfiles.$inferSelect)["verificationStatus"]) {
  requireAdmin(actor);
  return db
    .select({
      id: proProfiles.userId,
      displayName: proProfiles.displayName,
      status: proProfiles.verificationStatus,
      submittedAt: proProfiles.submittedAt,
      email: users.email,
      isDemo: users.isDemo,
    })
    .from(proProfiles)
    .innerJoin(users, eq(users.id, proProfiles.userId))
    .where(status ? eq(proProfiles.verificationStatus, status) : undefined)
    .orderBy(desc(proProfiles.submittedAt))
    .limit(200);
}

/**
 * Decisão de verificação. Sempre humana: nenhum processo automático aprova
 * profissionais. A decisão e o motivo ficam no audit log.
 */
export async function decideProVerification(
  actor: Actor,
  proId: string,
  decision: "approved" | "rejected" | "suspended",
  notes: string,
) {
  requireAdmin(actor);
  if (decision !== "approved" && notes.trim().length < 5) throw invalid("Explique o motivo para o profissional.");
  await db.transaction(async (tx) => {
    const [p] = await tx.select().from(proProfiles).where(eq(proProfiles.userId, proId)).for("update");
    if (!p) throw notFound("Profissional");
    if (decision === "approved") {
      const docs = await tx.select().from(proDocuments).where(eq(proDocuments.proId, proId));
      const accepted = (kind: string) => docs.some((d) => d.kind === kind && d.status === "accepted");
      if (!accepted("identity") || !accepted("address_proof"))
        throw invalid("Aceite o documento de identidade e o comprovante de endereço antes de aprovar.");
    }
    await tx
      .update(proProfiles)
      .set({
        verificationStatus: decision,
        verificationNotes: notes.trim() || null,
        verifiedAt: decision === "approved" ? new Date() : p.verifiedAt,
        verifiedBy: actor.id,
        updatedAt: new Date(),
      })
      .where(eq(proProfiles.userId, proId));
    await audit(tx, actor, `pro.verification.${decision}`, "pro_profile", proId, { notes, previous: p.verificationStatus });
    await emitIntegrationEvent(tx, "pro.verification_decided", {
      proId,
      decision,
      previous: p.verificationStatus,
      adminUrl: proAdminUrl(proId),
    });
    const messages = {
      approved: { title: "Perfil aprovado!", body: "Você já pode receber solicitações e enviar propostas." },
      rejected: { title: "Perfil precisa de ajustes", body: notes.trim() },
      suspended: { title: "Perfil suspenso", body: notes.trim() },
    } as const;
    await notify(tx, proId, { type: `verification_${decision}`, ...messages[decision], link: "/profissional/perfil" }, { email: true });
  });
}

export async function reviewDocument(actor: Actor, documentId: string, status: "accepted" | "rejected", note: string) {
  requireAdmin(actor);
  const updated = await db
    .update(proDocuments)
    .set({ status, reviewNote: note.trim() || null, reviewedBy: actor.id, reviewedAt: new Date() })
    .where(eq(proDocuments.id, documentId))
    .returning();
  if (!updated.length) throw notFound("Documento");
  await audit(db, actor, `document.${status}`, "pro_document", documentId, { note });
}

export async function listRequestsForAdmin(actor: Actor, status?: (typeof serviceRequests.$inferSelect)["status"]) {
  requireAdmin(actor);
  return db
    .select({
      id: serviceRequests.id,
      title: serviceRequests.title,
      status: serviceRequests.status,
      createdAt: serviceRequests.createdAt,
      scheduledStart: serviceRequests.scheduledStart,
      categoryName: categories.name,
      regionName: regions.name,
      isDemo: serviceRequests.isDemo,
      quoteCount: sql<number>`(select count(*)::int from quotes q where q.request_id = ${serviceRequests.id})`,
      invited: sql<number>`(select count(*)::int from request_invitations i where i.request_id = ${serviceRequests.id})`,
    })
    .from(serviceRequests)
    .innerJoin(categories, eq(categories.id, serviceRequests.categoryId))
    .leftJoin(regions, eq(regions.id, serviceRequests.regionId))
    .where(status ? eq(serviceRequests.status, status) : undefined)
    .orderBy(desc(serviceRequests.createdAt))
    .limit(200);
}

export const couponSchema = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9_-]{4,24}$/, "Use 4 a 24 letras/números."),
  description: z.string().trim().min(5).max(200),
  discountType: z.enum(["percent", "fixed"]),
  value: z.coerce.number().int().positive(),
  maxRedemptions: z
    .union([z.literal(""), z.coerce.number().int().positive()])
    .transform((v) => (v === "" ? null : v)),
  validUntil: z
    .union([z.literal(""), z.coerce.date()])
    .transform((v) => (v === "" ? null : v)),
});

export async function createCoupon(actor: Actor, input: z.input<typeof couponSchema>) {
  requireAdmin(actor);
  const parsed = couponSchema.safeParse(input);
  if (!parsed.success) throw invalid(parsed.error.issues[0].message);
  const d = parsed.data;
  if (d.discountType === "percent" && d.value > 5000) throw invalid("Desconto percentual máximo de 50% (5000 bps).");
  const [c] = await db
    .insert(coupons)
    .values({ ...d, createdBy: actor.id })
    .onConflictDoNothing({ target: coupons.code })
    .returning();
  if (!c) throw invalid("Já existe um cupom com este código.");
  await audit(db, actor, "coupon.create", "coupon", c.id, d);
}

export async function toggleCoupon(actor: Actor, couponId: string, active: boolean) {
  requireAdmin(actor);
  await db.update(coupons).set({ active }).where(eq(coupons.id, couponId));
  await audit(db, actor, active ? "coupon.activate" : "coupon.deactivate", "coupon", couponId);
}

export async function listCoupons(actor: Actor) {
  requireAdmin(actor);
  return db.select().from(coupons).orderBy(desc(coupons.createdAt));
}

export async function listAuditLogs(actor: Actor, limit = 200) {
  requireAdmin(actor);
  return db
    .select({ log: auditLogs, actorName: users.name })
    .from(auditLogs)
    .leftJoin(users, eq(users.id, auditLogs.actorId))
    .orderBy(desc(auditLogs.id))
    .limit(limit);
}

/** Financeiro: economia registrada por serviço concluído e registros de pagamento. */
export async function listFinance(actor: Actor) {
  requireAdmin(actor);
  const rows = await db.execute<{
    request_id: string;
    title: string;
    pro_name: string;
    gross_cents: number;
    commission_bps: number;
    commission_cents: number;
    pro_net_cents: number;
    settlement_status: string;
    payment_status: string | null;
    provider: string | null;
    created_at: Date;
    is_demo: boolean;
  }>(sql`
    select s.request_id, r.title, p.display_name as pro_name, s.gross_cents, s.commission_bps, s.commission_cents,
      s.pro_net_cents, s.status as settlement_status, pay.status as payment_status, pay.provider, s.created_at, r.is_demo
    from settlements s
    join service_requests r on r.id = s.request_id
    join pro_profiles p on p.user_id = s.pro_id
    left join payments pay on pay.request_id = s.request_id
    order by s.created_at desc
    limit 300
  `);
  return rows;
}
