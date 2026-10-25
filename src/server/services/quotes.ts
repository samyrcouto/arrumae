import "server-only";
import { and, asc, eq, inArray, ne, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/client";
import {
  categories,
  messages,
  priceRevisions,
  proProfiles,
  quotes,
  requestEvents,
  requestInvitations,
  serviceRequests,
  users,
  type QuoteSlot,
} from "../db/schema";
import type { Actor } from "../domain/actor";
import { maskContacts } from "../domain/contact-masking";
import { conflict, forbidden, invalid, notFound } from "../domain/errors";
import { checkActionGuards } from "../domain/request-lifecycle";
import { enforceRateLimit, LIMITS } from "../security/rate-limit";
import { fieldErrorsFrom } from "./accounts";
import { trackServer } from "./analytics";
import { notify } from "./notifications";
import { emitIntegrationEvent, requestAdminUrl, requestRefs } from "./integrations";
import { getSettings } from "./settings";

const HOUR = 3600_000;

export const quoteSchema = z
  .object({
    requestId: z.uuid(),
    kind: z.enum(["fixed", "visit"]),
    amountCents: z.number().int().min(2000, "Valor mínimo de R$ 20,00.").max(5_000_000).nullable(),
    visitFeeCents: z.number().int().min(0).max(50_000, "Taxa de visita máxima de R$ 500,00.").nullable(),
    estimateMinCents: z.number().int().min(0).max(5_000_000).nullable(),
    estimateMaxCents: z.number().int().min(0).max(5_000_000).nullable(),
    message: z.string().trim().min(10, "Explique o que está incluído (mín. 10 caracteres).").max(1500),
    slots: z
      .array(z.object({ start: z.date(), end: z.date() }))
      .min(1, "Ofereça pelo menos um horário.")
      .max(3, "Ofereça até 3 horários."),
  })
  .superRefine((q, ctx) => {
    if (q.kind === "fixed" && q.amountCents === null)
      ctx.addIssue({ code: "custom", path: ["amountCents"], message: "Informe o preço total." });
    if (q.kind === "visit" && q.visitFeeCents === null)
      ctx.addIssue({ code: "custom", path: ["visitFeeCents"], message: "Informe a taxa de visita (pode ser R$ 0)." });
    if (q.estimateMinCents !== null && q.estimateMaxCents !== null && q.estimateMinCents > q.estimateMaxCents)
      ctx.addIssue({ code: "custom", path: ["estimateMaxCents"], message: "O máximo precisa ser maior que o mínimo." });
    const now = Date.now();
    for (const s of q.slots) {
      if (s.start.getTime() < now + HOUR)
        ctx.addIssue({ code: "custom", path: ["slots"], message: "Horários precisam começar daqui a pelo menos 1 hora." });
      else if (s.start.getTime() > now + 30 * 24 * HOUR)
        ctx.addIssue({ code: "custom", path: ["slots"], message: "Ofereça horários nos próximos 30 dias." });
      const duration = s.end.getTime() - s.start.getTime();
      if (duration <= 0 || duration > 10 * HOUR)
        ctx.addIssue({ code: "custom", path: ["slots"], message: "Cada horário precisa ter fim depois do início (máx. 10h)." });
    }
  });
export type QuoteInput = z.input<typeof quoteSchema>;

/** Envia (ou atualiza) a proposta do profissional para uma solicitação. */
export async function submitQuote(actor: Actor, input: QuoteInput) {
  if (actor.kind !== "user" || actor.role !== "pro") throw forbidden();
  const parsed = quoteSchema.safeParse(input);
  if (!parsed.success) throw invalid("Revise os campos destacados.", fieldErrorsFrom(parsed.error));
  const q = parsed.data;
  await enforceRateLimit("quote", actor.id, LIMITS.quote.limit, LIMITS.quote.window);
  const settings = await getSettings();

  const result = await db.transaction(async (tx) => {
    const [pro] = await tx
      .select({ status: proProfiles.verificationStatus, userStatus: users.status })
      .from(proProfiles)
      .innerJoin(users, eq(users.id, proProfiles.userId))
      .where(eq(proProfiles.userId, actor.id));
    if (!pro || pro.status !== "approved" || pro.userStatus !== "active")
      throw forbidden("Seu perfil precisa estar aprovado para enviar propostas.");

    // Trava a solicitação para contar propostas sem corrida.
    const [r] = await tx.select().from(serviceRequests).where(eq(serviceRequests.id, q.requestId)).for("update");
    if (!r) throw notFound("Solicitação");
    const [inv] = await tx
      .select()
      .from(requestInvitations)
      .where(and(eq(requestInvitations.requestId, r.id), eq(requestInvitations.proId, actor.id)));
    if (!inv) throw notFound("Solicitação");
    if (r.status !== "open" || r.expiresAt <= new Date()) throw conflict("Esta solicitação não está mais recebendo propostas.");

    const [cat] = await tx.select().from(categories).where(eq(categories.id, r.categoryId));
    if (cat?.pricingMode === "visit_required" && q.kind !== "visit")
      throw invalid("Este tipo de serviço exige visita técnica antes do preço final.", {
        kind: "Este serviço exige visita técnica.",
      });

    const [existing] = await tx
      .select()
      .from(quotes)
      .where(and(eq(quotes.requestId, r.id), eq(quotes.proId, actor.id)));
    if (existing && (existing.status === "rejected" || existing.status === "cancelled"))
      throw conflict("Você não pode enviar nova proposta para esta solicitação.");

    const active = await tx
      .select({ n: sql<number>`count(*)::int` })
      .from(quotes)
      .where(and(eq(quotes.requestId, r.id), eq(quotes.status, "pending"), ne(quotes.proId, actor.id)));
    if ((active[0]?.n ?? 0) >= settings.maxQuotesPerRequest)
      throw conflict("Esta solicitação já recebeu o número máximo de propostas.");

    const values = {
      kind: q.kind,
      amountCents: q.kind === "fixed" ? q.amountCents : null,
      visitFeeCents: q.kind === "visit" ? q.visitFeeCents : null,
      estimateMinCents: q.kind === "visit" ? q.estimateMinCents : null,
      estimateMaxCents: q.kind === "visit" ? q.estimateMaxCents : null,
      message: maskContacts(q.message).text,
      slots: q.slots.map((s) => ({ start: s.start.toISOString(), end: s.end.toISOString() })),
      status: "pending" as const,
      validUntil: new Date(Math.min(Date.now() + settings.quoteValidityHours * HOUR, q.slots[0].start.getTime())),
      updatedAt: new Date(),
    };
    let quoteId: string;
    if (existing) {
      await tx.update(quotes).set(values).where(eq(quotes.id, existing.id));
      quoteId = existing.id;
    } else {
      const [created] = await tx
        .insert(quotes)
        .values({ ...values, requestId: r.id, proId: actor.id })
        .returning({ id: quotes.id });
      quoteId = created.id;
    }
    await tx.insert(requestEvents).values({
      requestId: r.id,
      type: existing ? "quote_updated" : "quote_submitted",
      actorId: actor.id,
      actorRole: "pro",
      data: { quoteId },
    });
    await emitIntegrationEvent(tx, "quote.submitted", {
      requestId: r.id,
      quoteId,
      kind: values.kind,
      updated: !!existing,
      amountCents: values.amountCents,
      visitFeeCents: values.visitFeeCents,
      adminUrl: requestAdminUrl(r.id),
    });
    await notify(
      tx,
      r.clientId,
      {
        type: "quote_received",
        title: existing ? "Uma proposta foi atualizada" : "Você recebeu uma proposta",
        body: r.title,
        link: `/cliente/solicitacoes/${r.id}`,
      },
      { email: true },
    );
    return { quoteId, created: !existing };
  });
  if (result.created) await trackServer("quote_submitted", { userId: actor.id, props: { kind: q.kind } });
  return result;
}

export async function withdrawQuote(actor: Actor, quoteId: string) {
  if (actor.kind !== "user" || actor.role !== "pro") throw forbidden();
  const updated = await db
    .update(quotes)
    .set({ status: "withdrawn", updatedAt: new Date() })
    .where(and(eq(quotes.id, quoteId), eq(quotes.proId, actor.id), eq(quotes.status, "pending")))
    .returning();
  if (!updated.length) throw conflict("Esta proposta não pode mais ser retirada.");
}

export async function rejectQuote(actor: Actor, quoteId: string) {
  if (actor.kind !== "user" || actor.role !== "client") throw forbidden();
  await db.transaction(async (tx) => {
    const [row] = await tx
      .select({ quote: quotes, clientId: serviceRequests.clientId, title: serviceRequests.title })
      .from(quotes)
      .innerJoin(serviceRequests, eq(serviceRequests.id, quotes.requestId))
      .where(eq(quotes.id, quoteId));
    if (!row || row.clientId !== actor.id) throw notFound("Proposta");
    const updated = await tx
      .update(quotes)
      .set({ status: "rejected", updatedAt: new Date() })
      .where(and(eq(quotes.id, quoteId), eq(quotes.status, "pending")))
      .returning();
    if (!updated.length) throw conflict("Esta proposta não está mais disponível.");
    await notify(tx, row.quote.proId, {
      type: "quote_rejected",
      title: "Proposta recusada pelo cliente",
      body: row.title,
      link: `/profissional/oportunidades/${row.quote.requestId}`,
    });
  });
}

/**
 * Aceite de proposta. Executado sob lock da solicitação: duas abas aceitando
 * propostas diferentes ao mesmo tempo resultam em apenas um aceite.
 */
export async function acceptQuote(actor: Actor, input: { quoteId: string; slotIndex: number }) {
  if (actor.kind !== "user" || actor.role !== "client") throw forbidden();
  const res = await db.transaction(async (tx) => {
    const [q] = await tx.select().from(quotes).where(eq(quotes.id, input.quoteId));
    if (!q) throw notFound("Proposta");
    const [r] = await tx.select().from(serviceRequests).where(eq(serviceRequests.id, q.requestId)).for("update");
    if (!r || r.clientId !== actor.id) throw notFound("Proposta");

    const now = new Date();
    const guard = checkActionGuards(
      "accept_quote",
      {
        status: r.status,
        clientId: r.clientId,
        proId: r.proId,
        scheduledStart: r.scheduledStart,
        completedAt: r.completedAt,
        expiresAt: r.expiresAt,
        hasPendingRevision: false,
        autoConfirmHours: 72,
      },
      { role: "client", id: actor.id },
      now,
    );
    if (!guard.ok) throw conflict(guard.reason);

    // Relê a proposta já com a solicitação travada.
    const [fresh] = await tx.select().from(quotes).where(eq(quotes.id, q.id));
    if (fresh.status !== "pending") throw conflict("Esta proposta não está mais disponível.");
    if (fresh.validUntil <= now) throw conflict("Esta proposta expirou. Peça ao profissional para atualizá-la.");
    const slot: QuoteSlot | undefined = fresh.slots[input.slotIndex];
    if (!slot) throw invalid("Escolha um dos horários oferecidos.");
    if (new Date(slot.start) <= now) throw conflict("Este horário já passou. Escolha outro.");

    const [pro] = await tx
      .select({ status: proProfiles.verificationStatus, userStatus: users.status })
      .from(proProfiles)
      .innerJoin(users, eq(users.id, proProfiles.userId))
      .where(eq(proProfiles.userId, fresh.proId));
    if (!pro || pro.status !== "approved" || pro.userStatus !== "active")
      throw conflict("Este profissional não está disponível no momento.");

    const agreed = fresh.kind === "fixed" ? fresh.amountCents! : fresh.visitFeeCents!;
    const updated = await tx
      .update(serviceRequests)
      .set({
        status: "scheduled",
        proId: fresh.proId,
        acceptedQuoteId: fresh.id,
        scheduledStart: new Date(slot.start),
        scheduledEnd: new Date(slot.end),
        agreedAmountCents: agreed,
        updatedAt: now,
      })
      .where(and(eq(serviceRequests.id, r.id), eq(serviceRequests.status, "open")))
      .returning();
    if (!updated.length) throw conflict("A solicitação mudou enquanto você agia. Atualize a página.");

    await tx.update(quotes).set({ status: "accepted", selectedSlot: slot, updatedAt: now }).where(eq(quotes.id, fresh.id));
    const superseded = await tx
      .update(quotes)
      .set({ status: "superseded", updatedAt: now })
      .where(and(eq(quotes.requestId, r.id), eq(quotes.status, "pending")))
      .returning({ proId: quotes.proId });

    await tx.insert(requestEvents).values({
      requestId: r.id,
      type: "accept_quote",
      fromStatus: "open",
      toStatus: "scheduled",
      actorId: actor.id,
      actorRole: "client",
      data: { quoteId: fresh.id, slot },
    });
    await emitIntegrationEvent(tx, "request.status_changed", {
      ...(await requestRefs(tx, updated[0])),
      action: "accept_quote",
      from: "open",
      to: "scheduled",
      actorRole: "client",
      quoteId: fresh.id,
      quoteKind: fresh.kind,
      agreedAmountCents: agreed,
      scheduledStart: slot.start,
    });
    await notify(
      tx,
      fresh.proId,
      {
        type: "quote_accepted",
        title: "Sua proposta foi aceita!",
        body: `${r.title}. O endereço completo e o contato do cliente já estão disponíveis.`,
        link: `/profissional/oportunidades/${r.id}`,
      },
      { email: true },
    );
    for (const s of superseded)
      await notify(tx, s.proId, {
        type: "quote_superseded",
        title: "O cliente escolheu outra proposta",
        body: r.title,
        link: `/profissional/oportunidades/${r.id}`,
      });
    return { requestId: r.id, kind: fresh.kind };
  });
  await trackServer("quote_accepted", { userId: actor.id, props: { kind: res.kind } });
  return res;
}

// ---------------------------------------------------------------------------
// Mensagens entre cliente e profissional (por proposta)
// ---------------------------------------------------------------------------

async function quoteParticipants(quoteId: string) {
  const [row] = await db
    .select({
      quoteId: quotes.id,
      proId: quotes.proId,
      clientId: serviceRequests.clientId,
      requestId: serviceRequests.id,
      requestStatus: serviceRequests.status,
      assignedProId: serviceRequests.proId,
      title: serviceRequests.title,
    })
    .from(quotes)
    .innerJoin(serviceRequests, eq(serviceRequests.id, quotes.requestId))
    .where(eq(quotes.id, quoteId));
  return row ?? null;
}

function canAccessThread(actor: Actor, p: NonNullable<Awaited<ReturnType<typeof quoteParticipants>>>) {
  if (actor.kind !== "user") return false;
  return actor.role === "admin" || actor.id === p.clientId || actor.id === p.proId;
}

export async function listMessages(actor: Actor, quoteId: string) {
  const p = z.uuid().safeParse(quoteId).success ? await quoteParticipants(quoteId) : null;
  if (!p || !canAccessThread(actor, p)) throw notFound("Conversa");
  return db
    .select({ id: messages.id, body: messages.body, senderId: messages.senderId, createdAt: messages.createdAt })
    .from(messages)
    .where(eq(messages.quoteId, quoteId))
    .orderBy(asc(messages.createdAt));
}

export async function sendMessage(actor: Actor, quoteId: string, bodyInput: string) {
  const p = z.uuid().safeParse(quoteId).success ? await quoteParticipants(quoteId) : null;
  if (!p || !canAccessThread(actor, p) || actor.kind !== "user" || actor.role === "admin") throw notFound("Conversa");
  const body = bodyInput.trim();
  if (body.length < 1 || body.length > 1000) throw invalid("A mensagem precisa ter entre 1 e 1000 caracteres.");
  if (["cancelled", "expired"].includes(p.requestStatus)) throw conflict("Esta conversa foi encerrada.");
  if (p.requestStatus !== "open" && p.assignedProId !== p.proId)
    throw conflict("O cliente escolheu outra proposta. Esta conversa foi encerrada.");
  await enforceRateLimit("message", actor.id, LIMITS.message.limit, LIMITS.message.window);
  // Contato liberado somente entre cliente e profissional designado após o agendamento.
  const contactAllowed = p.assignedProId === p.proId && p.requestStatus !== "open";
  const finalBody = contactAllowed ? body : maskContacts(body).text;
  await db.transaction(async (tx) => {
    await tx.insert(messages).values({ quoteId, senderId: actor.id, body: finalBody });
    const recipient = actor.id === p.clientId ? p.proId : p.clientId;
    await notify(tx, recipient, {
      type: "message",
      title: "Nova mensagem",
      body: p.title,
      link: actor.id === p.clientId ? `/profissional/oportunidades/${p.requestId}` : `/cliente/solicitacoes/${p.requestId}`,
    });
  });
}

// ---------------------------------------------------------------------------
// Revisão de preço durante o atendimento (aditivo)
// ---------------------------------------------------------------------------

export async function proposePriceRevision(actor: Actor, input: { requestId: string; newAmountCents: number; reason: string }) {
  if (actor.kind !== "user" || actor.role !== "pro") throw forbidden();
  const reason = input.reason.trim();
  if (reason.length < 10) throw invalid("Explique o motivo da alteração (mín. 10 caracteres).", { reason: "Explique o motivo." });
  if (!Number.isInteger(input.newAmountCents) || input.newAmountCents < 1000 || input.newAmountCents > 5_000_000)
    throw invalid("Valor inválido.", { newAmountCents: "Informe um valor entre R$ 10 e R$ 50.000." });
  await db.transaction(async (tx) => {
    const [r] = await tx.select().from(serviceRequests).where(eq(serviceRequests.id, input.requestId)).for("update");
    if (!r || r.proId !== actor.id) throw notFound("Solicitação");
    if (r.status !== "in_progress") throw conflict("Alterações de preço só podem ser propostas durante o atendimento.");
    const pending = await tx
      .select({ id: priceRevisions.id })
      .from(priceRevisions)
      .where(and(eq(priceRevisions.requestId, r.id), eq(priceRevisions.status, "pending")));
    if (pending.length) throw conflict("Já existe uma alteração aguardando o cliente.");
    await tx.insert(priceRevisions).values({
      requestId: r.id,
      proposedBy: actor.id,
      previousAmountCents: r.agreedAmountCents ?? 0,
      newAmountCents: input.newAmountCents,
      reason: maskContacts(reason).text,
    });
    await tx.insert(requestEvents).values({
      requestId: r.id,
      type: "price_revision_proposed",
      actorId: actor.id,
      actorRole: "pro",
      data: { from: r.agreedAmountCents, to: input.newAmountCents },
    });
    await notify(
      tx,
      r.clientId,
      {
        type: "price_revision",
        title: "O profissional propôs um novo valor",
        body: "Revise e aprove ou recuse antes de o serviço continuar.",
        link: `/cliente/solicitacoes/${r.id}`,
      },
      { email: true },
    );
  });
}

export async function decidePriceRevision(actor: Actor, revisionId: string, approve: boolean) {
  if (actor.kind !== "user" || actor.role !== "client") throw forbidden();
  await db.transaction(async (tx) => {
    const [rev] = await tx.select().from(priceRevisions).where(eq(priceRevisions.id, revisionId));
    if (!rev) throw notFound("Alteração");
    const [r] = await tx.select().from(serviceRequests).where(eq(serviceRequests.id, rev.requestId)).for("update");
    if (!r || r.clientId !== actor.id) throw notFound("Alteração");
    const updated = await tx
      .update(priceRevisions)
      .set({ status: approve ? "approved" : "rejected", decidedAt: new Date() })
      .where(and(eq(priceRevisions.id, rev.id), eq(priceRevisions.status, "pending")))
      .returning();
    if (!updated.length) throw conflict("Esta alteração já foi respondida.");
    if (approve) {
      const ok = await tx
        .update(serviceRequests)
        .set({ agreedAmountCents: rev.newAmountCents, updatedAt: new Date() })
        .where(and(eq(serviceRequests.id, r.id), inArray(serviceRequests.status, ["in_progress"])))
        .returning();
      if (!ok.length) throw conflict("O atendimento não está mais em andamento.");
    }
    await tx.insert(requestEvents).values({
      requestId: r.id,
      type: approve ? "price_revision_approved" : "price_revision_rejected",
      actorId: actor.id,
      actorRole: "client",
      data: { to: rev.newAmountCents },
    });
    if (r.proId)
      await notify(tx, r.proId, {
        type: "price_revision_decided",
        title: approve ? "Cliente aprovou o novo valor" : "Cliente recusou o novo valor",
        body: approve
          ? "Você pode continuar o serviço."
          : "Mantenha o valor combinado ou conclua apenas o que foi acordado. Em caso de impasse, abra uma contestação.",
        link: `/profissional/oportunidades/${r.id}`,
      });
  });
}
