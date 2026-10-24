"use client";

import { useState } from "react";
import {
  acceptQuoteAction,
  createReviewAction,
  decideRevisionAction,
  proposeRevisionAction,
  rejectQuoteAction,
  requestTransitionAction,
  sendMessageAction,
} from "@/server/actions/requests";
import { formatSlot } from "@/lib/datetime";
import { ActionForm, Checkbox, Input, SubmitButton, Textarea } from "./form";
import { Button, type ButtonVariant } from "./ui";

/** Texto e estilo de cada ação disponível. A permissão real é decidida no servidor. */
const ACTION_UI: Record<
  string,
  { label: string; variant: ButtonVariant; reason?: "required" | "optional"; reasonLabel?: string; confirm?: string; help?: string }
> = {
  client_cancel: {
    label: "Cancelar solicitação",
    variant: "danger",
    reason: "required",
    reasonLabel: "Por que você está cancelando?",
    help: "Cancelamentos com menos de 24h do horário ficam registrados como tardios.",
  },
  pro_cancel: {
    label: "Cancelar atendimento",
    variant: "danger",
    reason: "required",
    reasonLabel: "Motivo do cancelamento (o cliente verá)",
    help: "A solicitação volta a receber propostas e o cancelamento conta no seu histórico.",
  },
  report_pro_no_show: {
    label: "O profissional não apareceu",
    variant: "danger",
    help: "A solicitação volta a receber propostas de outros profissionais.",
  },
  report_client_no_show: {
    label: "O cliente não estava no local",
    variant: "danger",
    help: "A solicitação será encerrada. Use apenas se você esteve no endereço no horário combinado.",
  },
  start: { label: "Cheguei — iniciar atendimento", variant: "primary" },
  complete: { label: "Informar que concluí o serviço", variant: "primary" },
  confirm: { label: "Confirmar que o serviço foi concluído", variant: "primary" },
  open_dispute: {
    label: "Tive um problema — abrir contestação",
    variant: "secondary",
    reason: "required",
    reasonLabel: "O que aconteceu?",
    help: "Uma pessoa da equipe vai analisar com base no que foi registrado.",
  },
  admin_cancel: { label: "Cancelar (equipe)", variant: "danger", reason: "required", reasonLabel: "Motivo (registrado no histórico)" },
  resolve_as_completed: {
    label: "Resolver: serviço concluído",
    variant: "primary",
    reason: "required",
    reasonLabel: "Decisão e justificativa",
  },
  resolve_as_cancelled: {
    label: "Resolver: cancelar serviço",
    variant: "danger",
    reason: "required",
    reasonLabel: "Decisão e justificativa",
  },
};

export function RequestActionPanel({ requestId, actions, returnTo }: { requestId: string; actions: string[]; returnTo: string }) {
  const [open, setOpen] = useState<string | null>(null);
  const visible = actions.filter((a) => ACTION_UI[a]);
  if (!visible.length) return null;
  return (
    <div className="space-y-3">
      {visible.map((a) => {
        const ui = ACTION_UI[a];
        if (open !== a)
          return (
            <Button key={a} variant={ui.variant} className="w-full" onClick={() => setOpen(a)}>
              {ui.label}
            </Button>
          );
        return (
          <div key={a} className="rounded-2xl border border-line bg-paper p-4">
            <p className="font-semibold">{ui.label}</p>
            {ui.help && <p className="mt-1 text-sm text-ink-soft">{ui.help}</p>}
            <ActionForm action={requestTransitionAction} className="mt-3">
              <input type="hidden" name="requestId" value={requestId} />
              <input type="hidden" name="action" value={a} />
              <input type="hidden" name="returnTo" value={returnTo} />
              {ui.reason && <Textarea label={ui.reasonLabel ?? "Motivo"} name="reason" required maxLength={1000} />}
              {a === "confirm" && (
                <Checkbox name="declaredPaid">
                  Já paguei o profissional diretamente (durante o piloto, o pagamento não passa pela plataforma).
                </Checkbox>
              )}
              {a === "resolve_as_completed" && (
                <Input label="Valor final (opcional)" name="finalAmount" inputMode="decimal" placeholder="Ex.: 150,00" hint="Deixe vazio para manter o valor registrado." />
              )}
              <div className="flex flex-col-reverse gap-2 sm:flex-row">
                <Button type="button" variant="ghost" onClick={() => setOpen(null)}>
                  Voltar
                </Button>
                <SubmitButton variant={ui.variant === "danger" ? "danger" : "primary"}>Confirmar</SubmitButton>
              </div>
            </ActionForm>
          </div>
        );
      })}
    </div>
  );
}

export function AcceptQuoteForm({ quoteId, slots }: { quoteId: string; slots: { start: string; end: string }[] }) {
  return (
    <ActionForm action={acceptQuoteAction}>
      <input type="hidden" name="quoteId" value={quoteId} />
      <fieldset>
        <legend className="mb-2 font-semibold">Escolha o horário</legend>
        <div className="grid gap-2">
          {slots.map((s, i) => (
            <label key={s.start} className="flex cursor-pointer items-center gap-3 rounded-xl border border-line bg-white p-3 has-[:checked]:border-brand has-[:checked]:bg-brand-soft">
              <input type="radio" name="slotIndex" value={i} defaultChecked={i === 0} className="accent-brand" />
              <span className="font-medium">{formatSlot(s)}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <SubmitButton className="w-full" pendingLabel="Agendando…">Aceitar proposta e agendar</SubmitButton>
    </ActionForm>
  );
}

export function RejectQuoteForm({ quoteId, returnTo }: { quoteId: string; returnTo: string }) {
  return (
    <ActionForm action={rejectQuoteAction}>
      <input type="hidden" name="quoteId" value={quoteId} />
      <input type="hidden" name="returnTo" value={returnTo} />
      <SubmitButton variant="ghost" className="w-full" pendingLabel="Recusando…">Recusar esta proposta</SubmitButton>
    </ActionForm>
  );
}

export function MessageForm({ quoteId, returnTo }: { quoteId: string; returnTo: string }) {
  return (
    <ActionForm action={sendMessageAction} className="space-y-2">
      <input type="hidden" name="quoteId" value={quoteId} />
      <input type="hidden" name="returnTo" value={returnTo} />
      <Textarea label="Mensagem" name="body" maxLength={1000} required className="[&_textarea]:min-h-20" />
      <SubmitButton variant="secondary" pendingLabel="Enviando…">Enviar mensagem</SubmitButton>
    </ActionForm>
  );
}

export function RevisionDecisionForm({ revisionId, returnTo }: { revisionId: string; returnTo: string }) {
  return (
    <ActionForm action={decideRevisionAction} className="flex flex-col gap-2 sm:flex-row">
      <input type="hidden" name="revisionId" value={revisionId} />
      <input type="hidden" name="returnTo" value={returnTo} />
      <SubmitButton name="decision" value="approve">Aprovar novo valor</SubmitButton>
      <SubmitButton name="decision" value="reject" variant="secondary">Recusar</SubmitButton>
    </ActionForm>
  );
}

export function ProposeRevisionForm({ requestId, returnTo }: { requestId: string; returnTo: string }) {
  const [open, setOpen] = useState(false);
  if (!open)
    return (
      <Button variant="secondary" className="w-full" onClick={() => setOpen(true)}>
        Propor novo valor ao cliente
      </Button>
    );
  return (
    <div className="rounded-2xl border border-line bg-paper p-4">
      <p className="text-sm text-ink-soft">
        Use quando o serviço exigir algo que não estava combinado (ou para informar o preço final após a visita). O cliente
        precisa aprovar antes de você concluir.
      </p>
      <ActionForm action={proposeRevisionAction} className="mt-3">
        <input type="hidden" name="requestId" value={requestId} />
        <input type="hidden" name="returnTo" value={returnTo} />
        <Input label="Novo valor TOTAL" name="newAmount" inputMode="decimal" placeholder="Ex.: 280,00" required />
        <Textarea label="O que mudou?" name="reason" required maxLength={1000} />
        <div className="flex gap-2">
          <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Voltar</Button>
          <SubmitButton>Enviar para aprovação</SubmitButton>
        </div>
      </ActionForm>
    </div>
  );
}

export function ReviewForm({ requestId }: { requestId: string }) {
  return (
    <ActionForm action={createReviewAction}>
      <input type="hidden" name="requestId" value={requestId} />
      <fieldset>
        <legend className="mb-2 font-semibold">Sua nota</legend>
        <div className="stars-input flex flex-row-reverse justify-end gap-1">
          {[5, 4, 3, 2, 1].map((n) => (
            <label key={n} className="cursor-pointer text-4xl text-line has-[:focus-visible]:outline has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-tape">
              <input type="radio" name="rating" value={n} className="sr-only" aria-label={`${n} estrela${n > 1 ? "s" : ""}`} />
              ★
            </label>
          ))}
        </div>
      </fieldset>
      <Textarea label="Comentário (opcional)" name="comment" maxLength={1000} placeholder="Como foi o atendimento? Pontualidade, cuidado, preço…" />
      <p className="text-sm text-ink-soft">Avaliações não podem ser editadas depois de enviadas.</p>
      <SubmitButton>Enviar avaliação</SubmitButton>
    </ActionForm>
  );
}
