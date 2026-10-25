import "server-only";
import { lt, sql } from "drizzle-orm";
import { db } from "../db/client";
import { rateLimits } from "../db/schema";
import { purgeExpiredSessions } from "./accounts";
import { detectStaleRequests, dispatchIntegrationEvents, purgeIntegrationEvents } from "./integrations";
import { runLifecycleJobs } from "./requests";

/** Executado periodicamente (scripts/jobs.ts ou rota /api/cron/maintenance). */
export async function runMaintenance(now = new Date()) {
  const lifecycle = await runLifecycleJobs(now);
  await purgeExpiredSessions();
  await db.delete(rateLimits).where(lt(rateLimits.windowStart, sql`now() - interval '2 days'`));
  // Integrações: alertas derivados, entrega dos webhooks pendentes e limpeza.
  const staleAlerts = await detectStaleRequests(now);
  const integrations = await dispatchIntegrationEvents(now);
  await purgeIntegrationEvents(now);
  return { ...lifecycle, staleAlerts, integrations, at: now.toISOString() };
}
