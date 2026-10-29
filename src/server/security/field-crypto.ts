import "server-only";
import { createCipheriv, createDecipheriv, createHash, createHmac, hkdfSync, randomBytes } from "node:crypto";
import { env } from "../env";

/**
 * Criptografia de campos sensíveis (CPF, CNPJ, segredo do 2FA) feita pela
 * aplicação: AES-256-GCM com a chave fora do banco. Quem obtiver só uma cópia
 * do banco (backup, dump, acesso de leitura) não lê esses dados.
 *
 * Formato gravado: `enc:v1:<id da chave>:<base64url(iv | tag | cifrado)>`.
 * O id da chave permite trocar a chave sem perder o que foi gravado antes:
 * a antiga vai para DATA_ENCRYPTION_KEY_PREVIOUS e `npm run db:encrypt-pii`
 * regrava tudo com a nova.
 *
 * O `context` (ex.: "pro_profiles.cpf") entra como dado autenticado: um valor
 * cifrado não pode ser copiado de uma coluna para outra.
 */
const PREFIX = "enc:v1:";
const IV_BYTES = 12;
const TAG_BYTES = 16;

type Key = { id: string; enc: Buffer; index: Buffer };

function derive(secret: string): Key {
  const ikm = Buffer.from(secret, "utf8");
  const enc = Buffer.from(hkdfSync("sha256", ikm, "arrumae", "field-encryption", 32));
  const index = Buffer.from(hkdfSync("sha256", ikm, "arrumae", "blind-index", 32));
  return { id: createHash("sha256").update(enc).digest("hex").slice(0, 8), enc, index };
}

let cached: { current: Key; all: Map<string, Key> } | undefined;

function keys() {
  if (!cached) {
    const e = env();
    // Fora de produção, sem chave própria, deriva do APP_SECRET (env.ts exige a chave em produção).
    const current = derive(e.DATA_ENCRYPTION_KEY ?? `derived-from-app-secret:${e.APP_SECRET}`);
    const all = new Map([[current.id, current]]);
    if (e.DATA_ENCRYPTION_KEY_PREVIOUS) {
      const previous = derive(e.DATA_ENCRYPTION_KEY_PREVIOUS);
      all.set(previous.id, previous);
    }
    cached = { current, all };
  }
  return cached;
}

export const isEncrypted = (value: string | null | undefined) => !!value && value.startsWith(PREFIX);

/** Valor cifrado com a chave atual? (falso para texto puro ou chave antiga) */
export const isCurrentKey = (value: string) => value.startsWith(`${PREFIX}${keys().current.id}:`);

export function encryptField(plain: string, context: string): string {
  const { current } = keys();
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv("aes-256-gcm", current.enc, iv);
  cipher.setAAD(Buffer.from(context));
  const body = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return `${PREFIX}${current.id}:${Buffer.concat([iv, cipher.getAuthTag(), body]).toString("base64url")}`;
}

/**
 * Decifra um campo. Texto sem o prefixo é devolvido como está: são valores
 * gravados antes da criptografia, até `npm run db:encrypt-pii` rodar.
 * Valor adulterado ou de chave desconhecida gera erro (nunca dado errado).
 */
export function decryptField(stored: string | null | undefined, context: string): string | null {
  if (!stored) return null;
  if (!isEncrypted(stored)) return stored;
  const rest = stored.slice(PREFIX.length);
  const sep = rest.indexOf(":");
  const key = keys().all.get(rest.slice(0, sep));
  if (sep < 0 || !key) throw new Error(`Campo ${context} cifrado com uma chave que não está configurada`);
  const raw = Buffer.from(rest.slice(sep + 1), "base64url");
  const decipher = createDecipheriv("aes-256-gcm", key.enc, raw.subarray(0, IV_BYTES));
  decipher.setAAD(Buffer.from(context));
  decipher.setAuthTag(raw.subarray(IV_BYTES, IV_BYTES + TAG_BYTES));
  return Buffer.concat([decipher.update(raw.subarray(IV_BYTES + TAG_BYTES)), decipher.final()]).toString("utf8");
}

/**
 * "Índice cego": HMAC do valor, para achar registros com o mesmo CPF sem
 * decifrar nada. Muda se a chave mudar (o script de recriptografia recalcula).
 */
export const blindIndex = (value: string, context: string) =>
  createHmac("sha256", keys().current.index).update(`${context}:${value}`).digest("hex");
