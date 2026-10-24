import { sql } from "drizzle-orm";
import sharp from "sharp";
import { db } from "@/server/db/client";
import { categories, proAvailability, proCategories, proProfiles, proRegions, regions, users } from "@/server/db/schema";
import type { Actor } from "@/server/domain/actor";
import { registerUser } from "@/server/services/accounts";
import { eq } from "drizzle-orm";

/** Limpa todas as tabelas de negócio (não toca nas migrations). */
export async function resetDb() {
  const rows = await db.execute<{ tablename: string }>(
    sql`select tablename from pg_tables where schemaname = 'public'`,
  );
  const names = rows.map((r) => `"${r.tablename}"`).join(", ");
  // audit_logs é append-only via trigger de linha; TRUNCATE não dispara triggers de linha.
  if (names) await db.execute(sql.raw(`truncate table ${names} restart identity cascade`));
}

export async function seedBase() {
  const [cat] = await db
    .insert(categories)
    .values({ slug: "eletrica", name: "Eletricista", shortDescription: "Serviços elétricos residenciais" })
    .returning();
  const [visitCat] = await db
    .insert(categories)
    .values({
      slug: "ar-condicionado",
      name: "Ar-condicionado",
      shortDescription: "Instalação e manutenção de ar",
      pricingMode: "visit_required",
    })
    .returning();
  const [region] = await db
    .insert(regions)
    .values({ slug: "pinheiros", name: "Pinheiros", city: "São Paulo", state: "SP", cepPrefixes: ["054"] })
    .returning();
  return { cat, visitCat, region };
}

let counter = 0;
export const asActor = (u: { id: string; role: "client" | "pro" | "admin" }): Actor => ({ kind: "user", id: u.id, role: u.role });

export async function makeClient() {
  counter++;
  const u = await registerUser({
    name: `Cliente ${counter}`,
    email: `cliente${counter}-${Date.now()}@teste.com`,
    phone: "11987654321",
    password: "senha-forte-123",
    role: "client",
    acceptTerms: true,
  });
  return asActor(u) as Extract<Actor, { kind: "user" }>;
}

export async function makePro(opts: { categoryIds: string[]; regionIds: string[]; approved?: boolean }) {
  counter++;
  const u = await registerUser({
    name: `Profissional ${counter}`,
    email: `pro${counter}-${Date.now()}@teste.com`,
    phone: "11912345678",
    password: "senha-forte-123",
    role: "pro",
    acceptTerms: true,
  });
  if (opts.approved !== false)
    await db.update(proProfiles).set({ verificationStatus: "approved" }).where(eq(proProfiles.userId, u.id));
  for (const categoryId of opts.categoryIds) await db.insert(proCategories).values({ proId: u.id, categoryId });
  for (const regionId of opts.regionIds) await db.insert(proRegions).values({ proId: u.id, regionId });
  await db.insert(proAvailability).values({ proId: u.id, weekday: 1, startMinute: 480, endMinute: 1080 });
  return asActor(u) as Extract<Actor, { kind: "user" }>;
}

export async function makeAdmin() {
  counter++;
  const [u] = await db
    .insert(users)
    .values({
      email: `admin${counter}-${Date.now()}@teste.com`,
      passwordHash: "x",
      name: "Admin",
      role: "admin",
      termsVersion: "t",
      termsAcceptedAt: new Date(),
    })
    .returning();
  return asActor(u) as Extract<Actor, { kind: "user" }>;
}

export const requestInput = (categoryId: string, extra: Record<string, unknown> = {}) => ({
  categoryId,
  title: "Trocar chuveiro",
  description: "O chuveiro queimou e preciso trocar por um novo que já comprei.",
  cep: "05422-010",
  neighborhood: "Pinheiros",
  addressLine: "Rua Teste, 100",
  addressComplement: "apto 12",
  urgency: "this_week" as const,
  preferredWindow: "Manhãs",
  submissionToken: crypto.randomUUID(),
  ...extra,
});

export const inHours = (h: number) => new Date(Date.now() + h * 3600_000);

export const fixedQuote = (requestId: string, extra: Record<string, unknown> = {}) => ({
  requestId,
  kind: "fixed" as const,
  amountCents: 15000,
  visitFeeCents: null,
  estimateMinCents: null,
  estimateMaxCents: null,
  message: "Troca do chuveiro com material do cliente, inclui teste.",
  slots: [{ start: inHours(24), end: inHours(26) }],
  ...extra,
});

export async function jpegFile(name = "foto.jpg") {
  const buf = await sharp({ create: { width: 40, height: 30, channels: 3, background: { r: 200, g: 100, b: 50 } } })
    .jpeg()
    .withMetadata({ exif: { IFD0: { Copyright: "teste-exif" } } })
    .toBuffer();
  return new File([new Uint8Array(buf)], name, { type: "image/jpeg" });
}

/** Move o horário marcado para o passado/presente para testar regras de horário. */
export async function shiftSchedule(requestId: string, startsInMinutes: number) {
  const { serviceRequests } = await import("@/server/db/schema");
  await db
    .update(serviceRequests)
    .set({ scheduledStart: new Date(Date.now() + startsInMinutes * 60000), scheduledEnd: new Date(Date.now() + (startsInMinutes + 120) * 60000) })
    .where(eq(serviceRequests.id, requestId));
}
