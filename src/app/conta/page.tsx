import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import { ContactForm, DeleteAccountForm, PasswordForm } from "@/components/account-forms";
import { Card, PageHeader, Section } from "@/components/ui";
import { ROLE_LABEL } from "@/lib/labels";
import { formatPhone } from "@/lib/br";
import { requireUser } from "@/server/auth/session";
import { db } from "@/server/db/client";
import { users } from "@/server/db/schema";

export const metadata: Metadata = { title: "Minha conta" };

export default async function AccountPage() {
  const { user } = await requireUser(undefined, "/conta");
  const [u] = await db.select().from(users).where(eq(users.id, user.id));
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Minha conta" subtitle={`${u.email} · ${ROLE_LABEL[u.role]}`} />
      <Card><ContactForm name={u.name} phone={u.phone ? formatPhone(u.phone) : ""} marketingConsent={u.marketingConsent} /></Card>
      <Section title="Senha"><Card><PasswordForm /></Card></Section>
      <Section title="Seus dados (LGPD)">
        <Card className="space-y-3">
          <p>Baixe uma cópia dos dados que guardamos sobre você, em formato JSON.</p>
          <a href="/api/conta/exportar" className="inline-flex min-h-12 items-center rounded-full border border-line px-5 font-semibold hover:border-ink-soft">Baixar meus dados</a>
        </Card>
      </Section>
      {u.role !== "admin" && (
        <Section title="Excluir conta">
          <Card className="space-y-3 border-danger/30">
            <p>
              Seus dados pessoais serão anonimizados e você perderá o acesso. Registros de serviços realizados podem ser mantidos
              de forma desidentificada pelo prazo exigido por lei. Não é possível excluir com serviços em andamento.
            </p>
            <DeleteAccountForm />
          </Card>
        </Section>
      )}
    </div>
  );
}
