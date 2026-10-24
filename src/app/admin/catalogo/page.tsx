import { CategoryForm, RegionForm } from "@/components/admin-forms";
import { Badge, Card, PageHeader, Section } from "@/components/ui";
import { requireUser } from "@/server/auth/session";
import { listCategories, listRegions } from "@/server/services/catalog";

export default async function AdminCatalog() {
  await requireUser(["admin"]);
  const [categories, regions] = await Promise.all([listCategories({ includeInactive: true }), listRegions({ includeInactive: true })]);
  return (
    <div className="max-w-3xl">
      <PageHeader title="Categorias e regiões" subtitle="Ative ou pause categorias e regiões conforme a capacidade de atendimento." />
      <Section title="Categorias" className="mt-0">
        <div className="space-y-3">
          {categories.map((c) => (
            <details key={c.id} className="rounded-card border border-line bg-card">
              <summary className="flex cursor-pointer items-center justify-between gap-2 p-4 font-semibold">
                {c.name} <Badge tone={c.active ? "ok" : "neutral"}>{c.active ? "ativa" : "pausada"}</Badge>
              </summary>
              <div className="border-t border-line p-4"><CategoryForm c={c} /></div>
            </details>
          ))}
          <details className="rounded-card border border-dashed border-line bg-card">
            <summary className="cursor-pointer p-4 font-semibold text-brand">+ Nova categoria</summary>
            <div className="border-t border-line p-4"><CategoryForm /></div>
          </details>
        </div>
      </Section>
      <Section title="Regiões">
        <Card className="mb-3 text-sm text-ink-soft">Os prefixos de CEP iniciais são aproximações por setor postal (hipótese). Valide com a base dos Correios antes do piloto.</Card>
        <div className="space-y-3">
          {regions.map((r) => (
            <details key={r.id} className="rounded-card border border-line bg-card">
              <summary className="flex cursor-pointer items-center justify-between gap-2 p-4 font-semibold">
                {r.name} <span className="text-sm font-normal text-ink-soft">{r.cepPrefixes.join(", ")}</span>
              </summary>
              <div className="border-t border-line p-4"><RegionForm r={r} /></div>
            </details>
          ))}
          <details className="rounded-card border border-dashed border-line bg-card">
            <summary className="cursor-pointer p-4 font-semibold text-brand">+ Nova região</summary>
            <div className="border-t border-line p-4"><RegionForm /></div>
          </details>
        </div>
      </Section>
    </div>
  );
}
