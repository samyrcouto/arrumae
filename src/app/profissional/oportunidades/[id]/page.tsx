import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MessageThread } from "@/components/message-thread";
import { DeclineInvitationButton, QuoteForm, WithdrawQuoteButton } from "@/components/pro-forms";
import { ProposeRevisionForm, RequestActionPanel } from "@/components/request-actions";
import { PhotoGrid, ProgressSteps, QuotePrice, RequestFacts, SlotList, StatusBadge, Timeline } from "@/components/request-view";
import { Alert, Badge, Card, DemoTag, Section } from "@/components/ui";
import { formatPhone } from "@/lib/br";
import { QUOTE_STATUS_LABEL } from "@/lib/labels";
import { requireUser } from "@/server/auth/session";
import { isDomainError } from "@/server/domain/errors";
import { formatBRL } from "@/server/domain/money";
import { listMessages } from "@/server/services/quotes";
import { getRequestDetail } from "@/server/services/requests";

export const metadata: Metadata = { title: "Pedido" };

export default async function ProRequestPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ enviada?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const { actor, user } = await requireUser(["pro"], `/profissional/oportunidades/${id}`);
  const detail = await getRequestDetail(actor, id).catch((e) => {
    if (isDomainError(e) && e.code === "not_found") notFound();
    throw e;
  });
  const { request: r } = detail;
  const myQuote = detail.quotes[0] ?? null;
  const isAssigned = r.proId === user.id;
  const returnTo = `/profissional/oportunidades/${r.id}`;
  const messages = myQuote ? await listMessages(actor, myQuote.id) : [];
  const canQuote = r.status === "open" && (!myQuote || ["pending", "withdrawn", "superseded", "expired"].includes(myQuote.status));
  const pendingRevision = detail.revisions.find((rv) => rv.status === "pending");

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/profissional/oportunidades" className="text-sm font-semibold text-brand">← Oportunidades</Link>
      <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
        <h1 className="text-3xl font-bold">{r.title} {r.isDemo && <DemoTag />}</h1>
        <StatusBadge status={r.status} audience="pro" />
      </div>
      <p className="text-ink-soft">{detail.category.name}{detail.region && ` · ${detail.region.name}`} · Cliente: {detail.client?.name}</p>
      {sp.enviada && <div className="mt-4"><Alert tone="ok">Proposta enviada! Você será avisado quando o cliente responder.</Alert></div>}

      <Card className="mt-5 space-y-5">
        {isAssigned && <ProgressSteps status={r.status} />}
        <RequestFacts request={r} />
        <p className="whitespace-pre-wrap">{r.description}</p>
        <PhotoGrid photos={detail.photos} />
        {isAssigned && r.addressLine ? (
          <div className="rounded-2xl bg-brand-soft p-4">
            <p className="font-semibold">Endereço: {r.addressLine}{r.addressComplement && `, ${r.addressComplement}`} — {r.neighborhood}, CEP {r.cep}</p>
            {detail.client?.phone && <p>Telefone do cliente: <a className="font-semibold underline" href={`tel:+55${detail.client.phone}`}>{formatPhone(detail.client.phone)}</a></p>}
          </div>
        ) : (
          <p className="text-sm text-ink-soft">O endereço completo e o telefone do cliente são liberados se ele aceitar a sua proposta.</p>
        )}
      </Card>

      {isAssigned && (
        <Section title="Atendimento">
          <Card className="space-y-4">
            <p>Valor combinado: <strong className="text-xl">{formatBRL(r.agreedAmountCents ?? 0)}</strong>{myQuote?.kind === "visit" && " (taxa de visita)"}</p>
            {pendingRevision && <Alert tone="warn">Aguardando o cliente responder a alteração para {formatBRL(pendingRevision.newAmountCents)}.</Alert>}
            {r.status === "in_progress" && !pendingRevision && <ProposeRevisionForm requestId={r.id} returnTo={returnTo} />}
            <RequestActionPanel requestId={r.id} actions={detail.actions} returnTo={returnTo} />
            {r.status === "scheduled" && <p className="text-sm text-ink-soft">Você pode iniciar o atendimento a partir de 2 horas antes do horário marcado.</p>}
          </Card>
        </Section>
      )}

      {myQuote && !isAssigned && (
        <Section title="Sua proposta">
          <Card className="space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <QuotePrice q={myQuote} />
              <Badge tone={myQuote.status === "pending" ? "warn" : "neutral"}>{QUOTE_STATUS_LABEL[myQuote.status]}</Badge>
            </div>
            <p className="whitespace-pre-wrap rounded-2xl bg-paper p-3">{myQuote.message}</p>
            <SlotList slots={myQuote.slots} />
            {myQuote.status === "pending" && <WithdrawQuoteButton quoteId={myQuote.id} returnTo={returnTo} />}
          </Card>
        </Section>
      )}

      {myQuote && (
        <div className="mt-4">
          <MessageThread
            messages={messages}
            viewerId={user.id}
            quoteId={myQuote.id}
            returnTo={returnTo}
            canSend={["pending", "accepted"].includes(myQuote.status) && !["cancelled", "expired"].includes(r.status)}
            contactHidden={!isAssigned}
          />
        </div>
      )}

      {canQuote && (
        <Section title={myQuote?.status === "pending" ? "Atualizar proposta" : "Enviar proposta"}>
          <Card><QuoteForm requestId={r.id} visitRequired={detail.category.pricingMode === "visit_required"} existing={myQuote} /></Card>
          {!myQuote && <div className="mt-3"><DeclineInvitationButton requestId={r.id} /></div>}
        </Section>
      )}

      {isAssigned && (
        <Section title="Histórico">
          <Timeline events={detail.events} />
        </Section>
      )}
    </div>
  );
}
