import { formatDateTime } from "@/lib/datetime";
import { MASK } from "@/server/domain/contact-masking";
import { MessageForm } from "./request-actions";

export function MessageThread({
  messages,
  viewerId,
  quoteId,
  returnTo,
  canSend,
  contactHidden,
}: {
  messages: { id: string; body: string; senderId: string; createdAt: Date }[];
  viewerId: string;
  quoteId: string;
  returnTo: string;
  canSend: boolean;
  contactHidden: boolean;
}) {
  return (
    <details className="group rounded-2xl border border-line bg-paper" open={messages.length > 0 && messages.length < 6}>
      <summary className="cursor-pointer list-none p-3 font-semibold">
        💬 Conversa {messages.length > 0 && <span className="text-ink-soft">({messages.length})</span>}
      </summary>
      <div className="space-y-3 px-3 pb-3">
        {messages.length === 0 && <p className="text-sm text-ink-soft">Nenhuma mensagem ainda. Tire dúvidas antes de fechar.</p>}
        <ul className="space-y-2">
          {messages.map((m) => (
            <li key={m.id} className={m.senderId === viewerId ? "ml-8 rounded-2xl rounded-br-sm bg-brand-soft p-3" : "mr-8 rounded-2xl rounded-bl-sm bg-card p-3"}>
              <p className="whitespace-pre-wrap break-words">{m.body}</p>
              <p className="mt-1 text-xs text-ink-soft">{m.senderId === viewerId ? "Você" : "Outra parte"} · {formatDateTime(m.createdAt)}</p>
            </li>
          ))}
        </ul>
        {contactHidden && <p className="text-xs text-ink-soft">Até o agendamento, telefones e e-mails aparecem como “{MASK}”.</p>}
        {canSend && <MessageForm quoteId={quoteId} returnTo={returnTo} />}
      </div>
    </details>
  );
}
