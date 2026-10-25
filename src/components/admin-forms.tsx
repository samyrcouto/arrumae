"use client";

import {
  createCouponAction,
  decideProAction,
  moderateReviewAction,
  retryIntegrationsAction,
  reviewDocumentAction,
  saveCategoryAction,
  saveRegionAction,
  setUserStatusAction,
  toggleCouponAction,
  updateSettingsAction,
} from "@/server/actions/admin";
import { updateTicketAction } from "@/server/actions/support";
import { TICKET_STATUS_LABEL } from "@/lib/labels";
import { ActionForm, Checkbox, Input, Select, SubmitButton, Textarea } from "./form";

export function ProDecisionForm({ proId }: { proId: string }) {
  return (
    <ActionForm action={decideProAction}>
      <input type="hidden" name="proId" value={proId} />
      <Textarea label="Observações (obrigatório para recusar/suspender — o profissional verá)" name="notes" maxLength={1000} />
      <div className="flex flex-wrap gap-2">
        <SubmitButton name="decision" value="approved">Aprovar</SubmitButton>
        <SubmitButton name="decision" value="rejected" variant="secondary">Pedir ajustes</SubmitButton>
        <SubmitButton name="decision" value="suspended" variant="danger">Suspender</SubmitButton>
      </div>
    </ActionForm>
  );
}

export function DocumentReviewForm({ documentId }: { documentId: string }) {
  return (
    <ActionForm action={reviewDocumentAction} className="space-y-2">
      <input type="hidden" name="documentId" value={documentId} />
      <Input label="Nota (opcional; o profissional verá se recusado)" name="note" maxLength={300} />
      <div className="flex gap-2">
        <SubmitButton name="status" value="accepted" className="min-h-10">Aceitar</SubmitButton>
        <SubmitButton name="status" value="rejected" variant="danger" className="min-h-10">Recusar</SubmitButton>
      </div>
    </ActionForm>
  );
}

export function UserStatusForm({ userId, status }: { userId: string; status: string }) {
  const next = status === "suspended" ? "active" : "suspended";
  return (
    <ActionForm action={setUserStatusAction} className="flex flex-wrap items-end gap-2 space-y-0">
      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="status" value={next} />
      <Input label="Motivo" name="reason" className="min-w-48 flex-1" />
      <SubmitButton variant={next === "suspended" ? "danger" : "secondary"} className="min-h-12">
        {next === "suspended" ? "Suspender" : "Reativar"}
      </SubmitButton>
    </ActionForm>
  );
}

type Category = {
  id: string;
  slug: string;
  name: string;
  shortDescription: string;
  examples: string[];
  outOfScope: string[];
  pricingMode: "fixed_or_visit" | "visit_required";
  commissionBps: number | null;
  active: boolean;
  sortOrder: number;
};

export function CategoryForm({ c }: { c?: Category }) {
  return (
    <ActionForm action={saveCategoryAction}>
      <input type="hidden" name="id" value={c?.id ?? ""} />
      <div className="grid gap-3 sm:grid-cols-2">
        <Input label="Nome" name="name" defaultValue={c?.name} />
        <Input label="Identificador (URL)" name="slug" defaultValue={c?.slug} />
      </div>
      <Textarea label="Descrição curta" name="shortDescription" defaultValue={c?.shortDescription} />
      <div className="grid gap-3 sm:grid-cols-2">
        <Textarea label="Exemplos (um por linha)" name="examples" defaultValue={c?.examples.join("\n")} />
        <Textarea label="Fora do escopo (um por linha)" name="outOfScope" defaultValue={c?.outOfScope.join("\n")} />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Select
          label="Preço"
          name="pricingMode"
          defaultValue={c?.pricingMode ?? "fixed_or_visit"}
          options={[
            { value: "fixed_or_visit", label: "Preço fechado ou visita" },
            { value: "visit_required", label: "Exige visita técnica" },
          ]}
        />
        <Input label="Comissão (bps, vazio = padrão)" name="commissionBps" inputMode="numeric" defaultValue={c?.commissionBps ?? ""} />
        <Input label="Ordem" name="sortOrder" type="number" defaultValue={c?.sortOrder ?? 0} />
      </div>
      <Checkbox name="active" defaultChecked={c?.active ?? true}>Ativa (visível para clientes e profissionais)</Checkbox>
      <SubmitButton variant="secondary">{c ? "Salvar categoria" : "Criar categoria"}</SubmitButton>
    </ActionForm>
  );
}

type Region = { id: string; slug: string; name: string; city: string; state: string; cepPrefixes: string[]; active: boolean };

export function RegionForm({ r }: { r?: Region }) {
  return (
    <ActionForm action={saveRegionAction}>
      <input type="hidden" name="id" value={r?.id ?? ""} />
      <div className="grid gap-3 sm:grid-cols-2">
        <Input label="Nome" name="name" defaultValue={r?.name} />
        <Input label="Identificador (URL)" name="slug" defaultValue={r?.slug} />
        <Input label="Cidade" name="city" defaultValue={r?.city ?? "São Paulo"} />
        <Input label="UF" name="state" defaultValue={r?.state ?? "SP"} maxLength={2} />
      </div>
      <Input label="Prefixos de CEP (3 a 5 dígitos, separados por vírgula)" name="cepPrefixes" defaultValue={r?.cepPrefixes.join(", ")} hint="O prefixo mais longo vence quando dois casam com o mesmo CEP." />
      <Checkbox name="active" defaultChecked={r?.active ?? true}>Ativa</Checkbox>
      <SubmitButton variant="secondary">{r ? "Salvar região" : "Criar região"}</SubmitButton>
    </ActionForm>
  );
}

export function ModerateReviewForm({ reviewId }: { reviewId: string }) {
  return (
    <ActionForm action={moderateReviewAction} className="space-y-2">
      <input type="hidden" name="reviewId" value={reviewId} />
      <Input label="Justificativa da decisão" name="note" />
      <div className="flex gap-2">
        <SubmitButton name="status" value="published" variant="secondary" className="min-h-10">Manter publicada</SubmitButton>
        <SubmitButton name="status" value="hidden" variant="danger" className="min-h-10">Ocultar</SubmitButton>
      </div>
    </ActionForm>
  );
}

export function CouponForm() {
  return (
    <ActionForm action={createCouponAction} resetOnSuccess>
      <div className="grid gap-3 sm:grid-cols-2">
        <Input label="Código" name="code" placeholder="BEMVINDO10" />
        <Input label="Descrição" name="description" />
        <Select label="Tipo" name="discountType" options={[{ value: "percent", label: "Percentual (bps)" }, { value: "fixed", label: "Valor fixo (centavos)" }]} />
        <Input label="Valor" name="value" inputMode="numeric" hint="1000 bps = 10%; 2000 centavos = R$ 20" />
        <Input label="Máximo de usos (opcional)" name="maxRedemptions" inputMode="numeric" />
        <Input label="Válido até (opcional)" name="validUntil" type="date" />
      </div>
      <SubmitButton variant="secondary">Criar cupom</SubmitButton>
    </ActionForm>
  );
}

export function CouponToggle({ couponId, active }: { couponId: string; active: boolean }) {
  return (
    <ActionForm action={toggleCouponAction}>
      <input type="hidden" name="couponId" value={couponId} />
      <input type="hidden" name="active" value={active ? "false" : "true"} />
      <SubmitButton variant="ghost" className="min-h-9 px-3 text-sm">{active ? "Desativar" : "Ativar"}</SubmitButton>
    </ActionForm>
  );
}

export function SettingsForm({ values, labels }: { values: Record<string, number | boolean>; labels: Record<string, string> }) {
  return (
    <ActionForm action={updateSettingsAction}>
      {Object.entries(values).map(([k, v]) =>
        typeof v === "boolean" ? (
          <Checkbox key={k} name={k} defaultChecked={v}>{labels[k]}</Checkbox>
        ) : (
          <Input key={k} label={labels[k]} name={k} inputMode="numeric" defaultValue={v} />
        ),
      )}
      <SubmitButton>Salvar configurações</SubmitButton>
    </ActionForm>
  );
}

export function TicketAdminForm({ ticketId, status }: { ticketId: string; status: string }) {
  return (
    <ActionForm action={updateTicketAction} className="space-y-3">
      <input type="hidden" name="ticketId" value={ticketId} />
      <div className="grid gap-3 sm:grid-cols-2">
        <Select label="Status" name="status" defaultValue={status} options={Object.entries(TICKET_STATUS_LABEL).map(([value, label]) => ({ value, label }))} />
        <Select label="Prioridade" name="priority" defaultValue="" options={[{ value: "", label: "Manter" }, { value: "low", label: "Baixa" }, { value: "normal", label: "Normal" }, { value: "high", label: "Alta" }, { value: "urgent", label: "Urgente" }]} />
      </div>
      <Checkbox name="assignToMe">Atribuir a mim</Checkbox>
      <SubmitButton variant="secondary">Atualizar chamado</SubmitButton>
    </ActionForm>
  );
}

export function RetryIntegrationsButton() {
  return (
    <ActionForm action={retryIntegrationsAction}>
      <SubmitButton variant="ghost">Reenviar eventos com falha</SubmitButton>
    </ActionForm>
  );
}
