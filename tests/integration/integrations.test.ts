import { createServer, type IncomingMessage, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { eq, sql } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { db } from "@/server/db/client";
import { integrationEvents, serviceRequests, users } from "@/server/db/schema";
import { DomainError } from "@/server/domain/errors";
import {
  detectStaleRequests,
  dispatchIntegrationEvents,
  getReportingSnapshot,
  retryDelayMs,
  signWebhook,
  verifyWebhook,
} from "@/server/services/integrations";
import { acceptQuote, submitQuote } from "@/server/services/quotes";
import { createServiceRequest, performRequestAction } from "@/server/services/requests";
import { createReview } from "@/server/services/reviews";
import { openTicket } from "@/server/services/support";
import { fixedQuote, makeClient, makePro, requestInput, resetDb, seedBase, shiftSchedule } from "./helpers";

let base: Awaited<ReturnType<typeof seedBase>>;
const SECRET = "segredo-de-teste-0123456789abcdef0123456789";

beforeEach(async () => {
  await resetDb();
  base = await seedBase();
  delete process.env.INTEGRATION_WEBHOOK_URL;
  process.env.INTEGRATION_WEBHOOK_SECRET = SECRET;
});

const allEvents = () => db.select().from(integrationEvents).orderBy(integrationEvents.createdAt);

async function fullFlow() {
  const client = await makeClient();
  const pro = await makePro({ categoryIds: [base.cat.id], regionIds: [base.region.id] });
  const { id: requestId } = await createServiceRequest(client, requestInput(base.cat.id));
  const { quoteId } = await submitQuote(pro, fixedQuote(requestId));
  await acceptQuote(client, { quoteId, slotIndex: 0 });
  await shiftSchedule(requestId, 0);
  await performRequestAction(pro, requestId, "start");
  await performRequestAction(pro, requestId, "complete");
  await performRequestAction(client, requestId, "confirm", { declaredPaid: true });
  await createReview(client, { requestId, rating: 5, comment: "Muito bom, recomendo o serviço." });
  await openTicket(client, { category: "question", subject: "Dúvida sobre o recibo", body: "Onde vejo o recibo do serviço?", requestId });
  return { client, pro, requestId };
}

describe("eventos de integração (outbox)", () => {
  it("o fluxo completo gera os eventos certos, sem dados pessoais", async () => {
    const { client, requestId } = await fullFlow();
    const events = await allEvents();
    expect(events.map((e) => e.type)).toEqual([
      "request.created",
      "quote.submitted",
      "request.status_changed", // aceite
      "request.status_changed", // início
      "request.status_changed", // conclusão
      "request.status_changed", // confirmação
      "review.created",
      "support.ticket_opened",
    ]);
    const changes = events.filter((e) => e.type === "request.status_changed").map((e) => e.payload.to);
    expect(changes).toEqual(["scheduled", "in_progress", "awaiting_confirmation", "completed"]);
    expect(events[0].payload).toMatchObject({ requestId, category: { slug: "eletrica" }, invitedPros: 1, noEligiblePros: false });

    // Nenhum payload carrega nome, e-mail, telefone, endereço, CEP, título ou descrição.
    const [u] = await db.select().from(users).where(eq(users.id, client.id));
    const input = requestInput(base.cat.id);
    const all = JSON.stringify(events.map((e) => e.payload));
    for (const pii of [u.name, u.email, "11987654321", input.addressLine, input.title, input.description, "05422", "Dúvida sobre o recibo"])
      expect(all).not.toContain(pii);
  });

  it("se a operação falha, nenhum evento é gravado", async () => {
    const client = await makeClient();
    await makePro({ categoryIds: [base.cat.id], regionIds: [base.region.id] });
    const { id: requestId } = await createServiceRequest(client, requestInput(base.cat.id));
    const before = (await allEvents()).length;
    const err = await createReview(client, { requestId, rating: 5, comment: "" }).catch((e) => e);
    expect(err).toBeInstanceOf(DomainError);
    expect((await allEvents()).length).toBe(before);
  });

  it("alerta de solicitação parada sai uma única vez", async () => {
    const client = await makeClient();
    const { id: requestId } = await createServiceRequest(client, requestInput(base.cat.id));
    await db.update(serviceRequests).set({ createdAt: new Date(Date.now() - 3 * 3600_000) }).where(eq(serviceRequests.id, requestId));
    expect(await detectStaleRequests()).toBe(1);
    expect(await detectStaleRequests()).toBe(0);
    const stale = (await allEvents()).filter((e) => e.type === "request.stale");
    expect(stale).toHaveLength(1);
    expect(stale[0].payload).toMatchObject({ requestId, pendingQuotes: 0 });
  });
});

describe("entrega por webhook", () => {
  let server: Server;
  let received: { headers: IncomingMessage["headers"]; body: string }[];
  let statusCode: number;

  beforeEach(async () => {
    received = [];
    statusCode = 200;
    server = createServer((req, res) => {
      let body = "";
      req.on("data", (c) => (body += c));
      req.on("end", () => {
        received.push({ headers: req.headers, body });
        res.writeHead(statusCode).end();
      });
    });
    await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
    process.env.INTEGRATION_WEBHOOK_URL = `http://127.0.0.1:${(server.address() as AddressInfo).port}/webhook`;
  });
  afterEach(async () => {
    await new Promise((r) => server.close(r));
  });

  it("entrega assinada; quem recebe consegue validar a assinatura", async () => {
    await fullFlow();
    const res = await dispatchIntegrationEvents();
    expect(res).toMatchObject({ configured: true, delivered: 8, retrying: 0, failed: 0 });
    expect(received).toHaveLength(8);
    for (const r of received) {
      const ts = Number(r.headers["x-arrumae-timestamp"]);
      expect(verifyWebhook(SECRET, ts, r.body, String(r.headers["x-arrumae-signature"]))).toBe(true);
      expect(verifyWebhook("outro-segredo-0123456789abcdef0123456789", ts, r.body, String(r.headers["x-arrumae-signature"]))).toBe(false);
      const parsed = JSON.parse(r.body);
      expect(parsed.type).toBe(r.headers["x-arrumae-event"]);
      expect(parsed.id).toBe(r.headers["x-arrumae-delivery"]);
    }
    expect((await allEvents()).every((e) => e.status === "delivered")).toBe(true);
    // Já entregues não saem de novo.
    expect((await dispatchIntegrationEvents()).delivered).toBe(0);
  });

  it("falha do destino: re-tenta com espera crescente e desiste depois de 8 tentativas", async () => {
    statusCode = 500;
    const client = await makeClient();
    await createServiceRequest(client, requestInput(base.cat.id));
    let now = new Date();
    const first = await dispatchIntegrationEvents(now);
    expect(first).toMatchObject({ delivered: 0, retrying: 1 });
    let [ev] = await allEvents();
    expect(ev).toMatchObject({ status: "pending", attempts: 1, lastError: "HTTP 500" });
    expect(ev.nextAttemptAt.getTime()).toBeGreaterThan(now.getTime());
    // Antes do horário da próxima tentativa nada é reenviado.
    expect((await dispatchIntegrationEvents(now)).retrying).toBe(0);
    for (let i = 0; i < 7; i++) {
      now = new Date(now.getTime() + 7 * 3600_000);
      await dispatchIntegrationEvents(now);
    }
    [ev] = await allEvents();
    expect(ev).toMatchObject({ status: "failed", attempts: 8 });
    expect(received).toHaveLength(8);
  });

  it("sem URL configurada, nada é enviado e os eventos ficam na fila", async () => {
    delete process.env.INTEGRATION_WEBHOOK_URL;
    const client = await makeClient();
    await createServiceRequest(client, requestInput(base.cat.id));
    expect(await dispatchIntegrationEvents()).toMatchObject({ configured: false });
    expect((await allEvents())[0].status).toBe("pending");
  });
});

describe("assinatura e relatórios", () => {
  it("assinatura expira (proteção contra reenvio) e espera cresce até 6 h", () => {
    const body = '{"a":1}';
    const ts = Math.floor(Date.now() / 1000);
    const sig = signWebhook(SECRET, ts, body);
    expect(verifyWebhook(SECRET, ts, body, sig)).toBe(true);
    expect(verifyWebhook(SECRET, ts, '{"a":2}', sig)).toBe(false);
    expect(verifyWebhook(SECRET, ts - 600, body, signWebhook(SECRET, ts - 600, body))).toBe(false);
    expect(retryDelayMs(1)).toBe(60_000);
    expect(retryDelayMs(3)).toBe(240_000);
    expect(retryDelayMs(20)).toBe(6 * 3600_000);
  });

  it("resumo de indicadores lê as views de relatório e ignora dados de demonstração", async () => {
    await fullFlow();
    const client = await makeClient();
    const { id: demoId } = await createServiceRequest(client, requestInput(base.cat.id));
    await db.update(serviceRequests).set({ isDemo: true }).where(eq(serviceRequests.id, demoId));
    const snap = await getReportingSnapshot(1);
    expect(snap.requests).toMatchObject({ created: 1, with_quote: 1, booked: 1, completed: 1 });
    expect(snap.byCategory).toEqual([{ category: "eletrica", name: "Eletricista", created: 1 }]);
    expect(snap.finance.services).toBe(1);
    expect(snap.finance.grossCents).toBe(15000);
    expect(snap.pros.approved).toBe(1);
    expect(snap.openTickets[0]).toMatchObject({ category: "question", tickets: 1 });
    // As views não expõem colunas pessoais.
    const cols = await db.execute<{ column_name: string }>(
      sql`select column_name from information_schema.columns where table_schema = 'reporting'`,
    );
    const names = cols.map((c) => c.column_name);
    for (const c of ["email", "phone", "name", "address_line", "cep", "description", "title", "client_id", "pro_id", "cpf"])
      expect(names).not.toContain(c);
  });
});
