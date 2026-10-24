import "server-only";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { sendEmail } from "../adapters/email";
import { db, type DbOrTx } from "../db/client";
import { notifications, users } from "../db/schema";
import { env } from "../env";

export type NotificationInput = { type: string; title: string; body: string; link?: string };

/**
 * Notificação in-app + e-mail (driver configurável). Chamado dentro da
 * transação da operação de negócio: se a operação falhar, nada é notificado.
 */
export async function notify(conn: DbOrTx, userId: string, n: NotificationInput, opts: { email?: boolean } = {}) {
  await conn.insert(notifications).values({ userId, ...n });
  if (opts.email) {
    const [u] = await conn.select({ email: users.email, status: users.status }).from(users).where(eq(users.id, userId));
    if (u && u.status === "active") {
      const link = n.link ? `\n\nAcesse: ${env().APP_URL}${n.link}` : "";
      await sendEmail(conn, { userId, to: u.email, subject: n.title, body: `${n.body}${link}` });
    }
  }
}

export async function listNotifications(userId: string, limit = 50) {
  return db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(limit);
}

export async function unreadCount(userId: string): Promise<number> {
  const [r] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));
  return r?.n ?? 0;
}

export async function markAllRead(userId: string) {
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));
}
