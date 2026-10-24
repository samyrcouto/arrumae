import assert from "node:assert/strict";
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

export async function runFlow(base) {
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

    assert.deepEqual(errors, [], "a página não deve ter erros de JavaScript");
  } finally {
    await browser.close();
  }
}
