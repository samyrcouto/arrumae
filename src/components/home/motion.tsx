"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { cx } from "../ui";

/**
 * Entrada das seções: só esconde o que ainda está abaixo da tela quando o
 * script roda, então o conteúdo nunca fica invisível se o JavaScript falhar.
 * Sem animação para quem pediu menos movimento.
 */
export function RevealOnScroll() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) return;
    const below = [...document.querySelectorAll<HTMLElement>("[data-reveal]")].filter(
      (el) => el.getBoundingClientRect().top > window.innerHeight * 0.92,
    );
    below.forEach((el) => el.setAttribute("data-reveal", "pending"));
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          e.target.setAttribute("data-reveal", "shown");
          io.unobserve(e.target);
        }
      },
      { rootMargin: "0px 0px -8% 0px" },
    );
    below.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
  return null;
}

/** Botão fixo no rodapé do celular, depois que o formulário do topo sai da tela. */
export function StickyRequestBar({ watchId, hideId }: { watchId: string; hideId: string }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const top = document.getElementById(watchId);
    const end = document.getElementById(hideId);
    if (!top || !end) return;
    let pastTop = false;
    let atEnd = false;
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.target === top) pastTop = !e.isIntersecting && e.boundingClientRect.top < 0;
        if (e.target === end) atEnd = e.isIntersecting;
      }
      setShow(pastTop && !atEnd);
    });
    io.observe(top);
    io.observe(end);
    return () => io.disconnect();
  }, [watchId, hideId]);
  return (
    <div
      aria-hidden={!show}
      className={cx(
        "fixed inset-x-0 bottom-0 z-30 bg-paper/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-8px_24px_-12px_rgba(24,32,44,0.35)] transition duration-300 sm:hidden",
        show ? "translate-y-0" : "pointer-events-none translate-y-full",
      )}
    >
      <Link
        href="/pedir"
        tabIndex={show ? 0 : -1}
        className="flex min-h-12 w-full items-center justify-center rounded-full bg-brand font-semibold text-white active:scale-[0.98]"
      >
        Pedir orçamento grátis
      </Link>
    </div>
  );
}
