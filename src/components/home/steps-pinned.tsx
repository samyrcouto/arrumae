"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { cx } from "../ui";

type Step = { t: string; d: string; img: string; alt: string };

/**
 * "Como funciona": no computador, a tela do app fica parada à direita e muda
 * conforme cada passo chega ao meio da tela. No celular, cada passo vem com a
 * própria tela logo abaixo (sem nada fixo).
 */
export function StepsPinned({ steps }: { steps: Step[] }) {
  const [active, setActive] = useState(0);
  const refs = useRef<(HTMLLIElement | null)[]>([]);

  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset.step));
      },
      { rootMargin: "-45% 0px -45% 0px" },
    );
    refs.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <div className="grid gap-10 lg:grid-cols-12">
      <ol className="lg:col-span-5">
        {steps.map((s, i) => (
          <li
            key={s.t}
            ref={(el) => {
              refs.current[i] = el;
            }}
            data-step={i}
            className="flex flex-col justify-center py-6 lg:min-h-[62vh] lg:py-0"
          >
            <h3 className={cx("text-[1.75rem] font-bold leading-tight transition-colors sm:text-[2rem]", active === i ? "text-ink" : "lg:text-ink-soft")}>
              {s.t}
            </h3>
            <p className="mt-2 max-w-md text-lg">{s.d}</p>
            <div className="mt-6 overflow-hidden rounded-[1.25rem] bg-brand-soft px-6 pt-6 lg:hidden">
              <Image src={s.img} alt={s.alt} width={780} height={1560} className="mx-auto h-[26rem] w-auto object-cover object-top" />
            </div>
          </li>
        ))}
      </ol>
      <div className="hidden lg:col-span-7 lg:block">
        <div data-ui className="sticky top-[14vh] grid h-[72vh] place-items-end overflow-hidden rounded-[1.25rem] bg-brand-soft">
          {steps.map((s, i) => (
            <Image
              key={s.img}
              src={s.img}
              alt={active === i ? s.alt : ""}
              aria-hidden={active !== i}
              width={780}
              height={1560}
              className={cx(
                "col-start-1 row-start-1 h-[64vh] w-auto rounded-t-[1.5rem] object-cover object-top transition duration-500",
                active === i ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0",
              )}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
