import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import type { Tone } from "@/lib/labels";

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

const BUTTON = {
  primary: "bg-brand text-white hover:bg-brand-strong",
  secondary: "bg-card text-ink border border-line hover:border-ink-soft",
  tape: "bg-tape text-ink hover:brightness-95",
  danger: "bg-card text-danger border border-danger/40 hover:bg-danger-soft",
  ghost: "text-brand hover:bg-brand-soft",
} as const;
export type ButtonVariant = keyof typeof BUTTON;

const btnBase =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-5 text-base font-semibold transition disabled:cursor-not-allowed disabled:opacity-60";

export function Button({ variant = "primary", className, ...props }: ComponentProps<"button"> & { variant?: ButtonVariant }) {
  return <button className={cx(btnBase, BUTTON[variant], className)} {...props} />;
}

export function LinkButton({
  variant = "primary",
  className,
  ...props
}: ComponentProps<typeof Link> & { variant?: ButtonVariant }) {
  return <Link className={cx(btnBase, BUTTON[variant], className)} {...props} />;
}

export function Card({ className, ...props }: ComponentProps<"div">) {
  return <div className={cx("rounded-card border border-line bg-card p-5", className)} {...props} />;
}

const TONE: Record<Tone, string> = {
  neutral: "bg-paper text-ink-soft border-line",
  brand: "bg-brand-soft text-brand border-brand/20",
  ok: "bg-ok-soft text-ok border-ok/20",
  warn: "bg-warn-soft text-warn border-warn/20",
  danger: "bg-danger-soft text-danger border-danger/20",
  tape: "bg-tape-soft text-ink border-tape/60",
};

export function Badge({ tone = "neutral", children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span className={cx("inline-flex items-center rounded-full border px-2.5 py-0.5 text-sm font-medium", TONE[tone])}>
      {children}
    </span>
  );
}

export function Alert({ tone = "brand", title, children }: { tone?: Tone; title?: string; children?: ReactNode }) {
  return (
    <div role={tone === "danger" ? "alert" : "status"} className={cx("rounded-2xl border p-4", TONE[tone])}>
      {title && <p className="font-semibold">{title}</p>}
      {children && <div className="text-[0.95rem] leading-relaxed">{children}</div>}
    </div>
  );
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-3xl font-bold sm:text-4xl">{title}</h1>
        {subtitle && <p className="mt-1 text-ink-soft">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function EmptyState({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="rounded-card border border-dashed border-line bg-card/60 p-8 text-center">
      <p className="font-display text-xl font-semibold">{title}</p>
      {children && <div className="mx-auto mt-2 max-w-md text-ink-soft">{children}</div>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Stars({ value, size = "base" }: { value: number; size?: "base" | "lg" }) {
  const full = Math.round(value);
  return (
    <span className={cx("text-tape", size === "lg" ? "text-2xl" : "text-base")} aria-label={`${value.toFixed(1)} de 5 estrelas`}>
      {"★".repeat(full)}
      <span className="text-line">{"★".repeat(5 - full)}</span>
    </span>
  );
}

export function DemoTag() {
  return (
    <span className="rounded bg-tape px-1.5 py-0.5 text-xs font-bold uppercase tracking-wide text-ink" title="Dado de demonstração, não é real">
      Demo
    </span>
  );
}

export function KeyValue({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-sm text-ink-soft">{label}</dt>
      <dd className="font-medium">{children}</dd>
    </div>
  );
}

export function Section({ title, children, className }: { title: string; children: ReactNode; className?: string }) {
  return (
    <section className={cx("mt-8", className)}>
      <h2 className="mb-3 text-xl font-bold">{title}</h2>
      {children}
    </section>
  );
}
