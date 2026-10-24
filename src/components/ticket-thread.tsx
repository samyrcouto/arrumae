import { formatDateTime } from "@/lib/datetime";
import { ROLE_LABEL } from "@/lib/labels";

export function TicketThread({
  messages,
}: {
  messages: { id: string; body: string; internal: boolean; createdAt: Date; authorName: string; authorRole: "client" | "pro" | "admin" }[];
}) {
  return (
    <ul className="space-y-3">
      {messages.map((m) => (
        <li key={m.id} className={m.internal ? "rounded-2xl border border-dashed border-warn/40 bg-warn-soft p-4" : m.authorRole === "admin" ? "rounded-2xl bg-brand-soft p-4" : "rounded-2xl border border-line bg-card p-4"}>
          <p className="text-sm font-semibold">
            {m.authorRole === "admin" ? "Equipe Desenrola" : m.authorName} <span className="font-normal text-ink-soft">· {ROLE_LABEL[m.authorRole]} · {formatDateTime(m.createdAt)}</span>
            {m.internal && <span className="ml-2 text-warn">nota interna</span>}
          </p>
          <p className="mt-1 whitespace-pre-wrap break-words">{m.body}</p>
        </li>
      ))}
    </ul>
  );
}
