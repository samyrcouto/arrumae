import { describe, expect, it } from "vitest";
import { matchService, POPULAR_REQUESTS } from "@/lib/service-match";

describe("descobrir o serviço pelo texto", () => {
  it.each([
    ["O chuveiro queimou", "eletrica"],
    ["tomada da cozinha não funciona", "eletrica"],
    ["Vazamento embaixo da pia", "encanador"],
    ["descarga não para de correr", "encanador"],
    ["Montar guarda-roupa de 6 portas", "montagem-de-moveis"],
    ["instalar suporte de TV 55", "pequenos-reparos"],
    ["Ar condicionado não gela", "ar-condicionado"],
    ["limpeza do split da sala", "ar-condicionado"],
    ["PRATELEIRA na parede", "pequenos-reparos"],
  ])("%s → %s", (text, slug) => {
    expect(matchService(text)).toBe(slug);
  });

  it("sem pista, não chuta", () => {
    expect(matchService("")).toBeNull();
    expect(matchService("pintar a casa inteira")).toBeNull();
    expect(matchService("tvz")).toBeNull(); // palavra curta só conta inteira
  });

  it("toda sugestão pronta leva a um serviço", () => {
    for (const p of POPULAR_REQUESTS) expect(matchService(p)).not.toBeNull();
  });
});
