/**
 * Máquina de estados da solicitação de serviço.
 *
 * Toda mudança de status passa por `REQUEST_ACTIONS`. O serviço aplica a
 * transição com UPDATE condicional (WHERE status IN from), o que torna a
 * operação atômica e impede ações fora de ordem mesmo com requisições
 * concorrentes. Regras de propriedade (dono / profissional designado) e de
 * horário ficam em `checkActionGuards`.
 *
 * Diagrama e políticas: docs/PRODUCT.md#ciclo-de-vida
 */
import type { UserRole } from "./actor";

export const REQUEST_STATUSES = [
  "open",
  "scheduled",
  "in_progress",
  "awaiting_confirmation",
  "completed",
  "disputed",
  "cancelled",
  "expired",
] as const;
export type RequestStatus = (typeof REQUEST_STATUSES)[number];

export const TERMINAL_STATUSES: readonly RequestStatus[] = ["completed", "cancelled", "expired"];

type Who = UserRole | "system";
/** Relação exigida entre o ator e a solicitação. */
type Relation = "owner" | "assigned_pro" | "owner_or_assigned_pro" | "any";

type ActionDef = {
  from: readonly RequestStatus[];
  to: RequestStatus;
  actors: readonly Who[];
  relation: Relation;
  label: string;
};

export const REQUEST_ACTIONS = {
  accept_quote: { from: ["open"], to: "scheduled", actors: ["client"], relation: "owner", label: "Proposta aceita" },
  client_cancel: {
    from: ["open", "scheduled"],
    to: "cancelled",
    actors: ["client"],
    relation: "owner",
    label: "Cancelada pelo cliente",
  },
  pro_cancel: {
    from: ["scheduled"],
    to: "open",
    actors: ["pro"],
    relation: "assigned_pro",
    label: "Profissional cancelou — solicitação reaberta",
  },
  report_pro_no_show: {
    from: ["scheduled"],
    to: "open",
    actors: ["client"],
    relation: "owner",
    label: "Profissional não compareceu — solicitação reaberta",
  },
  report_client_no_show: {
    from: ["scheduled"],
    to: "cancelled",
    actors: ["pro"],
    relation: "assigned_pro",
    label: "Cliente ausente no horário combinado",
  },
  start: { from: ["scheduled"], to: "in_progress", actors: ["pro"], relation: "assigned_pro", label: "Atendimento iniciado" },
  complete: {
    from: ["in_progress"],
    to: "awaiting_confirmation",
    actors: ["pro"],
    relation: "assigned_pro",
    label: "Profissional informou conclusão",
  },
  confirm: {
    from: ["awaiting_confirmation"],
    to: "completed",
    actors: ["client"],
    relation: "owner",
    label: "Cliente confirmou a conclusão",
  },
  auto_confirm: {
    from: ["awaiting_confirmation"],
    to: "completed",
    actors: ["system"],
    relation: "any",
    label: "Conclusão confirmada automaticamente",
  },
  open_dispute: {
    from: ["in_progress", "awaiting_confirmation"],
    to: "disputed",
    actors: ["client", "pro"],
    relation: "owner_or_assigned_pro",
    label: "Contestação aberta",
  },
  resolve_as_completed: {
    from: ["disputed"],
    to: "completed",
    actors: ["admin"],
    relation: "any",
    label: "Contestação resolvida: serviço concluído",
  },
  resolve_as_cancelled: {
    from: ["disputed"],
    to: "cancelled",
    actors: ["admin"],
    relation: "any",
    label: "Contestação resolvida: serviço cancelado",
  },
  admin_cancel: {
    from: ["open", "scheduled", "in_progress", "awaiting_confirmation"],
    to: "cancelled",
    actors: ["admin"],
    relation: "any",
    label: "Cancelada pela equipe",
  },
  expire: { from: ["open"], to: "expired", actors: ["system"], relation: "any", label: "Expirada sem proposta aceita" },
} as const satisfies Record<string, ActionDef>;

export type RequestAction = keyof typeof REQUEST_ACTIONS;

/** Política de horários (minutos). Centralizada para ficar fácil de revisar. */
export const TIMING = {
  /** Profissional pode iniciar até 2h antes do horário marcado. */
  startEarliestBeforeMinutes: 120,
  /** Ausência só pode ser registrada 30 min após o início do horário marcado. */
  noShowAfterMinutes: 30,
  /** Cancelamento pelo cliente com menos de 24h é marcado como tardio. */
  lateCancelWindowMinutes: 24 * 60,
} as const;

export type GuardContext = {
  status: RequestStatus;
  clientId: string;
  proId: string | null;
  scheduledStart: Date | null;
  completedAt: Date | null;
  expiresAt: Date;
  hasPendingRevision: boolean;
  autoConfirmHours: number;
};

export type GuardActor = { role: Who; id: string | null };

export type GuardResult = { ok: true } | { ok: false; reason: string };

const deny = (reason: string): GuardResult => ({ ok: false, reason });

/** Verifica se `actor` pode executar `action` agora. Função pura — testada em tests/unit. */
export function checkActionGuards(action: RequestAction, ctx: GuardContext, actor: GuardActor, now: Date): GuardResult {
  const def: ActionDef = REQUEST_ACTIONS[action];

  if (!def.actors.includes(actor.role)) return deny("Você não tem permissão para esta ação.");

  const isOwner = actor.id !== null && actor.id === ctx.clientId;
  const isAssignedPro = actor.id !== null && ctx.proId !== null && actor.id === ctx.proId;
  if (def.relation === "owner" && !isOwner) return deny("Você não tem permissão para esta ação.");
  if (def.relation === "assigned_pro" && !isAssignedPro) return deny("Você não tem permissão para esta ação.");
  if (def.relation === "owner_or_assigned_pro" && !isOwner && !isAssignedPro)
    return deny("Você não tem permissão para esta ação.");

  if (!def.from.includes(ctx.status)) return deny("Esta ação não está disponível na etapa atual da solicitação.");

  const minutesToStart = ctx.scheduledStart ? (ctx.scheduledStart.getTime() - now.getTime()) / 60000 : null;

  switch (action) {
    case "accept_quote":
      if (now >= ctx.expiresAt) return deny("Esta solicitação expirou.");
      break;
    case "start":
      if (minutesToStart === null) return deny("Atendimento sem horário marcado.");
      if (minutesToStart > TIMING.startEarliestBeforeMinutes)
        return deny("O atendimento só pode ser iniciado no dia e horário combinados.");
      break;
    case "report_pro_no_show":
    case "report_client_no_show":
      if (minutesToStart === null || -minutesToStart < TIMING.noShowAfterMinutes)
        return deny("A ausência só pode ser registrada 30 minutos após o horário combinado.");
      break;
    case "complete":
      if (ctx.hasPendingRevision) return deny("Há uma alteração de preço aguardando resposta do cliente.");
      break;
    case "auto_confirm": {
      if (!ctx.completedAt) return deny("Conclusão sem data registrada.");
      const due = ctx.completedAt.getTime() + ctx.autoConfirmHours * 3600_000;
      if (now.getTime() < due) return deny("Prazo de confirmação ainda não terminou.");
      break;
    }
    case "expire":
      if (now < ctx.expiresAt) return deny("A solicitação ainda está no prazo.");
      break;
  }
  return { ok: true };
}

export function isLateCancellation(scheduledStart: Date | null, now: Date): boolean {
  if (!scheduledStart) return false;
  return (scheduledStart.getTime() - now.getTime()) / 60000 < TIMING.lateCancelWindowMinutes;
}

/** Ações disponíveis para exibir botões. A decisão final é sempre do servidor. */
export function availableActions(ctx: GuardContext, actor: GuardActor, now: Date): RequestAction[] {
  return (Object.keys(REQUEST_ACTIONS) as RequestAction[]).filter(
    (a) => a !== "accept_quote" && checkActionGuards(a, ctx, actor, now).ok,
  );
}
