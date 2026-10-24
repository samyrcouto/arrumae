"use client";

import Link from "next/link";
import { loginAction, signupAction } from "@/server/actions/auth";
import { ActionForm, Checkbox, Input, SubmitButton } from "./form";

export function LoginForm({ next }: { next?: string }) {
  return (
    <ActionForm action={loginAction}>
      <input type="hidden" name="next" value={next ?? ""} />
      <Input label="E-mail" name="email" type="email" autoComplete="email" inputMode="email" required />
      <Input label="Senha" name="password" type="password" autoComplete="current-password" required />
      <SubmitButton className="w-full" pendingLabel="Entrando…">Entrar</SubmitButton>
    </ActionForm>
  );
}

/** Campos de cadastro reutilizados no fluxo de pedido (cliente entra sem sair do formulário). */
export function SignupFields({ role }: { role: "client" | "pro" }) {
  return (
    <>
      <input type="hidden" name="role" value={role} />
      <Input label="Nome completo" name="name" autoComplete="name" required />
      <Input label="E-mail" name="email" type="email" autoComplete="email" inputMode="email" required />
      <Input
        label="Celular com DDD"
        name="phone"
        type="tel"
        autoComplete="tel"
        inputMode="tel"
        placeholder="(11) 90000-0000"
        hint={role === "client" ? "Só é mostrado ao profissional que você escolher, depois do agendamento." : undefined}
        required
      />
      <Input label="Crie uma senha" name="password" type="password" autoComplete="new-password" hint="Mínimo de 8 caracteres." required />
      <Checkbox name="acceptTerms" required>
        Li e aceito os{" "}
        <Link href="/termos" target="_blank" className="font-semibold text-brand underline">Termos de uso</Link> e a{" "}
        <Link href="/privacidade" target="_blank" className="font-semibold text-brand underline">Política de privacidade</Link>.
      </Checkbox>
      <Checkbox name="marketingConsent">Quero receber novidades e ofertas por e-mail (opcional).</Checkbox>
    </>
  );
}

export function SignupForm({ role, next }: { role: "client" | "pro"; next?: string }) {
  return (
    <ActionForm action={signupAction}>
      <input type="hidden" name="next" value={next ?? ""} />
      <SignupFields role={role} />
      <SubmitButton className="w-full" pendingLabel="Criando conta…">
        {role === "pro" ? "Criar conta de profissional" : "Criar conta"}
      </SubmitButton>
    </ActionForm>
  );
}
