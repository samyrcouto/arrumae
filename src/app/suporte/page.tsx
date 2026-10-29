import type { Metadata } from "next";
import Link from "next/link";
import { Badge, Card, EmptyState, LinkButton, PageHeader } from "@/components/ui";
import { formatDateTime } from "@/lib/datetime";
import { TICKET_CATEGORY_LABEL, TICKET_STATUS_LABEL } from "@/lib/labels";
import { getCurrentUser, needsMfaSetup, toActor } from "@/server/auth/session";
import { listMyTickets } from "@/server/services/support";

export const metadata: Metadata = { title: "Ajuda e suporte" };

export default async function SupportPage() {
  const user = await getCurrentUser();
  const tickets = user && !needsMfaSetup(user) ? await listMyTickets(toActor(user)) : [];
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Ajuda e suporte" subtitle="Atendimento por pessoas da equipe." action={user ? <LinkButton href="/suporte/novo">Abrir chamado</LinkButton> : null} />
      <Card className="mb-6">
        <p className="font-semibold">Antes de abrir um chamado</p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-ink-soft">
          <li>Regras de cancelamento, ausência e mudança de preço: <Link href="/como-funciona" className="text-brand underline">Como funciona</Link>.</li>
          <li>Problema com um serviço em andamento? Abra o pedido e use “Tive um problema — abrir contestação”.</li>
          <li>Em situação de risco, ligue 190.</li>
        </ul>
      </Card>
      {!user ? (
        <EmptyState title="Entre para falar com o suporte" action={<LinkButton href="/entrar?next=/suporte">Entrar</LinkButton>} />
      ) : tickets.length === 0 ? (
        <EmptyState title="Você não tem chamados" />
      ) : (
        <ul className="space-y-2">
          {tickets.map((t) => (
            <li key={t.id}>
              <Link href={`/suporte/${t.id}`} className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-card p-4 hover:border-brand">
                <span><span className="font-semibold">{t.subject}</span><span className="block text-sm text-ink-soft">{TICKET_CATEGORY_LABEL[t.category]} · {formatDateTime(t.createdAt)}</span></span>
                <Badge tone={t.status === "waiting_user" ? "warn" : t.status === "resolved" || t.status === "closed" ? "ok" : "brand"}>{TICKET_STATUS_LABEL[t.status]}</Badge>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
