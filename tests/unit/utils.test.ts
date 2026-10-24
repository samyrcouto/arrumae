import { describe, expect, it } from "vitest";
import { formatPhone, isValidCpf, normalizeCep, normalizePhone } from "@/lib/br";
import { localWeekdayMinute, parseLocalDateTime } from "@/lib/datetime";
import { maskContacts } from "@/server/domain/contact-masking";
import { commissionFor, parseBRL } from "@/server/domain/money";
import { detectType } from "@/server/security/uploads";

describe("dinheiro", () => {
  it("interpreta valores em reais", () => {
    expect(parseBRL("150")).toBe(15000);
    expect(parseBRL("150,5")).toBe(15050);
    expect(parseBRL("R$ 1.234,56")).toBe(123456);
    expect(parseBRL("1.500")).toBe(150000);
    expect(parseBRL("89.90")).toBe(8990);
    expect(parseBRL("abc")).toBeNull();
    expect(parseBRL("")).toBeNull();
    expect(parseBRL("-10")).toBeNull();
  });
  it("calcula comissão sem perder centavos", () => {
    expect(commissionFor(15000, 1500)).toEqual({ commissionCents: 2250, proNetCents: 12750 });
    const { commissionCents, proNetCents } = commissionFor(9999, 1234);
    expect(commissionCents + proNetCents).toBe(9999);
    expect(() => commissionFor(100, 20000)).toThrow();
  });
});

describe("dados brasileiros", () => {
  it("valida CPF", () => {
    expect(isValidCpf("529.982.247-25")).toBe(true);
    expect(isValidCpf("111.111.111-11")).toBe(false);
    expect(isValidCpf("529.982.247-24")).toBe(false);
  });
  it("normaliza CEP e telefone", () => {
    expect(normalizeCep("05422-010")).toBe("05422010");
    expect(normalizeCep("0542")).toBeNull();
    expect(normalizePhone("+55 (11) 98765-4321")).toBe("11987654321");
    expect(normalizePhone("123")).toBeNull();
    expect(formatPhone("11987654321")).toBe("(11) 98765-4321");
  });
});

describe("datas em São Paulo", () => {
  it("converte horário local de SP para UTC", () => {
    expect(parseLocalDateTime("2026-11-10T09:30")?.toISOString()).toBe("2026-11-10T12:30:00.000Z");
    expect(parseLocalDateTime("10/11/2026")).toBeNull();
  });
  it("calcula dia da semana e minuto local", () => {
    // 2026-11-10 02:00Z = 2026-11-09 23:00 em SP (segunda-feira)
    expect(localWeekdayMinute(new Date("2026-11-10T02:00:00Z"))).toEqual({ weekday: 1, minute: 23 * 60 });
  });
});

describe("ocultação de contatos antes do agendamento", () => {
  it("oculta telefone, e-mail e links de mensageiros", () => {
    for (const s of ["me liga 11 98765-4321", "(11)987654321", "email joao@gmail.com", "wa.me/5511987654321"]) {
      expect(maskContacts(s).masked).toBe(true);
    }
  });
  it("não altera texto comum nem valores", () => {
    const t = "Consigo fazer amanhã às 14h por R$ 150,00, levo 2 horas.";
    expect(maskContacts(t)).toEqual({ text: t, masked: false });
  });
});

describe("detecção de tipo de arquivo por conteúdo", () => {
  it("reconhece assinaturas e recusa o resto", () => {
    expect(detectType(Buffer.from([0xff, 0xd8, 0xff, 0xe0]))).toBe("image/jpeg");
    expect(detectType(Buffer.from("%PDF-1.7"))).toBe("application/pdf");
    expect(detectType(Buffer.from("<html><script>"))).toBeNull();
    expect(detectType(Buffer.from("GIF89a"))).toBeNull();
  });
});
