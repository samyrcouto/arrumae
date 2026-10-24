import "server-only";
import { and, eq, gt, inArray, lt, sql } from "drizzle-orm";
import { z } from "zod";
import { TERMS_VERSION } from "@/config/legal";
import { normalizePhone } from "@/lib/br";
import { db } from "../db/client";
import {
  dataRequests,
  messages,
  notifications,
  proProfiles,
  quotes,
  reviews,
  serviceRequests,
  sessions,
  supportTickets,
  users,
} from "../db/schema";
import { type Actor, type UserRole } from "../domain/actor";
import { conflict, forbidden, invalid } from "../domain/errors";
import { burnPasswordCheck, hashPassword, verifyPassword } from "../auth/password";
import { randomToken, sha256 } from "../security/crypto";
import { audit } from "./audit";

export const SESSION_TTL_DAYS = 30;

const COMMON_PASSWORDS = new Set(["12345678", "123456789", "password", "senha123", "qwerty123", "11111111", "abc12345"]);

export const passwordSchema = z
  .string()
  .min(8, "A senha precisa ter pelo menos 8 caracteres.")
  .max(128, "Senha longa demais.")
  .refine((p) => !COMMON_PASSWORDS.has(p.toLowerCase()), "Essa senha é muito comum. Escolha outra.");

export const signupSchema = z.object({
  name: z.string().trim().min(2, "Informe seu nome.").max(80),
  email: z.email("E-mail inválido.").trim().toLowerCase().max(160),
  phone: z
    .string()
    .trim()
    .transform((v, ctx) => {
      const p = normalizePhone(v);
      if (!p) ctx.addIssue({ code: "custom", message: "Telefone com DDD inválido." });
      return p ?? "";
    }),
  password: passwordSchema,
  role: z.enum(["client", "pro"]),
  acceptTerms: z.literal(true, { error: "É preciso aceitar os Termos de Uso e a Política de Privacidade." }),
  marketingConsent: z.boolean().default(false),
});
export type SignupInput = z.input<typeof signupSchema>;

export function fieldErrorsFrom(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const k = String(issue.path[0] ?? "form");
    out[k] ??= issue.message;
  }
  return out;
}

export async function registerUser(input: SignupInput, opts: { isDemo?: boolean } = {}) {
  const parsed = signupSchema.safeParse(input);
  if (!parsed.success) throw invalid("Revise os campos destacados.", fieldErrorsFrom(parsed.error));
  const data = parsed.data;
  const passwordHash = await hashPassword(data.password);
  return db.transaction(async (tx) => {
    const existing = await tx
      .select({ id: users.id })
      .from(users)
      .where(sql`lower(${users.email}) = ${data.email}`);
    if (existing.length) throw invalid("Revise os campos destacados.", { email: "Já existe uma conta com este e-mail." });
    const [user] = await tx
      .insert(users)
      .values({
        email: data.email,
        passwordHash,
        name: data.name,
        phone: data.phone,
        role: data.role,
        marketingConsent: data.marketingConsent,
        termsVersion: TERMS_VERSION,
        termsAcceptedAt: new Date(),
        isDemo: opts.isDemo ?? false,
      })
      .returning();
    if (data.role === "pro") {
      await tx.insert(proProfiles).values({ userId: user.id, displayName: data.name });
    }
    return user;
  });
}

/** Cria a primeira conta admin (script). Nunca exposto via interface pública. */
export async function createAdmin(email: string, password: string, name = "Administrador") {
  const pw = passwordSchema.safeParse(password);
  if (!pw.success) throw invalid(pw.error.issues[0].message);
  const passwordHash = await hashPassword(password);
  const [user] = await db
    .insert(users)
    .values({
      email: email.toLowerCase(),
      passwordHash,
      name,
      role: "admin",
      termsVersion: TERMS_VERSION,
      termsAcceptedAt: new Date(),
    })
    .returning();
  await audit(db, { kind: "system" }, "admin.create", "user", user.id, {});
  return user;
}

export async function authenticate(emailInput: string, password: string) {
  const email = emailInput.trim().toLowerCase();
  const [user] = await db.select().from(users).where(sql`lower(${users.email}) = ${email}`);
  if (!user) {
    await burnPasswordCheck(password);
    return null;
  }
  const ok = await verifyPassword(user.passwordHash, password);
  if (!ok || user.status !== "active") return null;
  await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id));
  return user;
}

export async function createSession(userId: string, userAgent?: string | null) {
  const token = randomToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 86400_000);
  await db.insert(sessions).values({ id: sha256(token), userId, expiresAt, userAgent: userAgent?.slice(0, 200) ?? null });
  return { token, expiresAt };
}

export type SessionUser = { id: string; name: string; email: string; role: UserRole; isDemo: boolean };

export async function validateSessionToken(token: string): Promise<SessionUser | null> {
  const id = sha256(token);
  const [row] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      status: users.status,
      isDemo: users.isDemo,
      lastSeenAt: sessions.lastSeenAt,
    })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.id, id), gt(sessions.expiresAt, new Date())));
  if (!row || row.status !== "active") return null;
  // Renova a validade (sessão deslizante), no máximo uma vez por hora.
  if (Date.now() - row.lastSeenAt.getTime() > 3600_000) {
    await db
      .update(sessions)
      .set({ lastSeenAt: new Date(), expiresAt: new Date(Date.now() + SESSION_TTL_DAYS * 86400_000) })
      .where(eq(sessions.id, id));
  }
  return { id: row.id, name: row.name, email: row.email, role: row.role, isDemo: row.isDemo };
}

export async function revokeSessionToken(token: string) {
  await db.delete(sessions).where(eq(sessions.id, sha256(token)));
}

export async function purgeExpiredSessions() {
  await db.delete(sessions).where(lt(sessions.expiresAt, new Date()));
}

export async function changePassword(actor: Actor, current: string, next: string) {
  if (actor.kind !== "user") throw forbidden();
  const pw = passwordSchema.safeParse(next);
  if (!pw.success) throw invalid("Revise os campos destacados.", { newPassword: pw.error.issues[0].message });
  const [u] = await db.select().from(users).where(eq(users.id, actor.id));
  if (!u || !(await verifyPassword(u.passwordHash, current)))
    throw invalid("Revise os campos destacados.", { currentPassword: "Senha atual incorreta." });
  await db.transaction(async (tx) => {
    await tx.update(users).set({ passwordHash: await hashPassword(next), updatedAt: new Date() }).where(eq(users.id, u.id));
    // Encerra todas as sessões: o usuário entra de novo com a nova senha.
    await tx.delete(sessions).where(eq(sessions.userId, u.id));
    await audit(tx, actor, "account.password_change", "user", u.id);
  });
}

const ACTIVE_STATUSES = ["scheduled", "in_progress", "awaiting_confirmation", "disputed"] as const;

/**
 * Exclusão de conta (LGPD art. 18). Dados pessoais são anonimizados; registros
 * de transações são mantidos de forma desidentificada pelo prazo necessário a
 * obrigações legais e defesa em processos (docs/LEGAL.md — validar prazos com
 * advogado).
 */
export async function deleteAccount(actor: Actor, password: string) {
  if (actor.kind !== "user") throw forbidden();
  if (actor.role === "admin") throw forbidden("Contas administrativas são removidas por outro administrador.");
  const [u] = await db.select().from(users).where(eq(users.id, actor.id));
  if (!u || !(await verifyPassword(u.passwordHash, password)))
    throw invalid("Revise os campos destacados.", { password: "Senha incorreta." });

  await db.transaction(async (tx) => {
    const active = await tx
      .select({ id: serviceRequests.id })
      .from(serviceRequests)
      .where(
        and(
          sql`(${serviceRequests.clientId} = ${u.id} or ${serviceRequests.proId} = ${u.id})`,
          inArray(serviceRequests.status, [...ACTIVE_STATUSES]),
        ),
      );
    if (active.length)
      throw conflict("Você tem serviços em andamento. Conclua ou cancele antes de excluir a conta, ou fale com o suporte.");

    // Cancela solicitações abertas do cliente e retira propostas pendentes do profissional.
    await tx
      .update(serviceRequests)
      .set({ status: "cancelled", cancelledAt: new Date(), cancelReason: "Conta excluída", cancelledBy: u.id })
      .where(and(eq(serviceRequests.clientId, u.id), eq(serviceRequests.status, "open")));
    await tx
      .update(quotes)
      .set({ status: "withdrawn", updatedAt: new Date() })
      .where(and(eq(quotes.proId, u.id), eq(quotes.status, "pending")));

    // Anonimiza conteúdo livre que pode conter dados pessoais.
    await tx
      .update(serviceRequests)
      .set({ addressLine: "[removido]", addressComplement: "", description: "[removido a pedido do titular]" })
      .where(eq(serviceRequests.clientId, u.id));
    await tx.update(messages).set({ body: "[mensagem removida]" }).where(eq(messages.senderId, u.id));

    if (u.role === "pro") {
      await tx
        .update(proProfiles)
        .set({ displayName: "Profissional removido", bio: "", cpf: null, cnpj: null, verificationStatus: "suspended" })
        .where(eq(proProfiles.userId, u.id));
    }
    await tx
      .update(users)
      .set({
        email: `removido+${u.id}@invalid.desenrola`,
        name: "Usuário removido",
        phone: null,
        passwordHash: "!",
        status: "deleted",
        marketingConsent: false,
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(users.id, u.id));
    await tx.delete(sessions).where(eq(sessions.userId, u.id));
    await tx.delete(notifications).where(eq(notifications.userId, u.id));
    await tx.insert(dataRequests).values({ userId: u.id, kind: "deletion", completedAt: new Date() });
    await audit(tx, actor, "account.delete", "user", u.id);
  });
}

/** Exportação dos dados do titular (portabilidade/acesso — LGPD art. 18). */
export async function exportAccountData(actor: Actor) {
  if (actor.kind !== "user") throw forbidden();
  const [u] = await db.select().from(users).where(eq(users.id, actor.id));
  if (!u) throw forbidden();
  const [requests, myQuotes, myReviews, tickets, profile] = await Promise.all([
    db.select().from(serviceRequests).where(eq(serviceRequests.clientId, u.id)),
    db.select().from(quotes).where(eq(quotes.proId, u.id)),
    db.select().from(reviews).where(sql`${reviews.clientId} = ${u.id} or ${reviews.proId} = ${u.id}`),
    db.select().from(supportTickets).where(eq(supportTickets.openerId, u.id)),
    db.select().from(proProfiles).where(eq(proProfiles.userId, u.id)),
  ]);
  await db.insert(dataRequests).values({ userId: u.id, kind: "export", completedAt: new Date() });
  const { passwordHash: _omit, ...account } = u;
  void _omit;
  return {
    generatedAt: new Date().toISOString(),
    account,
    proProfile: profile[0] ?? null,
    requests,
    quotes: myQuotes,
    reviews: myReviews,
    supportTickets: tickets,
  };
}

export async function updateContact(actor: Actor, input: { name: string; phone: string; marketingConsent: boolean }) {
  if (actor.kind !== "user") throw forbidden();
  const name = input.name.trim();
  const phone = normalizePhone(input.phone);
  const errors: Record<string, string> = {};
  if (name.length < 2 || name.length > 80) errors.name = "Informe seu nome.";
  if (!phone) errors.phone = "Telefone com DDD inválido.";
  if (Object.keys(errors).length) throw invalid("Revise os campos destacados.", errors);
  await db
    .update(users)
    .set({ name, phone, marketingConsent: input.marketingConsent, updatedAt: new Date() })
    .where(eq(users.id, actor.id));
}
