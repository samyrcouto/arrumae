import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CategoryLanding } from "@/components/category-landing";
import { getCategoryBySlug, listRegions } from "@/server/services/catalog";

type Params = { params: Promise<{ categoria: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const c = await getCategoryBySlug((await params).categoria);
  if (!c) return {};
  return { title: `${c.name} em São Paulo — orçamento com preço antes de agendar`, description: c.shortDescription, alternates: { canonical: `/servicos/${c.slug}` } };
}

export default async function CategoryPage({ params }: Params) {
  const c = await getCategoryBySlug((await params).categoria);
  if (!c) notFound();
  const regions = await listRegions();
  return <CategoryLanding category={c} regions={regions} />;
}
