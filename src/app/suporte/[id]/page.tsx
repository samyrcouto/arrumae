import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { TicketReplyForm } from "@/components/support-forms";
import { TicketThread } from "@/components/ticket-thread";
import { Alert, Badge, Card, PageHeader } from "@/components/ui";
import { TICKET_STATUS_LABEL } from "@/lib/labels";
import { requireUser } from "@/server/auth/session";
import { isDomainError } from "@/server/domain/errors";
import { getTicket } from "@/server/services/support";

export const metadata: Metadata = { title: "Chamado" };

export default async function TicketPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ novo?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const { actor } = await requireUser(undefined, `/suporte/${id}`);
  const { ticket, messages } = await getTicket(actor, id).catch((e) => {
    if (isDomainError(e)) notFound();
    throw e;
  });
  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/suporte" className="text-sm font-semibold text-brand">← Suporte</Link>
      <PageHeader title={ticket.subject} action={<Badge>{TICKET_STATUS_LABEL[ticket.status]}</Badge>} />
      {sp.novo && <div className="mb-4"><Alert tone="ok">Chamado aberto. Você recebe uma notificação quando a equipe responder.</Alert></div>}
      <TicketThread messages={messages} />
      {ticket.status !== "closed" && <Card className="mt-4"><TicketReplyForm ticketId={ticket.id} /></Card>}
    </div>
  );
}
