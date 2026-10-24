/** Regras monetárias. Valores sempre em centavos inteiros. */

export function commissionFor(grossCents: number, bps: number): { commissionCents: number; proNetCents: number } {
  if (!Number.isInteger(grossCents) || grossCents < 0) throw new Error("grossCents inválido");
  if (!Number.isInteger(bps) || bps < 0 || bps > 10_000) throw new Error("bps inválido");
  // Arredondamento bancário seria excesso aqui; arredondamos para o centavo mais próximo.
  const commissionCents = Math.round((grossCents * bps) / 10_000);
  return { commissionCents, proNetCents: grossCents - commissionCents };
}

/** Valor devido pelo cliente para uma proposta de visita após aprovação do orçamento final. */
export function visitFinalAmount(visitFeeCents: number, approvedServiceCents: number | null): number {
  // Se o cliente aprovou o serviço, a taxa de visita é abatida (já está incluída no total).
  // Se recusou, só a taxa de visita é devida.
  return approvedServiceCents ?? visitFeeCents;
}

/** Converte "150", "150,00", "1.234,56" ou "R$ 89,90" em centavos. Retorna null se inválido. */
export function parseBRL(input: string): number | null {
  const cleaned = input.replace(/R\$|\s/g, "").trim();
  if (!cleaned) return null;
  if (!/^\d{1,3}(\.\d{3})*(,\d{1,2})?$|^\d+(,\d{1,2})?$|^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  let normalized: string;
  if (cleaned.includes(",")) normalized = cleaned.replace(/\./g, "").replace(",", ".");
  else if (/^\d{1,3}(\.\d{3})+$/.test(cleaned)) normalized = cleaned.replace(/\./g, "");
  else normalized = cleaned;
  const value = Math.round(Number(normalized) * 100);
  return Number.isFinite(value) ? value : null;
}

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
export const formatBRL = (cents: number) => brl.format(cents / 100);
