import "server-only";
import { eq, isNotNull, or } from "drizzle-orm";
import { db } from "../db/client";
import { proProfiles, users } from "../db/schema";
import { decryptField, encryptField, isCurrentKey } from "../security/field-crypto";
import { CNPJ_CONTEXT, CPF_CONTEXT, sealProDocuments } from "./pro-pii";
import { TOTP_CONTEXT } from "./mfa";

/**
 * Regrava com a chave atual todo campo sensível que estiver em texto puro
 * (dados de antes da criptografia) ou cifrado com a chave anterior, e
 * recalcula o índice cego do CPF. Idempotente: roda a cada `npm run db:migrate`
 * e em `npm run db:encrypt-pii` (troca de chave).
 */
export async function reencryptSensitiveFields() {
  let profiles = 0;
  let secrets = 0;
  const rows = await db
    .select({ userId: proProfiles.userId, cpf: proProfiles.cpf, cnpj: proProfiles.cnpj, cpfHash: proProfiles.cpfHash })
    .from(proProfiles)
    .where(or(isNotNull(proProfiles.cpf), isNotNull(proProfiles.cnpj)));
  for (const r of rows) {
    const current = (v: string | null) => v === null || isCurrentKey(v);
    const cpf = decryptField(r.cpf, CPF_CONTEXT) ?? "";
    const sealed = sealProDocuments(cpf, decryptField(r.cnpj, CNPJ_CONTEXT) ?? "");
    if (current(r.cpf) && current(r.cnpj) && r.cpfHash === sealed.cpfHash) continue;
    await db.update(proProfiles).set(sealed).where(eq(proProfiles.userId, r.userId));
    profiles++;
  }
  const withTotp = await db.select({ id: users.id, totpSecret: users.totpSecret }).from(users).where(isNotNull(users.totpSecret));
  for (const u of withTotp) {
    if (isCurrentKey(u.totpSecret!)) continue;
    const plain = decryptField(u.totpSecret, TOTP_CONTEXT)!;
    await db.update(users).set({ totpSecret: encryptField(plain, TOTP_CONTEXT) }).where(eq(users.id, u.id));
    secrets++;
  }
  return { profiles, secrets };
}
