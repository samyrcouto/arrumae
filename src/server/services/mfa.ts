import "server-only";
import { randomInt } from "node:crypto";
import { and, eq, gt, isNull, lt, ne, or, sql } from "drizzle-orm";
import { brand } from "@/config/brand";
import { sendEmail } from "../adapters/email";
import { verifyPassword } from "../auth/password";
import { db } from "../db/client";
import { mfaChallenges, mfaRecoveryCodes, sessions, users } from "../db/schema";
import type { Actor } from "../domain/actor";
import { conflict, forbidden, invalid } from "../domain/errors";
import { adminRequires2fa } from "../env";
import { hmac, randomToken, sha256 } from "../security/crypto";
import { decryptField, encryptField } from "../security/field-crypto";
import { enforceRateLimit, LIMITS } from "../security/rate-limit";
import { generateTotpSecret, matchTotp, otpauthUri } from "../security/totp";
import { audit } from "./audit";

/**
 * Verificação em duas etapas (2FA) por app autenticador (TOTP).
 * Obrigatória para administradores em produção (ADMIN_REQUIRE_2FA); opcional
 * para clientes e profissionais.
 */
export const TOTP_CONTEXT = "users.totp_secret";
export const MFA_CHALLENGE_MINUTES = 10;
const MAX_CHALLENGE_ATTEMPTS = 5;
const RECOVERY_CODES = 10;
const RECOVERY_ALPHABET = "23456789abcdefghjkmnpqrstuvwxyz"; // sem 0/o, 1/l/i

type UserActor = Extract<Actor, { kind: "user" }>;
function requireUserActor(actor: Actor): asserts actor is UserActor {
  if (actor.kind !== "user") throw forbidden();
}

const normalizeRecovery = (code: string) => code.toLowerCase().replace(/[^a-z0-9]/g, "");
// HMAC com o segredo da aplicação: quem tiver só o banco não testa códigos por força bruta.
const recoveryHash = (code: string) => hmac(`mfa-recovery:${normalizeRecovery(code)}`);

function newRecoveryCodes() {
  return Array.from({ length: RECOVERY_CODES }, () => {
    const s = Array.from({ length: 10 }, () => RECOVERY_ALPHABET[randomInt(RECOVERY_ALPHABET.length)]).join("");
    return `${s.slice(0, 5)}-${s.slice(5)}`;
  });
}

async function loadUser(userId: string) {
  const [u] = await db.select().from(users).where(eq(users.id, userId));
  if (!u) throw forbidden();
  return u;
}

export async function getMfaStatus(actor: Actor) {
  requireUserActor(actor);
  const u = await loadUser(actor.id);
  const [{ left }] = await db
    .select({ left: sql<number>`count(*)::int` })
    .from(mfaRecoveryCodes)
    .where(and(eq(mfaRecoveryCodes.userId, u.id), isNull(mfaRecoveryCodes.usedAt)));
  const pendingSecret = !u.totpEnabledAt && u.totpSecret ? decryptField(u.totpSecret, TOTP_CONTEXT) : null;
  return {
    enabled: !!u.totpEnabledAt,
    enabledAt: u.totpEnabledAt,
    recoveryCodesLeft: left,
    required: u.role === "admin" && adminRequires2fa(),
    // Cadastro em andamento: o que o app autenticador precisa ler.
    setup: pendingSecret ? { secret: pendingSecret, uri: otpauthUri(pendingSecret, u.email, brand.name) } : null,
  };
}

/** Gera (ou troca) o segredo de um cadastro em andamento. Só vale depois de confirmado com um código. */
export async function startTotpSetup(actor: Actor) {
  requireUserActor(actor);
  const u = await loadUser(actor.id);
  if (u.totpEnabledAt) throw conflict("A verificação em duas etapas já está ativa.");
  await db
    .update(users)
    .set({ totpSecret: encryptField(generateTotpSecret(), TOTP_CONTEXT), totpLastStep: null, updatedAt: new Date() })
    .where(eq(users.id, u.id));
}

/**
 * Confirma o cadastro com o primeiro código do app. Ativa o 2FA, cria os
 * códigos de recuperação (mostrados uma única vez) e encerra as outras sessões.
 */
export async function confirmTotpSetup(actor: Actor, code: string, currentSessionId?: string) {
  requireUserActor(actor);
  await enforceRateLimit("mfa_setup", actor.id, LIMITS.mfa.limit, LIMITS.mfa.window);
  const u = await loadUser(actor.id);
  if (u.totpEnabledAt) throw conflict("A verificação em duas etapas já está ativa.");
  const secret = decryptField(u.totpSecret, TOTP_CONTEXT);
  if (!secret) throw invalid("Comece o cadastro de novo.");
  const step = matchTotp(secret, code);
  if (step === null) throw invalid("Código incorreto. Confira o horário do celular e tente o código atual.", { code: "Código incorreto." });
  const codes = newRecoveryCodes();
  await db.transaction(async (tx) => {
    await tx.update(users).set({ totpEnabledAt: new Date(), totpLastStep: step, updatedAt: new Date() }).where(eq(users.id, u.id));
    await tx.delete(mfaRecoveryCodes).where(eq(mfaRecoveryCodes.userId, u.id));
    await tx.insert(mfaRecoveryCodes).values(codes.map((c) => ({ userId: u.id, codeHash: recoveryHash(c) })));
    await tx
      .delete(sessions)
      .where(currentSessionId ? and(eq(sessions.userId, u.id), ne(sessions.id, currentSessionId)) : eq(sessions.userId, u.id));
    await audit(tx, actor, "account.2fa_enabled", "user", u.id);
    await sendEmail(tx, {
      userId: u.id,
      to: u.email,
      subject: `Verificação em duas etapas ativada no ${brand.name}`,
      body: `Olá, ${u.name.split(" ")[0]}. A verificação em duas etapas foi ativada na sua conta. Se não foi você, fale com o suporte imediatamente.`,
    });
  });
  return codes;
}

/**
 * Confere o segundo fator: código do app (6 dígitos, cada um vale uma vez) ou
 * um código de recuperação (uso único). Atômico: dois envios simultâneos do
 * mesmo código não passam os dois.
 */
export async function verifySecondFactor(userId: string, code: string): Promise<"totp" | "recovery" | null> {
  const u = await loadUser(userId);
  if (!u.totpEnabledAt) return null;
  const secret = decryptField(u.totpSecret, TOTP_CONTEXT);
  const step = secret ? matchTotp(secret, code) : null;
  if (step !== null) {
    const ok = await db
      .update(users)
      .set({ totpLastStep: step })
      .where(and(eq(users.id, u.id), or(isNull(users.totpLastStep), lt(users.totpLastStep, step))))
      .returning({ id: users.id });
    return ok.length ? "totp" : null;
  }
  if (normalizeRecovery(code).length !== 10) return null;
  const used = await db
    .update(mfaRecoveryCodes)
    .set({ usedAt: new Date() })
    .where(and(eq(mfaRecoveryCodes.userId, u.id), eq(mfaRecoveryCodes.codeHash, recoveryHash(code)), isNull(mfaRecoveryCodes.usedAt)))
    .returning({ id: mfaRecoveryCodes.id });
  if (!used.length) return null;
  await audit(db, { kind: "user", id: u.id, role: u.role }, "account.2fa_recovery_code_used", "user", u.id);
  return "recovery";
}

export async function regenerateRecoveryCodes(actor: Actor, code: string) {
  requireUserActor(actor);
  await enforceRateLimit("mfa_setup", actor.id, LIMITS.mfa.limit, LIMITS.mfa.window);
  if (!(await verifySecondFactor(actor.id, code)))
    throw invalid("Código incorreto.", { code: "Use o código atual do app ou um código de recuperação." });
  const codes = newRecoveryCodes();
  await db.transaction(async (tx) => {
    await tx.delete(mfaRecoveryCodes).where(eq(mfaRecoveryCodes.userId, actor.id));
    await tx.insert(mfaRecoveryCodes).values(codes.map((c) => ({ userId: actor.id, codeHash: recoveryHash(c) })));
    await audit(tx, actor, "account.2fa_recovery_regenerated", "user", actor.id);
  });
  return codes;
}

/** Desliga o 2FA (exige senha e um código). Administradores não desligam quando é obrigatório. */
export async function disableTotp(actor: Actor, password: string, code: string) {
  requireUserActor(actor);
  if (actor.role === "admin" && adminRequires2fa())
    throw forbidden("Para administradores a verificação em duas etapas é obrigatória.");
  await enforceRateLimit("mfa_setup", actor.id, LIMITS.mfa.limit, LIMITS.mfa.window);
  const u = await loadUser(actor.id);
  if (!u.totpEnabledAt) return;
  if (!(await verifyPassword(u.passwordHash, password)))
    throw invalid("Revise os campos destacados.", { password: "Senha incorreta." });
  if (!(await verifySecondFactor(u.id, code))) throw invalid("Revise os campos destacados.", { code: "Código incorreto." });
  await clearMfa(u.id);
  await audit(db, actor, "account.2fa_disabled", "user", u.id);
  await sendEmail(db, {
    userId: u.id,
    to: u.email,
    subject: `Verificação em duas etapas desativada no ${brand.name}`,
    body: `Olá, ${u.name.split(" ")[0]}. A verificação em duas etapas foi desativada na sua conta. Se não foi você, troque a senha e fale com o suporte.`,
  });
}

async function clearMfa(userId: string) {
  await db.transaction(async (tx) => {
    await tx.update(users).set({ totpSecret: null, totpEnabledAt: null, totpLastStep: null, updatedAt: new Date() }).where(eq(users.id, userId));
    await tx.delete(mfaRecoveryCodes).where(eq(mfaRecoveryCodes.userId, userId));
  });
}

/**
 * Remove o 2FA de uma conta que perdeu o celular e os códigos (script de
 * servidor, `npm run db:reset-2fa`): quem roda já tem acesso ao servidor.
 * Encerra as sessões da conta.
 */
export async function resetMfaByEmail(email: string) {
  const [u] = await db.select().from(users).where(sql`lower(${users.email}) = ${email.trim().toLowerCase()}`);
  if (!u) throw invalid("Conta não encontrada.");
  await clearMfa(u.id);
  await db.delete(sessions).where(eq(sessions.userId, u.id));
  await audit(db, { kind: "system" }, "account.2fa_reset", "user", u.id);
  return u;
}

// ---------------------------------------------------------------------------
// Login em duas etapas: senha certa → desafio temporário → código → sessão
// ---------------------------------------------------------------------------

export async function createMfaChallenge(userId: string, nextPath: string | null) {
  const token = randomToken();
  await db.insert(mfaChallenges).values({
    id: sha256(token),
    userId,
    nextPath,
    expiresAt: new Date(Date.now() + MFA_CHALLENGE_MINUTES * 60_000),
  });
  return token;
}

export async function hasValidMfaChallenge(token: string) {
  const [c] = await db
    .select({ id: mfaChallenges.id })
    .from(mfaChallenges)
    .where(and(eq(mfaChallenges.id, sha256(token)), gt(mfaChallenges.expiresAt, new Date())));
  return !!c;
}

/**
 * Confere o código de um desafio. Cada desafio aceita até 5 tentativas; depois
 * é apagado e a pessoa volta para a senha. Devolve o usuário a autenticar.
 */
export async function completeMfaChallenge(token: string, code: string) {
  const expired = invalid("O tempo para digitar o código acabou. Entre de novo com e-mail e senha.");
  const [c] = await db
    .update(mfaChallenges)
    .set({ attempts: sql`${mfaChallenges.attempts} + 1` })
    .where(and(eq(mfaChallenges.id, sha256(token)), gt(mfaChallenges.expiresAt, new Date())))
    .returning();
  if (!c) throw expired;
  if (c.attempts > MAX_CHALLENGE_ATTEMPTS) {
    await db.delete(mfaChallenges).where(eq(mfaChallenges.id, c.id));
    throw expired;
  }
  await enforceRateLimit("mfa_user", c.userId, LIMITS.mfa.limit, LIMITS.mfa.window);
  const factor = await verifySecondFactor(c.userId, code);
  if (!factor) throw invalid("Código incorreto.", { code: "Código incorreto. Use o código atual do app ou um código de recuperação." });
  await db.delete(mfaChallenges).where(eq(mfaChallenges.id, c.id));
  const u = await loadUser(c.userId);
  if (u.status !== "active") throw expired;
  return { user: u, nextPath: c.nextPath, factor };
}

export async function purgeExpiredMfaChallenges() {
  await db.delete(mfaChallenges).where(lt(mfaChallenges.expiresAt, new Date()));
}
