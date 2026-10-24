import { NextResponse, type NextRequest } from "next/server";

/**
 * Proteção leve antes da renderização:
 * 1. Rotas de API mutáveis exigem Origin igual ao host (CSRF). Server Actions
 *    já têm essa checagem embutida no Next.js.
 * 2. Áreas logadas sem cookie de sessão redirecionam direto para o login
 *    (otimização; a autorização real acontece no servidor em cada página).
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
  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*", "/cliente/:path*", "/profissional/:path*", "/admin/:path*", "/conta", "/notificacoes"],
};
