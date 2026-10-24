/**
 * Antes do agendamento, telefones, e-mails e links de mensageiros são ocultados
 * nas mensagens. Motivos: segurança (golpes fora da plataforma) e manter o
 * histórico do combinado — base para suporte e contestações.
 */
const PATTERNS: RegExp[] = [
  /[\w.+-]+@[\w-]+(\.[\w-]+)+/g, // e-mail
  /(wa\.me|whatsapp\.com|t\.me|instagram\.com)\/\S*/gi, // links de mensageiros
  /(\+?55[\s.-]?)?\(?\d{2}\)?[\s.-]?9?\d{4}[\s.-]?\d{4}/g, // telefones BR
];

export const MASK = "[contato oculto até o agendamento]";

export function maskContacts(text: string): { text: string; masked: boolean } {
  let out = text;
  for (const p of PATTERNS) out = out.replace(p, MASK);
  return { text: out, masked: out !== text };
}
