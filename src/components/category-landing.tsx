import { CategoryArt } from "./illustrations";
import { Card, LinkButton } from "./ui";

type Category = { slug: string; name: string; shortDescription: string; examples: string[]; outOfScope: string[]; pricingMode: string };

/**
 * Landing de categoria (e categoria + região) para SEO local e anúncios.
 * Só afirma o que a plataforma realmente faz; nenhum número inventado.
 */
export function CategoryLanding({ category, regionName, regions }: { category: Category; regionName?: string; regions: { slug: string; name: string }[] }) {
  const where = regionName ? ` em ${regionName}` : " em São Paulo";
  const href = `/pedir?categoria=${category.slug}`;
  return (
    <div className="mx-auto max-w-4xl">
      <div className="grid items-center gap-8 md:grid-cols-[1.4fr_1fr]">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full border border-tape/70 bg-tape-soft px-3 py-1 text-sm font-semibold">
            <span className="size-2 rounded-full bg-clay" /> {category.name}
          </p>
          <h1 className="mt-4 text-4xl font-extrabold leading-[1.05] sm:text-5xl">{category.name}{where}, com preço antes de agendar</h1>
          <p className="mt-4 text-lg text-ink-soft">{category.shortDescription} Descreva o que precisa e receba até 4 propostas de profissionais com documentos conferidos{regionName ? ` que atendem ${regionName}` : ""}.</p>
          <LinkButton href={href} className="mt-6 w-full text-lg sm:w-auto">Pedir orçamento grátis</LinkButton>
        </div>
        <CategoryArt slug={category.slug} className="mx-auto block size-56 sm:size-72" />
      </div>

      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        <Card>
          <h2 className="text-xl font-bold">Serviços comuns</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5">{category.examples.map((e) => <li key={e}>{e}</li>)}</ul>
        </Card>
        <Card>
          <h2 className="text-xl font-bold">Como o preço funciona</h2>
          <p className="mt-2">
            {category.pricingMode === "visit_required"
              ? "Este tipo de serviço exige visita técnica: a proposta informa a taxa de visita, e o preço final só vale se você aprovar no app."
              : "Cada profissional envia o preço total — ou, se precisar ver antes, a taxa de visita. Qualquer mudança no meio do serviço só vale com a sua aprovação."}
          </p>
        </Card>
      </div>
      {category.outOfScope.length > 0 && (
        <p className="mt-4 text-sm text-ink-soft"><strong>Não atendemos por aqui:</strong> {category.outOfScope.join("; ")}.</p>
      )}
      <div className="mt-10">
        <h2 className="text-xl font-bold">Regiões atendidas no piloto</h2>
        <ul className="mt-3 flex flex-wrap gap-2">
          {regions.map((r) => (
            <li key={r.slug}><a href={`/servicos/${category.slug}/${r.slug}`} className="block rounded-full border border-line bg-card px-3 py-1 hover:border-brand">{category.name} em {r.name}</a></li>
          ))}
        </ul>
      </div>
    </div>
  );
}
