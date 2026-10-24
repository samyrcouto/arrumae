import Link from "next/link";
import { Table, Td } from "@/components/table";
import { Badge, PageHeader } from "@/components/ui";
import { formatDateTime } from "@/lib/datetime";
import { ROLE_LABEL, TICKET_CATEGORY_LABEL, TICKET_STATUS_LABEL } from "@/lib/labels";
import { requireUser } from "@/server/auth/session";
import { listTicketsForAdmin } from "@/server/services/support";

const PRIORITY_TONE = { low: "neutral", normal: "brand", high: "warn", urgent: "danger" } as const;

export default async function AdminSupport({ searchParams }: { searchParams: Promise<{ todos?: string }> }) {
  const sp = await searchParams;
  await requireUser(["admin"]);
  const rows = await listTicketsForAdmin(sp.todos ? "all" : "open");
  return (
    <div>
      <PageHeader title="Suporte" action={<Link href={sp.todos ? "?" : "?todos=1"} className="text-brand underline">{sp.todos ? "Só abertos" : "Ver todos"}</Link>} />
      <Table head={["Assunto", "Categoria", "Prioridade", "Status", "Aberto por", "Criado"]}>
        {rows.map(({ ticket: t, openerName, openerRole }) => (
          <tr key={t.id}>
            <Td><Link href={`/admin/suporte/${t.id}`} className="font-medium text-brand hover:underline">{t.subject}</Link></Td>
            <Td>{TICKET_CATEGORY_LABEL[t.category]}</Td>
            <Td><Badge tone={PRIORITY_TONE[t.priority]}>{t.priority}</Badge></Td>
            <Td>{TICKET_STATUS_LABEL[t.status]}</Td>
            <Td>{openerName} <span className="text-ink-soft">({ROLE_LABEL[openerRole]})</span></Td>
            <Td>{formatDateTime(t.createdAt)}</Td>
          </tr>
        ))}
      </Table>
    </div>
  );
}
