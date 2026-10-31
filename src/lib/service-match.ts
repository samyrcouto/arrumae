/**
 * Descobre o serviço a partir do que a pessoa escreveu ("o chuveiro queimou",
 * "vazamento na pia"). Roda no navegador (prévia do combinado na home) e no
 * servidor (/pedir?titulo=… sem categoria). Palavras-chave dos exemplos de cada
 * categoria em scripts/seed.ts; ajuste aqui se um serviço novo entrar.
 */
const KEYWORDS: Record<string, string[]> = {
  "ar-condicionado": ["ar condicionado", "ar-condicionado", "split", "nao gela", "higieniz", "evaporadora", "condensadora"],
  eletrica: [
    "chuveiro", "tomada", "interruptor", "disjuntor", "lustre", "luminaria", "lampada", "ventilador", "fiacao", "fio ",
    "curto", "eletric", "luz", "spot", "plafon", "resistencia",
  ],
  encanador: [
    "vazamento", "vaza", "torneira", "pia", "ralo", "descarga", "sifao", "registro", "entupi", "cano", "filtro",
    "purificador", "caixa acoplada", "misturador", "hidraul", "goteira", "pingando",
  ],
  "montagem-de-moveis": [
    "montar", "montagem", "desmontar", "guarda-roupa", "guarda roupa", "armario", "cama", "berco", "comoda", "rack",
    "estante", "escrivaninha", "mesa", "movel", "moveis", "cabeceira", "sapateira",
  ],
  "pequenos-reparos": [
    "suporte", "tv", "televisao", "prateleira", "nicho", "quadro", "cortina", "persiana", "varao", "varal", "fechadura",
    "puxador", "furo", "furar", "pendurar", "espelho", "olho magico",
  ],
};

const normalize = (s: string) =>
  ` ${s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9-]+/g, " ")} `;

/** Slug da categoria mais provável, ou null se nada bater. */
export function matchService(text: string | null | undefined): string | null {
  if (!text || !text.trim()) return null;
  const t = normalize(text);
  let best: { slug: string; score: number } | null = null;
  for (const [slug, words] of Object.entries(KEYWORDS)) {
    let score = 0;
    for (const w of words) if (t.includes(w.length <= 3 ? ` ${w} ` : w)) score += w.length;
    if (score > 0 && (!best || score > best.score)) best = { slug, score };
  }
  return best?.slug ?? null;
}

/** Sugestões prontas mostradas abaixo do campo (pedidos mais comuns no piloto). */
export const POPULAR_REQUESTS = [
  "Trocar o chuveiro",
  "Vazamento na pia",
  "Montar guarda-roupa",
  "Instalar suporte de TV",
  "Limpar o ar-condicionado",
];
