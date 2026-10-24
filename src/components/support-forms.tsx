"use client";

import { openTicketAction, replyTicketAction } from "@/server/actions/support";
import { TICKET_CATEGORY_LABEL } from "@/lib/labels";
import { ActionForm, Checkbox, Input, Select, SubmitButton, Textarea } from "./form";

export function NewTicketForm({ requestId }: { requestId?: string }) {
  const options = Object.entries(TICKET_CATEGORY_LABEL)
    .filter(([k]) => k !== "review_report")
    .map(([value, label]) => ({ value, label }));
  return (
    <ActionForm action={openTicketAction}>
      <input type="hidden" name="requestId" value={requestId ?? ""} />
      <Select label="Assunto" name="category" options={options} defaultValue={requestId ? "complaint" : "question"} />
      <Input label="Resumo" name="subject" maxLength={120} required />
      <Textarea label="Conte o que aconteceu" name="body" maxLength={4000} required hint="Em caso de risco à sua segurança, escolha “Segurança” — esses chamados têm prioridade máxima. Em emergência, ligue 190." />
      <SubmitButton>Enviar chamado</SubmitButton>
    </ActionForm>
  );
}

export function TicketReplyForm({ ticketId, isAdmin }: { ticketId: string; isAdmin?: boolean }) {
  return (
    <ActionForm action={replyTicketAction} resetOnSuccess>
      <input type="hidden" name="ticketId" value={ticketId} />
      <Textarea label="Resposta" name="body" maxLength={4000} required />
      {isAdmin && <Checkbox name="internal">Nota interna (não visível para o usuário)</Checkbox>}
      <SubmitButton variant="secondary">Enviar</SubmitButton>
    </ActionForm>
  );
}
