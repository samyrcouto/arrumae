import type { Metadata } from "next";
import Link from "next/link";
import { StatusBadge } from "@/components/request-view";
import { Card, EmptyState, PageHeader, Section } from "@/components/ui";
import { formatDateTime } from "@/lib/datetime";
import { requireUser } from "@/server/auth/session";
import { formatBRL } from "@/server/domain/money";
import { listProJobs } from "@/server/services/requests";

export const metadata: Metadata = { title: "Agenda" };

export default async function AgendaPage() {
  const { actor } = await requireUser(["pro"], "/profissional/agenda");
  const { jobs } = await listProJobs(actor);
  const active = jobs.filter((j) => ["scheduled", "in_progress", "awaiting_confirmation", "disputed"].includes(j.status)).reverse();
  const done = jobs.filter((j) => j.status === "completed");
  const earnings = done.reduce((s, j) => s + (j.finalAmountCents ?? 0), 0);
  return (
    <div>
      <PageHeader title="Agenda e histórico" />
      <Section title="Próximos e em andamento" className="mt-0">
        {active.length === 0 ? (
          <EmptyState title="Nada agendado">Quando um cliente aceitar sua proposta, o atendimento aparece aqui.</EmptyState>
        ) : (
          <ul className="space-y-2">
            {active.map((j) => (
              <li key={j.id}>
                <Link href={`/profissional/oportunidades/${j.id}`}>
                  <Card className="flex flex-wrap items-center justify-between gap-2 hover:border-brand">
                    <span>
                      <span className="font-semibold">{j.scheduledStart ? formatDateTime(j.scheduledStart) : "—"}</span> · {j.title}
                      <span className="block text-sm text-ink-soft">{j.categoryName} · {j.neighborhood}</span>
                    </span>
                    <StatusBadge status={j.status} audience="pro" />
                  </Card>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Section>
      <Section title="Concluídos">
        <p className="mb-3 text-ink-soft">
          {done.length} serviço{done.length === 1 ? "" : "s"} · {formatBRL(earnings)} em valores combinados (pagos diretamente a você durante o piloto).
        </p>
        <ul className="space-y-2">
          {done.map((j) => (
            <li key={j.id} className="flex justify-between gap-3 rounded-xl border border-line bg-card px-4 py-3">
              <Link href={`/profissional/oportunidades/${j.id}`} className="hover:underline">{j.title}</Link>
              <span className="font-semibold">{formatBRL(j.finalAmountCents ?? 0)}</span>
            </li>
          ))}
        </ul>
      </Section>
    </div>
  );
}
