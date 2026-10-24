import type { ReactNode } from "react";

export function Prose({ children }: { children: ReactNode }) {
  return (
    <article className="mx-auto max-w-3xl [&_h2]:mb-2 [&_h2]:mt-8 [&_h2]:text-2xl [&_h2]:font-bold [&_li]:mt-1 [&_p]:mt-3 [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:pl-6">
      {children}
    </article>
  );
}

export function DraftNotice() {
  return (
    <p className="rounded-2xl border border-warn/30 bg-warn-soft p-4 text-warn">
      <strong>Rascunho para revisão jurídica.</strong> Este texto descreve como a plataforma funciona hoje, mas ainda não foi
      revisado por advogado e pode mudar antes do lançamento oficial.
    </p>
  );
}
