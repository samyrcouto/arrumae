import { describe, expect, it } from "vitest";
import {
  availableActions,
  checkActionGuards,
  type GuardContext,
  REQUEST_ACTIONS,
  REQUEST_STATUSES,
  TERMINAL_STATUSES,
} from "@/server/domain/request-lifecycle";

const CLIENT = "client-1";
const PRO = "pro-1";
const now = new Date("2026-11-10T12:00:00Z");

const ctx = (over: Partial<GuardContext> = {}): GuardContext => ({
  status: "open",
  clientId: CLIENT,
  proId: null,
  scheduledStart: null,
  completedAt: null,
  expiresAt: new Date(now.getTime() + 86400_000),
  hasPendingRevision: false,
  autoConfirmHours: 72,
  ...over,
});
const client = { role: "client" as const, id: CLIENT };
const pro = { role: "pro" as const, id: PRO };
const otherClient = { role: "client" as const, id: "client-2" };
const otherPro = { role: "pro" as const, id: "pro-2" };
const admin = { role: "admin" as const, id: "admin-1" };
const system = { role: "system" as const, id: null };

describe("máquina de estados da solicitação", () => {
  it("nenhuma ação sai de estado terminal", () => {
    for (const def of Object.values(REQUEST_ACTIONS))
      for (const t of TERMINAL_STATUSES) expect(def.from as readonly string[]).not.toContain(t);
  });

  it("todo destino é um status conhecido", () => {
    for (const def of Object.values(REQUEST_ACTIONS)) expect(REQUEST_STATUSES).toContain(def.to);
  });

  it("apenas o dono aceita proposta", () => {
    expect(checkActionGuards("accept_quote", ctx(), client, now).ok).toBe(true);
    expect(checkActionGuards("accept_quote", ctx(), otherClient, now).ok).toBe(false);
    expect(checkActionGuards("accept_quote", ctx(), pro, now).ok).toBe(false);
    expect(checkActionGuards("accept_quote", ctx(), admin, now).ok).toBe(false);
  });

  it("não aceita proposta de solicitação expirada", () => {
    const r = checkActionGuards("accept_quote", ctx({ expiresAt: new Date(now.getTime() - 1) }), client, now);
    expect(r.ok).toBe(false);
  });

  it("impede iniciar antes da janela de 2h e por profissional não designado", () => {
    const scheduled = ctx({ status: "scheduled", proId: PRO, scheduledStart: new Date(now.getTime() + 3 * 3600_000) });
    expect(checkActionGuards("start", scheduled, pro, now).ok).toBe(false);
    const soon = { ...scheduled, scheduledStart: new Date(now.getTime() + 90 * 60_000) };
    expect(checkActionGuards("start", soon, pro, now).ok).toBe(true);
    expect(checkActionGuards("start", soon, otherPro, now).ok).toBe(false);
  });

  it("ausência só depois de 30 minutos do horário", () => {
    const base = ctx({ status: "scheduled", proId: PRO });
    const at10 = { ...base, scheduledStart: new Date(now.getTime() - 10 * 60_000) };
    const at40 = { ...base, scheduledStart: new Date(now.getTime() - 40 * 60_000) };
    expect(checkActionGuards("report_pro_no_show", at10, client, now).ok).toBe(false);
    expect(checkActionGuards("report_pro_no_show", at40, client, now).ok).toBe(true);
    expect(checkActionGuards("report_client_no_show", at40, pro, now).ok).toBe(true);
    expect(checkActionGuards("report_client_no_show", at40, client, now).ok).toBe(false);
  });

  it("não conclui com revisão de preço pendente", () => {
    const c = ctx({ status: "in_progress", proId: PRO, hasPendingRevision: true });
    expect(checkActionGuards("complete", c, pro, now).ok).toBe(false);
    expect(checkActionGuards("complete", { ...c, hasPendingRevision: false }, pro, now).ok).toBe(true);
  });

  it("confirmação automática só após o prazo e apenas pelo sistema", () => {
    const c = ctx({ status: "awaiting_confirmation", proId: PRO, completedAt: new Date(now.getTime() - 71 * 3600_000) });
    expect(checkActionGuards("auto_confirm", c, system, now).ok).toBe(false);
    const due = { ...c, completedAt: new Date(now.getTime() - 73 * 3600_000) };
    expect(checkActionGuards("auto_confirm", due, system, now).ok).toBe(true);
    expect(checkActionGuards("auto_confirm", due, admin, now).ok).toBe(false);
  });

  it("resolução de contestação é exclusiva do admin", () => {
    const c = ctx({ status: "disputed", proId: PRO });
    expect(checkActionGuards("resolve_as_completed", c, admin, now).ok).toBe(true);
    expect(checkActionGuards("resolve_as_completed", c, client, now).ok).toBe(false);
    expect(checkActionGuards("resolve_as_cancelled", c, pro, now).ok).toBe(false);
  });

  it("cliente não confirma serviço que ainda não foi concluído (fora de ordem)", () => {
    expect(checkActionGuards("confirm", ctx({ status: "scheduled", proId: PRO }), client, now).ok).toBe(false);
    expect(checkActionGuards("confirm", ctx({ status: "in_progress", proId: PRO }), client, now).ok).toBe(false);
  });

  it("availableActions lista apenas ações válidas para o ator", () => {
    const c = ctx({ status: "scheduled", proId: PRO, scheduledStart: new Date(now.getTime() + 86400_000) });
    expect(availableActions(c, client, now)).toEqual(["client_cancel"]);
    expect(availableActions(c, pro, now)).toEqual(["pro_cancel"]);
    expect(availableActions(c, otherPro, now)).toEqual([]);
  });
});
