import Link from "next/link";
import { StatusBadge } from "@/components/request-view";
import { Table, Td } from "@/components/table";
import { DemoTag, PageHeader } from "@/components/ui";
import { formatDateTime } from "@/lib/datetime";
import { REQUEST_STATUS_LABEL } from "@/lib/labels";
import { requireUser } from "@/server/auth/session";
import { REQUEST_STATUSES, type RequestStatus } from "@/server/domain/request-lifecycle";
import { listRequestsForAdmin } from "@/server/services/admin";

export default async function AdminRequests({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const sp = await searchParams;
  const status = REQUEST_STATUSES.includes(sp.status as RequestStatus) ? (sp.status as RequestStatus) : undefined;
  const { actor } = await requireUser(["admin"]);
  const rows = await listRequestsForAdmin(actor, status);
  return (
    <div>
      <PageHeader title="Solicitações" />
      <div className="mb-4 flex flex-wrap gap-2 text-sm">
        <Link href="/admin/solicitacoes" className={!status ? "rounded-full bg-brand px-3 py-1 text-white" : "rounded-full border border-line px-3 py-1"}>Todas</Link>
        {REQUEST_STATUSES.map((s) => (
          <Link key={s} href={`?status=${s}`} className={status === s ? "rounded-full bg-brand px-3 py-1 text-white" : "rounded-full border border-line px-3 py-1"}>{REQUEST_STATUS_LABEL[s]}</Link>
        ))}
      </div>
      <Table head={["Solicitação", "Status", "Categoria / região", "Convidados / propostas", "Criada"]}>
        {rows.map((r) => (
          <tr key={r.id}>
            <Td><Link href={`/admin/solicitacoes/${r.id}`} className="font-medium text-brand hover:underline">{r.title}</Link> {r.isDemo && <DemoTag />}</Td>
            <Td><StatusBadge status={r.status} /></Td>
            <Td>{r.categoryName}<br /><span className="text-ink-soft">{r.regionName ?? "—"}</span></Td>
            <Td className={r.invited === 0 && r.status === "open" ? "font-semibold text-danger" : ""}>{r.invited} / {r.quoteCount}</Td>
            <Td>{formatDateTime(r.createdAt)}</Td>
          </tr>
        ))}
      </Table>
    </div>
  );
}
