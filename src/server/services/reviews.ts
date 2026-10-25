import "server-only";
import { and, desc, eq } from "drizzle-orm";
import { db } from "../db/client";
import { proProfiles, reviews, serviceRequests, supportTickets, ticketMessages, users } from "../db/schema";
import type { Actor } from "../domain/actor";
import { conflict, forbidden, invalid, notFound } from "../domain/errors";
import { trackServer } from "./analytics";
import { audit } from "./audit";
import { emitIntegrationEvent } from "./integrations";
import { notify } from "./notifications";

/**
 * Avaliação do cliente. Só é possível para solicitação CONCLUÍDA do próprio
 * cliente, uma única vez (unique em reviews.request_id). Nota e comentário
 * são imutáveis (trigger no banco); a moderação altera apenas o status.
 */
export async function createReview(actor: Actor, input: { requestId: string; rating: number; comment: string }) {
  if (actor.kind !== "user" || actor.role !== "client") throw forbidden();
  const rating = Number(input.rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) throw invalid("Escolha uma nota de 1 a 5.", { rating: "Escolha uma nota." });
  const comment = input.comment.trim();
  if (comment.length > 1000) throw invalid("Comentário muito longo (máx. 1000 caracteres).");

  await db.transaction(async (tx) => {
    const [r] = await tx.select().from(serviceRequests).where(eq(serviceRequests.id, input.requestId)).for("update");
    if (!r || r.clientId !== actor.id) throw notFound("Solicitação");
    if (r.status !== "completed" || !r.proId) throw conflict("Só é possível avaliar serviços concluídos.");
    const inserted = await tx
      .insert(reviews)
      .values({ requestId: r.id, proId: r.proId, clientId: actor.id, rating, comment })
      .onConflictDoNothing({ target: reviews.requestId })
      .returning({ id: reviews.id });
    if (!inserted.length) throw conflict("Você já avaliou este serviço.");
    await emitIntegrationEvent(tx, "review.created", {
      requestId: r.id,
      reviewId: inserted[0].id,
      rating,
      hasComment: comment.length > 0,
      isDemo: r.isDemo,
    });
    await notify(tx, r.proId, {
      type: "review_received",
      title: "Você recebeu uma avaliação",
      body: `${rating} de 5 estrelas — ${r.title}`,
      link: "/profissional/avaliacoes",
    });
  });
  await trackServer("review_created", { userId: actor.id, props: { rating } });
}

export async function getReviewForRequest(requestId: string) {
  const [r] = await db.select().from(reviews).where(eq(reviews.requestId, requestId));
  return r ?? null;
}

/** Profissional denuncia uma avaliação suspeita → vai para moderação humana. */
export async function flagReview(actor: Actor, reviewId: string, reasonInput: string) {
  if (actor.kind !== "user" || actor.role !== "pro") throw forbidden();
  const reason = reasonInput.trim();
  if (reason.length < 10) throw invalid("Explique o motivo da denúncia (mín. 10 caracteres).");
  await db.transaction(async (tx) => {
    const [rev] = await tx.select().from(reviews).where(eq(reviews.id, reviewId));
    if (!rev || rev.proId !== actor.id) throw notFound("Avaliação");
    const updated = await tx
      .update(reviews)
      .set({ status: "flagged", flagReason: reason.slice(0, 1000) })
      .where(and(eq(reviews.id, rev.id), eq(reviews.status, "published")))
      .returning();
    if (!updated.length) throw conflict("Esta avaliação já está em análise ou foi moderada.");
    const [t] = await tx
      .insert(supportTickets)
      .values({
        openerId: actor.id,
        reviewId: rev.id,
        requestId: rev.requestId,
        category: "review_report",
        subject: "Denúncia de avaliação",
      })
      .returning({ id: supportTickets.id });
    await tx.insert(ticketMessages).values({ ticketId: t.id, authorId: actor.id, body: reason });
  });
}

/** Moderação (admin). Ocultar não apaga: a avaliação deixa de contar na nota pública. */
export async function moderateReview(actor: Actor, reviewId: string, status: "published" | "hidden", note: string) {
  if (actor.kind !== "user" || actor.role !== "admin") throw forbidden();
  if (note.trim().length < 5) throw invalid("Registre o motivo da decisão.");
  const updated = await db
    .update(reviews)
    .set({ status, moderationNote: note.trim().slice(0, 1000) })
    .where(eq(reviews.id, reviewId))
    .returning();
  if (!updated.length) throw notFound("Avaliação");
  await audit(db, actor, "review.moderate", "review", reviewId, { status, note });
}

export async function listReviewsForPro(actor: Actor) {
  if (actor.kind !== "user" || actor.role !== "pro") throw forbidden();
  return db
    .select({
      id: reviews.id,
      rating: reviews.rating,
      comment: reviews.comment,
      status: reviews.status,
      createdAt: reviews.createdAt,
      isDemo: reviews.isDemo,
      title: serviceRequests.title,
    })
    .from(reviews)
    .innerJoin(serviceRequests, eq(serviceRequests.id, reviews.requestId))
    .where(eq(reviews.proId, actor.id))
    .orderBy(desc(reviews.createdAt));
}

export async function listReviewsForAdmin(status?: "published" | "flagged" | "hidden") {
  return db
    .select({
      id: reviews.id,
      rating: reviews.rating,
      comment: reviews.comment,
      status: reviews.status,
      flagReason: reviews.flagReason,
      moderationNote: reviews.moderationNote,
      createdAt: reviews.createdAt,
      requestId: reviews.requestId,
      proName: proProfiles.displayName,
      clientName: users.name,
      isDemo: reviews.isDemo,
    })
    .from(reviews)
    .innerJoin(proProfiles, eq(proProfiles.userId, reviews.proId))
    .innerJoin(users, eq(users.id, reviews.clientId))
    .where(status ? eq(reviews.status, status) : undefined)
    .orderBy(desc(reviews.createdAt))
    .limit(200);
}
