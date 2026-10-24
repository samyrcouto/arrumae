import Link from "next/link";
import { formatDateTime, formatSlot } from "@/lib/datetime";
import { QUOTE_STATUS_LABEL, REQUEST_STATUS_LABEL, REQUEST_STATUS_LABEL_PRO, REQUEST_STATUS_TONE, URGENCY_LABEL } from "@/lib/labels";
import { formatBRL } from "@/server/domain/money";
import { REQUEST_ACTIONS, type RequestAction, type RequestStatus } from "@/server/domain/request-lifecycle";
import { Badge, Stars } from "./ui";

export function StatusBadge({ status, audience = "client" }: { status: RequestStatus; audience?: "client" | "pro" }) {
  const label = audience === "pro" ? REQUEST_STATUS_LABEL_PRO[status] : REQUEST_STATUS_LABEL[status];
  return <Badge tone={REQUEST_STATUS_TONE[status]}>{label}</Badge>;
}

/** Barra de progresso do ciclo principal: deixa claro "em que pé está". */
const MAIN_FLOW: RequestStatus[] = ["open", "scheduled", "in_progress", "awaiting_confirmation", "completed"];
const FLOW_LABEL: Record<string, string> = {
  open: "Propostas",
  scheduled: "Agendado",
  in_progress: "Em andamento",
  awaiting_confirmation: "Confirmação",
  completed: "Concluído",
};

export function ProgressSteps({ status }: { status: RequestStatus }) {
  const idx = MAIN_FLOW.indexOf(status);
  if (idx < 0) return null;
  return (
    <div>
      {/* No celular, os rótulos de 5 colunas não cabem: mostra só a etapa atual. */}
      <p className="mb-1.5 text-sm font-semibold sm:hidden">
        Etapa {idx + 1} de {MAIN_FLOW.length}: {FLOW_LABEL[status]}
      </p>
      <ol className="grid grid-cols-5 gap-1.5" aria-label="Progresso">
        {MAIN_FLOW.map((s, i) => (
          <li key={s} aria-current={i === idx ? "step" : undefined}>
            <div className={i <= idx ? "h-1.5 rounded-full bg-brand" : "h-1.5 rounded-full bg-line"} />
            <p className={i === idx ? "mt-1 hidden text-sm font-semibold sm:block" : "mt-1 hidden text-sm text-ink-soft sm:block"}>
              {FLOW_LABEL[s]}
            </p>
            <span className="sr-only sm:hidden">{FLOW_LABEL[s]}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

const EVENT_LABEL: Record<string, string> = {
  created: "Solicitação criada",
  no_eligible_pros: "Ainda sem profissionais disponíveis — a equipe foi avisada",
  quote_submitted: "Proposta recebida",
  quote_updated: "Proposta atualizada",
  price_revision_proposed: "Novo valor proposto pelo profissional",
  price_revision_approved: "Novo valor aprovado",
  price_revision_rejected: "Novo valor recusado",
};

export function Timeline({ events }: { events: { id: number; type: string; createdAt: Date; data: Record<string, unknown> }[] }) {
  if (!events.length) return null;
  return (
    <ol className="relative space-y-4 border-l-2 border-line pl-5">
      {events.map((e) => {
        const label = EVENT_LABEL[e.type] ?? REQUEST_ACTIONS[e.type as RequestAction]?.label ?? e.type;
        return (
          <li key={e.id} className="relative">
            <span className="absolute -left-[1.6rem] top-1.5 size-3 rounded-full border-2 border-paper bg-brand" aria-hidden />
            <p className="font-medium">{label}</p>
            <p className="text-sm text-ink-soft">
              {formatDateTime(e.createdAt)}
              {typeof e.data.reason === "string" && <> · “{e.data.reason}”</>}
              {e.data.lateCancellation === true && <> · cancelamento tardio</>}
            </p>
          </li>
        );
      })}
    </ol>
  );
}

export function PhotoGrid({ photos }: { photos: { id: string; storageKey: string }[] }) {
  if (!photos.length) return null;
  return (
    <ul className="grid grid-cols-3 gap-2 sm:grid-cols-5">
      {photos.map((p) => (
        <li key={p.id}>
          <a href={`/arquivos/${p.storageKey}`} target="_blank" rel="noopener">
            {/* eslint-disable-next-line @next/next/no-img-element -- arquivo privado servido por rota autenticada */}
            <img src={`/arquivos/${p.storageKey}`} alt="Foto enviada pelo cliente" className="aspect-square w-full rounded-xl border border-line object-cover" loading="lazy" />
          </a>
        </li>
      ))}
    </ul>
  );
}

export type QuoteView = {
  id: string;
  kind: "fixed" | "visit";
  amountCents: number | null;
  visitFeeCents: number | null;
  estimateMinCents: number | null;
  estimateMaxCents: number | null;
  message: string;
  slots: { start: string; end: string }[];
  selectedSlot: { start: string; end: string } | null;
  status: keyof typeof QUOTE_STATUS_LABEL;
  validUntil: Date;
  pro: { id: string; displayName: string; yearsExperience: number };
  stats: { ratingAvg: number | null; ratingCount: number; completedJobs: number };
};

export function QuotePrice({ q }: { q: Pick<QuoteView, "kind" | "amountCents" | "visitFeeCents" | "estimateMinCents" | "estimateMaxCents"> }) {
  if (q.kind === "fixed")
    return (
      <div>
        <p className="font-display text-3xl font-bold">{formatBRL(q.amountCents ?? 0)}</p>
        <p className="text-sm text-ink-soft">Preço fechado para o que você descreveu</p>
      </div>
    );
  return (
    <div>
      <p className="font-display text-2xl font-bold">
        Visita técnica: {q.visitFeeCents ? formatBRL(q.visitFeeCents) : "grátis"}
      </p>
      {q.estimateMinCents !== null && q.estimateMaxCents !== null && (
        <p className="text-[0.95rem]">
          Estimativa do serviço: {formatBRL(q.estimateMinCents)} a {formatBRL(q.estimateMaxCents)}
        </p>
      )}
      <p className="text-sm text-ink-soft">O preço final é proposto no local e só vale se você aprovar no app.</p>
    </div>
  );
}

export function ProSummary({ q, linkProfile = true }: { q: QuoteView; linkProfile?: boolean }) {
  return (
    <div>
      {linkProfile ? (
        <Link href={`/profissionais/${q.pro.id}`} className="text-lg font-semibold text-brand underline-offset-2 hover:underline">
          {q.pro.displayName}
        </Link>
      ) : (
        <p className="text-lg font-semibold">{q.pro.displayName}</p>
      )}
      <p className="text-sm text-ink-soft">
        {q.stats.ratingAvg !== null ? (
          <>
            <Stars value={q.stats.ratingAvg} /> {q.stats.ratingAvg.toFixed(1)} ({q.stats.ratingCount}) ·{" "}
          </>
        ) : (
          <>Ainda sem avaliações · </>
        )}
        {q.stats.completedJobs} serviço{q.stats.completedJobs === 1 ? "" : "s"} pela plataforma · {q.pro.yearsExperience} anos de experiência
      </p>
    </div>
  );
}

export function SlotList({ slots }: { slots: { start: string; end: string }[] }) {
  return (
    <ul className="space-y-1 text-[0.95rem]">
      {slots.map((s) => (
        <li key={s.start}>• {formatSlot(s)}</li>
      ))}
    </ul>
  );
}

export function RequestFacts({
  request,
}: {
  request: { urgency: keyof typeof URGENCY_LABEL; neighborhood: string; preferredWindow: string; createdAt: Date; scheduledStart: Date | null; scheduledEnd: Date | null };
}) {
  return (
    <dl className="grid grid-cols-2 gap-3 text-[0.95rem] sm:grid-cols-4">
      <div><dt className="text-ink-soft">Urgência</dt><dd className="font-medium">{URGENCY_LABEL[request.urgency]}</dd></div>
      <div><dt className="text-ink-soft">Bairro</dt><dd className="font-medium">{request.neighborhood}</dd></div>
      <div><dt className="text-ink-soft">Pedido em</dt><dd className="font-medium">{formatDateTime(request.createdAt)}</dd></div>
      {request.scheduledStart && request.scheduledEnd ? (
        <div><dt className="text-ink-soft">Agendado</dt><dd className="font-medium">{formatSlot({ start: request.scheduledStart.toISOString(), end: request.scheduledEnd.toISOString() })}</dd></div>
      ) : request.preferredWindow ? (
        <div><dt className="text-ink-soft">Preferência</dt><dd className="font-medium">{request.preferredWindow}</dd></div>
      ) : null}
    </dl>
  );
}
