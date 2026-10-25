"use server";

import { redirect } from "next/navigation";
import type { ActionResult } from "@/lib/action-result";
import { requireUser } from "../auth/session";
import { invalid } from "../domain/errors";
import { createCoupon, decideProVerification, reviewDocument, setUserStatus, toggleCoupon } from "../services/admin";
import { saveCategory, saveRegion } from "../services/catalog";
import { retryFailedIntegrationEvents } from "../services/integrations";
import { moderateReview } from "../services/reviews";
import { DEFAULT_SETTINGS, updateSettings, type CommercialSettings } from "../services/settings";
import { bool, run, str } from "./run";

export async function decideProAction(_: ActionResult, form: FormData): Promise<ActionResult> {
  return run(async () => {
    const { actor } = await requireUser(["admin"]);
    const decision = str(form, "decision");
    if (!["approved", "rejected", "suspended"].includes(decision)) throw invalid("Decisão inválida.");
    await decideProVerification(actor, str(form, "proId"), decision as "approved", str(form, "notes"));
  }, "Decisão registrada e profissional notificado.");
}

export async function reviewDocumentAction(_: ActionResult, form: FormData): Promise<ActionResult> {
  return run(async () => {
    const { actor } = await requireUser(["admin"]);
    await reviewDocument(actor, str(form, "documentId"), str(form, "status") === "accepted" ? "accepted" : "rejected", str(form, "note"));
  }, "Documento analisado.");
}

export async function setUserStatusAction(_: ActionResult, form: FormData): Promise<ActionResult> {
  return run(async () => {
    const { actor } = await requireUser(["admin"]);
    await setUserStatus(actor, str(form, "userId"), str(form, "status") === "suspended" ? "suspended" : "active", str(form, "reason"));
  }, "Status atualizado.");
}

export async function saveCategoryAction(_: ActionResult, form: FormData): Promise<ActionResult> {
  return run(async () => {
    const { actor } = await requireUser(["admin"]);
    await saveCategory(actor, str(form, "id") || null, {
      slug: str(form, "slug"),
      name: str(form, "name"),
      shortDescription: str(form, "shortDescription"),
      examples: str(form, "examples"),
      outOfScope: str(form, "outOfScope"),
      pricingMode: str(form, "pricingMode") as "fixed_or_visit",
      commissionBps: str(form, "commissionBps") as never,
      active: bool(form, "active"),
      sortOrder: str(form, "sortOrder") || "0",
    });
  }, "Categoria salva.");
}

export async function saveRegionAction(_: ActionResult, form: FormData): Promise<ActionResult> {
  return run(async () => {
    const { actor } = await requireUser(["admin"]);
    await saveRegion(actor, str(form, "id") || null, {
      slug: str(form, "slug"),
      name: str(form, "name"),
      city: str(form, "city"),
      state: str(form, "state"),
      cepPrefixes: str(form, "cepPrefixes"),
      active: bool(form, "active"),
    });
  }, "Região salva.");
}

export async function moderateReviewAction(_: ActionResult, form: FormData): Promise<ActionResult> {
  return run(async () => {
    const { actor } = await requireUser(["admin"]);
    await moderateReview(actor, str(form, "reviewId"), str(form, "status") === "hidden" ? "hidden" : "published", str(form, "note"));
  }, "Moderação registrada.");
}

export async function createCouponAction(_: ActionResult, form: FormData): Promise<ActionResult> {
  return run(async () => {
    const { actor } = await requireUser(["admin"]);
    await createCoupon(actor, {
      code: str(form, "code"),
      description: str(form, "description"),
      discountType: str(form, "discountType") as "percent",
      value: str(form, "value"),
      maxRedemptions: str(form, "maxRedemptions") as never,
      validUntil: str(form, "validUntil") as never,
    });
  }, "Cupom criado.");
}

export async function toggleCouponAction(_: ActionResult, form: FormData): Promise<ActionResult> {
  return run(async () => {
    const { actor } = await requireUser(["admin"]);
    await toggleCoupon(actor, str(form, "couponId"), bool(form, "active"));
    redirect("/admin/cupons");
  });
}

export async function updateSettingsAction(_: ActionResult, form: FormData): Promise<ActionResult> {
  return run(async () => {
    const { actor } = await requireUser(["admin"]);
    const patch: Record<string, unknown> = {};
    for (const [key, def] of Object.entries(DEFAULT_SETTINGS)) {
      if (typeof def === "boolean") patch[key] = bool(form, key);
      else {
        const v = str(form, key);
        if (v === "" || !/^\d+$/.test(v)) throw invalid("Use apenas números inteiros.", { [key]: "Número inteiro." });
        patch[key] = Number(v);
      }
    }
    await updateSettings(actor, patch as Partial<CommercialSettings>);
  }, "Configurações salvas.");
}

export async function retryIntegrationsAction(_: ActionResult, form: FormData): Promise<ActionResult> {
  void form;
  return run(async () => {
    const { actor } = await requireUser(["admin"]);
    const n = await retryFailedIntegrationEvents(actor);
    return { ok: true, message: n ? `${n} evento(s) voltaram para a fila.` : "Nenhum evento com falha." };
  });
}
