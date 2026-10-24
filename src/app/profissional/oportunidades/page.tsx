import type { Metadata } from "next";
import Link from "next/link";
import { Alert, Badge, Card, EmptyState, PageHeader, Section } from "@/components/ui";
import { formatDateTime } from "@/lib/datetime";
import { QUOTE_STATUS_LABEL, URGENCY_LABEL } from "@/lib/labels";
import { requireUser } from "@/server/auth/session";
import { formatBRL } from "@/server/domain/money";
import { getMyProProfile } from "@/server/services/pros";
import { listProJobs, listProOpportunities } from "@/server/services/requests";

export const metadata: Metadata = { title: "Oportunidades" };

export default async function OpportunitiesPage() {
  const { actor } = await requireUser(["pro"], "/profissional/oportunidades");
  const me = await getMyProProfile(actor);
  if (me.profile.verificationStatus !== "approved")
    return (
      <div className="mx-auto max-w-xl">
        <Alert tone="warn" title="Seu perfil ainda não foi aprovado">
          Você começa a receber pedidos depois da verificação. <Link href="/profissional/perfil" className="underline">Ver meu perfil</Link>
        </Alert>
      </div>
    );
  const [opps, { quotes }] = await Promise.all([listProOpportunities(actor), listProJobs(actor)]);
  const pendingQuotes = quotes.filter((q) => q.status === "pending");
  return (
    <div>
      <PageHeader title="Oportunidades" subtitle="Pedidos da sua região e especialidade. Você não paga nada para ver ou responder." />
      {opps.length === 0 ? (
        <EmptyState title="Nenhum pedido novo agora">Você recebe uma notificação quando chegar um pedido compatível.</EmptyState>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {opps.map((o) => (
            <li key={o.id}>
              <Link href={`/profissional/oportunidades/${o.id}`}>
                <Card className="transition hover:border-brand">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold">{o.title}</p>
                    {!o.viewedAt && <Badge tone="tape">Novo</Badge>}
                  </div>
                  <p className="mt-1 text-sm text-ink-soft">{o.categoryName} · {o.neighborhood}{o.regionName && ` (${o.regionName})`}</p>
                  <p className="mt-2 text-sm">
                    <Badge tone={o.urgency === "today" ? "danger" : "neutral"}>{URGENCY_LABEL[o.urgency]}</Badge>{" "}
                    <span className="text-ink-soft">expira {formatDateTime(o.expiresAt)}</span>
                  </p>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {pendingQuotes.length > 0 && (
        <Section title="Propostas aguardando o cliente">
          <ul className="space-y-2">
            {pendingQuotes.map((q) => (
              <li key={q.id}>
                <Link href={`/profissional/oportunidades/${q.requestId}`} className="flex items-center justify-between gap-3 rounded-xl border border-line bg-card px-4 py-3 hover:border-brand">
                  <span>{q.title}<span className="block text-sm text-ink-soft">{q.kind === "fixed" ? formatBRL(q.amountCents ?? 0) : `Visita ${formatBRL(q.visitFeeCents ?? 0)}`}</span></span>
                  <Badge tone="warn">{QUOTE_STATUS_LABEL[q.status]}</Badge>
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  );
}
