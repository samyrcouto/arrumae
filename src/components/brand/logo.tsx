import { brand } from "@/config/brand";
import { cx } from "../ui";

/**
 * Marca do Arrumaê.
 * - Símbolo: casinha cujo "chão" é uma trena (o reparo bem medido).
 * - Logotipo: "arrumaê" em minúsculas; o acento do "ê" é um telhado.
 */
export function LogoMark({ className = "size-9" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <rect width="64" height="64" rx="16" fill="var(--color-tape)" />
      <path d="M14 31 32 15l18 16" fill="none" stroke="var(--color-ink)" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M20 29v17h24V29" fill="none" stroke="var(--color-ink)" strokeWidth="5" strokeLinejoin="round" />
      <rect x="28.5" y="35" width="7" height="11" rx="1.5" fill="var(--color-ink)" />
      <path d="M13 50h38" stroke="var(--color-ink)" strokeWidth="3" strokeLinecap="round" />
      {[17, 22, 27, 37, 42, 47].map((x, i) => (
        <path key={x} d={`M${x} 50v${i % 2 ? -2.5 : -4}`} stroke="var(--color-ink)" strokeWidth="1.6" strokeLinecap="round" />
      ))}
    </svg>
  );
}

/** "ê" com telhado no lugar do acento circunflexo. */
function RoofE({ roofColor }: { roofColor: string }) {
  return (
    <span className="relative inline-block">
      e
      <svg
        viewBox="0 0 20 11"
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[0.12em] w-[0.76em] -translate-x-1/2"
      >
        <path d="M2 9.5 10 2.5l8 7" fill="none" stroke={roofColor} strokeWidth="3.3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

export function Wordmark({ className, tone = "ink" }: { className?: string; tone?: "ink" | "light" }) {
  return (
    <span
      className={cx("font-display font-extrabold tracking-[-0.03em]", tone === "light" ? "text-white" : "text-ink", className)}
      aria-label={brand.name}
    >
      <span aria-hidden>
        arruma
        <RoofE roofColor={tone === "light" ? "var(--color-tape)" : "var(--color-brand)"} />
      </span>
    </span>
  );
}

export function Logo({ tone = "ink", size = "md" }: { tone?: "ink" | "light"; size?: "md" | "lg" }) {
  return (
    <span className="flex items-center gap-2">
      <LogoMark className={size === "lg" ? "size-11" : "size-9"} />
      <Wordmark tone={tone} className={size === "lg" ? "text-[1.7rem]" : "text-[1.45rem]"} />
    </span>
  );
}
