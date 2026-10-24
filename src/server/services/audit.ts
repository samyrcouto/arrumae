import "server-only";
import type { DbOrTx } from "../db/client";
import { auditLogs } from "../db/schema";
import { type Actor, actorId, actorRole } from "../domain/actor";

/** Registra uma ação sensível. A tabela é append-only (trigger no banco). */
export async function audit(
  conn: DbOrTx,
  actor: Actor,
  action: string,
  entityType: string,
  entityId: string | null,
  data: Record<string, unknown> = {},
) {
  await conn.insert(auditLogs).values({
    actorId: actorId(actor),
    actorRole: actorRole(actor),
    action,
    entityType,
    entityId,
    data,
  });
}
