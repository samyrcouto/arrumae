import { Table, Td } from "@/components/table";
import { PageHeader } from "@/components/ui";
import { formatDateTime } from "@/lib/datetime";
import { requireUser } from "@/server/auth/session";
import { listAuditLogs } from "@/server/services/admin";

export default async function AdminAudit() {
  const { actor } = await requireUser(["admin"]);
  const rows = await listAuditLogs(actor);
  return (
    <div>
      <PageHeader title="Auditoria" subtitle="Registro append-only (o banco bloqueia alteração e exclusão)." />
      <Table head={["Quando", "Quem", "Ação", "Entidade", "Dados"]}>
        {rows.map(({ log, actorName }) => (
          <tr key={log.id}>
            <Td className="whitespace-nowrap">{formatDateTime(log.createdAt)}</Td>
            <Td>{actorName ?? log.actorRole}</Td>
            <Td className="font-mono text-sm">{log.action}</Td>
            <Td className="text-sm">{log.entityType}<br /><span className="text-ink-soft">{log.entityId?.slice(0, 8)}</span></Td>
            <Td><code className="block max-w-xs truncate text-xs">{JSON.stringify(log.data)}</code></Td>
          </tr>
        ))}
      </Table>
    </div>
  );
}
