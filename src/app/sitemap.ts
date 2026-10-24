import type { MetadataRoute } from "next";
import { listCategories, listRegions } from "@/server/services/catalog";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.APP_URL ?? "http://localhost:3000";
  const [cats, regs] = await Promise.all([listCategories(), listRegions()]);
  const pages = ["", "/como-funciona", "/seja-profissional", "/pedir", "/termos", "/privacidade"].map((p) => ({ url: `${base}${p}` }));
  const landings = cats.flatMap((c) => [{ url: `${base}/servicos/${c.slug}` }, ...regs.map((r) => ({ url: `${base}/servicos/${c.slug}/${r.slug}` }))]);
  return [...pages, ...landings];
}
