import "server-only";
import { lt, sql } from "drizzle-orm";
import { db } from "../db/client";
import { rateLimits } from "../db/schema";
import { purgeExpiredSessions } from "./accounts";
import { runLifecycleJobs } from "./requests";

/** Executado periodicamente (scripts/jobs.ts ou rota /api/cron/maintenance). */
export async function runMaintenance(now = new Date()) {
  const lifecycle = await runLifecycleJobs(now);
  await purgeExpiredSessions();
  await db.delete(rateLimits).where(lt(rateLimits.windowStart, sql`now() - interval '2 days'`));
  return { ...lifecycle, at: now.toISOString() };
}
