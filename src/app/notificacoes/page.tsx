import type { Metadata } from "next";
import Link from "next/link";
import { Button, EmptyState, PageHeader } from "@/components/ui";
import { formatDateTime } from "@/lib/datetime";
import { markNotificationsReadAction } from "@/server/actions/auth";
import { requireUser } from "@/server/auth/session";
import { listNotifications } from "@/server/services/notifications";

export const metadata: Metadata = { title: "Notificações" };

export default async function NotificationsPage() {
  const { user } = await requireUser(undefined, "/notificacoes");
  const items = await listNotifications(user.id);
  const unread = items.some((n) => !n.readAt);
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Notificações"
        action={unread ? <form action={markNotificationsReadAction}><Button variant="secondary">Marcar todas como lidas</Button></form> : null}
      />
      {items.length === 0 ? (
        <EmptyState title="Nada por aqui ainda" />
      ) : (
        <ul className="space-y-2">
          {items.map((n) => {
            const body = (
              <div className={n.readAt ? "rounded-2xl border border-line bg-card p-4" : "rounded-2xl border border-brand/30 bg-brand-soft p-4"}>
                <p className="font-semibold">{!n.readAt && <span className="mr-2 inline-block size-2 rounded-full bg-brand align-middle" aria-label="não lida" />}{n.title}</p>
                <p className="text-ink-soft">{n.body}</p>
                <p className="mt-1 text-xs text-ink-soft">{formatDateTime(n.createdAt)}</p>
              </div>
            );
            return <li key={n.id}>{n.link ? <Link href={n.link}>{body}</Link> : body}</li>;
          })}
        </ul>
      )}
    </div>
  );
}
