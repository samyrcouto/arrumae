# Arrumaê (nome provisório)

Marketplace de serviços residenciais (eletricista, encanador, montagem de móveis, pequenos reparos e ar‑condicionado) para um piloto em São Paulo. O cliente descreve o problema, recebe até 4 propostas com preço e horário de profissionais com documentos conferidos, agenda, acompanha e avalia — tudo pelo celular, sem instalar app.

> **Estado:** MVP funcional em ambiente local. **Não está publicado** e **não processa pagamentos** (piloto com pagamento direto ao profissional). Veja [`docs/ROADMAP.md`](docs/ROADMAP.md) para o que falta antes do lançamento.

## Ver o projeto sem instalar nada

- **Vitrine (capturas reais de todas as telas):** https://samyrcouto.github.io/arrumae/
- **Rodar e editar no navegador:** veja [GitHub Codespaces](#rodar-sem-instalar-nada-github-codespaces) abaixo.

## Documentação

| Documento | Conteúdo |
|---|---|
| [docs/VISAO-GERAL.md](docs/VISAO-GERAL.md) | **Comece por aqui:** o que já existe, tecnologias, mapa do código, onde mexer para cada coisa e regras para mudar sem quebrar |
| [docs/PRODUCT.md](docs/PRODUCT.md) | Problema, público, proposta de valor, escopo, ciclo de vida, políticas e status de cada funcionalidade |
| [docs/BUSINESS.md](docs/BUSINESS.md) | Concorrência pesquisada, monetização, economia por transação, provedores de pagamento |
| [docs/GROWTH.md](docs/GROWTH.md) | Funil, canais, métricas e plano de experimentos |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Stack, camadas, adaptadores trocáveis, como estender |
| [docs/DATABASE.md](docs/DATABASE.md) | Modelo de dados, regras de integridade, relatórios em SQL e plano para produção |
| [docs/AUTOMACOES.md](docs/AUTOMACOES.md) | Integração com n8n (eventos por webhook, API de leitura, workflows prontos) e plano de agentes de IA |
| [docs/SECURITY.md](docs/SECURITY.md) | Controles implementados, riscos e pendências |
| [docs/LEGAL.md](docs/LEGAL.md) | LGPD, CDC, tributário e pontos para advogado/contador |
| [docs/ROADMAP.md](docs/ROADMAP.md) | Fases, critérios de conclusão e checklist de lançamento |
| [docs/DECISIONS.md](docs/DECISIONS.md) | Decisões e justificativas |
| [WORKLOG.md](WORKLOG.md) | Registro do que foi feito, testado e bloqueado |

## O que precisa instalar

| Programa | Versão | Onde baixar |
|---|---|---|
| **Node.js** | 22 ou mais nova (LTS) | https://nodejs.org/ — botão "LTS" |
| **PostgreSQL** | 16 ou mais nova | https://www.postgresql.org/download/ (Windows: "Download the installer") |
| **Git** | qualquer recente | https://git-scm.com/downloads |
| Editor (opcional) | — | VS Code: https://code.visualstudio.com/ |

Não precisa instalar mais nada: as outras dependências vêm com o `npm install`.

## Como rodar no Windows (passo a passo)

**1. Baixe o código** (PowerShell, na pasta onde quer o projeto):

```powershell
git clone https://github.com/samyrcouto/arrumae
cd arrumae
```

**2. Instale as dependências.** Se o PowerShell disser que "a execução de scripts foi desabilitada", use `npm.cmd` no lugar de `npm` em todos os comandos, ou libere uma vez com `Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned` e reabra o terminal.

```powershell
npm.cmd install
```

**3. Crie o banco de dados.** Abra o **SQL Shell (psql)** pelo menu Iniciar (vem com o PostgreSQL), aperte Enter nas perguntas até a senha, digite a senha do usuário `postgres` definida na instalação e rode:

```sql
CREATE ROLE arrumae WITH LOGIN PASSWORD 'arrumae_dev' CREATEDB;
CREATE DATABASE arrumae_dev OWNER arrumae;
CREATE DATABASE arrumae_test OWNER arrumae;
```

**4. Crie o arquivo de configuração.** Os valores padrão já funcionam com o banco do passo 3:

```powershell
copy .env.example .env.local
```

Para uso local, troque só o `APP_SECRET` em `.env.local` por qualquer texto com 32 caracteres ou mais.

**5. Prepare o banco e rode:**

```powershell
npm.cmd run db:migrate          # cria as tabelas
npm.cmd run db:seed -- --demo   # categorias, regiões e contas de DEMONSTRAÇÃO
npm.cmd run dev                 # inicia o site
```

**6.** Abra **http://localhost:3000**.

**7. (Opcional) Integração com o n8n:** passo a passo para testar no seu computador em [docs/AUTOMACOES.md](docs/AUTOMACOES.md#testar-no-seu-computador-windows).

## Como rodar no Linux/Mac

```bash
git clone https://github.com/samyrcouto/arrumae && cd arrumae
npm install
cp .env.example .env.local          # ajuste DATABASE_URL e APP_SECRET se precisar

# banco (Postgres local; ajuste usuário/senha ao seu ambiente)
psql -U postgres -c "CREATE ROLE arrumae WITH LOGIN PASSWORD 'arrumae_dev' CREATEDB;"
createdb -U postgres -O arrumae arrumae_dev && createdb -U postgres -O arrumae arrumae_test

npm run db:migrate
npm run db:seed -- --demo
npm run dev                         # http://localhost:3000
```

## Rodar sem instalar nada (GitHub Codespaces)

[![Abrir no GitHub Codespaces](https://github.com/codespaces/badge.svg)](https://codespaces.new/samyrcouto/arrumae)

1. Clique no botão acima (precisa estar logado no GitHub) → **Create codespace**.
2. Espere a preparação, que leva alguns minutos na primeira vez: ela instala as dependências, cria o banco e coloca os dados de demonstração.
3. O site abre sozinho. Se não abrir, vá na aba **PORTS** e clique no globo da porta **3000**.
4. Edite os arquivos no editor do próprio navegador: a página atualiza na hora.

O plano gratuito do GitHub inclui algumas dezenas de horas de Codespaces por mês. Desligue o codespace quando terminar (github.com/codespaces → ⋯ → Stop).

## Como usar depois de rodar

Contas de demonstração (senha `demo-senha-123` para todas):

| Conta | Papel |
|---|---|
| `cliente@demo.arrumae.invalid` | cliente |
| `pro1@demo.arrumae.invalid` … `pro4@demo.arrumae.invalid` | profissionais já aprovados |
| `admin@demo.arrumae.invalid` | administrador (painel em `/admin`) |

Para criar pedidos, use CEPs que começam com 054, 050, 040, 041, 045 ou 014 (ex.: `05422-010`). Dica: abra uma janela anônima para entrar com outra conta ao mesmo tempo (cliente numa, profissional na outra).

### Problemas comuns

| Erro | Solução |
|---|---|
| "a execução de scripts foi desabilitada" (PowerShell) | Use `npm.cmd` ou o `Set-ExecutionPolicy` do passo 2 |
| `ECONNREFUSED` / `connection refused` | O PostgreSQL não está rodando. No Windows: menu Iniciar → "Serviços" → `postgresql-x64-…` → Iniciar |
| `password authentication failed for user "arrumae"` | Refaça o passo 3 ou ajuste a senha em `DATABASE_URL` no `.env.local` |
| `Configuração inválida: APP_SECRET…` | Coloque um texto com 32+ caracteres em `APP_SECRET` no `.env.local` |
| Porta 3000 em uso | `npm.cmd run dev -- -p 3001` e abra http://localhost:3001 |

Em produção, crie o admin com `ADMIN_EMAIL=… ADMIN_PASSWORD=… npm run db:create-admin` e rode só `npm run db:seed` (sem `--demo`).

## Para quem vai mudar o visual

| O que mudar | Onde |
|---|---|
| Nome, slogan e textos da marca | `src/config/brand.ts` |
| Logo (casinha com trena + "ê" com telhado) | `src/components/brand/logo.tsx` e `public/icon.svg` |
| Ilustrações (cena da home, serviços) | `src/components/illustrations.tsx` |
| Personagens dos profissionais (`RealPerson`, `HeroPro`, `ProTeam`) | `src/components/people.tsx` |
| Telas do app nas molduras de celular | `public/marketing/*.webp` (geradas por `npm run vitrine`) |
| Cores, fontes, raio dos cantos, faixa "trena" | `src/app/globals.css` (bloco `@theme`) |
| Botões, cartões, selos, alertas | `src/components/ui.tsx` |
| Campos de formulário | `src/components/form.tsx` |
| Cabeçalho, menu e rodapé | `src/components/site-header.tsx` |
| Página inicial | `src/app/page.tsx` |
| Landing de serviço por bairro | `src/components/category-landing.tsx` |
| Pedido de orçamento (3 etapas) | `src/components/request-wizard.tsx` |
| Ícone do app | `public/icon.svg` |

O estilo usa **Tailwind CSS 4**: as classes ficam direto no JSX (ex.: `bg-brand`, `rounded-card`), e as cores da marca são as variáveis `--color-*` do `globals.css`. Trocar uma cor ali muda o site inteiro.

Antes de enviar mudanças, rode `npm run typecheck && npm run lint && npm test`. Para atualizar a vitrine depois de mudar o visual: `npm run vitrine && npm run vitrine:publicar`.

## Scripts

| Comando | O que faz |
|---|---|
| `npm run dev` / `build` / `start` | Next.js |
| `npm run typecheck` / `lint` | TypeScript e ESLint |
| `npm test` | Testes unitários + integração (Postgres real, banco de teste é **limpo** a cada execução) |
| `npm run test:e2e` | Build de produção + navegador real (Playwright) percorrendo o fluxo completo, em banco separado `arrumae_e2e`. Na 1ª vez, rode `npx playwright install chromium` |
| `npm run db:generate` | Gera migration a partir de `src/server/db/schema.ts` |
| `npm run db:migrate` | Aplica migrations |
| `npm run db:seed` | Catálogo base (`--demo` para dados de demonstração) |
| `npm run vitrine` / `vitrine:publicar` | Gera capturas reais de todas as telas em `./vitrine` e publica no GitHub Pages (branch `gh-pages`) |
| `npm run jobs` | Rotinas periódicas: expirar pedidos/propostas, confirmação automática, alertas de pedido parado, envio dos webhooks de integração, limpeza |

As rotinas periódicas também podem ser disparadas por `POST /api/cron/maintenance` com `Authorization: Bearer $CRON_SECRET` (a cada 5–15 min) — por exemplo, pelo workflow `integrations/n8n/03-agendador-manutencao.json`. Integrações com n8n: [docs/AUTOMACOES.md](docs/AUTOMACOES.md).

## Estrutura

```
src/
  app/                 páginas (App Router) — finas, só montam a UI
  components/          UI reutilizável (ui.tsx, form.tsx, …)
  config/brand.ts      nome, cores e textos da marca (trocar aqui)
  lib/                 utilidades puras (datas SP, CEP/CPF/telefone, rótulos)
  server/
    domain/            regras puras: máquina de estados, dinheiro, erros
    services/          regras de negócio + autorização (toda escrita passa aqui)
    actions/           Server Actions (formulários → serviços)
    adapters/          armazenamento, e-mail, pagamentos (trocáveis)
    security/          rate limit, uploads, criptografia
    db/                schema Drizzle e conexão
drizzle/               migrations SQL versionadas
scripts/               migrate, seed, create-admin, jobs
tests/                 unit/, integration/, e2e/
```
