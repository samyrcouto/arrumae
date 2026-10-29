import { describe, expect, it } from "vitest";
import { blindIndex, decryptField, encryptField, isEncrypted } from "@/server/security/field-crypto";
import { base32Decode, base32Encode, generateTotpSecret, matchTotp, otpauthUri, totpCode, totpStep } from "@/server/security/totp";

describe("TOTP (RFC 6238)", () => {
  // Vetores oficiais do apêndice B da RFC 6238 (SHA-1), últimos 6 dígitos.
  const secret = base32Encode(Buffer.from("12345678901234567890"));
  it.each([
    [59, "287082"],
    [1111111109, "081804"],
    [1111111111, "050471"],
    [1234567890, "005924"],
    [2000000000, "279037"],
  ])("t=%i → %s", (t, code) => {
    expect(totpCode(secret, Math.floor(t / 30))).toBe(code);
  });

  it("base32 ida e volta; segredo novo tem 160 bits", () => {
    expect(secret).toBe("GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ");
    expect(base32Decode(secret).toString()).toBe("12345678901234567890");
    expect(base32Decode(generateTotpSecret())).toHaveLength(20);
  });

  it("aceita o intervalo vizinho (relógio torto), recusa o resto", () => {
    const s = generateTotpSecret();
    const now = Date.now();
    const step = totpStep(now);
    expect(matchTotp(s, totpCode(s, step), now)).toBe(step);
    expect(matchTotp(s, totpCode(s, step - 1), now)).toBe(step - 1);
    expect(matchTotp(s, totpCode(s, step + 2), now)).toBeNull();
    expect(matchTotp(s, "12345", now)).toBeNull();
    expect(matchTotp(s, "abcdef", now)).toBeNull();
  });

  it("URI do app autenticador", () => {
    const uri = otpauthUri("ABCD", "ana@teste.com", "Arrumaê");
    expect(uri).toMatch(/^otpauth:\/\/totp\/Arruma%C3%AA%3Aana%40teste\.com\?/);
    expect(uri).toContain("secret=ABCD");
  });
});

describe("criptografia de campos", () => {
  it("cifra com IV aleatório e decifra", () => {
    const a = encryptField("52998224725", "pro_profiles.cpf");
    const b = encryptField("52998224725", "pro_profiles.cpf");
    expect(a).not.toBe(b);
    expect(isEncrypted(a)).toBe(true);
    expect(a).not.toContain("52998224725");
    expect(decryptField(a, "pro_profiles.cpf")).toBe("52998224725");
  });

  it("valor adulterado ou trocado de coluna dá erro, nunca dado errado", () => {
    const v = encryptField("52998224725", "pro_profiles.cpf");
    const last = v.at(-2) === "A" ? "B" : "A";
    expect(() => decryptField(v.slice(0, -2) + last + v.at(-1), "pro_profiles.cpf")).toThrow();
    expect(() => decryptField(v, "pro_profiles.cnpj")).toThrow();
  });

  it("texto puro antigo passa (até a migração regravar); índice cego é estável", () => {
    expect(decryptField("52998224725", "pro_profiles.cpf")).toBe("52998224725");
    expect(decryptField(null, "pro_profiles.cpf")).toBeNull();
    expect(blindIndex("52998224725", "c")).toBe(blindIndex("52998224725", "c"));
    expect(blindIndex("52998224725", "c")).not.toBe(blindIndex("11144477735", "c"));
  });
});
