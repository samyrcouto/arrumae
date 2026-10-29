import type { Metadata } from "next";
import Link from "next/link";
import { ResetPasswordForm } from "@/components/security-forms";
import { Alert, Card } from "@/components/ui";
import { isResetTokenValid } from "@/server/services/password-reset";

// O token está na URL: nada de enviá-lo como Referer.
export const metadata: Metadata = { title: "Criar nova senha", robots: { index: false }, referrer: "no-referrer" };

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const token = (await searchParams).token ?? "";
  const valid = await isResetTokenValid(token);
  return (
    <div className="mx-auto max-w-md">
      <h1 className="mb-6 text-3xl font-bold">Criar nova senha</h1>
      {valid ? (
        <Card>
          <ResetPasswordForm token={token} />
          <p className="mt-4 text-sm text-ink-soft">Depois de salvar, você sai de todos os aparelhos e entra de novo com a senha nova.</p>
        </Card>
      ) : (
        <Alert tone="warn" title="Este link não vale mais">
          Ele expirou, já foi usado ou um link mais novo foi pedido.{" "}
          <Link href="/entrar/esqueci" className="font-semibold underline">Pedir um novo link</Link>.
        </Alert>
      )}
    </div>
  );
}
