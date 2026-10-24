/**
 * Identidade da marca centralizada. Nome do MVP: "Arrumaê" (antes "Desenrola
 * Casa"). Ainda sem busca no INPI nem verificação de domínio (docs/DECISIONS.md).
 * Logo e símbolo: src/components/brand/logo.tsx e public/icon.svg.
 * Cores: tokens em src/app/globals.css.
 */
export const brand = {
  name: "Arrumaê",
  shortName: "Arrumaê",
  tagline: "O conserto da sua casa, sem enrolação.",
  description:
    "Peça pequenos reparos em casa, receba propostas com preço e horário de profissionais verificados e acompanhe tudo até o fim.",
  city: "São Paulo",
  supportEmail: "suporte@exemplo.com.br", // placeholder — definir antes do lançamento
  // Cores espelhadas de globals.css (usadas em manifest/metadata)
  colors: { primary: "#0e4a57", accent: "#f2b33d", paper: "#f7f3ec", ink: "#18202c" },
} as const;
