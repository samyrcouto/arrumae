import "server-only";
import { randomUUID } from "node:crypto";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { isValidCpf, onlyDigits } from "@/lib/br";
import { hhmmToMinute } from "@/lib/datetime";
import { makeKey, storage } from "../adapters/storage";
import { db } from "../db/client";
import {
  categories,
  proAvailability,
  proCategories,
  proDocuments,
  proPhotos,
  proProfiles,
  proRegions,
  regions,
  reviews,
  users,
} from "../db/schema";
import type { Actor } from "../domain/actor";
import { conflict, forbidden, invalid, notFound } from "../domain/errors";
import { sha256 } from "../security/crypto";
import { enforceRateLimit, LIMITS } from "../security/rate-limit";
import { processDocument, processImage } from "../security/uploads";
import { audit } from "./audit";
import { fieldErrorsFrom } from "./accounts";
import { statsForPros } from "./matching";
import { emitIntegrationEvent, proAdminUrl } from "./integrations";
import { notify } from "./notifications";

type ProActor = Extract<Actor, { kind: "user" }> & { role: "pro" };

function requirePro(actor: Actor): asserts actor is ProActor {
  if (actor.kind !== "user" || actor.role !== "pro") throw forbidden();
}

export async function getMyProProfile(actor: Actor) {
  requirePro(actor);
  const [profile] = await db.select().from(proProfiles).where(eq(proProfiles.userId, actor.id));
  if (!profile) throw notFound("Perfil profissional");
  const [cats, regs, availability, documents, photos] = await Promise.all([
    db.select({ id: proCategories.categoryId }).from(proCategories).where(eq(proCategories.proId, actor.id)),
    db.select({ id: proRegions.regionId }).from(proRegions).where(eq(proRegions.proId, actor.id)),
    db
      .select()
      .from(proAvailability)
      .where(eq(proAvailability.proId, actor.id))
      .orderBy(asc(proAvailability.weekday), asc(proAvailability.startMinute)),
    db.select().from(proDocuments).where(eq(proDocuments.proId, actor.id)).orderBy(desc(proDocuments.createdAt)),
    db.select().from(proPhotos).where(eq(proPhotos.proId, actor.id)).orderBy(desc(proPhotos.createdAt)),
  ]);
  return {
    profile,
    categoryIds: cats.map((c) => c.id),
    regionIds: regs.map((r) => r.id),
    availability,
    documents,
    photos,
  };
}

export const proProfileSchema = z.object({
  displayName: z.string().trim().min(2, "Informe o nome exibido.").max(80),
  bio: z.string().trim().max(1200, "Máximo de 1200 caracteres."),
  yearsExperience: z.coerce.number().int().min(0).max(70),
  cpf: z
    .string()
    .trim()
    .transform((v) => onlyDigits(v))
    .refine((v) => v === "" || isValidCpf(v), "CPF inválido."),
  cnpj: z
    .string()
    .trim()
    .transform((v) => onlyDigits(v))
    .refine((v) => v === "" || v.length === 14, "CNPJ deve ter 14 dígitos."),
  acceptsUrgent: z.boolean(),
  categoryIds: z.array(z.uuid()).max(5, "Escolha até 5 categorias."),
  regionIds: z.array(z.uuid()).max(20),
});

export async function updateProProfile(actor: Actor, input: z.input<typeof proProfileSchema>) {
  requirePro(actor);
  const parsed = proProfileSchema.safeParse(input);
  if (!parsed.success) throw invalid("Revise os campos destacados.", fieldErrorsFrom(parsed.error));
  const d = parsed.data;

  await db.transaction(async (tx) => {
    const [current] = await tx.select().from(proProfiles).where(eq(proProfiles.userId, actor.id)).for("update");
    if (!current) throw notFound("Perfil profissional");
    if (current.verificationStatus === "suspended") throw forbidden("Seu perfil está suspenso. Fale com o suporte.");

    if (d.categoryIds.length) {
      const valid = await tx
        .select({ id: categories.id })
        .from(categories)
        .where(and(inArray(categories.id, d.categoryIds), eq(categories.active, true)));
      if (valid.length !== d.categoryIds.length) throw invalid("Categoria inválida.");
    }
    if (d.regionIds.length) {
      const valid = await tx
        .select({ id: regions.id })
        .from(regions)
        .where(and(inArray(regions.id, d.regionIds), eq(regions.active, true)));
      if (valid.length !== d.regionIds.length) throw invalid("Região inválida.");
    }

    // Trocar o CPF de um perfil aprovado exige nova análise.
    const cpfChanged = (current.cpf ?? "") !== d.cpf;
    const needsReReview = cpfChanged && current.verificationStatus === "approved";

    await tx
      .update(proProfiles)
      .set({
        displayName: d.displayName,
        bio: d.bio,
        yearsExperience: d.yearsExperience,
        cpf: d.cpf || null,
        cnpj: d.cnpj || null,
        acceptsUrgent: d.acceptsUrgent,
        ...(needsReReview ? { verificationStatus: "pending_review" as const, submittedAt: new Date() } : {}),
        updatedAt: new Date(),
      })
      .where(eq(proProfiles.userId, actor.id));

    await tx.delete(proCategories).where(eq(proCategories.proId, actor.id));
    if (d.categoryIds.length)
      await tx.insert(proCategories).values(d.categoryIds.map((categoryId) => ({ proId: actor.id, categoryId })));
    await tx.delete(proRegions).where(eq(proRegions.proId, actor.id));
    if (d.regionIds.length)
      await tx.insert(proRegions).values(d.regionIds.map((regionId) => ({ proId: actor.id, regionId })));

    if (needsReReview) await audit(tx, actor, "pro.cpf_changed_rereview", "pro_profile", actor.id);
  });
}

export type AvailabilityInput = { weekday: number; start: string; end: string }[];

export async function setAvailability(actor: Actor, input: AvailabilityInput) {
  requirePro(actor);
  const rows = input.map((s) => {
    const startMinute = hhmmToMinute(s.start);
    const endMinute = hhmmToMinute(s.end);
    if (!Number.isInteger(s.weekday) || s.weekday < 0 || s.weekday > 6 || startMinute === null || endMinute === null)
      throw invalid("Horário inválido.");
    if (startMinute >= endMinute) throw invalid("O horário final precisa ser depois do inicial.");
    return { proId: actor.id, weekday: s.weekday, startMinute, endMinute };
  });
  if (rows.length > 21) throw invalid("Muitos intervalos de disponibilidade.");
  await db.transaction(async (tx) => {
    await tx.delete(proAvailability).where(eq(proAvailability.proId, actor.id));
    if (rows.length) await tx.insert(proAvailability).values(rows);
  });
}

export async function uploadProDocument(actor: Actor, kind: "identity" | "address_proof" | "certificate" | "other", file: File) {
  requirePro(actor);
  await enforceRateLimit("upload", actor.id, LIMITS.upload.limit, LIMITS.upload.window);
  const existing = await db.select({ id: proDocuments.id }).from(proDocuments).where(eq(proDocuments.proId, actor.id));
  if (existing.length >= 15) throw invalid("Limite de documentos atingido. Fale com o suporte.");
  const processed = await processDocument(file);
  const id = randomUUID();
  const key = makeKey("pro-documents", actor.id, id, processed.mimeType);
  await storage().put(key, processed.buffer, processed.mimeType);
  await db.insert(proDocuments).values({
    id,
    proId: actor.id,
    kind,
    storageKey: key,
    mimeType: processed.mimeType,
    sizeBytes: processed.sizeBytes,
    sha256: sha256(processed.buffer),
  });
  await audit(db, actor, "pro.document_upload", "pro_document", id, { kind });
}

export async function uploadPortfolioPhoto(actor: Actor, file: File, caption: string, rightsConfirmed: boolean) {
  requirePro(actor);
  if (!rightsConfirmed) throw invalid("Confirme que você tem autorização para publicar a foto.");
  await enforceRateLimit("upload", actor.id, LIMITS.upload.limit, LIMITS.upload.window);
  const count = await db.select({ id: proPhotos.id }).from(proPhotos).where(eq(proPhotos.proId, actor.id));
  if (count.length >= 12) throw invalid("Máximo de 12 fotos no portfólio.");
  const processed = await processImage(file);
  const id = randomUUID();
  const key = makeKey("pro-photos", actor.id, id, processed.mimeType);
  await storage().put(key, processed.buffer, processed.mimeType);
  await db.insert(proPhotos).values({ id, proId: actor.id, storageKey: key, caption: caption.trim().slice(0, 140), rightsConfirmed });
}

export async function deletePortfolioPhoto(actor: Actor, photoId: string) {
  requirePro(actor);
  const [p] = await db
    .select()
    .from(proPhotos)
    .where(and(eq(proPhotos.id, photoId), eq(proPhotos.proId, actor.id)));
  if (!p) throw notFound("Foto");
  await db.delete(proPhotos).where(eq(proPhotos.id, p.id));
  await storage().delete(p.storageKey);
}

/** Itens que faltam para enviar o perfil para análise. Exibido como checklist. */
export function onboardingChecklist(data: Awaited<ReturnType<typeof getMyProProfile>>) {
  const docs = data.documents.filter((d) => d.status !== "rejected");
  return [
    { key: "bio", label: "Descrição com pelo menos 40 caracteres", done: data.profile.bio.trim().length >= 40 },
    { key: "cpf", label: "CPF válido", done: !!data.profile.cpf && isValidCpf(data.profile.cpf) },
    { key: "categories", label: "Pelo menos 1 especialidade", done: data.categoryIds.length > 0 },
    { key: "regions", label: "Pelo menos 1 região atendida", done: data.regionIds.length > 0 },
    { key: "availability", label: "Disponibilidade semanal", done: data.availability.length > 0 },
    { key: "identity", label: "Documento de identidade (RG ou CNH)", done: docs.some((d) => d.kind === "identity") },
    { key: "address", label: "Comprovante de endereço", done: docs.some((d) => d.kind === "address_proof") },
  ];
}

export async function submitForReview(actor: Actor) {
  requirePro(actor);
  const data = await getMyProProfile(actor);
  const missing = onboardingChecklist(data).filter((i) => !i.done);
  if (missing.length) throw invalid(`Complete antes de enviar: ${missing.map((m) => m.label).join("; ")}.`);
  const status = data.profile.verificationStatus;
  if (status !== "draft" && status !== "rejected") throw conflict("Seu perfil já foi enviado para análise.");

  await db.transaction(async (tx) => {
    const updated = await tx
      .update(proProfiles)
      .set({ verificationStatus: "pending_review", submittedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(proProfiles.userId, actor.id), inArray(proProfiles.verificationStatus, ["draft", "rejected"])))
      .returning({ id: proProfiles.userId });
    if (!updated.length) throw conflict("Seu perfil já foi enviado para análise.");
    await audit(tx, actor, "pro.submit_for_review", "pro_profile", actor.id);
    await emitIntegrationEvent(tx, "pro.submitted_for_review", { proId: actor.id, adminUrl: proAdminUrl(actor.id) });
    const admins = await tx
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.role, "admin"), eq(users.status, "active")));
    for (const a of admins)
      await notify(tx, a.id, {
        type: "pro_review_pending",
        title: "Novo profissional aguardando análise",
        body: `${data.profile.displayName} enviou o perfil para verificação.`,
        link: `/admin/profissionais/${actor.id}`,
      });
  });
}

/** Perfil público: apenas profissionais aprovados e ativos. */
export async function getPublicProProfile(proId: string) {
  const [row] = await db
    .select({ profile: proProfiles, user: { createdAt: users.createdAt, isDemo: users.isDemo } })
    .from(proProfiles)
    .innerJoin(users, eq(users.id, proProfiles.userId))
    .where(and(eq(proProfiles.userId, proId), eq(proProfiles.verificationStatus, "approved"), eq(users.status, "active")));
  if (!row) return null;
  const [cats, regs, photos, recentReviews, stats, availability] = await Promise.all([
    db
      .select({ name: categories.name, slug: categories.slug })
      .from(proCategories)
      .innerJoin(categories, eq(categories.id, proCategories.categoryId))
      .where(eq(proCategories.proId, proId)),
    db
      .select({ name: regions.name })
      .from(proRegions)
      .innerJoin(regions, eq(regions.id, proRegions.regionId))
      .where(eq(proRegions.proId, proId)),
    db.select().from(proPhotos).where(eq(proPhotos.proId, proId)).orderBy(desc(proPhotos.createdAt)),
    db
      .select({
        id: reviews.id,
        rating: reviews.rating,
        comment: reviews.comment,
        createdAt: reviews.createdAt,
        isDemo: reviews.isDemo,
        clientName: users.name,
      })
      .from(reviews)
      .innerJoin(users, eq(users.id, reviews.clientId))
      .where(and(eq(reviews.proId, proId), eq(reviews.status, "published")))
      .orderBy(desc(reviews.createdAt))
      .limit(20),
    statsForPros(db, [proId]),
    db
      .select()
      .from(proAvailability)
      .where(eq(proAvailability.proId, proId))
      .orderBy(asc(proAvailability.weekday), asc(proAvailability.startMinute)),
  ]);
  const { cpf: _cpf, cnpj, verificationNotes: _notes, verifiedBy: _vb, ...publicProfile } = row.profile;
  void _cpf;
  void _notes;
  void _vb;
  return {
    profile: { ...publicProfile, hasCnpj: !!cnpj },
    memberSince: row.user.createdAt,
    isDemo: row.user.isDemo,
    categories: cats,
    regions: regs,
    photos,
    availability,
    // Exibe apenas o primeiro nome de quem avaliou.
    reviews: recentReviews.map((r) => ({ ...r, clientName: r.clientName.split(" ")[0] })),
    stats: stats.get(proId) ?? { ratingAvg: null, ratingCount: 0, completedJobs: 0 },
  };
}
