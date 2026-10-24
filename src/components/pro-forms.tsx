"use client";

import { useState } from "react";
import {
  deletePhotoAction,
  declineInvitationAction,
  flagReviewAction,
  setAvailabilityAction,
  submitForReviewAction,
  submitQuoteAction,
  updateProProfileAction,
  uploadDocumentAction,
  uploadPhotoAction,
  withdrawQuoteAction,
} from "@/server/actions/pro";
import { WEEKDAYS } from "@/lib/datetime";
import { DOCUMENT_KIND_LABEL } from "@/lib/labels";
import { ActionForm, Checkbox, Input, Select, SubmitButton, Textarea, useFieldError } from "./form";
import { Button, cx } from "./ui";

type Option = { id: string; name: string };

function MultiCheck({ name, legend, options, selected }: { name: string; legend: string; options: Option[]; selected: string[] }) {
  const error = useFieldError(name);
  return (
    <fieldset>
      <legend className="mb-2 font-semibold">{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <label key={o.id} className="cursor-pointer rounded-full border border-line bg-white px-3 py-2 has-[:checked]:border-brand has-[:checked]:bg-brand-soft">
            <input type="checkbox" name={name} value={o.id} defaultChecked={selected.includes(o.id)} className="mr-2 accent-brand" />
            {o.name}
          </label>
        ))}
      </div>
      {error && <p className="mt-1 text-sm font-medium text-danger">{error}</p>}
    </fieldset>
  );
}

export function ProProfileForm({
  profile,
  categories,
  regions,
  categoryIds,
  regionIds,
}: {
  profile: { displayName: string; bio: string; yearsExperience: number; cpf: string | null; cnpj: string | null; acceptsUrgent: boolean };
  categories: Option[];
  regions: Option[];
  categoryIds: string[];
  regionIds: string[];
}) {
  return (
    <ActionForm action={updateProProfileAction}>
      <Input label="Nome exibido aos clientes" name="displayName" defaultValue={profile.displayName} maxLength={80} required />
      <Textarea
        label="Sobre você e seu trabalho"
        name="bio"
        defaultValue={profile.bio}
        maxLength={1200}
        hint="Experiência, especialidades, ferramentas, cuidados com limpeza. Mínimo de 40 caracteres."
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <Input label="Anos de experiência" name="yearsExperience" type="number" min={0} max={70} defaultValue={profile.yearsExperience} />
        <Input label="CPF" name="cpf" inputMode="numeric" defaultValue={profile.cpf ?? ""} hint="Não aparece no perfil público." />
        <Input label="CNPJ/MEI (opcional)" name="cnpj" inputMode="numeric" defaultValue={profile.cnpj ?? ""} />
      </div>
      <MultiCheck name="categoryIds" legend="Especialidades" options={categories} selected={categoryIds} />
      <MultiCheck name="regionIds" legend="Regiões que você atende" options={regions} selected={regionIds} />
      <Checkbox name="acceptsUrgent" defaultChecked={profile.acceptsUrgent}>
        Aceito pedidos urgentes (para o mesmo dia) — você aparece primeiro nesses pedidos.
      </Checkbox>
      <SubmitButton>Salvar perfil</SubmitButton>
    </ActionForm>
  );
}

export function AvailabilityForm({ availability }: { availability: { weekday: number; startMinute: number; endMinute: number }[] }) {
  const toHHMM = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
  return (
    <ActionForm action={setAvailabilityAction}>
      <ul className="space-y-2">
        {WEEKDAYS.map((label, d) => {
          const a = availability.find((x) => x.weekday === d);
          return (
            <li key={d} className="flex flex-wrap items-center gap-3 rounded-xl border border-line bg-white p-3">
              <label className="flex w-28 items-center gap-2 font-medium">
                <input type="checkbox" name={`day${d}`} defaultChecked={!!a} className="size-5 accent-brand" />
                {label}
              </label>
              <input aria-label={`${label}: início`} type="time" name={`start${d}`} defaultValue={a ? toHHMM(a.startMinute) : "08:00"} className="rounded-lg border border-line px-2 py-1.5" />
              <span aria-hidden>às</span>
              <input aria-label={`${label}: fim`} type="time" name={`end${d}`} defaultValue={a ? toHHMM(a.endMinute) : "18:00"} className="rounded-lg border border-line px-2 py-1.5" />
            </li>
          );
        })}
      </ul>
      <SubmitButton variant="secondary">Salvar disponibilidade</SubmitButton>
    </ActionForm>
  );
}

export function DocumentUploadForm() {
  return (
    <ActionForm action={uploadDocumentAction} resetOnSuccess>
      <Select
        label="Tipo de documento"
        name="kind"
        options={Object.entries(DOCUMENT_KIND_LABEL).map(([value, label]) => ({ value, label }))}
      />
      <Input label="Arquivo (foto ou PDF, até 8 MB)" name="file" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" />
      <SubmitButton variant="secondary" pendingLabel="Enviando…">Enviar documento</SubmitButton>
    </ActionForm>
  );
}

export function PhotoUploadForm() {
  return (
    <ActionForm action={uploadPhotoAction} resetOnSuccess>
      <Input label="Foto de um trabalho seu" name="file" type="file" accept="image/jpeg,image/png,image/webp" />
      <Input label="Legenda (opcional)" name="caption" maxLength={140} />
      <Checkbox name="rightsConfirmed">
        A foto é de um trabalho meu, tenho autorização para publicá-la e ela não mostra pessoas, placas ou endereços.
      </Checkbox>
      <SubmitButton variant="secondary" pendingLabel="Enviando…">Adicionar ao portfólio</SubmitButton>
    </ActionForm>
  );
}

export function DeletePhotoButton({ photoId }: { photoId: string }) {
  return (
    <ActionForm action={deletePhotoAction}>
      <input type="hidden" name="photoId" value={photoId} />
      <SubmitButton variant="ghost" className="min-h-9 px-3 text-sm">Remover</SubmitButton>
    </ActionForm>
  );
}

export function SubmitForReviewButton({ disabled }: { disabled: boolean }) {
  return (
    <ActionForm action={submitForReviewAction}>
      <SubmitButton className="w-full" pendingLabel="Enviando…">
        {disabled ? "Complete os itens acima para enviar" : "Enviar perfil para análise"}
      </SubmitButton>
    </ActionForm>
  );
}

function dateInputValue(offsetDays: number) {
  const d = new Date(Date.now() + offsetDays * 86400_000);
  // Data no fuso de São Paulo, formato yyyy-mm-dd
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(d);
}

function SlotFields() {
  const error = useFieldError("slots");
  return (
    <fieldset>
      <legend className="mb-1 font-semibold">Horários que você pode atender (1 a 3)</legend>
      <p className="mb-2 text-sm text-ink-soft">O cliente escolhe um deles e o agendamento é confirmado na hora.</p>
      <div className="space-y-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="grid grid-cols-[1fr_auto_auto] items-center gap-2 rounded-xl border border-line bg-white p-2 sm:grid-cols-[12rem_auto_auto]">
            <input aria-label={`Horário ${i + 1}: data`} type="date" name={`slotDate${i}`} min={dateInputValue(0)} defaultValue={i === 0 ? dateInputValue(1) : ""} className="min-w-0 rounded-lg border border-line px-2 py-2" />
            <input aria-label={`Horário ${i + 1}: início`} type="time" name={`slotStart${i}`} defaultValue="09:00" className="rounded-lg border border-line px-2 py-2" />
            <input aria-label={`Horário ${i + 1}: fim`} type="time" name={`slotEnd${i}`} defaultValue="11:00" className="rounded-lg border border-line px-2 py-2" />
          </div>
        ))}
      </div>
      {error && <p className="mt-1 text-sm font-medium text-danger">{error}</p>}
    </fieldset>
  );
}

export function QuoteForm({
  requestId,
  visitRequired,
  existing,
}: {
  requestId: string;
  visitRequired: boolean;
  existing?: { kind: "fixed" | "visit"; message: string } | null;
}) {
  const [kind, setKind] = useState<"fixed" | "visit">(visitRequired ? "visit" : (existing?.kind ?? "fixed"));
  return (
    <ActionForm action={submitQuoteAction}>
      <input type="hidden" name="requestId" value={requestId} />
      <input type="hidden" name="kind" value={kind} />
      <fieldset>
        <legend className="mb-2 font-semibold">Tipo de proposta</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {(["fixed", "visit"] as const).map((k) => (
            <button
              key={k}
              type="button"
              disabled={visitRequired && k === "fixed"}
              onClick={() => setKind(k)}
              aria-pressed={kind === k}
              className={cx(
                "rounded-xl border bg-white p-3 text-left disabled:opacity-50",
                kind === k ? "border-brand bg-brand-soft ring-2 ring-brand/20" : "border-line",
              )}
            >
              <span className="block font-semibold">{k === "fixed" ? "Preço fechado" : "Visita técnica"}</span>
              <span className="block text-sm text-ink-soft">
                {k === "fixed" ? "Você já sabe o valor total pelo que foi descrito." : "Precisa ver no local antes de dar o preço final."}
              </span>
            </button>
          ))}
        </div>
        {visitRequired && <p className="mt-1 text-sm text-ink-soft">Este tipo de serviço exige visita técnica antes do preço final.</p>}
      </fieldset>

      {kind === "fixed" ? (
        <Input label="Preço total (R$)" name="amountCents" inputMode="decimal" placeholder="Ex.: 150,00" hint="Inclua mão de obra e deslocamento. Material, só se você for fornecer — e diga isso na descrição." />
      ) : (
        <>
          <Input label="Taxa de visita (R$)" name="visitFeeCents" inputMode="decimal" placeholder="0 = visita grátis" hint="Abatida do valor final se o cliente aprovar o serviço." />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Estimativa mínima (opcional)" name="estimateMinCents" inputMode="decimal" />
            <Input label="Estimativa máxima (opcional)" name="estimateMaxCents" inputMode="decimal" />
          </div>
        </>
      )}
      <Textarea
        label="O que está incluído"
        name="message"
        defaultValue={existing?.message}
        maxLength={1500}
        placeholder="Ex.: Instalação do chuveiro com material do cliente, teste de funcionamento e limpeza do local."
        hint="Telefones e e-mails são ocultados até o agendamento."
      />
      <SlotFields />
      <SubmitButton pendingLabel="Enviando proposta…">{existing ? "Atualizar proposta" : "Enviar proposta"}</SubmitButton>
    </ActionForm>
  );
}

export function WithdrawQuoteButton({ quoteId, returnTo }: { quoteId: string; returnTo: string }) {
  return (
    <ActionForm action={withdrawQuoteAction}>
      <input type="hidden" name="quoteId" value={quoteId} />
      <input type="hidden" name="returnTo" value={returnTo} />
      <SubmitButton variant="ghost">Retirar proposta</SubmitButton>
    </ActionForm>
  );
}

export function DeclineInvitationButton({ requestId }: { requestId: string }) {
  return (
    <ActionForm action={declineInvitationAction}>
      <input type="hidden" name="requestId" value={requestId} />
      <SubmitButton variant="ghost" className="w-full">Não posso atender este pedido</SubmitButton>
    </ActionForm>
  );
}

export function FlagReviewForm({ reviewId }: { reviewId: string }) {
  const [open, setOpen] = useState(false);
  if (!open)
    return (
      <Button variant="ghost" className="min-h-9 px-3 text-sm" onClick={() => setOpen(true)}>
        Denunciar avaliação
      </Button>
    );
  return (
    <ActionForm action={flagReviewAction} className="mt-2">
      <input type="hidden" name="reviewId" value={reviewId} />
      <Textarea label="Por que esta avaliação é indevida?" name="reason" maxLength={1000} />
      <SubmitButton variant="secondary">Enviar para moderação</SubmitButton>
    </ActionForm>
  );
}
