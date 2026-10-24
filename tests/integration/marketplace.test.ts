import { and, eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/server/db/client";
import {
  auditLogs,
  outboundMessages,
  payments,
  quotes,
  requestInvitations,
  reviews,
  serviceRequests,
  settlements,
} from "@/server/db/schema";
import { DomainError } from "@/server/domain/errors";
import {
  acceptQuote,
  decidePriceRevision,
  listMessages,
  proposePriceRevision,
  rejectQuote,
  sendMessage,
  submitQuote,
} from "@/server/services/quotes";
import {
  createServiceRequest,
  getRequestDetail,
  listProOpportunities,
  performRequestAction,
  runLifecycleJobs,
} from "@/server/services/requests";
import { createReview, flagReview, moderateReview } from "@/server/services/reviews";
import {
  fixedQuote,
  inHours,
  jpegFile,
  makeAdmin,
  makeClient,
  makePro,
  requestInput,
  resetDb,
  seedBase,
  shiftSchedule,
} from "./helpers";

let base: Awaited<ReturnType<typeof seedBase>>;

beforeEach(async () => {
  await resetDb();
  base = await seedBase();
});

const expectDomainError = async (p: Promise<unknown>, code?: DomainError["code"]) => {
  const err = await p.then(
    () => null,
    (e) => e,
  );
  expect(err).toBeInstanceOf(DomainError);
  if (code) expect((err as DomainError).code).toBe(code);
};

async function scenario() {
  const client = await makeClient();
  const pro = await makePro({ categoryIds: [base.cat.id], regionIds: [base.region.id] });
  const { id } = await createServiceRequest(client, requestInput(base.cat.id), [await jpegFile()]);
  return { client, pro, requestId: id };
}

describe("fluxo completo de contratação", () => {
  it("solicitação → proposta → aceite → execução → conclusão → avaliação", async () => {
    const { client, pro, requestId } = await scenario();

    // Profissional elegível foi convidado e vê a oportunidade sem endereço completo.
    const opps = await listProOpportunities(pro);
    expect(opps.map((o) => o.id)).toContain(requestId);
    const proView = await getRequestDetail(pro, requestId);
    expect(proView.request.addressLine).toBeNull();
    expect(proView.client?.phone).toBeNull();
    expect(proView.request.cep).toBe("05422***");
    expect(proView.request.clientId).toBe("");
    expect(proView.photos).toHaveLength(1);

    const { quoteId } = await submitQuote(pro, fixedQuote(requestId));
    await acceptQuote(client, { quoteId, slotIndex: 0 });

    const afterAccept = await getRequestDetail(pro, requestId);
    expect(afterAccept.request.status).toBe("scheduled");
    expect(afterAccept.request.addressLine).toBe("Rua Teste, 100"); // revelado após agendamento
    expect(afterAccept.client?.phone).toBe("11987654321");

    await shiftSchedule(requestId, 30);
    await performRequestAction(pro, requestId, "start");
    await proposePriceRevision(pro, { requestId, newAmountCents: 18000, reason: "Fiação do chuveiro precisou ser trocada." });
    await expectDomainError(performRequestAction(pro, requestId, "complete"), "conflict"); // revisão pendente
    const detail = await getRequestDetail(client, requestId);
    await decidePriceRevision(client, detail.revisions[0].id, true);
    await performRequestAction(pro, requestId, "complete");
    await performRequestAction(client, requestId, "confirm", { declaredPaid: true });

    const [r] = await db.select().from(serviceRequests).where(eq(serviceRequests.id, requestId));
    expect(r.status).toBe("completed");
    expect(r.finalAmountCents).toBe(18000);

    const [s] = await db.select().from(settlements).where(eq(settlements.requestId, requestId));
    expect(s).toMatchObject({ grossCents: 18000, commissionBps: 1500, commissionCents: 2700, proNetCents: 15300, status: "waived" });
    const [p] = await db.select().from(payments).where(eq(payments.requestId, requestId));
    expect(p).toMatchObject({ provider: "offline", status: "declared_offline" });

    await createReview(client, { requestId, rating: 5, comment: "Ótimo serviço" });
    await expectDomainError(createReview(client, { requestId, rating: 4, comment: "de novo" }), "conflict");

    // E-mails ficam registrados como "skipped" no driver console (nenhum envio real).
    const mails = await db.select().from(outboundMessages);
    expect(mails.length).toBeGreaterThan(0);
    expect(mails.every((m) => m.status === "skipped")).toBe(true);
  });

  it("visita técnica: preço final só após aprovação do cliente", async () => {
    const client = await makeClient();
    const pro = await makePro({ categoryIds: [base.visitCat.id], regionIds: [base.region.id] });
    const { id: requestId } = await createServiceRequest(client, requestInput(base.visitCat.id));

    // Categoria exige visita: proposta de preço fechado é recusada.
    await expectDomainError(submitQuote(pro, fixedQuote(requestId)), "validation");
    const { quoteId } = await submitQuote(
      pro,
      fixedQuote(requestId, { kind: "visit", amountCents: null, visitFeeCents: 8000, estimateMinCents: 30000, estimateMaxCents: 60000 }),
    );
    await acceptQuote(client, { quoteId, slotIndex: 0 });
    const [r] = await db.select().from(serviceRequests).where(eq(serviceRequests.id, requestId));
    expect(r.agreedAmountCents).toBe(8000);

    await shiftSchedule(requestId, 0);
    await performRequestAction(pro, requestId, "start");
    await proposePriceRevision(pro, { requestId, newAmountCents: 45000, reason: "Instalação completa com suporte e tubulação." });
    const d = await getRequestDetail(client, requestId);
    await decidePriceRevision(client, d.revisions[0].id, false); // recusou: só a visita é devida
    await performRequestAction(pro, requestId, "complete");
    const [done] = await db.select().from(serviceRequests).where(eq(serviceRequests.id, requestId));
    expect(done.finalAmountCents).toBe(8000);
  });
});

describe("autorização e visibilidade", () => {
  it("outro cliente e profissional não convidado não acessam a solicitação", async () => {
    const { requestId } = await scenario();
    const intruder = await makeClient();
    const otherPro = await makePro({ categoryIds: [base.visitCat.id], regionIds: [base.region.id] });
    await expectDomainError(getRequestDetail(intruder, requestId), "not_found");
    await expectDomainError(getRequestDetail(otherPro, requestId), "not_found");
    await expectDomainError(submitQuote(otherPro, fixedQuote(requestId)), "not_found");
  });

  it("profissional não aprovado não é convidado nem envia proposta", async () => {
    const client = await makeClient();
    const pending = await makePro({ categoryIds: [base.cat.id], regionIds: [base.region.id], approved: false });
    const { id } = await createServiceRequest(client, requestInput(base.cat.id));
    const inv = await db.select().from(requestInvitations).where(eq(requestInvitations.requestId, id));
    expect(inv).toHaveLength(0);
    await expectDomainError(submitQuote(pending, fixedQuote(id)), "forbidden");
  });

  it("profissional não aceita a própria proposta nem cliente age como profissional", async () => {
    const { client, pro, requestId } = await scenario();
    const { quoteId } = await submitQuote(pro, fixedQuote(requestId));
    await expectDomainError(acceptQuote(pro, { quoteId, slotIndex: 0 }), "forbidden");
    await acceptQuote(client, { quoteId, slotIndex: 0 });
    await shiftSchedule(requestId, 0);
    await expectDomainError(performRequestAction(client, requestId, "start"), "forbidden");
  });

  it("cliente não cria solicitação fora da área atendida", async () => {
    const client = await makeClient();
    await expectDomainError(createServiceRequest(client, requestInput(base.cat.id, { cep: "20040-020" })), "validation");
  });

  it("profissional não cria solicitação", async () => {
    const pro = await makePro({ categoryIds: [base.cat.id], regionIds: [base.region.id] });
    await expectDomainError(createServiceRequest(pro, requestInput(base.cat.id)), "forbidden");
  });
});

describe("regras de transição e concorrência", () => {
  it("operações fora de ordem são recusadas", async () => {
    const { client, pro, requestId } = await scenario();
    await expectDomainError(performRequestAction(client, requestId, "confirm"), "conflict");
    await expectDomainError(performRequestAction(pro, requestId, "complete"), "forbidden"); // ainda não designado
    const admin = await makeAdmin();
    await expectDomainError(performRequestAction(admin, requestId, "resolve_as_completed", { reason: "teste" }), "conflict");
  });

  it("duas propostas aceitas ao mesmo tempo: apenas uma vence", async () => {
    const client = await makeClient();
    const proA = await makePro({ categoryIds: [base.cat.id], regionIds: [base.region.id] });
    const proB = await makePro({ categoryIds: [base.cat.id], regionIds: [base.region.id] });
    const { id: requestId } = await createServiceRequest(client, requestInput(base.cat.id));
    const qa = await submitQuote(proA, fixedQuote(requestId));
    const qb = await submitQuote(proB, fixedQuote(requestId, { amountCents: 14000 }));
    const results = await Promise.allSettled([
      acceptQuote(client, { quoteId: qa.quoteId, slotIndex: 0 }),
      acceptQuote(client, { quoteId: qb.quoteId, slotIndex: 0 }),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const qs = await db.select().from(quotes).where(eq(quotes.requestId, requestId));
    expect(qs.filter((q) => q.status === "accepted")).toHaveLength(1);
    expect(qs.filter((q) => q.status === "superseded")).toHaveLength(1);
  });

  it("reenvio do mesmo formulário não duplica a solicitação", async () => {
    const client = await makeClient();
    const input = requestInput(base.cat.id);
    const [a, b] = await Promise.all([createServiceRequest(client, input), createServiceRequest(client, input)]);
    expect(a.id).toBe(b.id);
    const rows = await db.select().from(serviceRequests).where(eq(serviceRequests.clientId, client.id));
    expect(rows).toHaveLength(1);
  });

  it("limite de propostas por solicitação é respeitado", async () => {
    const client = await makeClient();
    const pros = await Promise.all(
      Array.from({ length: 5 }, () => makePro({ categoryIds: [base.cat.id], regionIds: [base.region.id] })),
    );
    const { id: requestId } = await createServiceRequest(client, requestInput(base.cat.id));
    const results = await Promise.allSettled(pros.map((p) => submitQuote(p, fixedQuote(requestId))));
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(4); // padrão: 4
  });

  it("profissional cancela: solicitação reabre e outra proposta volta a valer", async () => {
    const client = await makeClient();
    const proA = await makePro({ categoryIds: [base.cat.id], regionIds: [base.region.id] });
    const proB = await makePro({ categoryIds: [base.cat.id], regionIds: [base.region.id] });
    const { id: requestId } = await createServiceRequest(client, requestInput(base.cat.id));
    const qa = await submitQuote(proA, fixedQuote(requestId));
    const qb = await submitQuote(proB, fixedQuote(requestId));
    await acceptQuote(client, { quoteId: qa.quoteId, slotIndex: 0 });
    await expectDomainError(performRequestAction(proA, requestId, "pro_cancel"), "validation"); // motivo obrigatório
    await performRequestAction(proA, requestId, "pro_cancel", { reason: "Imprevisto familiar" });
    const [r] = await db.select().from(serviceRequests).where(eq(serviceRequests.id, requestId));
    expect(r.status).toBe("open");
    expect(r.proId).toBeNull();
    const [b] = await db.select().from(quotes).where(eq(quotes.id, qb.quoteId));
    expect(b.status).toBe("pending");
    await acceptQuote(client, { quoteId: qb.quoteId, slotIndex: 0 });
    await expectDomainError(submitQuote(proA, fixedQuote(requestId)), "conflict");
  });

  it("ausência do profissional reabre a solicitação e conta no perfil", async () => {
    const { client, pro, requestId } = await scenario();
    const { quoteId } = await submitQuote(pro, fixedQuote(requestId));
    await acceptQuote(client, { quoteId, slotIndex: 0 });
    await expectDomainError(performRequestAction(client, requestId, "report_pro_no_show"), "conflict");
    await shiftSchedule(requestId, -45);
    await performRequestAction(client, requestId, "report_pro_no_show");
    const [r] = await db.select().from(serviceRequests).where(eq(serviceRequests.id, requestId));
    expect(r.status).toBe("open");
  });
});

describe("contestação e moderação", () => {
  it("contestação abre chamado e só admin resolve", async () => {
    const { client, pro, requestId } = await scenario();
    const { quoteId } = await submitQuote(pro, fixedQuote(requestId));
    await acceptQuote(client, { quoteId, slotIndex: 0 });
    await shiftSchedule(requestId, 0);
    await performRequestAction(pro, requestId, "start");
    await performRequestAction(pro, requestId, "complete");
    await performRequestAction(client, requestId, "open_dispute", { reason: "O chuveiro continua sem esquentar." });
    await expectDomainError(createReview(client, { requestId, rating: 1, comment: "" }), "conflict");
    await expectDomainError(
      performRequestAction(client, requestId, "resolve_as_completed", { reason: "quero resolver" }),
      "forbidden",
    );
    const admin = await makeAdmin();
    await performRequestAction(admin, requestId, "resolve_as_completed", {
      reason: "Profissional retornou e corrigiu.",
      finalAmountCents: 12000,
    });
    const [r] = await db.select().from(serviceRequests).where(eq(serviceRequests.id, requestId));
    expect(r).toMatchObject({ status: "completed", finalAmountCents: 12000 });
    const logs = await db.select().from(auditLogs).where(eq(auditLogs.entityId, requestId));
    expect(logs.map((l) => l.action)).toContain("request.resolve_as_completed");
  });

  it("avaliação é imutável no banco e profissional só denuncia (não edita)", async () => {
    const { client, pro, requestId } = await scenario();
    const { quoteId } = await submitQuote(pro, fixedQuote(requestId));
    await acceptQuote(client, { quoteId, slotIndex: 0 });
    await shiftSchedule(requestId, 0);
    await performRequestAction(pro, requestId, "start");
    await performRequestAction(pro, requestId, "complete");
    await performRequestAction(client, requestId, "confirm");
    await createReview(client, { requestId, rating: 2, comment: "Atrasou" });
    const [rev] = await db.select().from(reviews).where(eq(reviews.requestId, requestId));
    await expect(db.update(reviews).set({ rating: 5 }).where(eq(reviews.id, rev.id))).rejects.toThrow();
    await flagReview(pro, rev.id, "O cliente não estava em casa no horário combinado.");
    const admin = await makeAdmin();
    await moderateReview(admin, rev.id, "published", "Avaliação legítima, mantida.");
    const [after] = await db.select().from(reviews).where(eq(reviews.id, rev.id));
    expect(after).toMatchObject({ rating: 2, status: "published" });
  });

  it("audit log é append-only", async () => {
    const admin = await makeAdmin();
    await moderateReview(admin, crypto.randomUUID(), "hidden", "teste de log").catch(() => {});
    await db.insert(auditLogs).values({ actorRole: "system", action: "teste", entityType: "x" });
    await expect(db.update(auditLogs).set({ action: "alterado" })).rejects.toThrow();
    await expect(db.delete(auditLogs)).rejects.toThrow();
  });
});

describe("mensagens e rotinas", () => {
  it("contatos ficam ocultos antes do agendamento e liberados depois", async () => {
    const { client, pro, requestId } = await scenario();
    const { quoteId } = await submitQuote(pro, fixedQuote(requestId));
    await sendMessage(pro, quoteId, "Me chama no 11 98765-4321");
    let msgs = await listMessages(client, quoteId);
    expect(msgs[0].body).not.toContain("98765");
    await acceptQuote(client, { quoteId, slotIndex: 0 });
    await sendMessage(pro, quoteId, "Meu número: 11 98765-4321");
    msgs = await listMessages(client, quoteId);
    expect(msgs[1].body).toContain("98765-4321");
    const stranger = await makeClient();
    await expectDomainError(listMessages(stranger, quoteId), "not_found");
  });

  it("solicitação expira e conclusão é confirmada automaticamente", async () => {
    const { client, pro, requestId } = await scenario();
    await db.update(serviceRequests).set({ expiresAt: inHours(-1) }).where(eq(serviceRequests.id, requestId));
    const second = await createServiceRequest(client, requestInput(base.cat.id));
    const { quoteId } = await submitQuote(pro, fixedQuote(second.id));
    await acceptQuote(client, { quoteId, slotIndex: 0 });
    await shiftSchedule(second.id, 0);
    await performRequestAction(pro, second.id, "start");
    await performRequestAction(pro, second.id, "complete");
    await db.update(serviceRequests).set({ completedAt: inHours(-80) }).where(eq(serviceRequests.id, second.id));

    const result = await runLifecycleJobs();
    expect(result).toMatchObject({ expired: 1, autoConfirmed: 1, failures: 0 });
    const rows = await db.select().from(serviceRequests);
    expect(rows.find((r) => r.id === requestId)?.status).toBe("expired");
    expect(rows.find((r) => r.id === second.id)?.status).toBe("completed");
    const [p] = await db.select().from(payments).where(and(eq(payments.requestId, second.id)));
    expect(p.status).toBe("pending"); // auto-confirmação não presume pagamento
  });

  it("cliente recusa proposta e ela não pode mais ser aceita", async () => {
    const { client, pro, requestId } = await scenario();
    const { quoteId } = await submitQuote(pro, fixedQuote(requestId));
    await rejectQuote(client, quoteId);
    await expectDomainError(acceptQuote(client, { quoteId, slotIndex: 0 }), "conflict");
  });
});
