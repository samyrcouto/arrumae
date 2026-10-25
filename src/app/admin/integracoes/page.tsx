import { RetryIntegrationsButton } from "@/components/admin-forms";
import { Table, Td } from "@/components/table";
import { Alert, Badge, Card, PageHeader, Section } from "@/components/ui";
import { formatDateTime } from "@/lib/datetime";
import { requireUser } from "@/server/auth/session";
import { listIntegrationEvents } from "@/server/services/integrations";

const STATUS = {
  pending: { label: "na fila", tone: "warn" },
  delivered: { label: "entregue", tone: "ok" },
  failed: { label: "falhou", tone: "danger" },
} as const;

export default async function AdminIntegrations() {
  const { actor } = await requireUser(["admin"]);
  const { counts, events, config } = await listIntegrationEvents(actor);
  return (
    <div>
      <PageHeader
        title="Integrações"
        subtitle="Eventos enviados ao n8n (ou outra automação) por webhook assinado. Os eventos não levam dados pessoais."
      />
      {config.problems.map((p) => (
        <Alert key={p} tone="danger">{p}</Alert>
      ))}
      <div className="grid gap-3 sm:grid-cols-2">
        <Card>
          <p className="font-semibold">Webhook de saída</p>
          <p className="text-ink-soft">
            {config.webhook ? "Configurado (INTEGRATION_WEBHOOK_URL)." : "Desligado — os eventos ficam só aqui por 7 dias."}
          </p>
        </Card>
        <Card>
          <p className="font-semibold">API de leitura</p>
          <p className="text-ink-soft">
            {config.api ? "Ativa em /api/integrations/v1/metrics." : "Desligada (defina INTEGRATION_API_TOKEN)."}
          </p>
        </Card>
      </div>
      <Section title="Fila">
        <div className="flex flex-wrap items-center gap-3">
          <Badge tone="warn">{counts.pending} na fila</Badge>
          <Badge tone="ok">{counts.delivered} entregues</Badge>
          <Badge tone="danger">{counts.failed} com falha</Badge>
          {counts.failed > 0 && <RetryIntegrationsButton />}
        </div>
      </Section>
      <Section title="Últimos eventos">
        <Table head={["Quando", "Evento", "Status", "Tentativas", "Último erro", "Dados"]}>
          {events.map((e) => (
            <tr key={e.id}>
              <Td className="whitespace-nowrap">{formatDateTime(e.createdAt)}</Td>
              <Td className="font-mono text-sm">{e.type}</Td>
              <Td className="whitespace-nowrap"><Badge tone={STATUS[e.status].tone}>{STATUS[e.status].label}</Badge></Td>
              <Td>{e.attempts}</Td>
              <Td className="max-w-[12rem] text-sm text-ink-soft">{e.lastError ?? "—"}</Td>
              <Td><code className="block max-w-xs truncate text-xs">{JSON.stringify(e.payload)}</code></Td>
            </tr>
          ))}
        </Table>
      </Section>
    </div>
  );
}
