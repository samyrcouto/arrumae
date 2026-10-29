import "server-only";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import type { Actor, UserRole } from "../domain/actor";
import { forbidden } from "../domain/errors";
import { adminRequires2fa, env, isProduction } from "../env";
import { createSession, revokeSessionToken, type SessionUser, validateSessionToken } from "../services/accounts";

export const SESSION_COOKIE = "arrumae_session";
/** Cookie temporário entre a senha e o código do 2FA (só vale em /entrar). */
export const MFA_COOKIE = "arrumae_mfa";
export const MFA_SETUP_PATH = "/conta/seguranca";

export async function startSession(userId: string, role: UserRole) {
  const ua = (await headers()).get("user-agent");
  const { token, expiresAt } = await createSession(userId, role, ua);
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: isProduction(),
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function endSession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await revokeSessionToken(token);
  jar.delete(SESSION_COOKIE);
}

export async function setMfaCookie(token: string, maxAgeSeconds: number) {
  (await cookies()).set(MFA_COOKIE, token, {
    httpOnly: true,
    secure: isProduction(),
    sameSite: "lax",
    path: "/entrar",
    maxAge: maxAgeSeconds,
  });
}

export async function readMfaCookie() {
  return (await cookies()).get(MFA_COOKIE)?.value ?? null;
}

export async function clearMfaCookie() {
  (await cookies()).delete({ name: MFA_COOKIE, path: "/entrar" });
}

/** Usuário da requisição atual (memoizado por requisição). */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return validateSessionToken(token);
});

/** Admin sem 2FA quando o 2FA é obrigatório: só pode abrir a página de cadastrá-lo. */
export const needsMfaSetup = (u: SessionUser) => u.role === "admin" && !u.mfaEnabled && adminRequires2fa();

/**
 * Converte o usuário em quem age nos serviços. Admin sem o 2FA obrigatório não
 * age em lugar nenhum (nem por rotas de API): a regra vale para todo o app.
 */
export function toActor(u: SessionUser): Actor {
  if (needsMfaSetup(u)) throw forbidden("Ative a verificação em duas etapas para usar a conta de administrador.");
  return { kind: "user", id: u.id, role: u.role };
}

/**
 * Exige usuário autenticado (e papel, se informado). É a checagem de servidor
 * — esconder links no frontend nunca substitui esta chamada.
 */
export async function requireUser(roles?: UserRole[], next?: string): Promise<{ user: SessionUser; actor: Actor }> {
  const user = await getCurrentUser();
  if (!user) redirect(`/entrar${next ? `?next=${encodeURIComponent(next)}` : ""}`);
  if (roles && !roles.includes(user.role)) redirect("/sem-permissao");
  if (needsMfaSetup(user)) redirect(`${MFA_SETUP_PATH}?exigido=1`);
  return { user, actor: toActor(user) };
}

/** Só para a página e as ações de cadastrar o 2FA, que precisam funcionar antes dele existir. */
export async function requireUserForMfaSetup(): Promise<{ user: SessionUser; actor: Actor }> {
  const user = await getCurrentUser();
  if (!user) redirect(`/entrar?next=${encodeURIComponent(MFA_SETUP_PATH)}`);
  return { user, actor: { kind: "user", id: user.id, role: user.role } };
}

/**
 * IP do visitante (para limitar tentativas). Em produção, configure
 * TRUSTED_IP_HEADER com o cabeçalho que o provedor preenche: o X-Forwarded-For
 * pode ser forjado por quem acessa direto.
 */
export async function clientIp(): Promise<string> {
  const h = await headers();
  const trusted = env().TRUSTED_IP_HEADER;
  if (trusted) return h.get(trusted)?.split(",")[0]?.trim() || "unknown";
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}
