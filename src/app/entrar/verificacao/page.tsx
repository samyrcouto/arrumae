import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { MfaCodeForm } from "@/components/security-forms";
import { Card } from "@/components/ui";
import { readMfaCookie } from "@/server/auth/session";
import { hasValidMfaChallenge } from "@/server/services/mfa";

export const metadata: Metadata = { title: "Verificação em duas etapas", robots: { index: false } };

export default async function MfaVerifyPage() {
  const token = await readMfaCookie();
  if (!token || !(await hasValidMfaChallenge(token))) redirect("/entrar");
  return (
    <div className="mx-auto max-w-md">
      <h1 className="mb-2 text-3xl font-bold">Verificação em duas etapas</h1>
      <p className="mb-6 text-ink-soft">Abra o app autenticador no celular e digite o código do Arrumaê.</p>
      <Card>
        <MfaCodeForm />
      </Card>
      <p className="mt-6 text-center text-sm text-ink-soft">
        Perdeu o celular e os códigos de recuperação? Fale com o <Link href="/suporte" className="underline">suporte</Link>.
      </p>
    </div>
  );
}
