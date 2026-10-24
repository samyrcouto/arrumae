import Link from "next/link";
import { notFound } from "next/navigation";
import { TicketAdminForm } from "@/components/admin-forms";
import { TicketReplyForm } from "@/components/support-forms";
import { TicketThread } from "@/components/ticket-thread";
import { Badge, Card, PageHeader, Section } from "@/components/ui";
import { TICKET_CATEGORY_LABEL, TICKET_STATUS_LABEL } from "@/lib/labels";
import { requireUser } from "@/server/auth/session";
import { isDomainError } from "@/server/domain/errors";
import { getTicket } from "@/server/services/support";

export default async function AdminTicket({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { actor } = await requireUser(["admin"]);
  const { ticket, messages } = await getTicket(actor, id).catch((e) => {
    if (isDomainError(e)) notFound();
    throw e;
  });
  return (
    <div className="max-w-3xl">
      <Link href="/admin/suporte" className="text-sm font-semibold text-brand">← Suporte</Link>
      <PageHeader title={ticket.subject} subtitle={<>{TICKET_CATEGORY_LABEL[ticket.category]} · prioridade {ticket.priority}{ticket.requestId && <> · <Link href={`/admin/solicitacoes/${ticket.requestId}`} className="underline">ver solicitação</Link></>}</>} action={<Badge>{TICKET_STATUS_LABEL[ticket.status]}</Badge>} />
      <TicketThread messages={messages} />
      <Card className="mt-4"><TicketReplyForm ticketId={ticket.id} isAdmin /></Card>
      <Section title="Gestão do chamado"><Card><TicketAdminForm ticketId={ticket.id} status={ticket.status} /></Card></Section>
    </div>
  );
}
