"use server";

import { redirect } from "next/navigation";
import type { ActionResult } from "@/lib/action-result";
import { parseLocalDateTime } from "@/lib/datetime";
import { requireUser } from "../auth/session";
import { invalid } from "../domain/errors";
import { parseBRL } from "../domain/money";
import { filesFrom } from "../security/uploads";
import { submitQuote, withdrawQuote } from "../services/quotes";
import { declineInvitation } from "../services/requests";
import {
  deletePortfolioPhoto,
  setAvailability,
  submitForReview,
  updateProProfile,
  uploadPortfolioPhoto,
  uploadProDocument,
} from "../services/pros";
import { flagReview } from "../services/reviews";
import { bool, run, safePath, str } from "./run";

export async function updateProProfileAction(_: ActionResult, form: FormData): Promise<ActionResult> {
  return run(async () => {
    const { actor } = await requireUser(["pro"]);
    await updateProProfile(actor, {
      displayName: str(form, "displayName"),
      bio: str(form, "bio"),
      yearsExperience: str(form, "yearsExperience") || "0",
      cpf: str(form, "cpf"),
      cnpj: str(form, "cnpj"),
      acceptsUrgent: bool(form, "acceptsUrgent"),
      categoryIds: form.getAll("categoryIds").map(String),
      regionIds: form.getAll("regionIds").map(String),
    });
  }, "Perfil salvo.");
}

export async function setAvailabilityAction(_: ActionResult, form: FormData): Promise<ActionResult> {
  return run(async () => {
    const { actor } = await requireUser(["pro"]);
    const slots = [];
    for (let d = 0; d < 7; d++) {
      if (!bool(form, `day${d}`)) continue;
      slots.push({ weekday: d, start: str(form, `start${d}`), end: str(form, `end${d}`) });
    }
    await setAvailability(actor, slots);
  }, "Disponibilidade salva.");
}

export async function uploadDocumentAction(_: ActionResult, form: FormData): Promise<ActionResult> {
  return run(async () => {
    const { actor } = await requireUser(["pro"]);
    const kind = str(form, "kind");
    if (!["identity", "address_proof", "certificate", "other"].includes(kind)) throw invalid("Tipo de documento inválido.");
    const [file] = filesFrom(form, "file");
    if (!file) throw invalid("Escolha um arquivo.", { file: "Escolha um arquivo." });
    await uploadProDocument(actor, kind as "identity", file);
  }, "Documento enviado para análise.");
}

export async function uploadPhotoAction(_: ActionResult, form: FormData): Promise<ActionResult> {
  return run(async () => {
    const { actor } = await requireUser(["pro"]);
    const [file] = filesFrom(form, "file");
    if (!file) throw invalid("Escolha uma foto.", { file: "Escolha uma foto." });
    await uploadPortfolioPhoto(actor, file, str(form, "caption"), bool(form, "rightsConfirmed"));
  }, "Foto adicionada ao portfólio.");
}

export async function deletePhotoAction(_: ActionResult, form: FormData): Promise<ActionResult> {
  return run(async () => {
    const { actor } = await requireUser(["pro"]);
    await deletePortfolioPhoto(actor, str(form, "photoId"));
  }, "Foto removida.");
}

export async function submitForReviewAction(_: ActionResult): Promise<ActionResult> {
  return run(async () => {
    const { actor } = await requireUser(["pro"]);
    await submitForReview(actor);
  }, "Perfil enviado para análise! Avisaremos por e-mail e notificação.");
}

export async function submitQuoteAction(_: ActionResult, form: FormData): Promise<ActionResult> {
  return run(async () => {
    const { actor } = await requireUser(["pro"]);
    const kind = str(form, "kind") === "visit" ? "visit" : "fixed";
    // Campo do formulário em reais → centavos; o erro aponta para o campo do serviço.
    const money = (field: string, errorKey: string) => {
      const v = str(form, field).trim();
      if (!v) return null;
      const c = parseBRL(v);
      if (c === null) throw invalid("Revise os campos destacados.", { [errorKey]: "Valor inválido." });
      return c;
    };
    const slots = [0, 1, 2]
      .map((i) => ({ date: str(form, `slotDate${i}`), start: str(form, `slotStart${i}`), end: str(form, `slotEnd${i}`) }))
      .filter((s) => s.date)
      .map((s) => {
        const start = parseLocalDateTime(`${s.date}T${s.start}`);
        const end = parseLocalDateTime(`${s.date}T${s.end}`);
        if (!start || !end) throw invalid("Revise os campos destacados.", { slots: "Informe data, início e fim de cada horário." });
        return { start, end };
      });
    const requestId = str(form, "requestId");
    await submitQuote(actor, {
      requestId,
      kind,
      amountCents: kind === "fixed" ? money("amountCents", "amountCents") : null,
      visitFeeCents: kind === "visit" ? (money("visitFeeCents", "visitFeeCents") ?? 0) : null,
      estimateMinCents: kind === "visit" ? money("estimateMinCents", "estimateMinCents") : null,
      estimateMaxCents: kind === "visit" ? money("estimateMaxCents", "estimateMaxCents") : null,
      message: str(form, "message"),
      slots,
    });
    redirect(`/profissional/oportunidades/${requestId}?enviada=1`);
  });
}

export async function withdrawQuoteAction(_: ActionResult, form: FormData): Promise<ActionResult> {
  return run(async () => {
    const { actor } = await requireUser(["pro"]);
    await withdrawQuote(actor, str(form, "quoteId"));
    redirect(safePath(str(form, "returnTo")));
  });
}

export async function declineInvitationAction(_: ActionResult, form: FormData): Promise<ActionResult> {
  return run(async () => {
    const { actor } = await requireUser(["pro"]);
    await declineInvitation(actor, str(form, "requestId"));
    redirect("/profissional/oportunidades");
  });
}

export async function flagReviewAction(_: ActionResult, form: FormData): Promise<ActionResult> {
  return run(async () => {
    const { actor } = await requireUser(["pro"]);
    await flagReview(actor, str(form, "reviewId"), str(form, "reason"));
  }, "Denúncia enviada. A equipe vai analisar.");
}
