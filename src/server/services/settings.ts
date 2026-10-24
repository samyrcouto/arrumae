import "server-only";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, type DbOrTx } from "../db/client";
import { commercialSettings } from "../db/schema";
import type { Actor } from "../domain/actor";
import { forbidden, invalid } from "../domain/errors";
import { audit } from "./audit";

/**
 * Configurações comerciais editáveis pelo admin. Os padrões abaixo são
 * HIPÓTESES iniciais (docs/BUSINESS.md), não valores validados.
 */
export const SETTINGS_SCHEMA = z.object({
  defaultCommissionBps: z.number().int().min(0).max(5000),
  /** Durante o piloto a comissão é registrada, mas não cobrada. */
  commissionWaived: z.boolean(),
  maxQuotesPerRequest: z.number().int().min(1).max(10),
  maxInvitesPerRequest: z.number().int().min(1).max(30),
  requestExpiryHours: z.number().int().min(6).max(24 * 14),
  quoteValidityHours: z.number().int().min(6).max(24 * 14),
  autoConfirmHours: z.number().int().min(12).max(24 * 14),
});
export type CommercialSettings = z.infer<typeof SETTINGS_SCHEMA>;

export const DEFAULT_SETTINGS: CommercialSettings = {
  defaultCommissionBps: 1500,
  commissionWaived: true,
  maxQuotesPerRequest: 4,
  maxInvitesPerRequest: 8,
  requestExpiryHours: 72,
  quoteValidityHours: 48,
  autoConfirmHours: 72,
};

export const SETTING_LABELS: Record<keyof CommercialSettings, string> = {
  defaultCommissionBps: "Comissão padrão (bps — 1500 = 15%)",
  commissionWaived: "Comissão dispensada (piloto)",
  maxQuotesPerRequest: "Máximo de propostas por solicitação",
  maxInvitesPerRequest: "Profissionais convidados por solicitação",
  requestExpiryHours: "Validade da solicitação (horas)",
  quoteValidityHours: "Validade da proposta (horas)",
  autoConfirmHours: "Confirmação automática após conclusão (horas)",
};

export async function getSettings(conn: DbOrTx = db): Promise<CommercialSettings> {
  const rows = await conn.select().from(commercialSettings);
  const merged: Record<string, unknown> = { ...DEFAULT_SETTINGS };
  for (const r of rows) if (r.key in DEFAULT_SETTINGS) merged[r.key] = r.value;
  const parsed = SETTINGS_SCHEMA.safeParse(merged);
  return parsed.success ? parsed.data : DEFAULT_SETTINGS;
}

export async function updateSettings(actor: Actor, patch: Partial<CommercialSettings>) {
  if (actor.kind !== "user" || actor.role !== "admin") throw forbidden();
  const current = await getSettings();
  const next = SETTINGS_SCHEMA.safeParse({ ...current, ...patch });
  if (!next.success) throw invalid("Configuração inválida.");
  await db.transaction(async (tx) => {
    for (const [key, value] of Object.entries(patch)) {
      if (!(key in DEFAULT_SETTINGS)) continue;
      const existing = await tx.select().from(commercialSettings).where(eq(commercialSettings.key, key));
      if (existing.length)
        await tx
          .update(commercialSettings)
          .set({ value, updatedBy: actor.id, updatedAt: new Date() })
          .where(eq(commercialSettings.key, key));
      else await tx.insert(commercialSettings).values({ key, value, updatedBy: actor.id });
    }
    await audit(tx, actor, "settings.update", "commercial_settings", null, { before: current, patch });
  });
}
