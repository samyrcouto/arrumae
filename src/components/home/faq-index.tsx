"use client";

import { useState } from "react";
import { cx } from "../ui";

/**
 * Perguntas à esquerda e a resposta grande à direita (computador); no celular,
 * cada resposta abre logo abaixo da pergunta. Teclado: Tab + Enter.
 */
export function FaqIndex({ items }: { items: [string, string][] }) {
  const [open, setOpen] = useState(0);
  return (
    <div className="grid gap-8 lg:grid-cols-12">
      <ul className="space-y-1 lg:col-span-5">
        {items.map(([q, a], i) => (
          <li key={q}>
            <button
              type="button"
              aria-expanded={open === i}
              onClick={() => setOpen(i)}
              onMouseEnter={() => setOpen(i)}
              onFocus={() => setOpen(i)}
              className={cx(
                "flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left text-lg font-semibold transition hover:bg-card",
                open === i ? "text-ink" : "text-ink-soft",
              )}
            >
              <span aria-hidden className={cx("mt-2.5 size-2 shrink-0 rounded-full", open === i ? "bg-clay" : "bg-ink-soft")} />
              {q}
            </button>
            {open === i && <p className="px-8 pb-3 text-lg lg:hidden">{a}</p>}
          </li>
        ))}
      </ul>
      <div className="hidden lg:col-span-6 lg:col-start-7 lg:block">
        <p key={open} className="faq-answer sticky top-32 font-display text-[1.625rem] leading-snug" aria-live="polite">
          {items[open][1]}
        </p>
      </div>
    </div>
  );
}
