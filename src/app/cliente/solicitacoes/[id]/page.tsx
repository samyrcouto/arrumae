import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MessageThread } from "@/components/message-thread";
import { AcceptQuoteForm, RejectQuoteForm, RequestActionPanel, ReviewForm, RevisionDecisionForm } from "@/components/request-actions";
import { PhotoGrid, ProgressSteps, ProSummary, QuotePrice, RequestFacts, StatusBadge, Timeline } from "@/components/request-view";
import { Alert, Badge, Card, DemoTag, Section, Stars } from "@/components/ui";
import { formatPhone } from "@/lib/br";
import { formatDateTime } from "@/lib/datetime";
import { QUOTE_STATUS_LABEL } from "@/lib/labels";
import { requireUser } from "@/server/auth/session";
import { isDomainError } from "@/server/domain/errors";
import { formatBRL } from "@/server/domain/money";
import { listMessages } from "@/server/services/quotes";
import { getRequestDetail } from "@/server/services/requests";
import { getReviewForRequest } from "@/server/services/reviews";

export const metadata: Metadata = { title: "Solicitação" };

export default async function ClientRequestPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ nova?: string; agendado?: string; avaliado?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const { actor, user } = await requireUser(["client"], `/cliente/solicitacoes/${id}`);
  const detail = await getRequestDetail(actor, id).catch((e) => {
    if (isDomainError(e) && e.code === "not_found") notFound();
    throw e;
  });
  const { request: r } = detail;
  const returnTo = `/cliente/solicitacoes/${r.id}`;
  const visibleQuotes = detail.quotes.filter((q) => !["withdrawn"].includes(q.status));
  const pendingQuotes = visibleQuotes.filter((q) => q.status === "pending");
  const acceptedQuote = detail.quotes.find((q) => q.id === r.acceptedQuoteId);
  const pendingRevision = detail.revisions.find((rv) => rv.status === "pending");
  const review = r.status === "completed" ? await getReviewForRequest(r.id) : null;
  const threads = await Promise.all(visibleQuotes.map((q) => listMessages(actor, q.id)));

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/cliente" className="text-sm font-semibold text-brand">← Minhas solicitações</Link>
      <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
        <h1 className="text-3xl font-bold">{r.title} {r.isDemo && <DemoTag />}</h1>
        <StatusBadge status={r.status} />
      </div>
      <p className="text-ink-soft">{detail.category.name}{detail.region && ` · ${detail.region.name}`}</p>

      <div className="mt-4 space-y-3">
        {sp.nova && (
          <Alert tone="ok" title="Pedido enviado!">
            {detail.events.some((e) => e.type === "no_eligible_pros")
              ? "Ainda não há profissionais disponíveis para este serviço na sua região. Nossa equipe foi avisada e vai buscar alguém — você será notificado."
              : "Profissionais da sua região foram avisados. Você recebe uma notificação a cada proposta."}
          </Alert>
        )}
        {sp.agendado && <Alert tone="ok" title="Agendado!">O profissional foi avisado e agora tem acesso ao endereço completo.</Alert>}
        {sp.avaliado && <Alert tone="ok">Obrigado pela avaliação!</Alert>}
      </div>

      <Card className="mt-5 space-y-5">
        <ProgressSteps status={r.status} />
        <RequestFacts request={r} />
        <p className="whitespace-pre-wrap">{r.description}</p>
        <PhotoGrid photos={detail.photos} />
        <p className="text-sm text-ink-soft">Endereço: {r.addressLine}{r.addressComplement && `, ${r.addressComplement}`} — visível só para o profissional agendado.</p>
      </Card>

      {pendingRevision && (
        <Card className="mt-5 border-tape bg-tape-soft">
          <p className="text-lg font-semibold">O profissional propôs um novo valor</p>
          <p className="mt-1">
            De <strong>{formatBRL(pendingRevision.previousAmountCents)}</strong> para{" "}
            <strong className="text-xl">{formatBRL(pendingRevision.newAmountCents)}</strong>
          </p>
          <p className="mt-1 text-ink-soft">“{pendingRevision.reason}”</p>
          <div className="mt-4"><RevisionDecisionForm revisionId={pendingRevision.id} returnTo={returnTo} /></div>
          <p className="mt-2 text-sm text-ink-soft">Se recusar, vale o valor combinado. Se não houver acordo, abra uma contestação.</p>
        </Card>
      )}

      {acceptedQuote && detail.assignedPro && (
        <Section title="Profissional agendado">
          <Card className="space-y-3">
            <ProSummary q={acceptedQuote} />
            <p>
              Contato: <a href={`tel:+55${detail.assignedPro.phone}`} className="font-semibold text-brand underline">{detail.assignedPro.phone ? formatPhone(detail.assignedPro.phone) : "—"}</a>
            </p>
            <p>
              Valor combinado: <strong>{formatBRL(r.agreedAmountCents ?? 0)}</strong>
              {r.finalAmountCents !== null && r.status !== "in_progress" && <> · Valor final: <strong>{formatBRL(r.finalAmountCents)}</strong></>}
            </p>
            {acceptedQuote.kind === "visit" && r.status !== "completed" && (
              <p className="text-sm text-ink-soft">Proposta com visita técnica: o profissional vai propor o preço final no local, para você aprovar aqui.</p>
            )}
            <MessageThread messages={threads[visibleQuotes.indexOf(acceptedQuote)] ?? []} viewerId={user.id} quoteId={acceptedQuote.id} returnTo={returnTo} canSend={!["cancelled", "expired"].includes(r.status)} contactHidden={false} />
          </Card>
        </Section>
      )}

      {r.status === "open" && (
        <Section title={pendingQuotes.length ? `Propostas (${pendingQuotes.length})` : "Propostas"}>
          {pendingQuotes.length === 0 ? (
            <Card className="text-ink-soft">
              Ainda não chegaram propostas. Você será avisado. Pedidos com fotos e descrição detalhada costumam receber respostas mais rápido.
            </Card>
          ) : (
            <ul className="space-y-4">
              {pendingQuotes.map((q) => (
                <li key={q.id}>
                  <Card className="space-y-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <ProSummary q={q} />
                      <QuotePrice q={q} />
                    </div>
                    <p className="whitespace-pre-wrap rounded-2xl bg-paper p-3">{q.message}</p>
                    <AcceptQuoteForm quoteId={q.id} slots={q.slots} />
                    <p className="text-xs text-ink-soft">Proposta válida até {formatDateTime(q.validUntil)}.</p>
                    <MessageThread messages={threads[visibleQuotes.indexOf(q)] ?? []} viewerId={user.id} quoteId={q.id} returnTo={returnTo} canSend contactHidden />
                    <RejectQuoteForm quoteId={q.id} returnTo={returnTo} />
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </Section>
      )}

      {r.status === "completed" && (
        <Section title="Avaliação">
          <Card>
            {review ? (
              <div>
                <Stars value={review.rating} size="lg" />
                {review.comment && <p className="mt-2">“{review.comment}”</p>}
                <p className="mt-1 text-sm text-ink-soft">Enviada em {formatDateTime(review.createdAt)}</p>
              </div>
            ) : (
              <ReviewForm requestId={r.id} />
            )}
          </Card>
        </Section>
      )}

      {detail.actions.length > 0 && (
        <Section title="O que você pode fazer agora">
          <RequestActionPanel requestId={r.id} actions={detail.actions} returnTo={returnTo} />
          {r.status === "awaiting_confirmation" && (
            <p className="mt-2 text-sm text-ink-soft">Sem resposta em 3 dias, a conclusão é confirmada automaticamente.</p>
          )}
        </Section>
      )}

      {detail.quotes.some((q) => !["pending", "accepted"].includes(q.status)) && (
        <Section title="Outras propostas">
          <ul className="space-y-2 text-[0.95rem]">
            {detail.quotes
              .filter((q) => !["pending", "accepted"].includes(q.status))
              .map((q) => (
                <li key={q.id} className="flex justify-between gap-3 rounded-xl border border-line bg-card px-4 py-2">
                  <span>{q.pro.displayName}</span>
                  <Badge>{QUOTE_STATUS_LABEL[q.status]}</Badge>
                </li>
              ))}
          </ul>
        </Section>
      )}

      <Section title="Histórico">
        <Timeline events={detail.events} />
      </Section>

      <p className="mt-8 text-center text-sm text-ink-soft">
        Precisa de ajuda? <Link href={`/suporte/novo?solicitacao=${r.id}`} className="font-semibold text-brand underline">Falar com o suporte</Link>
      </p>
    </div>
  );
}
