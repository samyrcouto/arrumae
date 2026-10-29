import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * TOTP (RFC 6238): o código de 6 dígitos que muda a cada 30 s nos apps
 * autenticadores (Google Authenticator, Microsoft Authenticator, Authy…).
 * Implementação própria, sem dependência: HMAC-SHA1 + truncamento (RFC 4226).
 */
export const TOTP_PERIOD = 30;
const DIGITS = 6;
const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function base32Encode(buf: Buffer): string {
  let bits = 0;
  let value = 0;
  let out = "";
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += B32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += B32[(value << (5 - bits)) & 31];
  return out;
}

export function base32Decode(text: string): Buffer {
  const clean = text.toUpperCase().replace(/[\s=-]/g, "");
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const ch of clean) {
    const idx = B32.indexOf(ch);
    if (idx < 0) throw new Error("Segredo base32 inválido");
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

/** Segredo novo de 160 bits (tamanho recomendado para HMAC-SHA1), em base32. */
export const generateTotpSecret = () => base32Encode(randomBytes(20));

export const totpStep = (now = Date.now()) => Math.floor(now / 1000 / TOTP_PERIOD);

export function totpCode(secret: string, step: number): string {
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(step));
  const mac = createHmac("sha1", base32Decode(secret)).update(counter).digest();
  const offset = mac[mac.length - 1] & 0x0f;
  const bin = (mac.readUInt32BE(offset) & 0x7fffffff) % 10 ** DIGITS;
  return bin.toString().padStart(DIGITS, "0");
}

/**
 * Confere um código aceitando 1 intervalo antes e depois (relógio do celular
 * adiantado ou atrasado). Devolve o intervalo aceito, para impedir reuso.
 */
export function matchTotp(secret: string, code: string, now = Date.now()): number | null {
  const digits = code.replace(/\s/g, "");
  if (!/^\d{6}$/.test(digits)) return null;
  const current = totpStep(now);
  for (const step of [current - 1, current, current + 1]) {
    if (timingSafeEqual(Buffer.from(totpCode(secret, step)), Buffer.from(digits))) return step;
  }
  return null;
}

/** Endereço `otpauth://` que o app autenticador lê pelo QR code. */
export function otpauthUri(secret: string, account: string, issuer: string) {
  const label = encodeURIComponent(`${issuer}:${account}`);
  const params = new URLSearchParams({ secret, issuer, algorithm: "SHA1", digits: String(DIGITS), period: String(TOTP_PERIOD) });
  return `otpauth://totp/${label}?${params}`;
}
