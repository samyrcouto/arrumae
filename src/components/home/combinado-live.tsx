"use client";

import { useId, useState } from "react";
import { matchService, POPULAR_REQUESTS } from "@/lib/service-match";

type Service = { slug: string; name: string; examples: string[] };

/**
 * A peça "viva" da home: a pessoa escreve o problema e vê o combinado se
 * montar (serviço, o que entra, como vem o preço, quem vê o telefone).
 * Sem JavaScript, o formulário continua indo para /pedir com o texto.
 */
export function CombinadoLive({ services, regionCount }: { services: Service[]; regionCount: number }) {
  const [text, setText] = useState("");
  const id = useId();
  const slug = matchService(text);
  const service = services.find((s) => s.slug === slug);
  const typed = text.trim().length > 0;

  const rows: [string, string][] = [
    [
      "Serviço",
      service ? service.name : typed ? "a gente confirma no próximo passo" : "aparece aqui enquanto você escreve",
    ],
    ["O que costuma entrar", service ? service.examples.slice(0, 2).join(" · ") : "você descreve e manda fotos, se quiser"],
    ["Quem responde", `até 4 profissionais conferidos (${regionCount} regiões no piloto)`],
    ["Preço", "fechado antes de agendar, ou visita técnica se precisar ver antes"],
    ["Mudou o preço?", "só vale com o seu OK no app"],
    ["Seu telefone", "só para quem você escolher"],
  ];

  return (
    <form action="/pedir" method="get" data-ui className="rounded-[1.25rem] bg-card p-5 text-ink sm:p-6">
      <label htmlFor={id} className="font-display text-[1.375rem] font-bold leading-tight">
        O que precisa arrumar?
      </label>
      <div className="mt-3 flex flex-col gap-2">
        <input
          id={id}
          name="titulo"
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={80}
          autoComplete="off"
          placeholder="Ex.: o chuveiro queimou"
          className="min-h-12 w-full rounded-xl border border-line bg-paper px-4 text-base placeholder:text-ink-soft focus:border-brand focus:outline-none"
        />
        {slug && <input type="hidden" name="categoria" value={slug} />}
        <button
          type="submit"
          className="inline-flex min-h-12 shrink-0 items-center justify-center rounded-full bg-tape px-5 font-semibold text-ink transition hover:brightness-95 active:scale-[0.98]"
        >
          Pedir orçamento grátis
        </button>
      </div>
      <ul className="mt-3 flex flex-wrap gap-2" aria-label="Pedidos comuns">
        {POPULAR_REQUESTS.map((p) => (
          <li key={p}>
            <button
              type="button"
              onClick={() => setText(p)}
              aria-pressed={text === p}
              className="rounded-full bg-brand-soft px-3 py-1.5 text-sm font-medium text-brand transition hover:bg-brand hover:text-white active:scale-[0.97] aria-pressed:bg-brand aria-pressed:text-white"
            >
              {p}
            </button>
          </li>
        ))}
      </ul>

      <div className="mt-5 rounded-xl bg-paper p-4">
        <div className="flex items-baseline justify-between gap-3">
          <p className="font-display text-lg font-bold">Seu combinado</p>
          <p className="text-sm text-ink-soft">{typed ? "montando…" : "prévia"}</p>
        </div>
        <dl className="mt-2 space-y-2 text-[0.95rem]" aria-live="polite">
          {rows.map(([k, v]) => (
            <div key={k} className="grid grid-cols-[7.5rem_1fr] gap-3 max-[420px]:grid-cols-1 max-[420px]:gap-0">
              <dt className="text-ink-soft">{k}</dt>
              <dd className={k === "Serviço" && service ? "font-semibold text-brand" : "font-medium"}>{v}</dd>
            </div>
          ))}
        </dl>
      </div>
    </form>
  );
}
