import Link from "next/link";
import { CategoryArt } from "@/components/illustrations";
import { CombinadoLive } from "@/components/home/combinado-live";
import { FaqIndex } from "@/components/home/faq-index";
import { RevealOnScroll, StickyRequestBar } from "@/components/home/motion";
import { StepsPinned } from "@/components/home/steps-pinned";
import { HeroPro, ProTeam } from "@/components/people";
import { LinkButton } from "@/components/ui";
import { listCategories, listRegions } from "@/server/services/catalog";

export const dynamic = "force-dynamic";

/*
 * Página inicial. Direção de arte (skill design-taste-frontend, docs/DECISIONS.md D-021):
 * "o produto se mostra funcionando" — o combinado se monta enquanto a pessoa
 * escreve o problema, sobre um palco com o recorte do telhado do logo.
 * Sem números de volume, avaliações ou depoimentos inventados.
 */

const PROMISES = [
  "Preço antes de agendar",
  "Mudou o preço? Só com o seu OK",
  "Contato protegido",
  "Profissional não paga por pedido",
  "Documentos conferidos por pessoas",
];

const STEPS = [
  {
    t: "Conte o que precisa.",
    d: "Escolha o serviço, descreva o problema e mande fotos se quiser. Uns 2 minutos, sem instalar nada.",
    img: "/marketing/app-pedido.webp",
    alt: "Tela do app: formulário de pedido de orçamento",
  },
  {
    t: "Compare as propostas.",
    d: "Até 4 profissionais da sua região mandam preço, o que está incluído e os horários livres.",
    img: "/marketing/app-propostas.webp",
    alt: "Tela do app: duas propostas com preço e horário",
  },
  {
    t: "Acompanhe até o fim.",
    d: "Agendou, começou, terminou: cada etapa aparece no app. No final, você confirma e avalia.",
    img: "/marketing/app-acompanhamento.webp",
    alt: "Tela do app: serviço concluído com linha do tempo",
  },
];

const FAQ: [string, string][] = [
  ["Quanto custa usar?", "Pedir orçamento é grátis. Você paga ao profissional o valor da proposta que aceitar. No piloto, o pagamento é feito direto a ele; a plataforma ainda não processa pagamentos."],
  ["E se ele precisar ver o problema antes?", "A proposta traz a taxa de visita, que pode ser grátis. No local, o profissional propõe o preço final pelo app, e ele só vale se você aprovar."],
  ["E se nenhuma proposta servir?", "Você não é obrigado a aceitar. Pode cancelar o pedido antes de agendar; sem resposta sua, ele expira sozinho em 72 horas."],
  ["E se o profissional não aparecer?", "Passados 30 minutos do horário, você registra a ausência no app. O pedido volta a receber propostas e a ausência fica no histórico do profissional."],
  ["Quem são os profissionais?", "Autônomos da sua região que passaram pela conferência de documentos da nossa equipe. Antes de escolher, você vê o perfil, a experiência e as avaliações de serviços feitos aqui."],
];

/** Pedaços das telas do app, em tamanho real, para cada regra do combinado. */
function Fragment({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div aria-hidden data-ui className={`rounded-[1.25rem] bg-card p-5 text-[0.9rem] ${className}`}>
      {children}
    </div>
  );
}

const RULES = [
  {
    t: "O preço só muda com o seu OK",
    d: "Apareceu algo a mais no local? O profissional manda o ajuste pelo app, com o motivo. Sem a sua aprovação, vale o preço combinado.",
    ui: (
      <Fragment>
        <p className="font-semibold">Ajuste de preço</p>
        <p className="mt-1 text-ink-soft">Sifão rachado: troca da peça + mão de obra.</p>
        <p className="mt-3 font-display text-2xl font-bold">
          R$ 180 <span className="text-ink-soft">→</span> R$ 220
        </p>
        <div className="mt-4 flex gap-2">
          <span className="rounded-full border border-line px-4 py-2 font-semibold">Recusar</span>
          <span className="rounded-full bg-brand px-4 py-2 font-semibold text-white">Aprovar</span>
        </div>
      </Fragment>
    ),
  },
  {
    t: "Seu telefone fica guardado",
    d: "Antes do agendamento, contatos escritos na conversa são escondidos. Endereço completo e telefone só vão para quem você escolher.",
    ui: (
      <Fragment className="space-y-2">
        <p className="w-fit max-w-[85%] rounded-2xl rounded-bl-sm bg-paper px-3 py-2">Me chama no zap pra gente combinar?</p>
        <p className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-sm bg-brand-soft px-3 py-2">
          Claro, é <span className="font-semibold text-brand">[contato oculto até o agendamento]</span>
        </p>
      </Fragment>
    ),
  },
  {
    t: "Faltou? Fica registrado",
    d: "Meia hora depois do horário, você registra a ausência. O pedido volta a receber propostas e o histórico do profissional mostra o que aconteceu.",
    ui: (
      <Fragment>
        <p className="text-ink-soft">Agendado para hoje, 14h às 16h</p>
        <p className="mt-1 font-semibold">O profissional não chegou?</p>
        <span className="mt-3 inline-flex rounded-full bg-tape px-4 py-2 font-semibold">Registrar ausência</span>
      </Fragment>
    ),
  },
  {
    t: "No máximo 4 propostas",
    d: "Seu pedido não vira leilão: até 4 profissionais respondem, cada um com preço, o que está incluído e horários.",
    ui: (
      <Fragment className="space-y-2">
        <p className="font-semibold">Propostas recebidas · 2 de 4</p>
        {[
          ["Proposta 1", "R$ 150", "amanhã, 9h"],
          ["Proposta 2", "R$ 165", "sexta, 14h"],
        ].map(([n, p, h]) => (
          <p key={n} className="flex items-center justify-between rounded-xl bg-paper px-3 py-2">
            <span>{n}</span>
            <span className="text-ink-soft">{h}</span>
            <span className="font-semibold">{p}</span>
          </p>
        ))}
      </Fragment>
    ),
  },
];

const CHECKED = ["Documento com foto (RG ou CNH)", "Comprovante de endereço", "CPF válido", "Histórico de cancelamentos e ausências"];
const NOT_YET = ["Antecedentes criminais", "Garantia ou seguro do serviço", "Pagamento pelo site (no piloto, direto ao profissional)"];

export default async function Home() {
  const [categories, regions] = await Promise.all([listCategories(), listRegions()]);
  return (
    <div className="-mt-6 sm:-mt-10">
      <RevealOnScroll />

      {/* ---------------------------------------------------------------- TOPO */}
      <section id="topo" className="full-bleed overflow-hidden pt-6 sm:pt-14">
        <div className="mx-auto grid max-w-6xl gap-5 px-4 sm:gap-8 lg:grid-cols-12 lg:gap-x-6 lg:gap-y-10">
          <div className="lg:col-span-8">
            <h1 className="font-display text-[clamp(2.6rem,9.5vw,4.5rem)] font-extrabold leading-[0.98] tracking-[-0.03em]">
              <span className="block overflow-hidden pb-1">
                <span className="hero-line block">Reparo em casa?</span>
              </span>
              <span className="block overflow-hidden pb-1">
                <span className="hero-line hero-line-2 block">Arrumaê.</span>
              </span>
            </h1>
          </div>
          <div className="lg:col-span-5 lg:row-start-2">
            <p className="hero-after max-w-xl text-[1.0625rem] sm:text-xl">
              Eletricista, encanador, montador e pequenos reparos em São Paulo. Você descreve o problema, recebe até 4 propostas
              com preço e horário e escolhe. Piloto em{" "}
              <a href="#onde" className="font-semibold text-brand underline underline-offset-4">
                {regions.length} regiões da cidade
              </a>
              .
            </p>
          </div>

          {/* Palco com o recorte do telhado (o mesmo "^" do ê do logo) */}
          <div className="hero-after relative -mx-4 lg:col-span-7 lg:col-start-6 lg:row-start-2 lg:mx-0 lg:-mt-24 lg:mr-[calc(-1*max(1rem,(100vw-72rem)/2+1rem))]">
            <div className="roof-stage bg-brand px-4 pb-0 pt-[4.5rem] sm:px-8 lg:pl-14 lg:pt-24">
              <div className="grid gap-6 xl:grid-cols-[minmax(0,24rem)_minmax(0,1fr)]">
                <div className="pb-8">
                  <CombinadoLive services={categories.map((c) => ({ slug: c.slug, name: c.name, examples: c.examples }))} regionCount={regions.length} />
                </div>
                <HeroPro home className="hero-pro mx-auto -mb-1 w-full max-w-[19rem] self-end lg:max-w-[22rem] xl:-ml-6 xl:max-w-none xl:self-start" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------- PROMESSAS */}
      <section aria-label="Nossas regras" className="full-bleed bg-ink text-white">
        <ul className="mx-auto grid max-w-6xl grid-cols-1 gap-x-8 gap-y-2 px-4 py-5 font-semibold min-[480px]:grid-cols-2 lg:flex lg:flex-wrap lg:justify-between">
          {PROMISES.map((p) => (
            <li key={p} className="flex items-center gap-2">
              <svg aria-hidden viewBox="0 0 20 20" className="size-5 shrink-0">
                <path d="M4 10.5l4 4 8-9" fill="none" stroke="var(--color-tape)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {p}
            </li>
          ))}
        </ul>
      </section>

      {/* ------------------------------------------------------------ SERVIÇOS */}
      <section id="servicos" className="scroll-mt-24 py-20 sm:py-28">
        <div className="grid gap-10 lg:grid-cols-12">
          <div data-reveal className="lg:col-span-4">
            <div>
              <h2 className="text-[clamp(2rem,4vw,2.75rem)] font-extrabold leading-[1.05] tracking-[-0.02em]">O que a gente arruma</h2>
              <p className="mt-4 text-lg">
                Cinco serviços no piloto, com regra clara do que entra. Toque num exemplo e o pedido já começa preenchido.
              </p>
              <p className="mt-4 text-ink-soft">
                Pintura, gás e obras ficam de fora por enquanto.{" "}
                <Link href="/suporte" className="font-semibold text-brand underline underline-offset-4">Sugerir um serviço</Link>
              </p>
            </div>
          </div>
          <div className="space-y-12 lg:col-span-8">
            {categories.map((c) => (
              <div key={c.id} data-reveal>
                <div className="flex items-center gap-3">
                  <CategoryArt slug={c.slug} className="size-12 shrink-0" />
                  <h3 className="text-[1.5rem] font-bold leading-tight">{c.name}</h3>
                </div>
                <ul className="mt-3">
                  {c.examples.map((e) => (
                    <li key={e}>
                      <Link
                        href={`/pedir?categoria=${c.slug}&titulo=${encodeURIComponent(e)}`}
                        className="group flex min-h-11 items-center justify-between gap-4 rounded-xl px-3 py-2 transition hover:bg-card active:scale-[0.99]"
                      >
                        <span>{e}</span>
                        <span className="shrink-0 font-semibold text-brand transition group-hover:translate-x-1">Pedir →</span>
                      </Link>
                    </li>
                  ))}
                </ul>
                {c.outOfScope.length > 0 && (
                  <p className="mt-2 max-w-[62ch] px-3 text-ink-soft">Fora deste serviço: {c.outOfScope.join("; ")}.</p>
                )}
                <Link href={`/servicos/${c.slug}`} className="mt-2 inline-block px-3 font-semibold text-brand underline-offset-4 hover:underline">
                  Mais sobre {c.name.toLowerCase()} →
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------- COMO FUNCIONA */}
      <section className="full-bleed bg-card py-20 sm:py-28">
        <div className="mx-auto max-w-6xl px-4">
          <h2 data-reveal className="text-[clamp(2rem,4vw,2.75rem)] font-extrabold leading-[1.05] tracking-[-0.02em]">
            Do pedido ao serviço feito
          </h2>
          <StepsPinned steps={STEPS} />
          <p className="mt-6 text-sm text-ink-soft">Telas reais do app, com dados de demonstração.</p>
        </div>
      </section>

      {/* ------------------------------------------------- COMBINADO É COMBINADO */}
      <section className="py-20 sm:py-28">
        <div className="grid gap-12 lg:grid-cols-12">
          <div data-reveal className="lg:col-span-4">
            <div className="lg:sticky lg:top-28">
              <h2 className="text-[clamp(2rem,4vw,2.75rem)] font-extrabold leading-[1.05] tracking-[-0.02em]">Combinado é combinado</h2>
              <p className="mt-4 text-lg">
                O que mais incomoda em serviço de casa é a surpresa: preço que muda, profissional que some, ninguém a quem recorrer.
                Aqui o combinado fica registrado, e o app não deixa ele mudar sem você.
              </p>
              <LinkButton href="/como-funciona" variant="secondary" className="mt-6">Ver todas as regras</LinkButton>
            </div>
          </div>
          <ul className="space-y-14 lg:col-span-8">
            {RULES.map((r) => (
              <li key={r.t} data-reveal className="grid items-start gap-5 sm:grid-cols-[minmax(0,22rem)_1fr]">
                {r.ui}
                <div>
                  <h3 className="text-[1.375rem] font-bold leading-tight">{r.t}</h3>
                  <p className="mt-2 text-lg">{r.d}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <p className="mt-10 text-sm text-ink-soft">Exemplos ilustrativos das telas do app.</p>
      </section>

      {/* ------------------------------------------------- O QUE CONFERIMOS */}
      <section aria-labelledby="conferimos" className="pb-20 sm:pb-28">
        <ul className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          <li data-reveal className="col-span-2 rounded-[1.25rem] bg-tape p-6 sm:p-8">
            <h2 id="conferimos" className="text-[clamp(1.75rem,3vw,2.5rem)] font-extrabold leading-[1.05] tracking-[-0.02em]">
              O que a equipe confere
            </h2>
            <p className="mt-3 max-w-md">Antes de aprovar um profissional, uma pessoa da equipe olha cada item.</p>
          </li>
          {CHECKED.map((c) => (
            <li key={c} data-reveal className="flex min-h-32 items-start rounded-[1.25rem] bg-ok-soft p-4 font-display text-[1.125rem] font-bold leading-tight text-ok [overflow-wrap:anywhere] sm:min-h-36 sm:p-6 sm:text-[1.375rem]">
              {c}
            </li>
          ))}
          <li data-reveal className="col-span-2 rounded-[1.25rem] bg-ink p-6 text-white sm:p-8">
            <h3 className="text-[clamp(1.75rem,3vw,2.5rem)] font-extrabold leading-[1.05] tracking-[-0.02em]">O que ainda não fazemos</h3>
            <p className="mt-3 max-w-md text-white/85">Preferimos dizer. O selo do perfil mostra só o que foi conferido de verdade.</p>
          </li>
          {NOT_YET.map((c) => (
            <li key={c} data-reveal className="flex min-h-32 items-start rounded-[1.25rem] bg-card p-4 font-display text-[1.125rem] font-bold leading-tight text-ink-soft [overflow-wrap:anywhere] last:col-span-2 sm:min-h-36 sm:p-6 sm:text-[1.375rem]">
              {c}
            </li>
          ))}
        </ul>
      </section>

      {/* ------------------------------------------------------- PROFISSIONAIS */}
      <section className="full-bleed bg-tape">
        <div className="mx-auto grid max-w-6xl items-center gap-8 px-4 py-16 lg:grid-cols-[1fr_1.1fr] lg:py-20">
          <ProTeam className="mx-auto w-full max-w-xl" />
          <div data-reveal>
            <h2 className="text-[clamp(2rem,4vw,2.75rem)] font-extrabold leading-[1.05] tracking-[-0.02em]">Sem pagar por contato</h2>
            <p className="mt-4 text-lg font-semibold">É profissional? Aqui funciona assim:</p>
            <ul className="mt-2 space-y-2 text-lg">
              <li>Pedidos da sua região, com descrição e fotos.</li>
              <li>No máximo 4 propostas por pedido.</li>
              <li>Preço, horário e mudanças registrados no app.</li>
              <li>Comissão só sobre serviço concluído, e dispensada no piloto.</li>
            </ul>
            <LinkButton href="/seja-profissional" className="mt-7 bg-ink hover:bg-ink/90">Quero me cadastrar</LinkButton>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------- ONDE */}
      <section id="onde" className="scroll-mt-24 py-20 sm:py-28">
        <div data-reveal className="grid gap-4 lg:grid-cols-12">
          <h2 className="text-[clamp(2rem,4vw,2.75rem)] font-extrabold leading-[1.05] tracking-[-0.02em] lg:col-span-5">Onde atendemos</h2>
          <p className="max-w-[60ch] text-lg lg:col-span-6 lg:col-start-7">
            Começamos por poucos bairros para responder rápido. Seu bairro não está aqui? Ele está na fila, e você pode avisar a gente.
          </p>
        </div>
        <ul className="mt-10 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {regions.map((r) => (
            <li key={r.id} data-reveal className="rounded-[1.25rem] bg-card p-6">
              <h3 className="text-[1.375rem] font-bold leading-tight">{r.name}</h3>
              <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
                {categories.map((c) => (
                  <li key={c.id}>
                    <Link href={`/servicos/${c.slug}/${r.slug}`} className="text-brand underline-offset-4 hover:underline">
                      {c.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </li>
          ))}
          <li data-reveal className="flex flex-col justify-between rounded-[1.25rem] bg-brand p-6 text-white">
            <h3 className="text-[1.375rem] font-bold leading-tight">Seu bairro ainda não?</h3>
            <Link href="/suporte" className="mt-6 font-semibold underline underline-offset-4">Avisar a equipe →</Link>
          </li>
        </ul>
      </section>

      {/* ------------------------------------------------------------- DÚVIDAS */}
      <section className="pb-20 sm:pb-28">
        <h2 data-reveal className="mb-8 text-[clamp(2rem,4vw,2.75rem)] font-extrabold leading-[1.05] tracking-[-0.02em]">Perguntas frequentes</h2>
        <FaqIndex items={FAQ} />
      </section>

      {/* ----------------------------------------------------- FRASE COM LACUNA */}
      <section id="fim" className="full-bleed bg-brand text-white">
        <form action="/pedir" method="get" className="mx-auto max-w-6xl px-4 py-20 sm:py-28">
          <h2 className="font-display text-[clamp(2.1rem,6vw,4.5rem)] font-extrabold leading-[1.1] tracking-[-0.03em]">
            <label htmlFor="lacuna">Preciso arrumar</label>{" "}
            <input
              id="lacuna"
              name="titulo"
              maxLength={80}
              placeholder="o chuveiro"
              autoComplete="off"
              className="my-1 inline-block h-[1.15em] w-full rounded-[0.25em] bg-white/15 px-[0.3em] align-baseline text-white placeholder:text-white/60 focus:bg-white/25 focus:outline-none sm:w-[7em]"
            />{" "}
            lá em casa.{" "}
            <button type="submit" className="rounded-[0.25em] bg-tape px-[0.3em] text-ink transition hover:brightness-95 active:scale-[0.98]">
              Pedir
            </button>
          </h2>
          <p className="mt-6 max-w-xl text-lg text-white/85">Grátis. Você recebe propostas com preço e horário e só aceita se quiser.</p>
        </form>
      </section>

      <StickyRequestBar watchId="topo" hideId="fim" />
    </div>
  );
}
