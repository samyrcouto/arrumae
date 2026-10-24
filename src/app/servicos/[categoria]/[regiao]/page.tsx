import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CategoryLanding } from "@/components/category-landing";
import { getCategoryBySlug, getRegionBySlug, listRegions } from "@/server/services/catalog";

type Params = { params: Promise<{ categoria: string; regiao: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const p = await params;
  const [c, r] = await Promise.all([getCategoryBySlug(p.categoria), getRegionBySlug(p.regiao)]);
  if (!c || !r) return {};
  return { title: `${c.name} em ${r.name} — orçamento com preço antes de agendar`, description: `${c.shortDescription} Atendimento em ${r.name}, ${r.city}.`, alternates: { canonical: `/servicos/${c.slug}/${r.slug}` } };
}

export default async function CategoryRegionPage({ params }: Params) {
  const p = await params;
  const [c, r] = await Promise.all([getCategoryBySlug(p.categoria), getRegionBySlug(p.regiao)]);
  if (!c || !r) notFound();
  const regions = await listRegions();
  return <CategoryLanding category={c} regionName={r.name} regions={regions} />;
}
