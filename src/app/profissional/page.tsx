import type { Metadata } from "next";
import Link from "next/link";
import { StatusBadge } from "@/components/request-view";
import { Alert, Badge, Card, LinkButton, PageHeader } from "@/components/ui";
import { formatDateTime } from "@/lib/datetime";
import { VERIFICATION_LABEL, VERIFICATION_TONE } from "@/lib/labels";
import { requireUser } from "@/server/auth/session";
import { getMyProProfile, onboardingChecklist } from "@/server/services/pros";
import { listProJobs, listProOpportunities } from "@/server/services/requests";

export const metadata: Metadata = { title: "Área do profissional" };

export default async function ProHome() {
  const { actor } = await requireUser(["pro"], "/profissional");
  const data = await getMyProProfile(actor);
  const status = data.profile.verificationStatus;
  const approved = status === "approved";
  const [opps, { jobs }] = approved ? await Promise.all([listProOpportunities(actor), listProJobs(actor)]) : [[], { jobs: [] }];
  const upcoming = jobs.filter((j) => ["scheduled", "in_progress", "awaiting_confirmation"].includes(j.status));
  const checklist = onboardingChecklist(data);
  const done = checklist.filter((c) => c.done).length;

  return (
    <div>
      <PageHeader
        title={`Olá, ${data.profile.displayName.split(" ")[0]}`}
        subtitle={<span className="inline-flex items-center gap-2">Status do cadastro: <Badge tone={VERIFICATION_TONE[status]}>{VERIFICATION_LABEL[status]}</Badge></span>}
      />
      {!approved && (
        <Card className="mb-6">
          {status === "pending_review" ? (
            <Alert tone="warn" title="Seu perfil está em análise">Nossa equipe confere os documentos e avisa você por notificação e e-mail.</Alert>
          ) : status === "suspended" ? (
            <Alert tone="danger" title="Perfil suspenso">{data.profile.verificationNotes ?? "Fale com o suporte."}</Alert>
          ) : (
            <>
              {status === "rejected" && (
                <div className="mb-4"><Alert tone="danger" title="Precisamos de ajustes">{data.profile.verificationNotes}</Alert></div>
              )}
              <p className="text-lg font-semibold">Complete seu cadastro para receber pedidos ({done}/{checklist.length})</p>
              <ul className="mt-3 space-y-1">
                {checklist.map((c) => (
                  <li key={c.key} className={c.done ? "text-ok" : "text-ink-soft"}>{c.done ? "✓" : "○"} {c.label}</li>
                ))}
              </ul>
              <LinkButton href="/profissional/perfil" className="mt-4">Completar perfil</LinkButton>
            </>
          )}
        </Card>
      )}
      {approved && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <p className="text-ink-soft">Oportunidades abertas</p>
            <p className="font-display text-4xl font-bold">{opps.length}</p>
            <LinkButton href="/profissional/oportunidades" variant="secondary" className="mt-3">Ver oportunidades</LinkButton>
          </Card>
          <Card>
            <p className="text-ink-soft">Próximos atendimentos</p>
            {upcoming.length === 0 ? (
              <p className="mt-2">Nenhum agendado.</p>
            ) : (
              <ul className="mt-2 space-y-2">
                {upcoming.slice(0, 4).map((j) => (
                  <li key={j.id}>
                    <Link href={`/profissional/oportunidades/${j.id}`} className="flex items-center justify-between gap-2 hover:underline">
                      <span>{j.title}{j.scheduledStart && <span className="block text-sm text-ink-soft">{formatDateTime(j.scheduledStart)} · {j.neighborhood}</span>}</span>
                      <StatusBadge status={j.status} audience="pro" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
