import "server-only";
import { timingSafeEqual } from "node:crypto";

/** Compara `Authorization: Bearer <token>` com o segredo em tempo constante. */
export function bearerMatches(authorization: string | null, secret: string): boolean {
  const given = Buffer.from(authorization?.replace(/^Bearer /, "") ?? "");
  const expected = Buffer.from(secret);
  return given.length === expected.length && timingSafeEqual(given, expected);
}
