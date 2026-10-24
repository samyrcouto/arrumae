import type { Metadata } from "next";
import { NewTicketForm } from "@/components/support-forms";
import { Card, PageHeader } from "@/components/ui";
import { requireUser } from "@/server/auth/session";

export const metadata: Metadata = { title: "Novo chamado" };

export default async function NewTicketPage({ searchParams }: { searchParams: Promise<{ solicitacao?: string }> }) {
  const sp = await searchParams;
  await requireUser(undefined, "/suporte/novo");
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Novo chamado" subtitle={sp.solicitacao ? "Vinculado à sua solicitação." : undefined} />
      <Card><NewTicketForm requestId={sp.solicitacao && /^[0-9a-f-]{36}$/.test(sp.solicitacao) ? sp.solicitacao : undefined} /></Card>
    </div>
  );
}
