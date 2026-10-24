import Link from "next/link";
import { CategoryArt, HeroScene, ProScene } from "@/components/illustrations";
import { PhoneFrame } from "@/components/phone-frame";
import { LinkButton } from "@/components/ui";
import { brand } from "@/config/brand";
import { listCategories, listRegions } from "@/server/services/catalog";

export const dynamic = "force-dynamic";

const PROMISES_STRIP = [
  "Preço antes de agendar",
  "Mudou o preço? Só com o seu OK",
  "Contato protegido",
  "Profissional não paga por pedido",
  "Documentos conferidos por pessoas",
];

const STEPS = [
  {
    n: "1",
    t: "Conte o que precisa",
    d: "Escolha o serviço, descreva o problema e mande fotos. Uns 2 minutos, sem instalar nada.",
    img: "/marketing/app-pedido.webp",
    alt: "Tela do app: formulário de pedido de orçamento",
  },
  {
    n: "2",
    t: "Compare propostas",
    d: "Até 4 profissionais da sua região mandam preço, o que está incluído e horários.",
    img: "/marketing/app-propostas.webp",
    alt: "Tela do app: duas propostas com preço e horário",
  },
  {
    n: "3",
    t: "Acompanhe até o fim",
    d: "Agendou, começou, terminou: cada etapa aparece no app. Você confirma e avalia no final.",
    img: "/marketing/app-acompanhamento.webp",
    alt: "Tela do app: serviço concluído com linha do tempo",
  },
];

const COMBINADO = [
  ["Serviço", "Instalar suporte de TV 55\""],
  ["Preço", "fechado, antes de agendar"],
  ["Horário", "você escolhe entre os oferecidos"],
  ["Mudança de preço", "só com a sua aprovação no app"],
  ["Seu telefone e endereço", "só para quem você escolher"],
];

const CHECKS = {
  yes: [
    "Documento de identidade com foto (RG ou CNH)",
    "Comprovante de endereço",
    "CPF válido e dados de contato",
    "Histórico de cancelamentos e ausências na plataforma",
  ],
  no: ["Checagem de antecedentes criminais", "Garantia financeira ou seguro do serviço", "Pagamento pela plataforma (no piloto, você paga direto ao profissional)"],
};

const FAQ = [
  ["Quanto custa usar?", "Pedir orçamento é grátis. Você paga ao profissional o valor da proposta que aceitar. Durante o piloto, o pagamento é feito diretamente a ele — a plataforma ainda não processa pagamentos."],
  ["E se precisar ver o problema antes?", "A proposta traz a taxa de visita (que pode ser grátis). No local, o profissional propõe o preço final pelo app, e ele só vale se você aprovar."],
  ["E se o profissional não aparecer?", "Passados 30 minutos do horário, você registra a ausência no app. O pedido volta a receber propostas e a ausência fica no histórico do profissional."],
  ["Quem são os profissionais?", "Autônomos da sua região que passaram pela conferência de documentos da nossa equipe. Você vê o perfil, a experiência e as avaliações de serviços feitos pela plataforma antes de escolher."],
];

export default async function Home() {
  const [categories, regions] = await Promise.all([listCategories(), listRegions()]);
  return (
    <div className="-mt-6 sm:-mt-10">
      {/* ------------------------------------------------------------ HERO */}
      <section className="full-bleed dot-grid overflow-hidden border-b border-line">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 pb-12 pt-8 sm:pb-16 sm:pt-14 lg:grid-cols-[1.05fr_1fr]">
          <div>
            <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-tape/70 bg-tape-soft px-3 py-1 text-sm font-semibold">
              <span className="size-2 rounded-full bg-clay" /> Piloto em {brand.city}
            </p>
            <h1 className="text-[2.6rem] font-extrabold leading-[1.02] sm:text-[3.4rem]">
              Aquele reparo que você vem adiando?{" "}
              <span className="relative whitespace-nowrap text-brand">
                Arrumaê.
                <svg aria-hidden viewBox="0 0 200 14" preserveAspectRatio="none" className="absolute -bottom-2 left-0 h-3 w-full">
                  <path d="M3 9c40-6 90-8 194-3" fill="none" stroke="var(--color-tape)" strokeWidth="6" strokeLinecap="round" />
                </svg>
              </span>
            </h1>
            <p className="mt-6 max-w-xl text-lg text-ink-soft">
              Eletricista, encanador, montador e pequenos reparos. Você descreve, recebe propostas com preço e horário de
              profissionais conferidos e acompanha tudo pelo celular.
            </p>

            <div className="mt-7 rounded-3xl border border-line bg-card p-4 shadow-[0_18px_40px_-28px_rgba(14,74,87,0.6)] sm:p-5">
              <p className="mb-3 font-display text-lg font-bold">O que precisa arrumar?</p>
              <ul className="grid grid-cols-1 gap-2 min-[440px]:grid-cols-2">
                {categories.map((c) => (
                  <li key={c.id}>
                    <Link
                      href={`/pedir?categoria=${c.slug}`}
                      className="flex h-full items-center gap-2 rounded-2xl border border-line bg-paper/60 p-2 pr-3 text-[0.95rem] font-semibold leading-tight transition hover:-translate-y-0.5 hover:border-brand hover:bg-brand-soft"
                    >
                      <CategoryArt slug={c.slug} className="size-11 shrink-0" />
                      {c.name}
                    </Link>
                  </li>
                ))}
                <li>
                  <Link
                    href="#servicos"
                    className="flex h-full items-center justify-center rounded-2xl border-2 border-dashed border-line p-2 text-center text-[0.95rem] font-semibold text-brand hover:border-brand"
                  >
                    Ver detalhes de cada serviço ↓
                  </Link>
                </li>
              </ul>
              <div className="mt-4 flex flex-col items-start gap-2 sm:flex-row sm:items-center">
                <LinkButton href="/pedir" className="w-full sm:w-auto">Pedir orçamento grátis</LinkButton>
                <span className="text-sm text-ink-soft">Grátis e sem compromisso.</span>
              </div>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-[34rem]">
            <HeroScene className="w-full" />
            <div className="absolute -bottom-6 -left-2 w-[38%] max-w-[13rem] rotate-[-4deg] sm:-left-6">
              <PhoneFrame src="/marketing/app-propostas.webp" alt="Tela real do app mostrando propostas com preço e horário" priority />
            </div>
            <p className="mt-3 pl-[42%] text-right text-xs text-ink-soft sm:mt-8">Tela real do app, com dados de demonstração.</p>
          </div>
        </div>
      </section>

      {/* -------------------------------------------------- FAIXA DE PROMESSAS */}
      <section aria-label="Nossas regras" className="full-bleed bg-ink text-white">
        <ul className="mx-auto flex max-w-6xl gap-x-8 gap-y-2 overflow-x-auto whitespace-nowrap px-4 py-4 text-[0.95rem] font-semibold sm:flex-wrap sm:justify-center">
          {PROMISES_STRIP.map((p) => (
            <li key={p} className="flex items-center gap-2">
              <svg aria-hidden viewBox="0 0 20 20" className="size-5 shrink-0"><path d="M4 10.5l4 4 8-9" fill="none" stroke="var(--color-tape)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>
              {p}
            </li>
          ))}
        </ul>
      </section>

      {/* ---------------------------------------------------------- SERVIÇOS */}
      <section id="servicos" className="scroll-mt-24 py-16">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <p className="font-semibold text-clay">Serviços do piloto</p>
            <h2 className="mt-1 text-3xl font-extrabold sm:text-4xl">O que a gente arruma</h2>
          </div>
          <p className="max-w-md text-ink-soft">Começamos com poucos serviços, bem feitos. Cada um tem regras claras do que entra e do que não entra.</p>
        </div>
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((c) => (
            <li key={c.id} className="group flex flex-col rounded-[1.6rem] border border-line bg-card p-5 transition hover:-translate-y-1 hover:shadow-[0_24px_40px_-28px_rgba(14,74,87,0.6)]">
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-xl font-bold">{c.name}</h3>
                <CategoryArt slug={c.slug} className="size-20 shrink-0 transition group-hover:rotate-[-4deg]" />
              </div>
              <ul className="mt-2 flex-1 space-y-1 text-[0.95rem] text-ink-soft">
                {c.examples.slice(0, 4).map((e) => (
                  <li key={e} className="flex gap-2"><span aria-hidden className="text-tape">●</span>{e}</li>
                ))}
              </ul>
              <div className="mt-5 flex items-center gap-3">
                <LinkButton href={`/pedir?categoria=${c.slug}`} className="min-h-11 px-4 text-[0.95rem]">Pedir orçamento</LinkButton>
                <Link href={`/servicos/${c.slug}`} className="text-[0.95rem] font-semibold text-brand underline-offset-4 hover:underline">Saiba mais</Link>
              </div>
            </li>
          ))}
          <li className="flex flex-col justify-center rounded-[1.6rem] border-2 border-dashed border-line p-6 text-ink-soft">
            <p className="font-display text-xl font-bold text-ink">Precisa de outra coisa?</p>
            <p className="mt-2 text-[0.95rem]">Pintura, gás, obras e projetos ficam de fora por enquanto. Fale com a gente se quiser ver seu serviço aqui.</p>
            <Link href="/suporte" className="mt-3 font-semibold text-brand underline">Sugerir um serviço</Link>
          </li>
        </ul>
      </section>

      {/* ------------------------------------------------------ COMO FUNCIONA */}
      <section className="full-bleed bg-brand-soft/60 py-16">
        <div className="mx-auto max-w-6xl px-4">
          <p className="font-semibold text-clay">Como funciona</p>
          <h2 className="mt-1 text-3xl font-extrabold sm:text-4xl">Do pedido ao “ficou ótimo” em 3 passos</h2>
          <ol className="mt-10 grid gap-10 md:grid-cols-3">
            {STEPS.map((s) => (
              <li key={s.n} className="flex flex-col items-center text-center">
                <PhoneFrame src={s.img} alt={s.alt} className="w-[62%] max-w-[15rem]" />
                <span className="-mt-5 grid size-11 place-items-center rounded-full border-2 border-ink bg-tape font-display text-xl font-extrabold">{s.n}</span>
                <p className="mt-3 text-xl font-bold">{s.t}</p>
                <p className="mt-1 max-w-xs text-ink-soft">{s.d}</p>
              </li>
            ))}
          </ol>
          <p className="mt-8 text-center text-xs text-ink-soft">Telas reais do app, com dados de demonstração.</p>
        </div>
      </section>

      {/* -------------------------------------------------------- COMBINADO */}
      <section className="py-16">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div>
            <p className="font-semibold text-clay">Nosso jeito</p>
            <h2 className="mt-1 text-3xl font-extrabold sm:text-4xl">Combinado é combinado</h2>
            <p className="mt-3 max-w-lg text-lg text-ink-soft">
              O que mais incomoda em serviço de casa é a surpresa: preço que muda, profissional que some, ninguém a quem
              recorrer. Aqui, o combinado fica registrado — e o app não deixa ele mudar sem você.
            </p>
            <LinkButton href="/como-funciona" variant="secondary" className="mt-6">Ver todas as regras</LinkButton>
          </div>
          <div className="relative mx-auto w-full max-w-md">
            <div className="absolute -right-1.5 -top-2 h-full w-full rotate-2 rounded-3xl bg-tape sm:-right-3 sm:-top-3" aria-hidden />
            <div className="relative rounded-3xl border-2 border-ink bg-card p-6">
              <div className="flex items-center justify-between">
                <p className="font-display text-xl font-extrabold">Combinado</p>
                <span className="rounded-full bg-paper px-2.5 py-0.5 text-xs font-semibold text-ink-soft">exemplo</span>
              </div>
              <div className="my-4 border-t-2 border-dashed border-line" />
              <dl className="space-y-3">
                {COMBINADO.map(([k, v]) => (
                  <div key={k} className="flex items-start gap-3">
                    <svg aria-hidden viewBox="0 0 24 24" className="mt-0.5 size-6 shrink-0"><circle cx="12" cy="12" r="11" fill="var(--color-brand)" /><path d="M7 12.5l3.2 3.2L17 9" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    <div>
                      <dt className="text-sm text-ink-soft">{k}</dt>
                      <dd className="font-semibold">{v}</dd>
                    </div>
                  </div>
                ))}
              </dl>
              <div className="tape-measure -mx-6 -mb-6 mt-6 rounded-b-[1.4rem]" aria-hidden />
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------- O QUE CONFERIMOS */}
      <section className="rounded-[2rem] border border-line bg-card p-6 sm:p-10">
        <h2 className="text-3xl font-extrabold">Transparência sobre os profissionais</h2>
        <p className="mt-2 max-w-2xl text-ink-soft">Preferimos dizer exatamente o que fazemos — e o que ainda não fazemos.</p>
        <div className="mt-8 grid gap-8 md:grid-cols-2">
          <div>
            <p className="mb-3 font-bold text-ok">✓ O que a equipe confere antes de aprovar</p>
            <ul className="space-y-2">
              {CHECKS.yes.map((c) => <li key={c} className="rounded-xl bg-ok-soft px-4 py-2.5">{c}</li>)}
            </ul>
          </div>
          <div>
            <p className="mb-3 font-bold text-ink-soft">○ O que ainda não fazemos</p>
            <ul className="space-y-2">
              {CHECKS.no.map((c) => <li key={c} className="rounded-xl bg-paper px-4 py-2.5 text-ink-soft">{c}</li>)}
            </ul>
          </div>
        </div>
      </section>

      {/* -------------------------------------------------- PROFISSIONAIS */}
      <section className="full-bleed mt-16 bg-tape">
        <div className="mx-auto grid max-w-6xl items-center gap-8 px-4 py-14 lg:grid-cols-[1fr_1.1fr]">
          <ProScene className="mx-auto w-full max-w-md" />
          <div>
            <p className="font-semibold">Para profissionais</p>
            <h2 className="mt-1 text-3xl font-extrabold sm:text-4xl">Pedidos de verdade, sem pagar por contato</h2>
            <ul className="mt-5 space-y-2 text-lg">
              <li>• Pedidos da sua região, com descrição e fotos</li>
              <li>• No máximo 4 propostas por pedido</li>
              <li>• Preço, horário e mudanças registrados no app</li>
              <li>• Comissão só sobre serviço concluído — dispensada no piloto</li>
            </ul>
            <LinkButton href="/seja-profissional" className="mt-7 bg-ink hover:bg-ink/90">Quero me cadastrar</LinkButton>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------- REGIÕES */}
      <section className="py-16">
        <div className="grid gap-8 lg:grid-cols-[1fr_1.4fr] lg:items-center">
          <div>
            <p className="font-semibold text-clay">Onde atendemos</p>
            <h2 className="mt-1 text-3xl font-extrabold sm:text-4xl">Começando por poucos bairros</h2>
            <p className="mt-3 text-ink-soft">Atender bem uma região antes de crescer é o que garante resposta rápida. Seu bairro ainda não está aqui? Ele está na fila.</p>
          </div>
          <ul className="flex flex-wrap gap-3">
            {regions.map((r) => (
              <li key={r.id} className="flex items-center gap-2 rounded-full border border-line bg-card px-4 py-2 font-medium">
                <svg aria-hidden viewBox="0 0 24 24" className="size-5"><path d="M12 2a7 7 0 0 1 7 7c0 5-7 13-7 13S5 14 5 9a7 7 0 0 1 7-7z" fill="var(--color-clay)" /><circle cx="12" cy="9" r="2.6" fill="#fff" /></svg>
                {r.name}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* -------------------------------------------------------------- FAQ */}
      <section className="pb-6">
        <h2 className="text-3xl font-extrabold">Perguntas frequentes</h2>
        <div className="mt-6 divide-y divide-line rounded-[1.6rem] border border-line bg-card">
          {FAQ.map(([q, a]) => (
            <details key={q} className="group p-5 [&_summary::-webkit-details-marker]:hidden">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-lg font-semibold">
                {q}
                <span aria-hidden className="grid size-8 shrink-0 place-items-center rounded-full bg-tape-soft font-display text-xl transition group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 text-ink-soft">{a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* -------------------------------------------------------- CTA FINAL */}
      <section className="mt-12 overflow-hidden rounded-[2rem] bg-brand text-white">
        <div className="grid items-center gap-6 p-8 sm:p-12 md:grid-cols-[1fr_auto]">
          <div>
            <h2 className="text-3xl font-extrabold sm:text-4xl">Bora arrumar?</h2>
            <p className="mt-2 text-white/80">Conte o que precisa e receba propostas com preço e horário.</p>
          </div>
          <LinkButton href="/pedir" variant="tape" className="text-lg">Pedir orçamento grátis</LinkButton>
        </div>
        <div className="tape-measure" aria-hidden />
      </section>
    </div>
  );
}
