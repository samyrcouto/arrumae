import "server-only";
import { sql } from "drizzle-orm";
import { db, type DbOrTx } from "../db/client";
import { rateLimited } from "../domain/errors";
import { hmac } from "./crypto";

/**
 * Rate limit em janela fixa, armazenado no Postgres (funciona com várias
 * instâncias sem Redis). Operação atômica via INSERT ... ON CONFLICT.
 */
export async function consumeRateLimit(
  bucket: string,
  identifier: string,
  limit: number,
  windowSeconds: number,
  conn: DbOrTx = db,
): Promise<{ allowed: boolean; count: number }> {
  const key = `${bucket}:${hmac(identifier)}`;
  const rows = await conn.execute<{ count: number }>(sql`
    insert into rate_limits (key, window_start, count) values (${key}, now(), 1)
    on conflict (key) do update set
      count = case when rate_limits.window_start < now() - make_interval(secs => ${windowSeconds})
                   then 1 else rate_limits.count + 1 end,
      window_start = case when rate_limits.window_start < now() - make_interval(secs => ${windowSeconds})
                   then now() else rate_limits.window_start end
    returning count
  `);
  const count = Number(rows[0]?.count ?? 0);
  return { allowed: count <= limit, count };
}

export async function enforceRateLimit(bucket: string, identifier: string, limit: number, windowSeconds: number) {
  const { allowed } = await consumeRateLimit(bucket, identifier, limit, windowSeconds);
  if (!allowed) throw rateLimited();
}

/** Limites padrão por ponto vulnerável. Ajuste aqui, não espalhado pelo código. */
export const LIMITS = {
  login: { limit: 8, window: 15 * 60 },
  mfa: { limit: 10, window: 15 * 60 },
  passwordResetIp: { limit: 10, window: 60 * 60 },
  passwordResetEmail: { limit: 3, window: 60 * 60 },
  signup: { limit: 5, window: 60 * 60 },
  createRequest: { limit: 10, window: 24 * 60 * 60 },
  quote: { limit: 60, window: 60 * 60 },
  message: { limit: 60, window: 10 * 60 },
  upload: { limit: 40, window: 60 * 60 },
  ticket: { limit: 10, window: 60 * 60 },
  track: { limit: 120, window: 60 },
} as const;
