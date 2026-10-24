import type { Metadata } from "next";
import Link from "next/link";
import { StatusBadge } from "@/components/request-view";
import { Card, EmptyState, LinkButton, PageHeader } from "@/components/ui";
import { formatDateTime } from "@/lib/datetime";
import { requireUser } from "@/server/auth/session";
import { listClientRequests } from "@/server/services/requests";

export const metadata: Metadata = { title: "Minhas solicitações" };

export default async function ClientHome() {
  const { actor, user } = await requireUser(["client"], "/cliente");
  const requests = await listClientRequests(actor);
  const active = requests.filter((r) => !["completed", "cancelled", "expired"].includes(r.status));
  const past = requests.filter((r) => ["completed", "cancelled", "expired"].includes(r.status));
  return (
    <div>
      <PageHeader
        title={`Olá, ${user.name.split(" ")[0]}`}
        subtitle="Acompanhe seus pedidos e propostas."
        action={<LinkButton href="/pedir">Novo pedido</LinkButton>}
      />
      {requests.length === 0 ? (
        <EmptyState title="Você ainda não fez nenhum pedido" action={<LinkButton href="/pedir">Pedir orçamento</LinkButton>}>
          Conte o que precisa e receba propostas com preço e horário.
        </EmptyState>
      ) : (
        <div className="space-y-8">
          {[
            ["Em andamento", active],
            ["Histórico", past],
          ].map(([title, list]) =>
            (list as typeof requests).length ? (
              <section key={title as string}>
                <h2 className="mb-3 text-xl font-bold">{title as string}</h2>
                <ul className="grid gap-3 sm:grid-cols-2">
                  {(list as typeof requests).map((r) => (
                    <li key={r.id}>
                      <Link href={`/cliente/solicitacoes/${r.id}`} className="block">
                        <Card className="transition hover:border-brand">
                          <div className="flex items-start justify-between gap-3">
                            <p className="font-semibold">{r.title}</p>
                            <StatusBadge status={r.status} />
                          </div>
                          <p className="mt-1 text-sm text-ink-soft">
                            {r.categoryName} · {formatDateTime(r.createdAt)}
                          </p>
                          {r.status === "open" && (
                            <p className="mt-2 font-medium text-brand">
                              {r.quoteCount === 0 ? "Aguardando propostas" : `${r.quoteCount} proposta${r.quoteCount > 1 ? "s" : ""} para avaliar`}
                            </p>
                          )}
                          {r.scheduledStart && r.status === "scheduled" && (
                            <p className="mt-2 font-medium text-brand">Agendado para {formatDateTime(r.scheduledStart)}</p>
                          )}
                        </Card>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null,
          )}
        </div>
      )}
    </div>
  );
}
