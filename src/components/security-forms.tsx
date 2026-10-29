"use client";

import { useActionState } from "react";
import {
  confirmTotpSetupAction,
  disableTotpAction,
  forgotPasswordAction,
  type RecoveryCodesResult,
  regenerateRecoveryCodesAction,
  resetPasswordAction,
  verifyMfaAction,
} from "@/server/actions/auth";
import { ActionForm, Input, SubmitButton } from "./form";
import { FormCtx } from "./form-context";
import { Alert } from "./ui";

export function ForgotPasswordForm() {
  return (
    <ActionForm action={forgotPasswordAction}>
      <Input label="E-mail da sua conta" name="email" type="email" autoComplete="email" inputMode="email" required />
      <SubmitButton className="w-full" pendingLabel="Enviando…">Enviar link</SubmitButton>
    </ActionForm>
  );
}

export function ResetPasswordForm({ token }: { token: string }) {
  return (
    <ActionForm action={resetPasswordAction}>
      <input type="hidden" name="token" value={token} />
      <Input label="Nova senha" name="password" type="password" autoComplete="new-password" hint="Mínimo de 8 caracteres." required />
      <Input label="Repita a nova senha" name="confirm" type="password" autoComplete="new-password" required />
      <SubmitButton className="w-full" pendingLabel="Salvando…">Salvar nova senha</SubmitButton>
    </ActionForm>
  );
}

/** Código do app autenticador (6 dígitos) ou um código de recuperação. */
export function MfaCodeForm() {
  return (
    <ActionForm action={verifyMfaAction}>
      <Input
        label="Código"
        name="code"
        autoComplete="one-time-code"
        inputMode="text"
        autoFocus
        hint="Os 6 números do app autenticador. Sem o celular? Use um dos códigos de recuperação."
        required
      />
      <SubmitButton className="w-full" pendingLabel="Conferindo…">Entrar</SubmitButton>
    </ActionForm>
  );
}

function RecoveryCodes({ codes }: { codes: string[] }) {
  return (
    <div className="space-y-3">
      <Alert tone="warn" title="Guarde estes códigos agora">
        Eles só aparecem esta vez. Cada um permite entrar uma única vez se você perder o celular. Anote no papel ou guarde num
        gerenciador de senhas, longe do celular.
      </Alert>
      <ol className="grid grid-cols-2 gap-2 rounded-2xl bg-paper p-4 font-mono text-lg" data-testid="recovery-codes">
        {codes.map((c) => (
          <li key={c}>{c}</li>
        ))}
      </ol>
    </div>
  );
}

/** Formulário que, no sucesso, mostra os códigos de recuperação no lugar dele. */
function CodesForm({
  action,
  label,
  submit,
}: {
  action: (prev: RecoveryCodesResult, form: FormData) => Promise<RecoveryCodesResult>;
  label: string;
  submit: string;
}) {
  const [state, formAction] = useActionState(action, null);
  if (state?.ok && state.codes?.length)
    return (
      <div className="space-y-3">
        {state.message && <Alert tone="ok">{state.message}</Alert>}
        <RecoveryCodes codes={state.codes} />
        <a href="/conta/seguranca" className="inline-flex min-h-12 items-center rounded-full bg-brand px-5 font-semibold text-white">
          Já guardei os códigos
        </a>
      </div>
    );
  return (
    <FormCtx value={state}>
      <form action={formAction} className="space-y-4" noValidate>
        {state?.message && !state.ok && <Alert tone="danger">{state.message}</Alert>}
        <Input label={label} name="code" autoComplete="one-time-code" maxLength={12} required />
        <SubmitButton pendingLabel="Conferindo…">{submit}</SubmitButton>
      </form>
    </FormCtx>
  );
}

export function ConfirmTotpForm() {
  return <CodesForm action={confirmTotpSetupAction} label="Código de 6 números que aparece no app" submit="Ativar" />;
}

export function RegenerateCodesForm() {
  return <CodesForm action={regenerateRecoveryCodesAction} label="Código do app ou de recuperação" submit="Gerar novos códigos" />;
}

export function DisableTotpForm() {
  return (
    <ActionForm action={disableTotpAction}>
      <Input label="Senha" name="password" type="password" autoComplete="current-password" required />
      <Input label="Código do app ou de recuperação" name="code" autoComplete="one-time-code" required />
      <SubmitButton variant="danger" pendingLabel="Desativando…">Desativar verificação em duas etapas</SubmitButton>
    </ActionForm>
  );
}
