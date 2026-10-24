"use server";

import { redirect } from "next/navigation";
import type { ActionResult } from "@/lib/action-result";
import { parseBRL } from "../domain/money";
import { getCurrentUser, requireUser, startSession, toActor } from "../auth/session";
import { invalid } from "../domain/errors";
import type { RequestAction } from "../domain/request-lifecycle";
import { enforceRateLimit, LIMITS } from "../security/rate-limit";
import { filesFrom } from "../security/uploads";
import { registerUser } from "../services/accounts";
import { trackServer } from "../services/analytics";
import { clientIp } from "../auth/session";
import {
  acceptQuote,
  decidePriceRevision,
  proposePriceRevision,
  rejectQuote,
  sendMessage,
} from "../services/quotes";
import { createServiceRequest, performRequestAction, validateRequestDraft, type CreateRequestInput } from "../services/requests";
import { createReview } from "../services/reviews";
import { bool, run, safePath, str } from "./run";

export async function createRequestAction(_: ActionResult, form: FormData): Promise<ActionResult> {
  return run(async () => {
    const input: CreateRequestInput = {
      categoryId: str(form, "categoryId"),
      title: str(form, "title"),
      description: str(form, "description"),
      cep: str(form, "cep"),
      neighborhood: str(form, "neighborhood"),
      addressLine: str(form, "addressLine"),
      addressComplement: str(form, "addressComplement"),
      urgency: str(form, "urgency") as CreateRequestInput["urgency"],
      preferredWindow: str(form, "preferredWindow"),
      submissionToken: str(form, "submissionToken"),
      utmSource: str(form, "utmSource") || undefined,
      utmMedium: str(form, "utmMedium") || undefined,
      utmCampaign: str(form, "utmCampaign") || undefined,
    };
    const photos = filesFrom(form, "photos");

    let user = await getCurrentUser();
    if (user && user.role !== "client") throw invalid("Para pedir um serviço, entre com uma conta de cliente.");
    if (!user) {
      // Visitante: valida o pedido antes de criar a conta.
      await validateRequestDraft(input);
      await enforceRateLimit("signup", await clientIp(), LIMITS.signup.limit, LIMITS.signup.window);
      const created = await registerUser({
        name: str(form, "name"),
        email: str(form, "email"),
        phone: str(form, "phone"),
        password: str(form, "password"),
        role: "client",
        acceptTerms: bool(form, "acceptTerms") as true,
        marketingConsent: bool(form, "marketingConsent"),
      });
      await trackServer("signup", { userId: created.id, props: { role: "client", via: "request" } });
      await startSession(created.id);
      user = { id: created.id, name: created.name, email: created.email, role: "client", isDemo: false };
    }
    const { id } = await createServiceRequest(toActor(user), input, photos);
    redirect(`/cliente/solicitacoes/${id}?nova=1`);
  });
}

const USER_ACTIONS: RequestAction[] = [
  "client_cancel",
  "pro_cancel",
  "report_pro_no_show",
  "report_client_no_show",
  "start",
  "complete",
  "confirm",
  "open_dispute",
  "admin_cancel",
  "resolve_as_completed",
  "resolve_as_cancelled",
];

export async function requestTransitionAction(_: ActionResult, form: FormData): Promise<ActionResult> {
  return run(async () => {
    const { actor } = await requireUser();
    const action = str(form, "action") as RequestAction;
    if (!USER_ACTIONS.includes(action)) throw invalid("Ação inválida.");
    const finalAmount = str(form, "finalAmount");
    const finalAmountCents = finalAmount ? parseBRL(finalAmount) : undefined;
    if (finalAmount && finalAmountCents === null) throw invalid("Valor inválido.", { finalAmount: "Valor inválido." });
    await performRequestAction(actor, str(form, "requestId"), action, {
      reason: str(form, "reason"),
      declaredPaid: bool(form, "declaredPaid"),
      finalAmountCents: finalAmountCents ?? undefined,
    });
    redirect(safePath(str(form, "returnTo")));
  });
}

export async function acceptQuoteAction(_: ActionResult, form: FormData): Promise<ActionResult> {
  return run(async () => {
    const { actor } = await requireUser(["client"]);
    const slot = str(form, "slotIndex");
    if (slot === "") throw invalid("Escolha um dos horários oferecidos.");
    const { requestId } = await acceptQuote(actor, { quoteId: str(form, "quoteId"), slotIndex: Number(slot) });
    redirect(`/cliente/solicitacoes/${requestId}?agendado=1`);
  });
}

export async function rejectQuoteAction(_: ActionResult, form: FormData): Promise<ActionResult> {
  return run(async () => {
    const { actor } = await requireUser(["client"]);
    await rejectQuote(actor, str(form, "quoteId"));
    redirect(safePath(str(form, "returnTo")));
  });
}

export async function sendMessageAction(_: ActionResult, form: FormData): Promise<ActionResult> {
  return run(async () => {
    const { actor } = await requireUser(["client", "pro"]);
    await sendMessage(actor, str(form, "quoteId"), str(form, "body"));
    redirect(safePath(str(form, "returnTo")));
  });
}

export async function proposeRevisionAction(_: ActionResult, form: FormData): Promise<ActionResult> {
  return run(async () => {
    const { actor } = await requireUser(["pro"]);
    const cents = parseBRL(str(form, "newAmount"));
    if (cents === null) throw invalid("Informe o novo valor.", { newAmount: "Informe o novo valor total." });
    await proposePriceRevision(actor, { requestId: str(form, "requestId"), newAmountCents: cents, reason: str(form, "reason") });
    redirect(safePath(str(form, "returnTo")));
  });
}

export async function decideRevisionAction(_: ActionResult, form: FormData): Promise<ActionResult> {
  return run(async () => {
    const { actor } = await requireUser(["client"]);
    await decidePriceRevision(actor, str(form, "revisionId"), str(form, "decision") === "approve");
    redirect(safePath(str(form, "returnTo")));
  });
}

export async function createReviewAction(_: ActionResult, form: FormData): Promise<ActionResult> {
  return run(async () => {
    const { actor } = await requireUser(["client"]);
    await createReview(actor, { requestId: str(form, "requestId"), rating: Number(str(form, "rating")), comment: str(form, "comment") });
    redirect(`/cliente/solicitacoes/${str(form, "requestId")}?avaliado=1`);
  });
}
