import Link from "next/link";
import { brand } from "@/config/brand";
import { Logo } from "./brand/logo";
import { getCurrentUser } from "@/server/auth/session";
import { logoutAction } from "@/server/actions/auth";
import { unreadCount } from "@/server/services/notifications";

const NAV = {
  client: [
    { href: "/cliente", label: "Minhas solicitações" },
    { href: "/pedir", label: "Novo pedido" },
    { href: "/suporte", label: "Ajuda" },
  ],
  pro: [
    { href: "/profissional", label: "Início" },
    { href: "/profissional/oportunidades", label: "Oportunidades" },
    { href: "/profissional/agenda", label: "Agenda" },
    { href: "/profissional/perfil", label: "Perfil" },
    { href: "/profissional/avaliacoes", label: "Avaliações" },
    { href: "/suporte", label: "Ajuda" },
  ],
  admin: [
    { href: "/admin", label: "Painel" },
    { href: "/admin/solicitacoes", label: "Solicitações" },
    { href: "/admin/profissionais", label: "Profissionais" },
    { href: "/admin/suporte", label: "Suporte" },
    { href: "/admin/catalogo", label: "Catálogo" },
    { href: "/admin/financeiro", label: "Financeiro" },
  ],
} as const;

export async function SiteHeader() {
  const user = await getCurrentUser();
  const unread = user ? await unreadCount(user.id) : 0;
  const nav = user ? NAV[user.role] : [];
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-paper/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
        <Link href="/" aria-label={`${brand.name} — início`}>
          <Logo />
        </Link>
        <div className="flex items-center gap-2">
          {user ? (
            <>
              <Link
                href="/notificacoes"
                className="relative grid size-11 place-items-center rounded-full hover:bg-brand-soft"
                aria-label={unread ? `Notificações (${unread} não lidas)` : "Notificações"}
              >
                <svg aria-hidden viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.94 1.94 0 0 0 3.4 0" />
                </svg>
                {unread > 0 && (
                  <span className="absolute right-1 top-1 grid min-w-5 place-items-center rounded-full bg-danger px-1 text-xs font-bold text-white">
                    {unread > 9 ? "9+" : unread}
                  </span>
                )}
              </Link>
              <Link href="/conta" className="hidden rounded-full px-3 py-2 text-sm font-semibold hover:bg-brand-soft sm:block">
                {user.name.split(" ")[0]}
              </Link>
              <form action={logoutAction}>
                <button className="rounded-full px-3 py-2 text-sm font-semibold text-ink-soft hover:bg-brand-soft">Sair</button>
              </form>
            </>
          ) : (
            <>
              <nav aria-label="Principal" className="mr-2 hidden items-center gap-1 md:flex">
                {[
                  ["/#servicos", "Serviços"],
                  ["/como-funciona", "Como funciona"],
                  ["/seja-profissional", "Para profissionais"],
                ].map(([href, label]) => (
                  <Link key={href} href={href} className="rounded-full px-3 py-2 font-medium text-ink-soft hover:bg-brand-soft hover:text-ink">
                    {label}
                  </Link>
                ))}
              </nav>
              <Link href="/entrar" className="rounded-full px-4 py-2 font-semibold hover:bg-brand-soft">
                Entrar
              </Link>
              <Link href="/pedir" className="hidden rounded-full bg-brand px-4 py-2 font-semibold text-white hover:bg-brand-strong sm:block">
                Pedir orçamento
              </Link>
            </>
          )}
        </div>
      </div>
      {nav.length > 0 && (
        <nav aria-label="Principal" className="mx-auto max-w-6xl overflow-x-auto px-4 pb-2">
          <ul className="flex gap-1 whitespace-nowrap">
            {nav.map((n) => (
              <li key={n.href}>
                <Link href={n.href} className="block rounded-full px-3 py-1.5 text-[0.95rem] font-medium text-ink-soft hover:bg-brand-soft hover:text-ink">
                  {n.label}
                </Link>
              </li>
            ))}
            <li className="sm:hidden">
              <Link href="/conta" className="block rounded-full px-3 py-1.5 text-[0.95rem] font-medium text-ink-soft hover:bg-brand-soft">
                Conta
              </Link>
            </li>
          </ul>
        </nav>
      )}
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-20 bg-ink text-white/80">
      <div className="tape-measure" aria-hidden />
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <Logo tone="light" />
          <p className="mt-4 max-w-xs text-[0.95rem]">{brand.tagline}</p>
          <p className="mt-3 text-xs text-white/50">Piloto em {brand.city}. Nome e marca provisórios.</p>
        </div>
        <nav aria-label="Institucional" className="text-[0.95rem]">
          <p className="mb-3 font-semibold text-white">Plataforma</p>
          <ul className="space-y-2">
            <li><Link href="/#servicos" className="hover:text-tape">Serviços</Link></li>
            <li><Link href="/como-funciona" className="hover:text-tape">Como funciona e regras</Link></li>
            <li><Link href="/seja-profissional" className="hover:text-tape">Seja um profissional</Link></li>
            <li><Link href="/suporte" className="hover:text-tape">Ajuda e suporte</Link></li>
          </ul>
        </nav>
        <nav aria-label="Legal" className="text-[0.95rem]">
          <p className="mb-3 font-semibold text-white">Legal</p>
          <ul className="space-y-2">
            <li><Link href="/termos" className="hover:text-tape">Termos de uso</Link></li>
            <li><Link href="/privacidade" className="hover:text-tape">Privacidade (LGPD)</Link></li>
          </ul>
        </nav>
      </div>
    </footer>
  );
}
