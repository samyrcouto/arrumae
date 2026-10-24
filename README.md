# Arrumaê (nome provisório)

Marketplace de serviços residenciais (eletricista, encanador, montagem de móveis, pequenos reparos e ar‑condicionado) para um piloto em São Paulo. O cliente descreve o problema, recebe até 4 propostas com preço e horário de profissionais com documentos conferidos, agenda, acompanha e avalia — tudo pelo celular, sem instalar app.

> **Estado:** MVP funcional em ambiente local. **Não está publicado** e **não processa pagamentos** (piloto com pagamento direto ao profissional). Veja [`docs/ROADMAP.md`](docs/ROADMAP.md) para o que falta antes do lançamento.

## Documentação

| Documento | Conteúdo |
|---|---|
| [docs/PRODUCT.md](docs/PRODUCT.md) | Problema, público, proposta de valor, escopo, ciclo de vida, políticas e status de cada funcionalidade |
| [docs/BUSINESS.md](docs/BUSINESS.md) | Concorrência pesquisada, monetização, economia por transação, provedores de pagamento |
| [docs/GROWTH.md](docs/GROWTH.md) | Funil, canais, métricas e plano de experimentos |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Stack, camadas, adaptadores trocáveis, como estender |
| [docs/DATABASE.md](docs/DATABASE.md) | Modelo de dados e regras de integridade |
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
| `npm run jobs` | Rotinas periódicas: expirar pedidos/propostas, confirmação automática, limpeza |

As rotinas periódicas também podem ser disparadas por `POST /api/cron/maintenance` com `Authorization: Bearer $CRON_SECRET` (a cada 10–15 min).

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
