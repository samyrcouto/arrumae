import { NextResponse, type NextRequest } from "next/server";

/**
 * Proteção leve antes da renderização:
 * 1. Rotas de API mutáveis exigem Origin igual ao host (CSRF). Server Actions
 *    já têm essa checagem embutida no Next.js.
 * 2. Áreas logadas sem cookie de sessão redirecionam direto para o login
 *    (otimização; a autorização real acontece no servidor em cada página).
 * 3. Content Security Policy com nonce novo a cada requisição: só roda script
 *    que o próprio Next marcou com o nonce, então um script injetado numa página
 *    (XSS) não executa. Funciona porque todas as páginas são dinâmicas (D-004).
 */
export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/api/") && req.method !== "GET" && !pathname.startsWith("/api/cron/")) {
    const origin = req.headers.get("origin");
    const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
    if (!origin || !host || new URL(origin).host !== host) return new NextResponse("Origem não permitida", { status: 403 });
  }

  if (/^\/(cliente|profissional|admin|conta|notificacoes)(\/|$)/.test(pathname) && !req.cookies.has("arrumae_session")) {
    const url = req.nextUrl.clone();
    url.pathname = "/entrar";
    url.search = `?next=${encodeURIComponent(pathname)}`;
    return NextResponse.redirect(url);
  }

  if (pathname.startsWith("/api/")) return NextResponse.next();

  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = contentSecurityPolicy(nonce);
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp); // o Next lê o nonce daqui e marca os scripts dele
  const res = NextResponse.next({ request: { headers: requestHeaders } });
  res.headers.set("Content-Security-Policy", csp);
  return res;
}

export function contentSecurityPolicy(nonce: string) {
  const dev = process.env.NODE_ENV === "development";
  return [
    "default-src 'self'",
    // 'strict-dynamic': scripts carregados por um script confiável também valem. Em dev o React usa eval.
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${dev ? " 'unsafe-eval'" : ""}`,
    // Estilos inline continuam liberados: injetar CSS é bem menos perigoso que script.
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "connect-src 'self'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    ...(dev ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");
}

export const config = {
  matcher: [
    "/api/:path*",
    {
      // Páginas (todas). Ficam de fora arquivos estáticos e os prefetches do <Link>.
      source: "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp|gif|ico|txt|xml|webmanifest)$).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
