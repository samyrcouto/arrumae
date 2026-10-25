import "server-only";
import { randomUUID } from "node:crypto";
import { and, asc, desc, eq, inArray, isNull, lte, notInArray, sql } from "drizzle-orm";
import { z } from "zod";
import { normalizeCep } from "@/lib/br";
import { makeKey, storage } from "../adapters/storage";
import { paymentProvider } from "../adapters/payments";
import { db, type Tx } from "../db/client";
import {
  categories,
  payments,
  priceRevisions,
  proProfiles,
  quotes,
  regions,
  requestEvents,
  requestInvitations,
  requestPhotos,
  serviceRequests,
  settlements,
  supportTickets,
  ticketMessages,
  users,
} from "../db/schema";
import { type Actor, actorId, actorRole } from "../domain/actor";
import { conflict, forbidden, invalid, notFound } from "../domain/errors";
import { commissionFor } from "../domain/money";
import {
  availableActions,
  checkActionGuards,
  type GuardContext,
  isLateCancellation,
  REQUEST_ACTIONS,
  type RequestAction,
  type RequestStatus,
} from "../domain/request-lifecycle";
import { enforceRateLimit, LIMITS } from "../security/rate-limit";
import { type ProcessedFile, processImage, UPLOAD_LIMITS } from "../security/uploads";
import { fieldErrorsFrom } from "./accounts";
import { trackServer } from "./analytics";
import { audit } from "./audit";
import { resolveRegionByCep } from "./catalog";
import { findEligiblePros, statsForPros } from "./matching";
import { notify } from "./notifications";
import { emitIntegrationEvent, requestAdminUrl, requestRefs } from "./integrations";
import { getSettings } from "./settings";

type ServiceRequest = typeof serviceRequests.$inferSelect;

// ---------------------------------------------------------------------------
// Criação
// ---------------------------------------------------------------------------

export const createRequestSchema = z.object({
  categoryId: z.uuid("Escolha o tipo de serviço."),
  title: z.string().trim().min(5, "Descreva em poucas palavras (mín. 5 caracteres).").max(80),
  description: z
    .string()
    .trim()
    .min(20, "Conte um pouco mais (mín. 20 caracteres) — isso ajuda o profissional a enviar um preço justo.")
    .max(2000),
  cep: z
    .string()
    .transform((v, ctx) => {
      const c = normalizeCep(v);
      if (!c) ctx.addIssue({ code: "custom", message: "CEP inválido." });
      return c ?? "";
    }),
  neighborhood: z.string().trim().min(2, "Informe o bairro.").max(80),
  addressLine: z.string().trim().min(3, "Informe rua e número.").max(160),
  addressComplement: z.string().trim().max(80).default(""),
  urgency: z.enum(["today", "this_week", "flexible"]),
  preferredWindow: z.string().trim().max(160).default(""),
  submissionToken: z.uuid(),
  utmSource: z.string().max(100).optional(),
  utmMedium: z.string().max(100).optional(),
  utmCampaign: z.string().max(100).optional(),
});
export type CreateRequestInput = z.input<typeof createRequestSchema>;

export const OUT_OF_AREA_MESSAGE =
  "Ainda não atendemos este CEP. Estamos começando por algumas regiões de São Paulo e vamos avisar quando chegarmos aí.";

/**
 * Valida um rascunho sem gravar nada: usado no fluxo de pedido de visitante,
 * antes de criar a conta, para não criar conta e falhar no pedido.
 */
export async function validateRequestDraft(input: CreateRequestInput) {
  const parsed = createRequestSchema.safeParse(input);
  if (!parsed.success) throw invalid("Revise os campos destacados.", fieldErrorsFrom(parsed.error));
  const [category] = await db
    .select({ id: categories.id, slug: categories.slug })
    .from(categories)
    .where(and(eq(categories.id, parsed.data.categoryId), eq(categories.active, true)));
  if (!category) throw invalid("Revise os campos destacados.", { categoryId: "Serviço indisponível." });
  if (!(await resolveRegionByCep(parsed.data.cep))) {
    await trackServer("out_of_area", { props: { cepPrefix: parsed.data.cep.slice(0, 3), category: category.slug } });
    throw invalid(OUT_OF_AREA_MESSAGE, { cep: "CEP fora da área atendida no momento." });
  }
}

export async function createServiceRequest(actor: Actor, input: CreateRequestInput, photos: File[] = []) {
  if (actor.kind !== "user" || actor.role !== "client") throw forbidden("Apenas clientes podem criar solicitações.");
  const parsed = createRequestSchema.safeParse(input);
  if (!parsed.success) throw invalid("Revise os campos destacados.", fieldErrorsFrom(parsed.error));
  const data = parsed.data;
  if (photos.length > UPLOAD_LIMITS.maxImagesPerRequest) throw invalid("Envie no máximo 5 fotos.");

  // Idempotência: um reenvio do mesmo formulário devolve a solicitação existente.
  const [dup] = await db
    .select({ id: serviceRequests.id })
    .from(serviceRequests)
    .where(and(eq(serviceRequests.clientId, actor.id), eq(serviceRequests.submissionToken, data.submissionToken)));
  if (dup) return { id: dup.id, created: false };

  await enforceRateLimit("create_request", actor.id, LIMITS.createRequest.limit, LIMITS.createRequest.window);

  const [category] = await db
    .select()
    .from(categories)
    .where(and(eq(categories.id, data.categoryId), eq(categories.active, true)));
  if (!category) throw invalid("Revise os campos destacados.", { categoryId: "Serviço indisponível." });

  const region = await resolveRegionByCep(data.cep);
  if (!region) {
    await trackServer("out_of_area", { userId: actor.id, props: { cepPrefix: data.cep.slice(0, 3), category: category.slug } });
    throw invalid(OUT_OF_AREA_MESSAGE, { cep: "CEP fora da área atendida no momento." });
  }

  // Processa as fotos antes da transação (operação lenta). Arquivos órfãos de
  // uma transação que falhe são removidos no bloco catch.
  const processed: ProcessedFile[] = [];
  for (const f of photos) processed.push(await processImage(f));

  const settings = await getSettings();
  const requestId = randomUUID();
  const storedKeys: string[] = [];
  try {
    for (const p of processed) {
      const key = makeKey("request-photos", requestId, randomUUID(), p.mimeType);
      await storage().put(key, p.buffer, p.mimeType);
      storedKeys.push(key);
    }

    const result = await db.transaction(async (tx) => {
      const inserted = await tx
        .insert(serviceRequests)
        .values({
          id: requestId,
          clientId: actor.id,
          categoryId: category.id,
          regionId: region.id,
          title: data.title,
          description: data.description,
          cep: data.cep,
          neighborhood: data.neighborhood,
          addressLine: data.addressLine,
          addressComplement: data.addressComplement,
          urgency: data.urgency,
          preferredWindow: data.preferredWindow,
          expiresAt: new Date(Date.now() + settings.requestExpiryHours * 3600_000),
          submissionToken: data.submissionToken,
          utmSource: data.utmSource,
          utmMedium: data.utmMedium,
          utmCampaign: data.utmCampaign,
        })
        .onConflictDoNothing({ target: [serviceRequests.clientId, serviceRequests.submissionToken] })
        .returning({ id: serviceRequests.id });
      if (!inserted.length) return { id: null, invited: 0 };

      if (storedKeys.length)
        await tx.insert(requestPhotos).values(
          storedKeys.map((storageKey, i) => ({
            requestId,
            storageKey,
            mimeType: processed[i].mimeType,
            sizeBytes: processed[i].sizeBytes,
          })),
        );

      await tx.insert(requestEvents).values({
        requestId,
        type: "created",
        toStatus: "open",
        actorId: actor.id,
        actorRole: "client",
      });

      const proIds = await findEligiblePros(tx, {
        categoryId: category.id,
        regionId: region.id,
        urgency: data.urgency,
        limit: settings.maxInvitesPerRequest,
      });
      if (proIds.length) {
        await tx.insert(requestInvitations).values(proIds.map((proId, rank) => ({ requestId, proId, rank })));
        for (const proId of proIds)
          await notify(
            tx,
            proId,
            {
              type: "new_opportunity",
              title: `Nova solicitação: ${category.name} em ${region.name}`,
              body: `${data.title}. Envie sua proposta se puder atender.`,
              link: `/profissional/oportunidades/${requestId}`,
            },
            { email: true },
          );
      } else {
        // Sem oferta: a operação recruta manualmente (concierge) — ver docs/ROADMAP.md.
        await tx.insert(requestEvents).values({ requestId, type: "no_eligible_pros", actorRole: "system" });
        const admins = await tx
          .select({ id: users.id })
          .from(users)
          .where(and(eq(users.role, "admin"), eq(users.status, "active")));
        for (const a of admins)
          await notify(tx, a.id, {
            type: "no_eligible_pros",
            title: "Solicitação sem profissionais elegíveis",
            body: `${category.name} em ${region.name}: nenhum profissional aprovado atende.`,
            link: `/admin/solicitacoes/${requestId}`,
          });
      }
      await emitIntegrationEvent(tx, "request.created", {
        requestId,
        category: { slug: category.slug, name: category.name },
        region: { slug: region.slug, name: region.name },
        urgency: data.urgency,
        isDemo: false,
        adminUrl: requestAdminUrl(requestId),
        invitedPros: proIds.length,
        noEligiblePros: proIds.length === 0,
      });
      return { id: requestId, invited: proIds.length };
    });

    if (!result.id) {
      // Corrida com envio duplicado concorrente: remove os arquivos e devolve a existente.
      await Promise.all(storedKeys.map((k) => storage().delete(k)));
      const [existing] = await db
        .select({ id: serviceRequests.id })
        .from(serviceRequests)
        .where(and(eq(serviceRequests.clientId, actor.id), eq(serviceRequests.submissionToken, data.submissionToken)));
      return { id: existing.id, created: false };
    }

    await trackServer("request_created", {
      userId: actor.id,
      utmSource: data.utmSource,
      utmMedium: data.utmMedium,
      utmCampaign: data.utmCampaign,
      props: { category: category.slug, region: region.slug, urgency: data.urgency, invited: result.invited },
    });
    return { id: result.id, created: true };
  } catch (e) {
    await Promise.all(storedKeys.map((k) => storage().delete(k).catch(() => {})));
    throw e;
  }
}

// ---------------------------------------------------------------------------
// Leitura com autorização
// ---------------------------------------------------------------------------

const CONTACT_VISIBLE: RequestStatus[] = ["scheduled", "in_progress", "awaiting_confirmation", "completed", "disputed"];

async function guardContext(tx: Tx | typeof db, r: ServiceRequest): Promise<GuardContext> {
  const settings = await getSettings(tx);
  const pending = await tx
    .select({ id: priceRevisions.id })
    .from(priceRevisions)
    .where(and(eq(priceRevisions.requestId, r.id), eq(priceRevisions.status, "pending")));
  return {
    status: r.status,
    clientId: r.clientId,
    proId: r.proId,
    scheduledStart: r.scheduledStart,
    completedAt: r.completedAt,
    expiresAt: r.expiresAt,
    hasPendingRevision: pending.length > 0,
    autoConfirmHours: settings.autoConfirmHours,
  };
}

export type RequestViewer = "client" | "pro" | "admin";

/**
 * Detalhe da solicitação conforme quem pede:
 * - cliente dono: tudo;
 * - profissional convidado: sem endereço completo e sem contato do cliente
 *   (revelados apenas ao profissional designado após o agendamento);
 * - admin: tudo.
 */
export async function getRequestDetail(actor: Actor, requestId: string) {
  if (actor.kind !== "user") throw forbidden();
  const parsedId = z.uuid().safeParse(requestId);
  if (!parsedId.success) throw notFound("Solicitação");
  const [row] = await db
    .select({ request: serviceRequests, category: categories, region: regions })
    .from(serviceRequests)
    .innerJoin(categories, eq(categories.id, serviceRequests.categoryId))
    .leftJoin(regions, eq(regions.id, serviceRequests.regionId))
    .where(eq(serviceRequests.id, requestId));
  if (!row) throw notFound("Solicitação");
  const r = row.request;

  let viewer: RequestViewer;
  if (actor.role === "admin") viewer = "admin";
  else if (actor.role === "client" && r.clientId === actor.id) viewer = "client";
  else if (actor.role === "pro") {
    const [inv] = await db
      .select()
      .from(requestInvitations)
      .where(and(eq(requestInvitations.requestId, r.id), eq(requestInvitations.proId, actor.id)));
    if (!inv && r.proId !== actor.id) throw notFound("Solicitação");
    if (inv && !inv.viewedAt)
      await db
        .update(requestInvitations)
        .set({ viewedAt: new Date() })
        .where(and(eq(requestInvitations.requestId, r.id), eq(requestInvitations.proId, actor.id)));
    viewer = "pro";
  } else throw notFound("Solicitação"); // não revela a existência para quem não tem acesso

  const isAssignedPro = viewer === "pro" && r.proId === actor.id && CONTACT_VISIBLE.includes(r.status);

  const [photos, quoteRows, revisions, events, client, ctx] = await Promise.all([
    db.select().from(requestPhotos).where(eq(requestPhotos.requestId, r.id)).orderBy(asc(requestPhotos.createdAt)),
    db
      .select({ quote: quotes, pro: proProfiles })
      .from(quotes)
      .innerJoin(proProfiles, eq(proProfiles.userId, quotes.proId))
      .where(
        viewer === "pro"
          ? and(eq(quotes.requestId, r.id), eq(quotes.proId, actor.id))
          : eq(quotes.requestId, r.id),
      )
      .orderBy(asc(quotes.createdAt)),
    db.select().from(priceRevisions).where(eq(priceRevisions.requestId, r.id)).orderBy(desc(priceRevisions.createdAt)),
    viewer === "pro" && !isAssignedPro
      ? Promise.resolve([])
      : db.select().from(requestEvents).where(eq(requestEvents.requestId, r.id)).orderBy(asc(requestEvents.id)),
    db.select({ name: users.name, phone: users.phone }).from(users).where(eq(users.id, r.clientId)),
    guardContext(db, r),
  ]);

  const proIds = quoteRows.map((q) => q.quote.proId);
  const stats = await statsForPros(db, proIds);
  let assignedPro: { name: string; phone: string | null } | null = null;
  if (r.proId && (viewer === "client" || viewer === "admin") && CONTACT_VISIBLE.includes(r.status)) {
    const [p] = await db
      .select({ name: proProfiles.displayName, phone: users.phone })
      .from(proProfiles)
      .innerJoin(users, eq(users.id, proProfiles.userId))
      .where(eq(proProfiles.userId, r.proId));
    assignedPro = p ?? null;
  }

  const showAddress = viewer !== "pro" || isAssignedPro;
  const firstName = client[0]?.name.split(" ")[0] ?? "Cliente";

  return {
    viewer,
    request: {
      ...r,
      addressLine: showAddress ? r.addressLine : null,
      addressComplement: showAddress ? r.addressComplement : null,
      // CEP completo identifica o trecho da rua: antes do agendamento, só o prefixo.
      cep: showAddress ? r.cep : `${r.cep.slice(0, 5)}***`,
      clientId: viewer === "pro" ? "" : r.clientId,
      submissionToken: undefined,
    },
    category: row.category,
    region: row.region,
    client:
      viewer === "pro"
        ? { name: isAssignedPro ? client[0]?.name : firstName, phone: isAssignedPro ? client[0]?.phone : null }
        : client[0],
    assignedPro,
    photos,
    quotes: quoteRows.map((q) => ({
      ...q.quote,
      pro: { id: q.pro.userId, displayName: q.pro.displayName, yearsExperience: q.pro.yearsExperience },
      stats: stats.get(q.quote.proId) ?? { ratingAvg: null, ratingCount: 0, completedJobs: 0 },
    })),
    revisions,
    events,
    actions: availableActions(ctx, { role: actor.role, id: actor.id }, new Date()),
  };
}

export async function listClientRequests(actor: Actor) {
  if (actor.kind !== "user" || actor.role !== "client") throw forbidden();
  return db
    .select({
      id: serviceRequests.id,
      title: serviceRequests.title,
      status: serviceRequests.status,
      createdAt: serviceRequests.createdAt,
      scheduledStart: serviceRequests.scheduledStart,
      categoryName: categories.name,
      quoteCount: sql<number>`(select count(*)::int from quotes q where q.request_id = ${serviceRequests.id} and q.status in ('pending','accepted'))`,
    })
    .from(serviceRequests)
    .innerJoin(categories, eq(categories.id, serviceRequests.categoryId))
    .where(eq(serviceRequests.clientId, actor.id))
    .orderBy(desc(serviceRequests.createdAt));
}

/** Oportunidades abertas para o profissional (convites ainda sem proposta). */
export async function listProOpportunities(actor: Actor) {
  if (actor.kind !== "user" || actor.role !== "pro") throw forbidden();
  return db
    .select({
      id: serviceRequests.id,
      title: serviceRequests.title,
      neighborhood: serviceRequests.neighborhood,
      urgency: serviceRequests.urgency,
      createdAt: serviceRequests.createdAt,
      expiresAt: serviceRequests.expiresAt,
      categoryName: categories.name,
      regionName: regions.name,
      viewedAt: requestInvitations.viewedAt,
    })
    .from(requestInvitations)
    .innerJoin(serviceRequests, eq(serviceRequests.id, requestInvitations.requestId))
    .innerJoin(categories, eq(categories.id, serviceRequests.categoryId))
    .leftJoin(regions, eq(regions.id, serviceRequests.regionId))
    .where(
      and(
        eq(requestInvitations.proId, actor.id),
        isNull(requestInvitations.declinedAt),
        eq(serviceRequests.status, "open"),
        sql`${serviceRequests.expiresAt} > now()`,
        sql`not exists (select 1 from quotes q where q.request_id = ${serviceRequests.id} and q.pro_id = ${actor.id} and q.status in ('pending','rejected','cancelled'))`,
      ),
    )
    .orderBy(desc(serviceRequests.createdAt));
}

/** Trabalhos e propostas do profissional. */
export async function listProJobs(actor: Actor) {
  if (actor.kind !== "user" || actor.role !== "pro") throw forbidden();
  const jobs = await db
    .select({
      id: serviceRequests.id,
      title: serviceRequests.title,
      status: serviceRequests.status,
      neighborhood: serviceRequests.neighborhood,
      scheduledStart: serviceRequests.scheduledStart,
      finalAmountCents: serviceRequests.finalAmountCents,
      agreedAmountCents: serviceRequests.agreedAmountCents,
      categoryName: categories.name,
    })
    .from(serviceRequests)
    .innerJoin(categories, eq(categories.id, serviceRequests.categoryId))
    .where(eq(serviceRequests.proId, actor.id))
    .orderBy(desc(serviceRequests.scheduledStart));
  const myQuotes = await db
    .select({
      id: quotes.id,
      requestId: quotes.requestId,
      status: quotes.status,
      kind: quotes.kind,
      amountCents: quotes.amountCents,
      visitFeeCents: quotes.visitFeeCents,
      createdAt: quotes.createdAt,
      title: serviceRequests.title,
    })
    .from(quotes)
    .innerJoin(serviceRequests, eq(serviceRequests.id, quotes.requestId))
    .where(and(eq(quotes.proId, actor.id), notInArray(quotes.status, ["accepted"])))
    .orderBy(desc(quotes.createdAt))
    .limit(50);
  return { jobs, quotes: myQuotes };
}

export async function declineInvitation(actor: Actor, requestId: string) {
  if (actor.kind !== "user" || actor.role !== "pro") throw forbidden();
  await db
    .update(requestInvitations)
    .set({ declinedAt: new Date() })
    .where(and(eq(requestInvitations.requestId, requestId), eq(requestInvitations.proId, actor.id)));
}

// ---------------------------------------------------------------------------
// Transições de estado
// ---------------------------------------------------------------------------

export type ActionPayload = {
  reason?: string;
  /** confirm: cliente declara que pagou diretamente ao profissional (piloto). */
  declaredPaid?: boolean;
  /** resolve_as_completed: valor final definido pela equipe. */
  finalAmountCents?: number;
};

const REASON_REQUIRED: RequestAction[] = [
  "client_cancel",
  "pro_cancel",
  "open_dispute",
  "admin_cancel",
  "resolve_as_cancelled",
  "resolve_as_completed",
];

/** Ações que o usuário pode disparar por um botão. accept_quote tem fluxo próprio (quotes.ts). */
export type UserRequestAction = Exclude<RequestAction, "accept_quote" | "auto_confirm" | "expire">;

export async function performRequestAction(
  actor: Actor,
  requestId: string,
  action: RequestAction,
  payload: ActionPayload = {},
) {
  if (action === "accept_quote") throw invalid("Use o fluxo de aceite de proposta.");
  const reason = payload.reason?.trim() ?? "";
  if (REASON_REQUIRED.includes(action) && reason.length < 5)
    throw invalid("Explique o motivo (mín. 5 caracteres).", { reason: "Explique o motivo (mín. 5 caracteres)." });
  if (reason.length > 1000) throw invalid("Motivo muito longo.");

  return db.transaction(async (tx) => {
    // Bloqueia a linha: operações concorrentes na mesma solicitação esperam.
    const [r] = await tx.select().from(serviceRequests).where(eq(serviceRequests.id, requestId)).for("update");
    if (!r) throw notFound("Solicitação");
    const ctx = await guardContext(tx, r);
    const now = new Date();
    const guard = checkActionGuards(action, ctx, { role: actorRole(actor), id: actorId(actor) }, now);
    if (!guard.ok) {
      if (guard.reason.includes("permissão")) throw forbidden(guard.reason);
      throw conflict(guard.reason);
    }
    const def = REQUEST_ACTIONS[action];
    const patch: Partial<typeof serviceRequests.$inferInsert> = { status: def.to, updatedAt: now };
    const eventData: Record<string, unknown> = reason ? { reason } : {};
    const settings = await getSettings(tx);

    switch (action) {
      case "client_cancel":
      case "admin_cancel":
      case "resolve_as_cancelled":
      case "report_client_no_show":
        patch.cancelledAt = now;
        patch.cancelledBy = actorId(actor);
        patch.cancelReason =
          action === "report_client_no_show" ? "Cliente ausente no horário combinado" : reason || def.label;
        if (action === "client_cancel" && r.status === "scheduled")
          eventData.lateCancellation = isLateCancellation(r.scheduledStart, now);
        break;
      case "pro_cancel":
      case "report_pro_no_show":
        // Reabre a solicitação para novas propostas.
        Object.assign(patch, {
          proId: null,
          acceptedQuoteId: null,
          scheduledStart: null,
          scheduledEnd: null,
          agreedAmountCents: null,
          expiresAt: new Date(Math.max(r.expiresAt.getTime(), now.getTime() + 24 * 3600_000)),
        });
        eventData.proId = r.proId;
        break;
      case "start":
        patch.startedAt = now;
        break;
      case "complete":
        patch.completedAt = now;
        patch.finalAmountCents = r.agreedAmountCents ?? 0;
        break;
      case "confirm":
      case "auto_confirm":
        patch.confirmedAt = now;
        break;
      case "resolve_as_completed":
        if (payload.finalAmountCents !== undefined) {
          if (!Number.isInteger(payload.finalAmountCents) || payload.finalAmountCents < 0)
            throw invalid("Valor final inválido.");
          patch.finalAmountCents = payload.finalAmountCents;
        } else patch.finalAmountCents = r.finalAmountCents ?? r.agreedAmountCents ?? 0;
        patch.confirmedAt = now;
        break;
    }

    // UPDATE condicional: só aplica se o status ainda for um dos permitidos.
    const updated = await tx
      .update(serviceRequests)
      .set(patch)
      .where(and(eq(serviceRequests.id, r.id), inArray(serviceRequests.status, [...def.from])))
      .returning();
    if (!updated.length) throw conflict("A solicitação mudou enquanto você agia. Atualize a página.");
    const next = updated[0];

    await tx.insert(requestEvents).values({
      requestId: r.id,
      type: action,
      fromStatus: r.status,
      toStatus: def.to,
      actorId: actorId(actor),
      actorRole: actorRole(actor),
      data: eventData,
    });

    // ---- efeitos colaterais ------------------------------------------------
    const link = (role: "client" | "pro") =>
      role === "client" ? `/cliente/solicitacoes/${r.id}` : `/profissional/oportunidades/${r.id}`;

    if (def.to === "cancelled" || def.to === "expired") {
      await tx
        .update(quotes)
        .set({ status: "expired", updatedAt: now })
        .where(and(eq(quotes.requestId, r.id), eq(quotes.status, "pending")));
      if (r.acceptedQuoteId)
        await tx.update(quotes).set({ status: "cancelled", updatedAt: now }).where(eq(quotes.id, r.acceptedQuoteId));
      await tx
        .update(priceRevisions)
        .set({ status: "cancelled", decidedAt: now })
        .where(and(eq(priceRevisions.requestId, r.id), eq(priceRevisions.status, "pending")));
    }

    if (action === "pro_cancel" || action === "report_pro_no_show") {
      if (r.acceptedQuoteId)
        await tx.update(quotes).set({ status: "cancelled", updatedAt: now }).where(eq(quotes.id, r.acceptedQuoteId));
      if (r.proId)
        await tx
          .update(proProfiles)
          .set(
            action === "pro_cancel"
              ? { cancellationsCount: sql`${proProfiles.cancellationsCount} + 1` }
              : { noShowCount: sql`${proProfiles.noShowCount} + 1` },
          )
          .where(eq(proProfiles.userId, r.proId));
      // Propostas que tinham sido preteridas voltam a valer, se ainda estiverem no prazo.
      await tx
        .update(quotes)
        .set({ status: "pending", updatedAt: now })
        .where(and(eq(quotes.requestId, r.id), eq(quotes.status, "superseded"), sql`${quotes.validUntil} > now()`));
    }

    if (def.to === "completed") await recordCompletion(tx, next, settings, action === "confirm" && !!payload.declaredPaid);

    let disputeTicketId: string | undefined;
    if (action === "open_dispute") {
      const [ticket] = await tx
        .insert(supportTickets)
        .values({
          openerId: actorId(actor)!,
          requestId: r.id,
          category: "complaint",
          subject: `Contestação: ${r.title}`.slice(0, 120),
          priority: "high",
        })
        .returning({ id: supportTickets.id });
      await tx.insert(ticketMessages).values({ ticketId: ticket.id, authorId: actorId(actor)!, body: reason });
      disputeTicketId = ticket.id;
      const admins = await tx
        .select({ id: users.id })
        .from(users)
        .where(and(eq(users.role, "admin"), eq(users.status, "active")));
      for (const a of admins)
        await notify(tx, a.id, {
          type: "dispute_opened",
          title: "Nova contestação",
          body: r.title,
          link: `/admin/solicitacoes/${r.id}`,
        });
    }

    // Notifica a outra parte.
    const label = def.label;
    const notifyClient = actorRole(actor) !== "client";
    const notifyPro = actorRole(actor) !== "pro" && r.proId;
    if (notifyClient)
      await notify(tx, r.clientId, { type: `request_${action}`, title: label, body: r.title, link: link("client") }, { email: true });
    if (notifyPro && r.proId)
      await notify(tx, r.proId, { type: `request_${action}`, title: label, body: r.title, link: link("pro") }, { email: true });

    if (action === "pro_cancel" || action === "report_pro_no_show") {
      const invited = await tx
        .select({ proId: requestInvitations.proId })
        .from(requestInvitations)
        .where(and(eq(requestInvitations.requestId, r.id), isNull(requestInvitations.declinedAt)));
      for (const i of invited)
        if (i.proId !== r.proId)
          await notify(tx, i.proId, {
            type: "request_reopened",
            title: "Solicitação reaberta",
            body: `${r.title} voltou a receber propostas.`,
            link: link("pro"),
          });
    }

    await emitIntegrationEvent(tx, "request.status_changed", {
      ...(await requestRefs(tx, next)),
      action,
      from: r.status,
      to: def.to,
      actorRole: actorRole(actor),
      ...(disputeTicketId ? { ticketId: disputeTicketId } : {}),
      ...(def.to === "completed" ? { finalAmountCents: next.finalAmountCents } : {}),
    });

    if (actor.kind === "user" && actor.role === "admin")
      await audit(tx, actor, `request.${action}`, "service_request", r.id, eventData);

    return next;
  });
}

async function recordCompletion(
  tx: Tx,
  r: ServiceRequest,
  settings: Awaited<ReturnType<typeof getSettings>>,
  declaredPaid: boolean,
) {
  if (!r.proId) return;
  const gross = r.finalAmountCents ?? r.agreedAmountCents ?? 0;
  const [cat] = await tx.select({ bps: categories.commissionBps }).from(categories).where(eq(categories.id, r.categoryId));
  const bps = cat?.bps ?? settings.defaultCommissionBps;
  const { commissionCents, proNetCents } = commissionFor(gross, bps);
  const provider = paymentProvider();
  await tx
    .insert(settlements)
    .values({
      requestId: r.id,
      proId: r.proId,
      grossCents: gross,
      commissionBps: bps,
      commissionCents,
      proNetCents,
      paymentMode: provider.name,
      status: settings.commissionWaived ? "waived" : "recorded",
    })
    .onConflictDoNothing({ target: settlements.requestId });
  await tx
    .insert(payments)
    .values({
      requestId: r.id,
      provider: provider.name,
      amountCents: gross,
      status: provider.initialStatusOnConfirmation(declaredPaid),
      idempotencyKey: `service:${r.id}`,
      metadata: { processesFunds: provider.processesFunds, declaredPaid },
    })
    .onConflictDoNothing({ target: payments.idempotencyKey });
  await trackServer("request_completed", { userId: r.clientId, props: { grossCents: gross } }, tx);
}

// ---------------------------------------------------------------------------
// Rotinas do sistema (expiração e confirmação automática)
// ---------------------------------------------------------------------------

export async function runLifecycleJobs(now = new Date()) {
  const settings = await getSettings();
  const toExpire = await db
    .select({ id: serviceRequests.id })
    .from(serviceRequests)
    .where(and(eq(serviceRequests.status, "open"), lte(serviceRequests.expiresAt, now)))
    .limit(500);
  const toConfirm = await db
    .select({ id: serviceRequests.id })
    .from(serviceRequests)
    .where(
      and(
        eq(serviceRequests.status, "awaiting_confirmation"),
        lte(serviceRequests.completedAt, new Date(now.getTime() - settings.autoConfirmHours * 3600_000)),
      ),
    )
    .limit(500);
  const result = { expired: 0, autoConfirmed: 0, quotesExpired: 0, failures: 0 };
  for (const r of toExpire) {
    try {
      await performRequestAction({ kind: "system" }, r.id, "expire");
      result.expired++;
    } catch {
      result.failures++;
    }
  }
  for (const r of toConfirm) {
    try {
      await performRequestAction({ kind: "system" }, r.id, "auto_confirm");
      result.autoConfirmed++;
    } catch {
      result.failures++;
    }
  }
  const expiredQuotes = await db
    .update(quotes)
    .set({ status: "expired", updatedAt: now })
    .where(and(eq(quotes.status, "pending"), lte(quotes.validUntil, now)))
    .returning({ id: quotes.id });
  result.quotesExpired = expiredQuotes.length;
  return result;
}
