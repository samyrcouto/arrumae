import "server-only";
import { and, asc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db, type DbOrTx } from "../db/client";
import { categories, regions } from "../db/schema";
import type { Actor } from "../domain/actor";
import { conflict, forbidden, invalid } from "../domain/errors";
import { audit } from "./audit";
import { fieldErrorsFrom } from "./accounts";

export async function listCategories(opts: { includeInactive?: boolean } = {}) {
  return db
    .select()
    .from(categories)
    .where(opts.includeInactive ? undefined : eq(categories.active, true))
    .orderBy(asc(categories.sortOrder), asc(categories.name));
}

export async function getCategoryBySlug(slug: string) {
  const [c] = await db
    .select()
    .from(categories)
    .where(and(eq(categories.slug, slug), eq(categories.active, true)));
  return c ?? null;
}

export async function listRegions(opts: { includeInactive?: boolean } = {}) {
  return db
    .select()
    .from(regions)
    .where(opts.includeInactive ? undefined : eq(regions.active, true))
    .orderBy(asc(regions.name));
}

export async function getRegionBySlug(slug: string) {
  const [r] = await db
    .select()
    .from(regions)
    .where(and(eq(regions.slug, slug), eq(regions.active, true)));
  return r ?? null;
}

/**
 * Região atendida pelo CEP (8 dígitos). Cada região lista prefixos de 3 a 5
 * dígitos; vence o prefixo mais longo (mais específico) que casar.
 */
export async function resolveRegionByCep(cep: string, conn: DbOrTx = db) {
  if (!/^\d{8}$/.test(cep)) return null;
  const rows = await conn.execute<{ id: string; len: number }>(sql`
    select r.id, max(length(p)) as len
    from regions r, jsonb_array_elements_text(r.cep_prefixes) p
    where r.active and ${cep} like p || '%'
    group by r.id
    order by len desc
    limit 1
  `);
  if (!rows.length) return null;
  const [r] = await conn.select().from(regions).where(eq(regions.id, rows[0].id));
  return r ?? null;
}

const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Use letras minúsculas, números e hífens.")
  .max(60);
const listField = z
  .string()
  .default("")
  .transform((s) =>
    s
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .slice(0, 20),
  );

export const categorySchema = z.object({
  slug: slugSchema,
  name: z.string().trim().min(2).max(60),
  shortDescription: z.string().trim().min(10).max(240),
  examples: listField,
  outOfScope: listField,
  pricingMode: z.enum(["fixed_or_visit", "visit_required"]),
  commissionBps: z
    .union([z.literal(""), z.coerce.number().int().min(0).max(5000)])
    .transform((v) => (v === "" ? null : v)),
  active: z.boolean(),
  sortOrder: z.coerce.number().int().min(0).max(999),
});

function requireAdmin(actor: Actor): asserts actor is Extract<Actor, { kind: "user" }> {
  if (actor.kind !== "user" || actor.role !== "admin") throw forbidden();
}

export async function saveCategory(actor: Actor, id: string | null, input: z.input<typeof categorySchema>) {
  requireAdmin(actor);
  const parsed = categorySchema.safeParse(input);
  if (!parsed.success) throw invalid("Revise os campos destacados.", fieldErrorsFrom(parsed.error));
  try {
    if (id) {
      await db
        .update(categories)
        .set({ ...parsed.data, updatedAt: new Date() })
        .where(eq(categories.id, id));
      await audit(db, actor, "category.update", "category", id, parsed.data);
      return id;
    }
    const [c] = await db.insert(categories).values(parsed.data).returning({ id: categories.id });
    await audit(db, actor, "category.create", "category", c.id, parsed.data);
    return c.id;
  } catch (e) {
    if ((e as { code?: string }).code === "23505") throw conflict("Já existe uma categoria com este identificador.");
    throw e;
  }
}

export const regionSchema = z.object({
  slug: slugSchema,
  name: z.string().trim().min(2).max(80),
  city: z.string().trim().min(2).max(80),
  state: z.string().trim().length(2).toUpperCase(),
  cepPrefixes: z
    .string()
    .transform((s) => [...new Set(s.split(/[\s,;]+/).map((p) => p.replace(/\D/g, "")).filter(Boolean))])
    .refine(
      (list) => list.length > 0 && list.every((p) => p.length >= 3 && p.length <= 5),
      "Informe prefixos de CEP com 3 a 5 dígitos.",
    ),
  active: z.boolean(),
});

export async function saveRegion(actor: Actor, id: string | null, input: z.input<typeof regionSchema>) {
  requireAdmin(actor);
  const parsed = regionSchema.safeParse(input);
  if (!parsed.success) throw invalid("Revise os campos destacados.", fieldErrorsFrom(parsed.error));
  try {
    if (id) {
      await db
        .update(regions)
        .set({ ...parsed.data, updatedAt: new Date() })
        .where(eq(regions.id, id));
      await audit(db, actor, "region.update", "region", id, parsed.data);
      return id;
    }
    const [r] = await db.insert(regions).values(parsed.data).returning({ id: regions.id });
    await audit(db, actor, "region.create", "region", r.id, parsed.data);
    return r.id;
  } catch (e) {
    if ((e as { code?: string }).code === "23505") throw conflict("Já existe uma região com este identificador.");
    throw e;
  }
}
