import Link from "next/link";
import { Table, Td } from "@/components/table";
import { Badge, DemoTag, PageHeader } from "@/components/ui";
import { formatDateTime } from "@/lib/datetime";
import { VERIFICATION_LABEL, VERIFICATION_TONE } from "@/lib/labels";
import { requireUser } from "@/server/auth/session";
import { listProsByVerification } from "@/server/services/admin";

const FILTERS = ["pending_review", "approved", "draft", "rejected", "suspended"] as const;

export default async function AdminPros({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const sp = await searchParams;
  const status = FILTERS.find((f) => f === sp.status) ?? "pending_review";
  const { actor } = await requireUser(["admin"]);
  const rows = await listProsByVerification(actor, status);
  return (
    <div>
      <PageHeader title="Profissionais" subtitle="Fila de verificação: decisões sempre humanas e registradas." />
      <div className="mb-4 flex flex-wrap gap-2 text-sm">
        {FILTERS.map((f) => (
          <Link key={f} href={`?status=${f}`} className={status === f ? "rounded-full bg-brand px-3 py-1 text-white" : "rounded-full border border-line px-3 py-1"}>{VERIFICATION_LABEL[f]}</Link>
        ))}
      </div>
      <Table head={["Nome", "E-mail", "Status", "Enviado em"]}>
        {rows.map((p) => (
          <tr key={p.id}>
            <Td><Link href={`/admin/profissionais/${p.id}`} className="font-medium text-brand hover:underline">{p.displayName}</Link> {p.isDemo && <DemoTag />}</Td>
            <Td>{p.email}</Td>
            <Td><Badge tone={VERIFICATION_TONE[p.status]}>{VERIFICATION_LABEL[p.status]}</Badge></Td>
            <Td>{p.submittedAt ? formatDateTime(p.submittedAt) : "—"}</Td>
          </tr>
        ))}
      </Table>
    </div>
  );
}
