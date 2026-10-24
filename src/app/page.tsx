import Link from "next/link";
import { CategoryIcon } from "@/components/category-icon";
import { Card, LinkButton } from "@/components/ui";
import { brand } from "@/config/brand";
import { listCategories, listRegions } from "@/server/services/catalog";

export const dynamic = "force-dynamic";

const STEPS = [
  { t: "Conte o que precisa", d: "Descreva o problema e mande fotos. Leva uns 2 minutos e não precisa instalar nada." },
  { t: "Receba propostas", d: "Até 4 profissionais da sua região respondem com preço, o que está incluído e horários." },
  { t: "Escolha e agende", d: "Compare com calma, converse pelo app e confirme o horário que for melhor." },
  { t: "Acompanhe até o fim", d: "Você vê cada etapa, aprova qualquer mudança de preço e avalia no final." },
];

const PROMISES = [
  {
    t: "Preço antes de agendar",
    d: "Cada proposta traz o valor total — ou, quando é preciso ver o problema antes, a taxa de visita informada de antemão.",
  },
  {
    t: "Mudou o preço? Só com o seu OK",
    d: "Se aparecer algo inesperado no meio do serviço, o profissional pede a alteração pelo app e você aprova ou recusa.",
  },
  {
    t: "Seu contato fica protegido",
    d: "Telefone e endereço completo só são liberados para o profissional que você escolher, depois do agendamento.",
  },
  {
    t: "Profissional não paga para ver seu pedido",
    d: "Não vendemos o seu contato. Isso evita ligações de quem não pode atender e deixa as propostas mais sérias.",
  },
  {
    t: "Cadastro conferido por pessoas",
    d: "Nossa equipe confere documento de identidade e comprovante de endereço antes de liberar cada profissional.",
  },
  {
    t: "Tudo registrado",
    d: "O combinado (escopo, preço, horário e mensagens) fica salvo. Se algo der errado, o suporte analisa com base nisso.",
  },
];

export default async function Home() {
  const [categories, regions] = await Promise.all([listCategories(), listRegions()]);
  return (
    <div className="-mt-6 sm:-mt-10">
      <section className="relative overflow-hidden pb-10 pt-8 sm:pb-16 sm:pt-14">
        <div className="grid items-center gap-10 lg:grid-cols-[1.15fr_1fr]">
          <div>
            <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-tape-soft px-3 py-1 text-sm font-semibold">
              <span className="size-2 rounded-full bg-tape" /> Piloto em {brand.city}
            </p>
            <h1 className="text-[2.6rem] font-extrabold leading-[1.05] sm:text-6xl">
              Aquele reparo <span className="relative whitespace-nowrap">adiado<span aria-hidden className="absolute -bottom-1 left-0 h-3 w-full -rotate-1 bg-tape/70 -z-10" /></span> em casa, desenrolado.
            </h1>
            <p className="mt-5 max-w-xl text-lg text-ink-soft">
              Eletricista, encanador, montador e pequenos reparos. Você descreve, recebe propostas com preço e horário de
              profissionais conferidos e acompanha tudo pelo celular.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <LinkButton href="/pedir" className="text-lg">Pedir orçamento grátis</LinkButton>
              <LinkButton href="/como-funciona" variant="secondary">Como funciona</LinkButton>
            </div>
            <p className="mt-3 text-sm text-ink-soft">Pedir é grátis e sem compromisso. Você só fecha se gostar da proposta.</p>
          </div>
          <div className="rounded-[1.6rem] border border-line bg-card p-5 shadow-[0_20px_60px_-30px_rgba(14,74,87,0.45)]">
            <p className="mb-3 font-display text-lg font-bold">O que você precisa resolver?</p>
            <ul className="grid gap-2">
              {categories.map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/pedir?categoria=${c.slug}`}
                    className="flex items-center gap-3 rounded-2xl border border-line px-4 py-3 transition hover:border-brand hover:bg-brand-soft"
                  >
                    <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand">
                      <CategoryIcon slug={c.slug} />
                    </span>
                    <span>
                      <span className="block font-semibold">{c.name}</span>
                      <span className="block text-sm text-ink-soft">{(c.examples as string[]).slice(0, 2).join(" · ")}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <div className="tape-rule" aria-hidden />

      <section className="py-12">
        <h2 className="text-3xl font-bold">Como funciona</h2>
        <ol className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <li key={s.t} className="rounded-card border border-line bg-card p-5">
              <span className="font-display text-4xl font-extrabold text-tape">{i + 1}</span>
              <p className="mt-2 text-lg font-semibold">{s.t}</p>
              <p className="mt-1 text-ink-soft">{s.d}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="rounded-[1.6rem] bg-brand px-5 py-10 text-white sm:px-10">
        <h2 className="text-3xl font-bold">Combinado é combinado</h2>
        <p className="mt-2 max-w-2xl text-white/80">
          O que mais incomoda quem contrata serviço em casa é a surpresa: preço que muda, profissional que some, falta de
          a quem recorrer. Por isso a plataforma funciona assim:
        </p>
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {PROMISES.map((p) => (
            <div key={p.t} className="rounded-2xl bg-white/10 p-5">
              <p className="text-lg font-semibold text-tape">{p.t}</p>
              <p className="mt-1 text-white/85">{p.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="py-12">
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <h2 className="text-2xl font-bold">Onde atendemos</h2>
            <p className="mt-1 text-ink-soft">Começamos por poucas regiões para garantir resposta rápida. Em breve, mais bairros.</p>
            <ul className="mt-4 flex flex-wrap gap-2">
              {regions.map((r) => (
                <li key={r.id} className="rounded-full border border-line px-3 py-1 text-[0.95rem]">{r.name}</li>
              ))}
            </ul>
          </Card>
          <Card className="bg-tape-soft">
            <h2 className="text-2xl font-bold">É profissional?</h2>
            <p className="mt-1">
              Receba pedidos da sua região sem pagar por contato. Você só envia proposta para o que quiser fazer.
            </p>
            <LinkButton href="/seja-profissional" variant="primary" className="mt-4">Quero me cadastrar</LinkButton>
          </Card>
        </div>
      </section>

      <section className="pb-4">
        <h2 className="text-2xl font-bold">Perguntas frequentes</h2>
        <dl className="mt-4 divide-y divide-line rounded-card border border-line bg-card">
          {[
            ["Quanto custa usar?", "Pedir orçamento é grátis. Você paga ao profissional o valor da proposta que aceitar. Durante o piloto, o pagamento é feito diretamente ao profissional — ainda não processamos pagamentos pela plataforma."],
            ["E se o serviço precisar de avaliação antes?", "Alguns problemas só têm preço depois de ver no local. Nesses casos, a proposta traz a taxa de visita (que pode ser grátis) e o preço final só vale se você aprovar no app."],
            ["E se o profissional não aparecer?", "Você registra a ausência no app depois de 30 minutos do horário. A solicitação volta a receber propostas e a ausência conta no histórico do profissional."],
            ["Quem são os profissionais?", "Profissionais independentes que se cadastram e passam por conferência de documentos pela nossa equipe. A plataforma ainda não faz checagem de antecedentes criminais."],
          ].map(([q, a]) => (
            <div key={q} className="p-5">
              <dt className="font-semibold">{q}</dt>
              <dd className="mt-1 text-ink-soft">{a}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}
