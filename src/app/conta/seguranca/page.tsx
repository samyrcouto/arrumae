import type { Metadata } from "next";
import Link from "next/link";
import { QrCode } from "@/components/qr-code";
import { ConfirmTotpForm, DisableTotpForm, RegenerateCodesForm } from "@/components/security-forms";
import { Alert, Button, Card, PageHeader, Section } from "@/components/ui";
import { formatDateTime } from "@/lib/datetime";
import { startTotpSetupAction } from "@/server/actions/auth";
import { requireUserForMfaSetup } from "@/server/auth/session";
import { getMfaStatus } from "@/server/services/mfa";

export const metadata: Metadata = { title: "Segurança da conta", robots: { index: false } };

export default async function SecurityPage({ searchParams }: { searchParams: Promise<{ exigido?: string; desativado?: string }> }) {
  const sp = await searchParams;
  const { actor } = await requireUserForMfaSetup();
  const status = await getMfaStatus(actor);
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Segurança da conta" subtitle={<Link href="/conta" className="text-brand underline">← Minha conta</Link>} />
      {sp.exigido && !status.enabled && (
        <div className="mb-4">
          <Alert tone="warn" title="Ative a verificação em duas etapas para continuar">
            Contas de administrador veem dados de clientes e profissionais. Por isso, além da senha, pedimos um código do celular.
          </Alert>
        </div>
      )}
      {sp.desativado && <div className="mb-4"><Alert tone="ok">Verificação em duas etapas desativada.</Alert></div>}

      <Section title="Verificação em duas etapas">
        {status.enabled ? (
          <Card className="space-y-2">
            <p className="font-semibold text-ok">Ativa desde {formatDateTime(status.enabledAt!)}.</p>
            <p>Ao entrar, depois da senha, pedimos o código de 6 números do app autenticador.</p>
            <p className="text-ink-soft">Códigos de recuperação disponíveis: {status.recoveryCodesLeft} de 10.</p>
          </Card>
        ) : status.setup ? (
          <Card className="space-y-5">
            <ol className="list-decimal space-y-2 pl-5">
              <li>Instale um app autenticador no celular (Google Authenticator, Microsoft Authenticator ou outro).</li>
              <li>No app, escolha adicionar conta e leia o QR code abaixo.</li>
              <li>Digite o código de 6 números que o app mostrar.</li>
            </ol>
            <div className="flex flex-col items-center gap-3">
              <QrCode value={status.setup.uri} label="QR code para o app autenticador" />
              <details className="w-full text-center text-sm">
                <summary className="cursor-pointer font-semibold text-brand">Não consegue ler o QR code? Digite a chave</summary>
                <p className="mt-2 break-words font-mono text-base" data-testid="totp-secret">{status.setup.secret.match(/.{1,4}/g)!.join(" ")}</p>
              </details>
            </div>
            <ConfirmTotpForm />
          </Card>
        ) : (
          <Card className="space-y-3">
            <p>
              Protege a conta mesmo que alguém descubra a sua senha: para entrar, também é preciso o código que muda a cada 30
              segundos no seu celular.
            </p>
            <form action={startTotpSetupAction}>
              <Button type="submit">Ativar verificação em duas etapas</Button>
            </form>
          </Card>
        )}
      </Section>

      {status.enabled && (
        <>
          <Section title="Códigos de recuperação">
            <Card className="space-y-3">
              <p>Gere novos códigos se usou vários ou perdeu os que anotou. Os anteriores deixam de valer.</p>
              <RegenerateCodesForm />
            </Card>
          </Section>
          {!status.required && (
            <Section title="Desativar">
              <Card className="space-y-3 border-danger/30">
                <p>Sua conta volta a depender só da senha.</p>
                <DisableTotpForm />
              </Card>
            </Section>
          )}
        </>
      )}
    </div>
  );
}
