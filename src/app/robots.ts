import type { MetadataRoute } from "next";

export const dynamic = "force-dynamic";

export default function robots(): MetadataRoute.Robots {
  const base = process.env.APP_URL ?? "http://localhost:3000";
  const isProd = process.env.APP_ENV === "production";
  return {
    // Fora de produção, nada é indexado.
    rules: isProd
      ? { userAgent: "*", allow: "/", disallow: ["/cliente", "/profissional", "/admin", "/conta", "/arquivos", "/api", "/suporte", "/notificacoes"] }
      : { userAgent: "*", disallow: "/" },
    sitemap: `${base}/sitemap.xml`,
  };
}
