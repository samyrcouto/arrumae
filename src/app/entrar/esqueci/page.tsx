import type { Metadata } from "next";
import Link from "next/link";
import { ForgotPasswordForm } from "@/components/security-forms";
import { Alert, Card } from "@/components/ui";
import { RESET_TOKEN_MINUTES } from "@/server/services/password-reset";

export const metadata: Metadata = { title: "Esqueci minha senha", robots: { index: false } };

export default async function ForgotPasswordPage({ searchParams }: { searchParams: Promise<{ enviado?: string }> }) {
  const sp = await searchParams;
  return (
    <div className="mx-auto max-w-md">
      <h1 className="mb-2 text-3xl font-bold">Esqueci minha senha</h1>
      <p className="mb-6 text-ink-soft">Enviamos um link para você criar uma senha nova. Ele vale por {RESET_TOKEN_MINUTES} minutos.</p>
      {sp.enviado ? (
        <Alert tone="ok" title="Confira seu e-mail">
          Se existir uma conta com esse e-mail, o link já está a caminho. Olhe também a caixa de spam. Não chegou em alguns minutos?
          Peça de novo ou fale com o <Link href="/suporte" className="underline">suporte</Link>.
        </Alert>
      ) : (
        <Card>
          <ForgotPasswordForm />
        </Card>
      )}
      <p className="mt-6 text-center">
        <Link href="/entrar" className="font-semibold text-brand underline">Voltar para entrar</Link>
      </p>
    </div>
  );
}
