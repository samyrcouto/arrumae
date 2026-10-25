import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { desc, eq, sql } from "drizzle-orm";
import { db, type DbOrTx } from "../db/client";
import { categories, integrationEvents, regions, serviceRequests } from "../db/schema";
import type { Actor } from "../domain/actor";
import { forbidden } from "../domain/errors";
import { env } from "../env";
import { audit } from "./audit";

/**
 * Integrações externas (n8n, Zapier, Make, um worker próprio...).
 *
 * Saída: os serviços gravam eventos em `integration_events` dentro da própria
 * transação (padrão outbox) e `dispatchIntegrationEvents` os entrega por
 * webhook assinado. Entrada: a API `/api/integrations/v1/*` é SÓ LEITURA.
 * Nenhuma integração escreve no banco nem muda estado de negócio — isso
 * continua passando pelos serviços, com as regras e a auditoria (D-017).
 *
 * Os payloads levam apenas ids, categorias, status e valores — nunca nome,
 * e-mail, telefone, endereço, CPF ou texto livre digitado por usuários.
 */

export const INTEGRATION_EVENT_TYPES = [
  "request.created",
  "request.status_changed",
  "request.stale",
  "quote.submitted",
  "review.created",
  "pro.submitted_for_review",
  "pro.verification_decided",
  "support.ticket_opened",
] as const;
export type IntegrationEventType = (typeof INTEGRATION_EVENT_TYPES)[number];

/** Pedido aberto sem nenhuma proposta pendente depois deste tempo vira alerta `request.stale`. */
export const STALE_REQUEST_MINUTES = 120;
const MAX_ATTEMPTS = 8;
const BATCH_SIZE = 50;
const LEASE_MS = 5 * 60_000;
const TIMEOUT_MS = 8_000;
/** Tolerância de relógio para validar a assinatura do lado de quem recebe. */
export const SIGNATURE_TOLERANCE_SECONDS = 300;

// ---------------------------------------------------------------------------
// Configuração (lida a cada chamada para permitir ligar/desligar sem reiniciar testes)
// ---------------------------------------------------------------------------

export function integrationConfig() {
  const url = process.env.INTEGRATION_WEBHOOK_URL?.trim() || undefined;
  const secret = process.env.INTEGRATION_WEBHOOK_SECRET ?? "";
  const token = process.env.INTEGRATION_API_TOKEN ?? "";
  const problems: string[] = [];
  if (url && secret.length < 32) problems.push("INTEGRATION_WEBHOOK_SECRET precisa ter pelo menos 32 caracteres");
  if (url && env().APP_ENV === "production" && !url.startsWith("https://"))
    problems.push("INTEGRATION_WEBHOOK_URL precisa usar https em produção");
  if (token && token.length < 32) problems.push("INTEGRATION_API_TOKEN precisa ter pelo menos 32 caracteres");
  return {
    webhookUrl: url && !problems.some((p) => p.startsWith("INTEGRATION_WEBHOOK")) ? url : undefined,
    webhookSecret: secret,
    apiToken: token.length >= 32 ? token : undefined,
    problems,
  };
}

// ---------------------------------------------------------------------------
// Emissão (dentro da transação do serviço)
// ---------------------------------------------------------------------------

export async function emitIntegrationEvent(
  conn: DbOrTx,
  type: IntegrationEventType,
  payload: Record<string, unknown>,
  opts: { dedupeKey?: string } = {},
) {
  await conn
    .insert(integrationEvents)
    .values({ type, payload, dedupeKey: opts.dedupeKey })
    .onConflictDoNothing({ target: integrationEvents.dedupeKey });
}

const adminLink = (path: string) => `${env().APP_URL}${path}`;

/** Dados não pessoais de uma solicitação, comuns a todos os eventos `request.*`. */
export async function requestRefs(conn: DbOrTx, r: typeof serviceRequests.$inferSelect) {
  const [category] = await conn
    .select({ slug: categories.slug, name: categories.name })
    .from(categories)
    .where(eq(categories.id, r.categoryId));
  const [region] = r.regionId
    ? await conn.select({ slug: regions.slug, name: regions.name }).from(regions).where(eq(regions.id, r.regionId))
    : [];
  return {
    requestId: r.id,
    category: category ?? null,
    region: region ?? null,
    urgency: r.urgency,
    isDemo: r.isDemo,
    adminUrl: requestAdminUrl(r.id),
  };
}

export const requestAdminUrl = (requestId: string) => adminLink(`/admin/solicitacoes/${requestId}`);
export const proAdminUrl = (proId: string) => adminLink(`/admin/profissionais/${proId}`);
export const ticketAdminUrl = (ticketId: string) => adminLink(`/admin/suporte/${ticketId}`);

// ---------------------------------------------------------------------------
// Assinatura (HMAC-SHA256 sobre "<timestamp>.<corpo>")
// ---------------------------------------------------------------------------

export function signWebhook(secret: string, timestamp: number, body: string) {
  return `sha256=${createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex")}`;
}

/** Validação do lado de quem recebe (mesma lógica do workflow do n8n). */
export function verifyWebhook(
  secret: string,
  timestamp: number,
  body: string,
  signature: string,
  nowMs = Date.now(),
): boolean {
  if (!Number.isFinite(timestamp) || Math.abs(nowMs / 1000 - timestamp) > SIGNATURE_TOLERANCE_SECONDS) return false;
  const expected = Buffer.from(signWebhook(secret, timestamp, body));
  const given = Buffer.from(signature);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

// ---------------------------------------------------------------------------
// Entrega
// ---------------------------------------------------------------------------

/** Espera antes da próxima tentativa: 1 min, 2, 4, 8... até 6 h. */
export function retryDelayMs(attempts: number) {
  return Math.min(60_000 * 2 ** Math.max(0, attempts - 1), 6 * 3600_000);
}

type Claimed = { id: string; type: string; payload: Record<string, unknown>; attempts: number; created_at: string | Date };

export async function dispatchIntegrationEvents(now = new Date(), fetchImpl: typeof fetch = fetch) {
  const cfg = integrationConfig();
  if (!cfg.webhookUrl) return { configured: false, delivered: 0, retrying: 0, failed: 0 };

  // Reserva um lote (lease): outra execução simultânea não pega os mesmos eventos.
  const claimed = await db.execute<Claimed>(sql`
    update integration_events
       set attempts = attempts + 1,
           next_attempt_at = ${new Date(now.getTime() + LEASE_MS).toISOString()}::timestamptz
     where id in (
       select id from integration_events
        where status = 'pending'
          -- greatest(): eventos gravados nesta mesma rodada (ex.: request.stale) também saem agora
          and next_attempt_at <= greatest(now(), ${now.toISOString()}::timestamptz)
        order by created_at
        limit ${BATCH_SIZE}
        for update skip locked)
    returning id, type, payload, attempts, created_at`);

  const result = { configured: true, delivered: 0, retrying: 0, failed: 0 };
  const rows = [...claimed].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  for (const ev of rows) {
    const body = JSON.stringify({
      id: ev.id,
      type: ev.type,
      createdAt: new Date(ev.created_at).toISOString(),
      env: env().APP_ENV,
      data: ev.payload,
    });
    const timestamp = Math.floor(Date.now() / 1000);
    let error: string | null = null;
    try {
      const res = await fetchImpl(cfg.webhookUrl, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "user-agent": "arrumae-webhooks/1",
          "x-arrumae-event": ev.type,
          "x-arrumae-delivery": ev.id,
          "x-arrumae-timestamp": String(timestamp),
          "x-arrumae-signature": signWebhook(cfg.webhookSecret, timestamp, body),
        },
        body,
        signal: AbortSignal.timeout(TIMEOUT_MS),
        redirect: "error",
      });
      if (!res.ok) error = `HTTP ${res.status}`;
    } catch (e) {
      error = e instanceof Error ? `${e.name}: ${e.message}`.slice(0, 300) : "erro desconhecido";
    }

    if (!error) {
      await db
        .update(integrationEvents)
        .set({ status: "delivered", deliveredAt: new Date(), lastError: null })
        .where(eq(integrationEvents.id, ev.id));
      result.delivered++;
    } else if (ev.attempts >= MAX_ATTEMPTS) {
      await db.update(integrationEvents).set({ status: "failed", lastError: error }).where(eq(integrationEvents.id, ev.id));
      result.failed++;
    } else {
      await db
        .update(integrationEvents)
        .set({ lastError: error, nextAttemptAt: new Date(now.getTime() + retryDelayMs(ev.attempts)) })
        .where(eq(integrationEvents.id, ev.id));
      result.retrying++;
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// Alertas derivados e retenção (rodam no job de manutenção)
// ---------------------------------------------------------------------------

/** Solicitações abertas há mais de STALE_REQUEST_MINUTES sem proposta pendente: um alerta por solicitação. */
export async function detectStaleRequests(now = new Date()) {
  const rows = await db.execute<{ id: string; minutes_open: number; invited_pros: number }>(sql`
    select r.id,
           floor(extract(epoch from (${now.toISOString()}::timestamptz - r.created_at)) / 60)::int as minutes_open,
           (select count(*) from request_invitations i where i.request_id = r.id)::int as invited_pros
      from service_requests r
     where r.status = 'open'
       and r.created_at <= ${new Date(now.getTime() - STALE_REQUEST_MINUTES * 60_000).toISOString()}::timestamptz
       and r.created_at >= ${new Date(now.getTime() - 7 * 86400_000).toISOString()}::timestamptz
       and not exists (select 1 from quotes q where q.request_id = r.id and q.status = 'pending')
       and not exists (select 1 from integration_events e where e.dedupe_key = 'request.stale:' || r.id::text)
     limit 200`);
  let emitted = 0;
  for (const row of rows) {
    const [r] = await db.select().from(serviceRequests).where(eq(serviceRequests.id, row.id));
    if (!r) continue;
    await emitIntegrationEvent(
      db,
      "request.stale",
      { ...(await requestRefs(db, r)), minutesOpen: row.minutes_open, invitedPros: row.invited_pros, pendingQuotes: 0 },
      { dedupeKey: `request.stale:${r.id}` },
    );
    emitted++;
  }
  return emitted;
}

/** Entregues/falhos somem após 30 dias; pendentes há mais de 7 dias (sem destino configurado) viram falha. */
export async function purgeIntegrationEvents(now = new Date()) {
  const cut30 = new Date(now.getTime() - 30 * 86400_000).toISOString();
  const cut7 = new Date(now.getTime() - 7 * 86400_000).toISOString();
  await db.execute(sql`
    update integration_events set status = 'failed', last_error = coalesce(last_error, 'expirou sem envio (7 dias)')
     where status = 'pending' and created_at < ${cut7}::timestamptz`);
  await db.execute(sql`
    delete from integration_events
     where status in ('delivered', 'failed') and created_at < ${cut30}::timestamptz`);
}

// ---------------------------------------------------------------------------
// Painel admin
// ---------------------------------------------------------------------------

function requireAdmin(actor: Actor) {
  if (actor.kind !== "user" || actor.role !== "admin") throw forbidden();
}

export async function listIntegrationEvents(actor: Actor, limit = 100) {
  requireAdmin(actor);
  const [counts] = await db.execute<{ pending: number; delivered: number; failed: number }>(sql`
    select count(*) filter (where status = 'pending')::int as pending,
           count(*) filter (where status = 'delivered')::int as delivered,
           count(*) filter (where status = 'failed')::int as failed
      from integration_events`);
  const events = await db.select().from(integrationEvents).orderBy(desc(integrationEvents.createdAt)).limit(limit);
  const cfg = integrationConfig();
  return {
    counts,
    events,
    config: { webhook: !!cfg.webhookUrl, api: !!cfg.apiToken, problems: cfg.problems },
  };
}

/** Recoloca eventos que falharam na fila (ex.: depois de corrigir o workflow no n8n). */
export async function retryFailedIntegrationEvents(actor: Actor) {
  requireAdmin(actor);
  return db.transaction(async (tx) => {
    const rows = await tx
      .update(integrationEvents)
      .set({ status: "pending", attempts: 0, nextAttemptAt: new Date(), lastError: null })
      .where(eq(integrationEvents.status, "failed"))
      .returning({ id: integrationEvents.id });
    await audit(tx, actor, "integration.retry_failed", "integration_events", null, { count: rows.length });
    return rows.length;
  });
}

// ---------------------------------------------------------------------------
// Leitura para integrações (API /api/integrations/v1/metrics) — só views de `reporting`
// ---------------------------------------------------------------------------

/** Resumo do período (últimos `days` dias, fuso de São Paulo). Nada de dados pessoais. */
export async function getReportingSnapshot(days: number) {
  const span = Math.min(Math.max(Math.trunc(days) || 1, 1), 90);
  const since = sql`((now() at time zone 'America/Sao_Paulo')::date - ${span - 1}::int)`;
  const [funnel] = await db.execute<Record<string, number | null>>(sql`
    select count(*)::int as created,
           count(*) filter (where quotes_count > 0)::int as with_quote,
           count(*) filter (where status in ('scheduled','in_progress','awaiting_confirmation','completed','disputed'))::int as booked,
           count(*) filter (where status = 'completed')::int as completed,
           count(*) filter (where status = 'cancelled')::int as cancelled,
           count(*) filter (where status = 'expired')::int as expired,
           count(*) filter (where status = 'disputed')::int as disputed,
           count(*) filter (where status = 'open')::int as open,
           (percentile_cont(0.5) within group (order by minutes_to_first_quote))::int as median_minutes_to_first_quote
      from reporting.requests where created_day >= ${since}`);
  const byCategory = await db.execute<{ category: string; name: string; created: number }>(sql`
    select category_slug as category, category_name as name, count(*)::int as created
      from reporting.requests where created_day >= ${since}
     group by category_slug, category_name order by created desc`);
  const [finance] = await db.execute<{ services: number; gross_cents: number; commission_cents: number }>(sql`
    select count(*)::int as services,
           coalesce(sum(gross_cents), 0)::bigint as gross_cents,
           coalesce(sum(commission_cents) filter (where status <> 'waived'), 0)::bigint as commission_cents
      from reporting.settlements where day >= ${since}`);
  const pros = await db.execute<{ verification_status: string; pros: number }>(sql`select * from reporting.pro_pipeline`);
  const tickets = await db.execute<{ category: string; priority: string; status: string; tickets: number }>(
    sql`select * from reporting.open_tickets`,
  );
  const stale = await db.execute<Record<string, unknown>>(sql`
    select id, created_at, minutes_open, category_slug, category_name, region_slug, region_name, urgency, invited_pros
      from reporting.stale_open_requests order by created_at limit 20`);
  const [queue] = await db.execute<{ pending: number; failed: number }>(sql`
    select count(*) filter (where status = 'pending')::int as pending,
           count(*) filter (where status = 'failed')::int as failed from integration_events`);
  return {
    periodDays: span,
    generatedAt: new Date().toISOString(),
    requests: funnel,
    byCategory: [...byCategory],
    finance: { services: Number(finance.services), grossCents: Number(finance.gross_cents), commissionCents: Number(finance.commission_cents) },
    pros: Object.fromEntries([...pros].map((p) => [p.verification_status, p.pros])),
    openTickets: [...tickets],
    staleOpenRequests: [...stale].map((s) => ({ ...s, adminUrl: requestAdminUrl(String(s.id)) })),
    integrationQueue: queue,
  };
}
