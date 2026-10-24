import "server-only";
import { db, type DbOrTx } from "../db/client";
import { analyticsEvents } from "../db/schema";

/**
 * Analytics próprio e mínimo (sem terceiros). Somente eventos da lista abaixo
 * são aceitos; `props` nunca deve conter dados pessoais (nome, e-mail,
 * telefone, endereço completo, CPF).
 */
export const CLIENT_EVENTS = [
  "page_view",
  "landing_view",
  "request_started",
  "request_step",
  "signup_started",
  "cta_click",
] as const;
export const SERVER_EVENTS = [
  "signup",
  "request_created",
  "out_of_area",
  "quote_submitted",
  "quote_accepted",
  "request_completed",
  "review_created",
] as const;
export type AnalyticsEventName = (typeof CLIENT_EVENTS)[number] | (typeof SERVER_EVENTS)[number];

export type TrackContext = {
  anonId?: string | null;
  userId?: string | null;
  path?: string | null;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  referrerHost?: string | null;
  props?: Record<string, string | number | boolean>;
};

const clip = (v: string | null | undefined, n = 100) => (v ? v.slice(0, n) : null);

export async function trackServer(name: AnalyticsEventName, ctx: TrackContext, conn: DbOrTx = db) {
  try {
    await conn.insert(analyticsEvents).values({
      name,
      anonId: clip(ctx.anonId, 40),
      userId: ctx.userId ?? null,
      path: clip(ctx.path, 200),
      utmSource: clip(ctx.utmSource),
      utmMedium: clip(ctx.utmMedium),
      utmCampaign: clip(ctx.utmCampaign),
      referrerHost: clip(ctx.referrerHost),
      props: ctx.props ?? {},
    });
  } catch (e) {
    // Analytics nunca pode derrubar uma operação de negócio fora de transação.
    if (conn !== db) throw e;
    console.error("[analytics] falha ao registrar evento", name);
  }
}
