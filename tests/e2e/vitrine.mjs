/**
 * Gera a "vitrine" estática do projeto: capturas reais das telas (celular e
 * computador) + uma página HTML para publicar no GitHub Pages.
 *
 *   npm run vitrine     → gera em ./vitrine (usa o mesmo banco isolado do e2e)
 *
 * Todos os dados exibidos são de DEMONSTRAÇÃO (contas @demo.arrumae.invalid).
 */
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { chromium } from "playwright";
import sharp from "sharp";

const OUT = "vitrine";
const PASSWORD = "demo-senha-123";
const MOBILE = { width: 390, height: 844 };
const DESKTOP = { width: 1280, height: 800 };

/** Telas capturadas, agrupadas por área. `as` = conta usada (null = visitante). */
function screens(ids) {
  return [
    { group: "Site público", items: [
      { slug: "home", title: "Página inicial", path: "/", as: null },
      { slug: "landing", title: "Landing de serviço por bairro (SEO/anúncios)", path: "/servicos/eletrica/pinheiros-vila-madalena", as: null },
      { slug: "como-funciona", title: "Regras da plataforma", path: "/como-funciona", as: null },
      { slug: "seja-profissional", title: "Página para profissionais", path: "/seja-profissional", as: null },
      { slug: "pedir", title: "Pedido de orçamento (etapa 1 de 3)", path: "/pedir?categoria=pequenos-reparos", as: null },
      { slug: "entrar", title: "Entrar", path: "/entrar", as: null },
      { slug: "esqueci-senha", title: "Esqueci minha senha", path: "/entrar/esqueci", as: null },
    ] },
    { group: "Área do cliente", items: [
      { slug: "cliente-lista", title: "Minhas solicitações", path: "/cliente", as: "cliente" },
      { slug: "cliente-propostas", title: "Comparando propostas e escolhendo horário", path: `/cliente/solicitacoes/${ids.open}`, as: "cliente" },
      { slug: "cliente-concluido", title: "Serviço concluído e avaliado", path: `/cliente/solicitacoes/${ids.done}`, as: "cliente" },
      { slug: "perfil-publico", title: "Perfil público do profissional", path: `/profissionais/${ids.pro1}`, as: "cliente" },
      { slug: "conta-seguranca", title: "Segurança da conta (verificação em duas etapas)", path: "/conta/seguranca", as: "cliente" },
    ] },
    { group: "Área do profissional", items: [
      { slug: "pro-inicio", title: "Início do profissional", path: "/profissional", as: "pro1" },
      { slug: "pro-oportunidade", title: "Oportunidade com formulário de proposta", path: `/profissional/oportunidades/${ids.openForPro}`, as: "pro3" },
      { slug: "pro-perfil", title: "Perfil, documentos e disponibilidade", path: "/profissional/perfil", as: "pro1" },
      { slug: "pro-agenda", title: "Agenda e histórico", path: "/profissional/agenda", as: "pro1" },
    ] },
    { group: "Painel administrativo", items: [
      { slug: "admin-indicadores", title: "Indicadores", path: "/admin", as: "admin" },
      { slug: "admin-solicitacoes", title: "Solicitações", path: "/admin/solicitacoes", as: "admin" },
      { slug: "admin-profissionais", title: "Fila de verificação", path: "/admin/profissionais?status=approved", as: "admin" },
      { slug: "admin-catalogo", title: "Categorias e regiões", path: "/admin/catalogo", as: "admin" },
      { slug: "admin-financeiro", title: "Financeiro", path: "/admin/financeiro", as: "admin" },
      { slug: "admin-integracoes", title: "Integrações (n8n)", path: "/admin/integracoes", as: "admin" },
    ] },
  ];
}

const EMAILS = {
  cliente: "cliente@demo.arrumae.invalid",
  pro1: "pro1@demo.arrumae.invalid",
  pro3: "pro3@demo.arrumae.invalid",
  admin: "admin@demo.arrumae.invalid",
};

function spLocal(minutes) {
  const d = new Date(Date.now() + minutes * 60000);
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
      .formatToParts(d)
      .map((x) => [x.type, x.value]),
  );
  return { date: `${p.year}-${p.month}-${p.day}`, time: `${p.hour}:${p.minute}` };
}

export async function captureVitrine(base) {
  rmSync(OUT, { recursive: true, force: true });
  mkdirSync(`${OUT}/telas`, { recursive: true });
  const browser = await chromium.launch();
  const sessions = {};

  async function contextFor(who, viewport) {
    const ctx = await browser.newContext({ viewport, locale: "pt-BR", timezoneId: "America/Sao_Paulo", deviceScaleFactor: 2 });
    await ctx.addInitScript(() => localStorage.setItem("arrumae_consent", "essential"));
    if (who) {
      if (!sessions[who]) {
        const page = await ctx.newPage();
        await page.goto(`${base}/entrar`);
        await page.getByLabel("E-mail", { exact: true }).fill(EMAILS[who]);
        await page.getByLabel("Senha").fill(PASSWORD);
        await page.getByRole("button", { name: "Entrar" }).click();
        await page.waitForURL((u) => !u.pathname.startsWith("/entrar"));
        sessions[who] = await ctx.storageState();
        await page.close();
      } else {
        await ctx.addCookies(sessions[who].cookies);
      }
    }
    return ctx;
  }

  // --- Prepara estados interessantes (tudo com contas DEMO) ---
  const client = await (await contextFor("cliente", MOBILE)).newPage();
  const createRequest = async (title) => {
    await client.goto(`${base}/pedir?categoria=pequenos-reparos`);
    await client.getByLabel("Resumo do serviço").fill(title);
    await client.getByLabel("Descreva o que está acontecendo").fill("Exemplo de demonstração: suporte articulado para TV de 55 polegadas em parede de alvenaria.");
    await client.getByRole("button", { name: "Continuar" }).click();
    await client.getByLabel("CEP").fill("05422-010");
    await client.getByLabel("Bairro").fill("Pinheiros");
    await client.getByLabel("Rua e número").fill("Endereço de demonstração, 100");
    await client.getByRole("button", { name: "Continuar" }).click();
    await client.getByRole("button", { name: "Enviar pedido" }).click();
    await client.waitForURL(/\/cliente\/solicitacoes\/.+/);
    return client.url().split("?")[0].split("/").pop();
  };
  const open = await createRequest("[DEMO] Instalar suporte de TV");
  const openForPro = await createRequest("[DEMO] Instalar prateleiras na sala");

  for (const [who, price, msg] of [
    ["pro1", "180,00", "Instalação do suporte com buchas para alvenaria, nivelamento e organização dos cabos."],
    ["pro3", "150,00", "Instalação do suporte e teste de firmeza. Levo furadeira e brocas."],
  ]) {
    const page = await (await contextFor(who, MOBILE)).newPage();
    await page.goto(`${base}/profissional/oportunidades/${open}`);
    await page.getByLabel("Preço total (R$)").fill(price);
    await page.getByLabel("O que está incluído").fill(msg);
    const s = spLocal(26 * 60);
    await page.getByLabel("Horário 1: data").fill(s.date);
    await page.getByLabel("Horário 1: início").fill("09:00");
    await page.getByLabel("Horário 1: fim").fill("11:00");
    await page.getByRole("button", { name: "Enviar proposta" }).click();
    await page.getByText("Proposta enviada!").waitFor();
    await page.context().close();
  }
  await client.context().close();

  // Serviço concluído do seed de demonstração e id do profissional 1
  const adminPage = await (await contextFor("admin", DESKTOP)).newPage();
  await adminPage.goto(`${base}/admin/solicitacoes?status=completed`);
  const doneHref = await adminPage.getByRole("link", { name: /\[DEMO\] Trocar chuveiro/ }).first().getAttribute("href");
  await adminPage.goto(`${base}/admin/profissionais?status=approved`);
  const pro1Href = await adminPage.getByRole("link", { name: /Carlos Eletricista/ }).first().getAttribute("href");
  await adminPage.context().close();
  const ids = { open, openForPro, done: doneHref.split("/").pop(), pro1: pro1Href.split("/").pop() };

  // --- Capturas para o site (molduras de celular na página inicial) ---
  // Sem a faixa de "ambiente de desenvolvimento"; dados continuam sendo DEMO.
  mkdirSync("public/marketing", { recursive: true });
  const marketing = [
    { file: "app-pedido", as: "cliente", path: "/pedir?categoria=pequenos-reparos" },
    { file: "app-propostas", as: "cliente", path: `/cliente/solicitacoes/${ids.open}`, scrollTo: "Propostas (2)" },
    { file: "app-acompanhamento", as: "cliente", path: `/cliente/solicitacoes/${ids.done}` },
  ];
  for (const m of marketing) {
    const ctx = await contextFor(m.as, { width: 390, height: 780 });
    const page = await ctx.newPage();
    await page.goto(`${base}${m.path}`, { waitUntil: "networkidle" });
    await page.addStyleTag({ content: ".tape-band{display:none!important} header{position:static!important}" });
    if (m.scrollTo) await page.getByRole("heading", { name: m.scrollTo }).evaluate((el) => window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - 12));
    const png = await page.screenshot();
    await sharp(png).webp({ quality: 82 }).toFile(`public/marketing/${m.file}.webp`);
    await ctx.close();
    console.log(`  📱 public/marketing/${m.file}.webp`);
  }

  // --- Capturas ---
  const groups = screens(ids);
  for (const g of groups)
    for (const item of g.items)
      for (const [kind, viewport] of [["celular", MOBILE], ["computador", DESKTOP]]) {
        const ctx = await contextFor(item.as, viewport);
        const page = await ctx.newPage();
        await page.goto(`${base}${item.path}`, { waitUntil: "networkidle" });
        // O cabeçalho é fixo: solta-o para a captura de página inteira não repeti-lo no meio.
        await page.addStyleTag({ content: "header{position:static!important}" });
        await page.screenshot({ path: `${OUT}/telas/${item.slug}-${kind}.png`, fullPage: true });
        await ctx.close();
        console.log(`  📸 ${item.slug} (${kind})`);
      }
  await browser.close();
  writeFileSync(`${OUT}/index.html`, renderHtml(groups));
  writeFileSync(`${OUT}/.nojekyll`, "");
}

function renderHtml(groups) {
  const generated = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "long" }).format(new Date());
  const sections = groups
    .map(
      (g) => `
    <section>
      <h2>${g.group}</h2>
      <div class="grid">
        ${g.items
          .map(
            (i) => `
        <figure>
          <figcaption>${i.title}</figcaption>
          <div class="shots">
            <a href="telas/${i.slug}-celular.png" target="_blank" class="phone"><img loading="lazy" src="telas/${i.slug}-celular.png" alt="${i.title} no celular"></a>
            <a href="telas/${i.slug}-computador.png" target="_blank" class="desk"><img loading="lazy" src="telas/${i.slug}-computador.png" alt="${i.title} no computador"></a>
          </div>
        </figure>`,
          )
          .join("")}
      </div>
    </section>`,
    )
    .join("");
  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Arrumaê — vitrine do MVP</title>
<meta name="description" content="Capturas reais das telas do MVP do Arrumaê, marketplace de pequenos reparos residenciais.">
<link rel="icon" href="data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="16" fill="#f2b33d"/><text x="32" y="44" text-anchor="middle" font-family="Arial" font-weight="800" font-size="34" fill="#18202c">A</text></svg>')}">
<style>
  :root { --ink:#18202c; --soft:#4a5464; --paper:#f7f3ec; --line:#e3ddd2; --brand:#0e4a57; --tape:#f2b33d; }
  * { box-sizing: border-box; }
  body { margin:0; background:var(--paper); color:var(--ink); font:17px/1.55 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; }
  .band { height:10px; background:repeating-linear-gradient(-45deg,var(--tape) 0 18px,#1d1d1b 18px 36px); }
  main { max-width:1200px; margin:0 auto; padding:32px 16px 64px; }
  header h1 { font-size:clamp(2rem,5vw,3.2rem); margin:.2em 0 .1em; letter-spacing:-.02em; }
  header h1 span { color:var(--brand); }
  .lead { color:var(--soft); max-width:62ch; }
  .note { background:#fff3d6; border:1px solid #e9cf8f; border-radius:14px; padding:12px 16px; margin:20px 0; color:#6b4700; }
  .links a { display:inline-block; margin:6px 8px 0 0; padding:10px 18px; border-radius:999px; background:var(--brand); color:#fff; text-decoration:none; font-weight:600; }
  .links a.alt { background:#fff; color:var(--ink); border:1px solid var(--line); }
  h2 { margin:48px 0 16px; font-size:1.6rem; }
  .grid { display:grid; gap:20px; grid-template-columns:repeat(auto-fill,minmax(340px,1fr)); }
  figure { margin:0; background:#fff; border:1px solid var(--line); border-radius:18px; padding:14px; }
  figcaption { font-weight:600; margin-bottom:10px; }
  .shots { display:grid; grid-template-columns:1fr 2.2fr; gap:10px; align-items:start; }
  .shots a { display:block; border:1px solid var(--line); border-radius:10px; overflow:hidden; background:var(--paper); }
  .shots img { display:block; width:100%; height:260px; object-fit:cover; object-position:top; }
  .shots a:hover { border-color:var(--brand); }
  footer { margin-top:56px; color:var(--soft); font-size:.9rem; }
</style>
</head>
<body>
<div class="band"></div>
<main>
  <header>
    <h1>Arruma<span>ê</span> — vitrine do MVP</h1>
    <p class="lead">Marketplace para pequenos reparos em casa (eletricista, encanador, montagem de móveis, pequenos reparos e ar‑condicionado). O cliente descreve o problema, recebe até 4 propostas com preço e horário, agenda e acompanha tudo pelo celular.</p>
    <p class="note"><strong>Estas são capturas reais do app rodando, com dados de DEMONSTRAÇÃO.</strong> Nenhum profissional, avaliação ou serviço mostrado aqui é real. Clique em qualquer imagem para ver a tela inteira.</p>
    <div class="links">
      <a href="https://github.com/samyrcouto/arrumae">Ver o código no GitHub</a>
      <a class="alt" href="https://github.com/samyrcouto/arrumae#rodar-sem-instalar-nada-github-codespaces">Rodar e editar no navegador (Codespaces)</a>
    </div>
  </header>
  ${sections}
  <footer>Gerado automaticamente em ${generated} com <code>npm run vitrine</code>. Nome e marca provisórios.</footer>
</main>
</body>
</html>
`;
}
