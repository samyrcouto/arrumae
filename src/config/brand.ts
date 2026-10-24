/**
 * Identidade da marca centralizada. Nome do MVP: "Arrumaê" (antes "Desenrola
 * Casa"). Ainda sem busca no INPI nem verificação de domínio (docs/DECISIONS.md).
 * Trocar o nome = editar este arquivo, os tokens de cor em globals.css e
 * public/icon.svg.
 */
export const brand = {
  name: "Arrumaê",
  shortName: "Arrumaê",
  // Logo em duas partes: o "ê" final ganha a cor da marca.
  logo: { main: "Arruma", accent: "ê" },
  monogram: "A",
  tagline: "O conserto da sua casa, sem enrolação.",
  description:
    "Peça pequenos reparos em casa, receba propostas com preço e horário de profissionais verificados e acompanhe tudo até o fim.",
  city: "São Paulo",
  supportEmail: "suporte@exemplo.com.br", // placeholder — definir antes do lançamento
  // Cores espelhadas de globals.css (usadas em manifest/metadata)
  colors: { primary: "#0e4a57", accent: "#f2b33d", paper: "#f7f3ec", ink: "#18202c" },
} as const;
