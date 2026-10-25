import "server-only";
import { and, asc, desc, eq, or } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/client";
import { serviceRequests, supportTickets, ticketMessages, users } from "../db/schema";
import type { Actor } from "../domain/actor";
import { forbidden, invalid, notFound } from "../domain/errors";
import { enforceRateLimit, LIMITS } from "../security/rate-limit";
import { fieldErrorsFrom } from "./accounts";
import { audit } from "./audit";
import { emitIntegrationEvent, ticketAdminUrl } from "./integrations";
import { notify } from "./notifications";

export const ticketSchema = z.object({
  category: z.enum(["question", "complaint", "payment", "safety", "account"]),
  subject: z.string().trim().min(5, "Informe um assunto.").max(120),
  body: z.string().trim().min(10, "Descreva o que aconteceu (mín. 10 caracteres).").max(4000),
  requestId: z.uuid().optional(),
});

/** Prioridade automática simples; a equipe pode ajustar. Segurança é sempre urgente. */
function priorityFor(category: z.infer<typeof ticketSchema>["category"]) {
  return category === "safety" ? "urgent" : category === "complaint" || category === "payment" ? "high" : "normal";
}

export async function openTicket(actor: Actor, input: z.input<typeof ticketSchema>) {
  if (actor.kind !== "user") throw forbidden();
  const parsed = ticketSchema.safeParse(input);
  if (!parsed.success) throw invalid("Revise os campos destacados.", fieldErrorsFrom(parsed.error));
  const d = parsed.data;
  await enforceRateLimit("ticket", actor.id, LIMITS.ticket.limit, LIMITS.ticket.window);
  if (d.requestId) {
    const [r] = await db
      .select({ clientId: serviceRequests.clientId, proId: serviceRequests.proId })
      .from(serviceRequests)
      .where(eq(serviceRequests.id, d.requestId));
    if (!r || (r.clientId !== actor.id && r.proId !== actor.id)) throw notFound("Solicitação");
  }
  return db.transaction(async (tx) => {
    const [t] = await tx
      .insert(supportTickets)
      .values({
        openerId: actor.id,
        requestId: d.requestId,
        category: d.category,
        subject: d.subject,
        priority: priorityFor(d.category),
      })
      .returning({ id: supportTickets.id });
    await tx.insert(ticketMessages).values({ ticketId: t.id, authorId: actor.id, body: d.body });
    await emitIntegrationEvent(tx, "support.ticket_opened", {
      ticketId: t.id,
      category: d.category,
      priority: priorityFor(d.category),
      requestId: d.requestId ?? null,
      openerRole: actor.role,
      adminUrl: ticketAdminUrl(t.id),
    });
    const admins = await tx
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.role, "admin"), eq(users.status, "active")));
    for (const a of admins)
      await notify(tx, a.id, { type: "ticket_opened", title: `Novo chamado: ${d.subject}`, body: d.category, link: `/admin/suporte/${t.id}` });
    return t.id;
  });
}

export async function listMyTickets(actor: Actor) {
  if (actor.kind !== "user") throw forbidden();
  return db.select().from(supportTickets).where(eq(supportTickets.openerId, actor.id)).orderBy(desc(supportTickets.createdAt));
}

export async function getTicket(actor: Actor, ticketId: string) {
  if (actor.kind !== "user" || !z.uuid().safeParse(ticketId).success) throw notFound("Chamado");
  const [t] = await db.select().from(supportTickets).where(eq(supportTickets.id, ticketId));
  if (!t || (actor.role !== "admin" && t.openerId !== actor.id)) throw notFound("Chamado");
  const msgs = await db
    .select({
      id: ticketMessages.id,
      body: ticketMessages.body,
      internal: ticketMessages.internal,
      createdAt: ticketMessages.createdAt,
      authorId: ticketMessages.authorId,
      authorName: users.name,
      authorRole: users.role,
    })
    .from(ticketMessages)
    .innerJoin(users, eq(users.id, ticketMessages.authorId))
    .where(
      actor.role === "admin"
        ? eq(ticketMessages.ticketId, t.id)
        : and(eq(ticketMessages.ticketId, t.id), eq(ticketMessages.internal, false)),
    )
    .orderBy(asc(ticketMessages.createdAt));
  return { ticket: t, messages: msgs };
}

export async function replyTicket(actor: Actor, ticketId: string, bodyInput: string, internal = false) {
  if (actor.kind !== "user") throw forbidden();
  const body = bodyInput.trim();
  if (body.length < 2 || body.length > 4000) throw invalid("Mensagem inválida.");
  const { ticket } = await getTicket(actor, ticketId);
  const isAdmin = actor.role === "admin";
  if (internal && !isAdmin) throw forbidden();
  if (!isAdmin && ticket.status === "closed") throw invalid("Este chamado foi encerrado. Abra um novo, se precisar.");
  await enforceRateLimit("ticket_reply", actor.id, 30, 600);
  await db.transaction(async (tx) => {
    await tx.insert(ticketMessages).values({ ticketId, authorId: actor.id, body, internal });
    if (!internal) {
      await tx
        .update(supportTickets)
        .set({ status: isAdmin ? "waiting_user" : "open", updatedAt: new Date() })
        .where(eq(supportTickets.id, ticketId));
      if (isAdmin)
        await notify(
          tx,
          ticket.openerId,
          { type: "ticket_reply", title: "O suporte respondeu seu chamado", body: ticket.subject, link: `/suporte/${ticketId}` },
          { email: true },
        );
    }
    if (isAdmin) await audit(tx, actor, internal ? "ticket.note" : "ticket.reply", "support_ticket", ticketId);
  });
}

export async function updateTicket(
  actor: Actor,
  ticketId: string,
  patch: { status?: (typeof supportTickets.$inferSelect)["status"]; priority?: (typeof supportTickets.$inferSelect)["priority"]; assignToMe?: boolean },
) {
  if (actor.kind !== "user" || actor.role !== "admin") throw forbidden();
  const set: Partial<typeof supportTickets.$inferInsert> = { updatedAt: new Date() };
  if (patch.status) {
    set.status = patch.status;
    if (patch.status === "resolved" || patch.status === "closed") set.resolvedAt = new Date();
  }
  if (patch.priority) set.priority = patch.priority;
  if (patch.assignToMe) set.assignedTo = actor.id;
  const updated = await db.update(supportTickets).set(set).where(eq(supportTickets.id, ticketId)).returning();
  if (!updated.length) throw notFound("Chamado");
  await audit(db, actor, "ticket.update", "support_ticket", ticketId, patch);
}

export async function listTicketsForAdmin(filter: "open" | "all" = "open") {
  return db
    .select({ ticket: supportTickets, openerName: users.name, openerRole: users.role })
    .from(supportTickets)
    .innerJoin(users, eq(users.id, supportTickets.openerId))
    .where(
      filter === "open"
        ? or(eq(supportTickets.status, "open"), eq(supportTickets.status, "in_progress"), eq(supportTickets.status, "waiting_user"))
        : undefined,
    )
    .orderBy(desc(supportTickets.priority), desc(supportTickets.createdAt))
    .limit(200);
}
