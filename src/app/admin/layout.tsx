import Link from "next/link";
import { requireUser } from "@/server/auth/session";

const LINKS = [
  ["/admin", "Indicadores"],
  ["/admin/solicitacoes", "Solicitações"],
  ["/admin/profissionais", "Profissionais"],
  ["/admin/usuarios", "Usuários"],
  ["/admin/suporte", "Suporte"],
  ["/admin/avaliacoes", "Avaliações"],
  ["/admin/catalogo", "Categorias e regiões"],
  ["/admin/financeiro", "Financeiro"],
  ["/admin/cupons", "Cupons"],
  ["/admin/configuracoes", "Configurações"],
  ["/admin/auditoria", "Auditoria"],
];

/** Toda página admin também chama requireUser(["admin"]) e os serviços revalidam o papel. */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireUser(["admin"], "/admin");
  return (
    <div className="grid gap-6 lg:grid-cols-[13rem_1fr]">
      <nav aria-label="Administração" className="lg:sticky lg:top-28 lg:self-start">
        <ul className="flex gap-1 overflow-x-auto whitespace-nowrap lg:flex-col">
          {LINKS.map(([href, label]) => (
            <li key={href}>
              <Link href={href} className="block rounded-xl px-3 py-2 text-[0.95rem] font-medium text-ink-soft hover:bg-brand-soft hover:text-ink">{label}</Link>
            </li>
          ))}
        </ul>
      </nav>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
