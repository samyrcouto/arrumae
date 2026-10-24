"use client";

import { changePasswordAction, deleteAccountAction, updateContactAction } from "@/server/actions/auth";
import { ActionForm, Checkbox, Input, SubmitButton } from "./form";

export function ContactForm({ name, phone, marketingConsent }: { name: string; phone: string; marketingConsent: boolean }) {
  return (
    <ActionForm action={updateContactAction}>
      <Input label="Nome" name="name" defaultValue={name} autoComplete="name" />
      <Input label="Celular com DDD" name="phone" type="tel" defaultValue={phone} autoComplete="tel" />
      <Checkbox name="marketingConsent" defaultChecked={marketingConsent}>Quero receber novidades e ofertas por e-mail.</Checkbox>
      <SubmitButton variant="secondary">Salvar</SubmitButton>
    </ActionForm>
  );
}

export function PasswordForm() {
  return (
    <ActionForm action={changePasswordAction}>
      <Input label="Senha atual" name="currentPassword" type="password" autoComplete="current-password" />
      <Input label="Nova senha" name="newPassword" type="password" autoComplete="new-password" hint="Mínimo de 8 caracteres. Você precisará entrar de novo." />
      <SubmitButton variant="secondary">Alterar senha</SubmitButton>
    </ActionForm>
  );
}

export function DeleteAccountForm() {
  return (
    <ActionForm action={deleteAccountAction}>
      <Input label="Senha" name="password" type="password" autoComplete="current-password" />
      <Input label='Digite "EXCLUIR" para confirmar' name="confirm" autoComplete="off" />
      <SubmitButton variant="danger" pendingLabel="Excluindo…">Excluir minha conta</SubmitButton>
    </ActionForm>
  );
}
