import Link from "next/link";
import { notFound } from "next/navigation";
import { RequestActionPanel } from "@/components/request-actions";
import { PhotoGrid, ProgressSteps, QuotePrice, RequestFacts, StatusBadge, Timeline } from "@/components/request-view";
import { Badge, Card, DemoTag, KeyValue, Section } from "@/components/ui";
import { formatPhone } from "@/lib/br";
import { formatDateTime } from "@/lib/datetime";
import { QUOTE_STATUS_LABEL } from "@/lib/labels";
import { requireUser } from "@/server/auth/session";
import { isDomainError } from "@/server/domain/errors";
import { formatBRL } from "@/server/domain/money";
import { getRequestDetail } from "@/server/services/requests";

export default async function AdminRequestDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { actor } = await requireUser(["admin"]);
  const d = await getRequestDetail(actor, id).catch((e) => {
    if (isDomainError(e)) notFound();
    throw e;
  });
  const r = d.request;
  return (
    <div className="max-w-3xl">
      <Link href="/admin/solicitacoes" className="text-sm font-semibold text-brand">← Solicitações</Link>
      <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
        <h1 className="text-3xl font-bold">{r.title} {r.isDemo && <DemoTag />}</h1>
        <StatusBadge status={r.status} />
      </div>
      <Card className="mt-4 space-y-4">
        <ProgressSteps status={r.status} />
        <RequestFacts request={r} />
        <p className="whitespace-pre-wrap">{r.description}</p>
        <PhotoGrid photos={d.photos} />
        <dl className="grid gap-3 sm:grid-cols-2">
          <KeyValue label="Cliente">{d.client?.name} · {d.client?.phone ? formatPhone(d.client.phone) : "—"}</KeyValue>
          <KeyValue label="Endereço">{r.addressLine}{r.addressComplement && `, ${r.addressComplement}`} · CEP {r.cep}</KeyValue>
          <KeyValue label="Profissional">{d.assignedPro ? `${d.assignedPro.name} · ${d.assignedPro.phone ? formatPhone(d.assignedPro.phone) : "—"}` : "—"}</KeyValue>
          <KeyValue label="Valores">combinado {r.agreedAmountCents !== null ? formatBRL(r.agreedAmountCents) : "—"} · final {r.finalAmountCents !== null ? formatBRL(r.finalAmountCents) : "—"}</KeyValue>
          <KeyValue label="Origem">{r.utmSource ?? "direto"}{r.utmCampaign && ` / ${r.utmCampaign}`}</KeyValue>
          <KeyValue label="Expira">{formatDateTime(r.expiresAt)}</KeyValue>
        </dl>
      </Card>
      {d.actions.length > 0 && (
        <Section title="Ações da equipe">
          <p className="mb-3 text-sm text-ink-soft">Toda ação administrativa exige justificativa e fica no registro de auditoria.</p>
          <RequestActionPanel requestId={r.id} actions={d.actions} returnTo={`/admin/solicitacoes/${r.id}`} />
        </Section>
      )}
      <Section title={`Propostas (${d.quotes.length})`}>
        <ul className="space-y-3">
          {d.quotes.map((q) => (
            <li key={q.id}>
              <Card className="space-y-2">
                <div className="flex flex-wrap justify-between gap-2"><Link href={`/admin/profissionais/${q.pro.id}`} className="font-semibold text-brand">{q.pro.displayName}</Link><Badge>{QUOTE_STATUS_LABEL[q.status]}</Badge></div>
                <QuotePrice q={q} />
                <p className="text-[0.95rem]">{q.message}</p>
              </Card>
            </li>
          ))}
        </ul>
      </Section>
      {d.revisions.length > 0 && (
        <Section title="Alterações de preço">
          <ul className="space-y-1">
            {d.revisions.map((rv) => <li key={rv.id}>{formatBRL(rv.previousAmountCents)} → {formatBRL(rv.newAmountCents)} · {rv.status} · “{rv.reason}”</li>)}
          </ul>
        </Section>
      )}
      <Section title="Linha do tempo"><Timeline events={d.events} /></Section>
    </div>
  );
}
