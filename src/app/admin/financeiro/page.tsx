import Link from "next/link";
import { Table, Td } from "@/components/table";
import { Alert, Badge, DemoTag, PageHeader } from "@/components/ui";
import { formatDate } from "@/lib/datetime";
import { requireUser } from "@/server/auth/session";
import { formatBRL } from "@/server/domain/money";
import { listFinance } from "@/server/services/admin";

const PAYMENT_LABEL: Record<string, string> = {
  declared_offline: "Cliente declarou pagamento direto",
  pending: "Sem confirmação",
  paid: "Pago",
  failed: "Falhou",
  refunded: "Reembolsado",
  partially_refunded: "Reembolso parcial",
  chargeback: "Chargeback",
};

export default async function AdminFinance() {
  const { actor } = await requireUser(["admin"]);
  const rows = await listFinance(actor);
  const real = rows.filter((r) => !r.is_demo);
  const total = (k: "gross_cents" | "commission_cents") => real.reduce((s, r) => s + Number(r[k]), 0);
  return (
    <div>
      <PageHeader title="Financeiro" subtitle={`GMV registrado: ${formatBRL(total("gross_cents"))} · comissão calculada: ${formatBRL(total("commission_cents"))} (sem demonstração)`} />
      <div className="mb-4">
        <Alert tone="warn" title="Piloto sem pagamentos integrados">
          Nenhum valor passa pela plataforma. Os registros abaixo mostram a economia calculada de cada serviço concluído; a comissão
          fica como “dispensada” enquanto a configuração do piloto estiver ativa. Reembolsos e chargebacks só existirão com um provedor real.
        </Alert>
      </div>
      <Table head={["Serviço", "Profissional", "Bruto", "Comissão", "Líquido prof.", "Status", "Pagamento", "Data"]}>
        {rows.map((r) => (
          <tr key={r.request_id}>
            <Td><Link href={`/admin/solicitacoes/${r.request_id}`} className="text-brand hover:underline">{r.title}</Link> {r.is_demo && <DemoTag />}</Td>
            <Td>{r.pro_name}</Td>
            <Td>{formatBRL(Number(r.gross_cents))}</Td>
            <Td>{formatBRL(Number(r.commission_cents))} <span className="text-ink-soft">({r.commission_bps / 100}%)</span></Td>
            <Td>{formatBRL(Number(r.pro_net_cents))}</Td>
            <Td><Badge tone={r.settlement_status === "waived" ? "neutral" : "brand"}>{r.settlement_status === "waived" ? "dispensada" : r.settlement_status}</Badge></Td>
            <Td>{r.payment_status ? PAYMENT_LABEL[r.payment_status] ?? r.payment_status : "—"}</Td>
            <Td>{formatDate(r.created_at)}</Td>
          </tr>
        ))}
      </Table>
    </div>
  );
}
