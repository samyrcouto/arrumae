import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { mkdirSync } from "node:fs";
import { chromium } from "playwright";

const PASSWORD = "demo-senha-123";
const SHOTS = process.env.E2E_SHOTS ?? "test-results/e2e";
mkdirSync(SHOTS, { recursive: true });

/** Data/hora local de São Paulo daqui a `minutes` minutos, para os campos do formulário. */
function spLocal(minutes) {
  const d = new Date(Date.now() + minutes * 60000);
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
      .formatToParts(d)
      .map((p) => [p.type, p.value]),
  );
  return { date: `${parts.year}-${parts.month}-${parts.day}`, time: `${parts.hour}:${parts.minute}` };
}

/** Código TOTP (RFC 6238), como um app autenticador calcularia. */
function totp(secretBase32, offsetSteps = 0) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  for (const ch of secretBase32.replace(/\s/g, "")) bits += alphabet.indexOf(ch).toString(2).padStart(5, "0");
  const key = Buffer.from(bits.match(/.{8}/g).map((b) => parseInt(b, 2)));
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30000) + offsetSteps));
  const mac = createHmac("sha1", key).update(counter).digest();
  const o = mac[mac.length - 1] & 15;
  return String((mac.readUInt32BE(o) & 0x7fffffff) % 1e6).padStart(6, "0");
}

export async function runFlow(base, { serverLog = () => "" } = {}) {
  const browser = await chromium.launch();
  const errors = [];
  const newPage = async () => {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: "pt-BR", timezoneId: "America/Sao_Paulo" });
    // Recusa analytics para o aviso de cookies não cobrir botões.
    await ctx.addInitScript(() => localStorage.setItem("arrumae_consent", "essential"));
    const page = await ctx.newPage();
    page.on("pageerror", (e) => errors.push(String(e)));
    page.on("console", (m) => m.type() === "error" && !/Failed to load resource/.test(m.text()) && errors.push(m.text()));
    return page;
  };
  const step = (n) => console.log(`→ ${n}`);
  const login = async (page, email) => {
    await page.goto(`${base}/entrar`);
    await page.getByLabel("E-mail", { exact: true }).fill(email);
    await page.getByLabel("Senha").fill(PASSWORD);
    await page.getByRole("button", { name: "Entrar" }).click();
    await page.waitForURL((u) => !u.pathname.startsWith("/entrar"));
  };
  const doAction = async (page, label, fill) => {
    await page.getByRole("button", { name: label }).click();
    if (fill) await fill();
    await page.getByRole("button", { name: "Confirmar" }).click();
    await page.waitForLoadState("networkidle");
  };

  try {
    // 0. Home: o combinado se monta enquanto a pessoa escreve e leva ao pedido preenchido
    step("home: combinado ao vivo leva ao pedido preenchido");
    const visitor = await newPage();
    await visitor.goto(`${base}/`);
    await visitor.getByLabel("O que precisa arrumar?").fill("O chuveiro queimou");
    await visitor.getByText("Eletricista", { exact: true }).first().waitFor();
    await visitor.getByRole("button", { name: "Pedir orçamento grátis" }).first().click();
    await visitor.waitForURL(/\/pedir\?/);
    assert.match(visitor.url(), /categoria=eletrica/);
    assert.equal(await visitor.getByLabel("Resumo do serviço").inputValue(), "O chuveiro queimou");

    // A. Visitante pede orçamento e cria conta no mesmo fluxo
    step("visitante cria pedido com cadastro embutido");
    const client = await newPage();
    const email = `e2e-${Date.now()}@teste.com`;
    await client.goto(`${base}/pedir?categoria=eletrica`);
    await client.getByLabel("Resumo do serviço").fill("Instalar chuveiro novo");
    await client.getByLabel("Descreva o que está acontecendo").fill("Comprei um chuveiro 220V e preciso instalar no banheiro social.");
    await client.getByRole("button", { name: "Continuar" }).click();
    await client.getByLabel("CEP").fill("05422-010");
    await client.getByLabel("Bairro").fill("Pinheiros");
    await client.getByLabel("Rua e número").fill("Rua de Teste, 123");
    await client.getByRole("button", { name: "Continuar" }).click(); // etapas ocultas não contam
    await client.getByLabel("Nome completo").fill("Cliente E2E");
    await client.getByLabel("E-mail", { exact: true }).fill(email);
    await client.getByLabel("Celular com DDD").fill("11988887777");
    await client.getByLabel("Crie uma senha").fill(PASSWORD);
    await client.getByLabel(/Li e aceito/).check();
    await client.screenshot({ path: `${SHOTS}/01-pedido-dados.png`, fullPage: true });
    await client.getByRole("button", { name: "Criar conta e enviar pedido" }).click();
    await client.waitForURL(/\/cliente\/solicitacoes\/.+/);
    await client.getByText("Pedido enviado!").waitFor();
    const requestUrl = client.url().split("?")[0];
    const requestId = requestUrl.split("/").pop();
    await client.screenshot({ path: `${SHOTS}/02-pedido-criado.png`, fullPage: true });

    // B. Profissional convidado envia proposta
    step("profissional envia proposta");
    const pro = await newPage();
    await login(pro, "pro1@demo.arrumae.invalid");
    await pro.goto(`${base}/profissional/oportunidades`);
    await pro.getByText("Instalar chuveiro novo").click();
    await pro.waitForURL(new RegExp(requestId));
    assert.ok(!(await pro.content()).includes("Rua de Teste"), "endereço não pode aparecer antes do agendamento");
    await pro.getByLabel("Preço total (R$)").fill("180,00");
    await pro.getByLabel("O que está incluído").fill("Instalação do chuveiro com teste. Me liga 11 98888-7777");
    const start = spLocal(75);
    const end = spLocal(195);
    await pro.getByLabel("Horário 1: data").fill(start.date);
    await pro.getByLabel("Horário 1: início").fill(start.time);
    await pro.getByLabel("Horário 1: fim").fill(end.date === start.date ? end.time : "23:59");
    await pro.getByRole("button", { name: "Enviar proposta" }).click();
    await pro.getByText("Proposta enviada!").waitFor();
    assert.ok(!(await pro.content()).includes("98888-7777"), "telefone na proposta deve ser ocultado");

    // C. Cliente aceita
    step("cliente aceita proposta");
    await client.goto(requestUrl);
    await client.getByText("R$ 180,00").first().waitFor();
    await client.screenshot({ path: `${SHOTS}/03-proposta.png`, fullPage: true });
    await client.getByRole("button", { name: "Aceitar proposta e agendar" }).click();
    await client.getByText("Agendado!").waitFor();

    // D. Profissional vê endereço, inicia e conclui
    step("profissional executa o serviço");
    await pro.goto(`${base}/profissional/oportunidades/${requestId}`);
    await pro.getByText("Rua de Teste, 123").first().waitFor();
    await doAction(pro, "Cheguei — iniciar atendimento");
    await doAction(pro, "Informar que concluí o serviço");
    await pro.screenshot({ path: `${SHOTS}/04-profissional-concluiu.png`, fullPage: true });

    // E. Cliente confirma e avalia
    step("cliente confirma e avalia");
    await client.goto(requestUrl);
    await doAction(client, "Confirmar que o serviço foi concluído", () => client.getByLabel(/Já paguei/).check());
    await client.getByRole("radio", { name: "5 estrelas" }).check({ force: true });
    await client.getByLabel("Comentário (opcional)").fill("Pontual e cuidadoso.");
    await client.getByRole("button", { name: "Enviar avaliação" }).click();
    await client.getByText("Obrigado pela avaliação!").waitFor();
    await client.screenshot({ path: `${SHOTS}/05-concluido-avaliado.png`, fullPage: true });

    // F. Admin acompanha
    step("admin vê indicadores e financeiro");
    const adm = await newPage();
    await adm.setViewportSize({ width: 1280, height: 900 });
    await login(adm, "admin@demo.arrumae.invalid");
    await adm.goto(`${base}/admin`);
    await adm.getByRole("heading", { name: "Indicadores" }).waitFor();
    await adm.screenshot({ path: `${SHOTS}/06-admin.png`, fullPage: true });
    await adm.goto(`${base}/admin/financeiro`);
    await adm.getByText("Instalar chuveiro novo").waitFor();

    // G. Fronteiras de acesso
    step("controles de acesso");
    await client.goto(`${base}/admin`);
    await client.waitForURL(/sem-permissao/);
    const otherPro = await newPage();
    await login(otherPro, "pro2@demo.arrumae.invalid");
    const res = await otherPro.goto(`${base}/profissional/oportunidades/${requestId}`);
    assert.equal(res.status(), 404, "profissional não convidado deve receber 404");
    const anon = await newPage();
    const photo = await anon.goto(`${base}/arquivos/request-photos/${requestId}/00000000-0000-0000-0000-000000000000.webp`);
    assert.equal(photo.status(), 404);

    // H. Segurança: CSP com nonce, "esqueci minha senha" e verificação em duas etapas
    step("CSP com nonce em todas as páginas");
    const home = await anon.goto(`${base}/`);
    const csp = home.headers()["content-security-policy"] ?? "";
    assert.match(csp, /script-src 'self' 'nonce-[A-Za-z0-9+/=]+' 'strict-dynamic'/, "CSP deve exigir nonce nos scripts");
    assert.doesNotMatch(csp.split(";").find((d) => d.trim().startsWith("script-src")), /unsafe-inline/);

    step("cliente redefine a senha pelo link do e-mail");
    const forgot = await newPage();
    await forgot.goto(`${base}/entrar`);
    await forgot.getByRole("link", { name: "Esqueci minha senha" }).click();
    await forgot.getByLabel("E-mail da sua conta").fill(email);
    await forgot.getByRole("button", { name: "Enviar link" }).click();
    await forgot.getByText("Confira seu e-mail").waitFor();
    const link = [...serverLog().matchAll(/link=(\S+redefinir\?token=\S+)/g)].at(-1)?.[1];
    assert.ok(link, "o link de redefinição deve aparecer no log do driver de e-mail de teste");
    await forgot.goto(link.replace(/^https?:\/\/[^/]+/, base));
    await forgot.getByLabel("Nova senha", { exact: true }).fill("senha-nova-e2e-456");
    await forgot.getByLabel("Repita a nova senha").fill("senha-nova-e2e-456");
    await forgot.getByRole("button", { name: "Salvar nova senha" }).click();
    await forgot.waitForURL(/senha=redefinida/);
    await forgot.getByLabel("E-mail", { exact: true }).fill(email);
    await forgot.getByLabel("Senha").fill("senha-nova-e2e-456");
    await forgot.getByRole("button", { name: "Entrar" }).click();
    await forgot.waitForURL(/\/cliente/);
    // O link não serve duas vezes.
    await forgot.goto(link.replace(/^https?:\/\/[^/]+/, base));
    await forgot.getByText("Este link não vale mais").waitFor();

    step("profissional ativa a verificação em duas etapas e entra com código");
    await otherPro.goto(`${base}/conta/seguranca`);
    await otherPro.getByRole("button", { name: "Ativar verificação em duas etapas" }).click();
    await otherPro.getByText("Não consegue ler o QR code?").click();
    const secret = (await otherPro.getByTestId("totp-secret").textContent()).replace(/\s/g, "");
    await otherPro.screenshot({ path: `${SHOTS}/07-2fa-cadastro.png`, fullPage: true });
    await otherPro.getByLabel(/Código de 6 números/).fill(totp(secret));
    await otherPro.getByRole("button", { name: "Ativar", exact: true }).click();
    await otherPro.getByTestId("recovery-codes").waitFor();
    assert.equal(await otherPro.getByTestId("recovery-codes").locator("li").count(), 10);
    const mfaLogin = await newPage();
    await mfaLogin.goto(`${base}/entrar`);
    await mfaLogin.getByLabel("E-mail", { exact: true }).fill("pro2@demo.arrumae.invalid");
    await mfaLogin.getByLabel("Senha").fill(PASSWORD);
    await mfaLogin.getByRole("button", { name: "Entrar" }).click();
    await mfaLogin.waitForURL(/\/entrar\/verificacao/);
    await mfaLogin.getByLabel("Código").fill("000000");
    await mfaLogin.getByRole("button", { name: "Entrar" }).click();
    await mfaLogin.getByText(/Código incorreto/).first().waitFor();
    await mfaLogin.getByLabel("Código").fill(totp(secret, 1)); // o código da ativação não vale de novo
    await mfaLogin.getByRole("button", { name: "Entrar" }).click();
    await mfaLogin.waitForURL(/\/profissional/);

    assert.deepEqual(errors, [], "a página não deve ter erros de JavaScript");
  } finally {
    await browser.close();
  }
}
