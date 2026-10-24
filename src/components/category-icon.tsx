/** Ícones simples (SVG inline) por categoria — sem dependência externa. */
const PATHS: Record<string, string> = {
  eletrica: "M13 2 4 14h7l-1 8 9-12h-7l1-8z",
  encanador: "M6 3v6a3 3 0 0 0 3 3h6a3 3 0 0 1 3 3v6M3 6h6M15 21h6",
  "montagem-de-moveis": "M4 20V8l8-5 8 5v12M4 12h16M9 20v-5h6v5",
  "pequenos-reparos": "m14.7 6.3 3-3a4 4 0 0 1-5.4 5.4L5 16l-2 5 5-2 7.3-7.3a4 4 0 0 1 5.4-5.4l-3 3z",
  "ar-condicionado": "M3 5h18v8H3zM7 17l-1 3M12 17v3M17 17l1 3M7 9h10",
};

export function CategoryIcon({ slug, className = "size-7" }: { slug: string; className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d={PATHS[slug] ?? "M12 3v18M3 12h18"} />
    </svg>
  );
}
