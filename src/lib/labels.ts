/** Rótulos em português para enums do banco. Fonte única para a interface. */
export const REQUEST_STATUS_LABEL = {
  open: "Recebendo propostas",
  scheduled: "Agendado",
  in_progress: "Em andamento",
  awaiting_confirmation: "Aguardando sua confirmação",
  completed: "Concluído",
  disputed: "Em análise pela equipe",
  cancelled: "Cancelado",
  expired: "Expirado",
} as const;

export const REQUEST_STATUS_LABEL_PRO: Record<keyof typeof REQUEST_STATUS_LABEL, string> = {
  ...REQUEST_STATUS_LABEL,
  awaiting_confirmation: "Aguardando confirmação do cliente",
};

export type Tone = "neutral" | "brand" | "ok" | "warn" | "danger" | "tape";

export const REQUEST_STATUS_TONE: Record<keyof typeof REQUEST_STATUS_LABEL, Tone> = {
  open: "tape",
  scheduled: "brand",
  in_progress: "brand",
  awaiting_confirmation: "warn",
  completed: "ok",
  disputed: "danger",
  cancelled: "neutral",
  expired: "neutral",
};

export const URGENCY_LABEL = { today: "Hoje", this_week: "Esta semana", flexible: "Sem pressa" } as const;

export const QUOTE_STATUS_LABEL = {
  pending: "Aguardando resposta",
  accepted: "Aceita",
  rejected: "Recusada",
  withdrawn: "Retirada",
  superseded: "Outra proposta escolhida",
  expired: "Expirada",
  cancelled: "Cancelada",
} as const;

export const VERIFICATION_LABEL = {
  draft: "Cadastro incompleto",
  pending_review: "Em análise",
  approved: "Aprovado",
  rejected: "Precisa de ajustes",
  suspended: "Suspenso",
} as const;

export const VERIFICATION_TONE: Record<keyof typeof VERIFICATION_LABEL, Tone> = {
  draft: "neutral",
  pending_review: "warn",
  approved: "ok",
  rejected: "danger",
  suspended: "danger",
};

export const DOCUMENT_KIND_LABEL = {
  identity: "Documento de identidade (RG/CNH)",
  address_proof: "Comprovante de endereço",
  certificate: "Certificado/curso (ex.: NR-10)",
  other: "Outro",
} as const;

export const DOCUMENT_STATUS_LABEL = { pending: "Em análise", accepted: "Aceito", rejected: "Recusado" } as const;

export const TICKET_CATEGORY_LABEL = {
  question: "Dúvida",
  complaint: "Reclamação",
  payment: "Pagamento",
  safety: "Segurança",
  review_report: "Denúncia de avaliação",
  account: "Minha conta",
} as const;

export const TICKET_STATUS_LABEL = {
  open: "Aberto",
  in_progress: "Em atendimento",
  waiting_user: "Aguardando você",
  resolved: "Resolvido",
  closed: "Encerrado",
} as const;

export const ROLE_LABEL = { client: "Cliente", pro: "Profissional", admin: "Admin" } as const;
