import { CouponForm, CouponToggle } from "@/components/admin-forms";
import { Table, Td } from "@/components/table";
import { Alert, Badge, Card, PageHeader, Section } from "@/components/ui";
import { formatDate } from "@/lib/datetime";
import { requireUser } from "@/server/auth/session";
import { formatBRL } from "@/server/domain/money";
import { listCoupons } from "@/server/services/admin";

export default async function AdminCoupons() {
  const { actor } = await requireUser(["admin"]);
  const coupons = await listCoupons(actor);
  return (
    <div className="max-w-4xl">
      <PageHeader title="Cupons e campanhas" />
      <Alert tone="warn">Cupons ainda não são aplicados no fluxo do cliente: dependem dos pagamentos integrados. O cadastro já existe para planejar campanhas.</Alert>
      <Section title="Novo cupom"><Card><CouponForm /></Card></Section>
      <Section title="Cupons">
        <Table head={["Código", "Descrição", "Desconto", "Usos", "Validade", "Status", ""]}>
          {coupons.map((c) => (
            <tr key={c.id}>
              <Td className="font-mono">{c.code}</Td>
              <Td>{c.description}</Td>
              <Td>{c.discountType === "percent" ? `${c.value / 100}%` : formatBRL(c.value)}</Td>
              <Td>{c.redeemedCount}{c.maxRedemptions ? ` / ${c.maxRedemptions}` : ""}</Td>
              <Td>{c.validUntil ? formatDate(c.validUntil) : "—"}</Td>
              <Td><Badge tone={c.active ? "ok" : "neutral"}>{c.active ? "ativo" : "inativo"}</Badge></Td>
              <Td><CouponToggle couponId={c.id} active={c.active} /></Td>
            </tr>
          ))}
        </Table>
      </Section>
    </div>
  );
}
