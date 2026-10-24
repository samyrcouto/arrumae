import "server-only";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import type { Actor, UserRole } from "../domain/actor";
import { isProduction } from "../env";
import { createSession, revokeSessionToken, type SessionUser, validateSessionToken } from "../services/accounts";

export const SESSION_COOKIE = "arrumae_session";

export async function startSession(userId: string) {
  const ua = (await headers()).get("user-agent");
  const { token, expiresAt } = await createSession(userId, ua);
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

/** Usuário da requisição atual (memoizado por requisição). */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return validateSessionToken(token);
});

export const toActor = (u: SessionUser): Actor => ({ kind: "user", id: u.id, role: u.role });

/**
 * Exige usuário autenticado (e papel, se informado). É a checagem de servidor
 * — esconder links no frontend nunca substitui esta chamada.
 */
export async function requireUser(roles?: UserRole[], next?: string): Promise<{ user: SessionUser; actor: Actor }> {
  const user = await getCurrentUser();
  if (!user) redirect(`/entrar${next ? `?next=${encodeURIComponent(next)}` : ""}`);
  if (roles && !roles.includes(user.role)) redirect("/sem-permissao");
  return { user, actor: toActor(user) };
}

export async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}
