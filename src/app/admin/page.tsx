import type { Metadata } from "next";
import { Card, PageHeader, Section } from "@/components/ui";
import { requireUser } from "@/server/auth/session";
import { formatBRL } from "@/server/domain/money";
import { getMetrics } from "@/server/services/admin";

export const metadata: Metadata = { title: "Indicadores" };

const pct = (v: number | null) => (v === null ? "—" : `${Math.round(v * 100)}%`);

function Stat({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <Card className="p-4">
      <p className="text-sm text-ink-soft">{label}</p>
      <p className="font-display text-3xl font-bold">{value}</p>
      {hint && <p className="text-xs text-ink-soft">{hint}</p>}
    </Card>
  );
}

export default async function AdminHome({ searchParams }: { searchParams: Promise<{ dias?: string }> }) {
  const sp = await searchParams;
  const days = [7, 30, 90].includes(Number(sp.dias)) ? Number(sp.dias) : 30;
  const { actor } = await requireUser(["admin"]);
  const m = await getMetrics(actor, days);
  const f = m.funnel;
  return (
    <div>
      <PageHeader
        title="Indicadores"
        subtitle={<>Últimos {days} dias · dados reais, sem registros de demonstração · {[7, 30, 90].map((d) => <a key={d} href={`?dias=${d}`} className={d === days ? "ml-2 font-semibold text-brand" : "ml-2 underline"}>{d}d</a>)}</>}
      />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Solicitações" value={m.ops.total} />
        <Stat label="Com ao menos 1 proposta" value={pct(m.rates.quoteCoverage)} hint="% atendidas" />
        <Stat label="Tempo até 1ª proposta" value={m.ops.median_first_quote_min === null ? "—" : `${Math.round(m.ops.median_first_quote_min)} min`} hint="mediana" />
        <Stat label="Taxa de conclusão" value={pct(m.rates.completion)} hint="concluídas / encerradas" />
        <Stat label="GMV (concluídos)" value={formatBRL(Number(m.ops.gmv_cents ?? 0))} />
        <Stat label="Ticket médio" value={m.ops.avg_ticket_cents ? formatBRL(m.ops.avg_ticket_cents) : "—"} />
        <Stat label="Comissão registrada" value={formatBRL(Number(m.fin.commission_recorded ?? 0))} hint={`dispensada no piloto: ${formatBRL(Number(m.fin.commission_waived ?? 0))}`} />
        <Stat label="Nota média" value={m.people.reviews_avg ? Number(m.people.reviews_avg).toFixed(2) : "—"} />
      </div>

      <Section title="Operação agora">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat label="Abertas" value={m.ops.open} />
          <Stat label="Agendadas / em andamento" value={m.ops.scheduled + m.ops.in_progress} />
          <Stat label="Em contestação" value={m.ops.disputed} />
          <Stat label="Ausências de profissional" value={m.people.no_shows} />
          <Stat label="Canceladas" value={m.ops.cancelled} />
          <Stat label="Expiradas sem proposta aceita" value={m.ops.expired} />
          <Stat label="Chamados abertos" value={m.people.tickets_open} />
          <Stat label="Profissionais em análise" value={m.people.pros_pending} />
        </div>
      </Section>

      <Section title="Funil (eventos)">
        <Card>
          <ol className="grid gap-2 sm:grid-cols-6">
            {[
              ["landing_view", "Visitas a landing"],
              ["request_started", "Iniciaram pedido"],
              ["signup", "Cadastros"],
              ["request_created", "Pedidos criados"],
              ["quote_accepted", "Propostas aceitas"],
              ["request_completed", "Concluídos"],
            ].map(([k, l]) => (
              <li key={k} className="rounded-xl bg-paper p-3">
                <p className="text-xs text-ink-soft">{l}</p>
                <p className="font-display text-2xl font-bold">{f[k] ?? 0}</p>
              </li>
            ))}
          </ol>
          <p className="mt-3 text-sm text-ink-soft">Eventos de navegação só são contados com consentimento; os de servidor (cadastro, pedido, aceite, conclusão) sempre.</p>
        </Card>
      </Section>

      <Section title="Pedidos por origem (UTM)">
        <Card>
          {m.bySource.length === 0 ? <p className="text-ink-soft">Sem dados no período.</p> : (
            <ul className="divide-y divide-line">
              {m.bySource.map((s) => (
                <li key={s.source} className="flex justify-between py-2"><span>{s.source}</span><span>{s.requests} pedidos · {s.completed} concluídos</span></li>
              ))}
            </ul>
          )}
        </Card>
      </Section>

      <Section title="Base">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat label="Clientes ativos" value={m.people.clients} />
          <Stat label="Profissionais aprovados" value={m.people.pros_approved} />
          <Stat label="Avaliações em moderação" value={m.people.reviews_flagged} />
        </div>
      </Section>
    </div>
  );
}
