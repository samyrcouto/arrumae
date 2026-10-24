import { UserStatusForm } from "@/components/admin-forms";
import { Table, Td } from "@/components/table";
import { Badge, DemoTag, PageHeader } from "@/components/ui";
import { formatDate } from "@/lib/datetime";
import { ROLE_LABEL } from "@/lib/labels";
import { requireUser } from "@/server/auth/session";
import { listUsers } from "@/server/services/admin";

export default async function AdminUsers({ searchParams }: { searchParams: Promise<{ q?: string; papel?: string }> }) {
  const sp = await searchParams;
  const { actor, user } = await requireUser(["admin"]);
  const role = (["client", "pro", "admin"] as const).find((r) => r === sp.papel);
  const rows = await listUsers(actor, { role, q: sp.q?.slice(0, 80) });
  return (
    <div>
      <PageHeader title="Usuários" />
      <form className="mb-4 flex flex-wrap gap-2">
        <input name="q" defaultValue={sp.q} placeholder="Buscar por nome ou e-mail" className="min-w-0 flex-1 rounded-xl border border-line bg-white px-4 py-2" />
        <select name="papel" defaultValue={sp.papel ?? ""} className="rounded-xl border border-line bg-white px-3 py-2">
          <option value="">Todos</option><option value="client">Clientes</option><option value="pro">Profissionais</option><option value="admin">Admins</option>
        </select>
        <button className="rounded-full bg-brand px-4 py-2 font-semibold text-white">Filtrar</button>
      </form>
      <Table head={["Nome", "Contato", "Papel", "Status", "Desde", "Ação"]}>
        {rows.map((u) => (
          <tr key={u.id}>
            <Td>{u.name} {u.isDemo && <DemoTag />}</Td>
            <Td>{u.email}<br /><span className="text-ink-soft">{u.phone ?? ""}</span></Td>
            <Td>{ROLE_LABEL[u.role]}</Td>
            <Td><Badge tone={u.status === "active" ? "ok" : u.status === "suspended" ? "danger" : "neutral"}>{u.status}</Badge></Td>
            <Td>{formatDate(u.createdAt)}</Td>
            <Td>{u.status !== "deleted" && u.id !== user.id && <UserStatusForm userId={u.id} status={u.status} />}</Td>
          </tr>
        ))}
      </Table>
    </div>
  );
}
