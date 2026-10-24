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

## Requisitos

- Node.js 22+
- PostgreSQL 16+ (local, Docker, Supabase, Neon…)

## Como rodar localmente

```bash
npm install
cp .env.example .env.local          # ajuste DATABASE_URL e APP_SECRET

# banco (exemplo com Postgres local)
createdb arrumae_dev && createdb arrumae_test

npm run db:migrate                  # aplica as migrations versionadas (drizzle/)
npm run db:seed -- --demo           # catálogo + DADOS DE DEMONSTRAÇÃO (bloqueado em produção)
npm run dev                         # http://localhost:3000
```

Contas de demonstração (senha `demo-senha-123`): `cliente@demo.arrumae.invalid`, `pro1@demo.arrumae.invalid` … `pro4@…`, `admin@demo.arrumae.invalid`. Para criar pedidos, use CEPs que começam com 054, 050, 040, 041, 045 ou 014 (ex.: `05422-010`).

Em produção, crie o admin com `ADMIN_EMAIL=… ADMIN_PASSWORD=… npm run db:create-admin` e rode só `npm run db:seed` (sem `--demo`).

## Scripts

| Comando | O que faz |
|---|---|
| `npm run dev` / `build` / `start` | Next.js |
| `npm run typecheck` / `lint` | TypeScript e ESLint |
| `npm test` | Testes unitários + integração (Postgres real, banco de teste é **limpo** a cada execução) |
| `npm run test:e2e` | Build de produção + navegador real (Playwright) percorrendo o fluxo completo, em banco separado `arrumae_e2e` |
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
