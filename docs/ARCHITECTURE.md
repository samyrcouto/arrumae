# Arquitetura

## Visão geral

Monólito modular em **Next.js 16 (App Router) + TypeScript + PostgreSQL 16**, com regras de negócio no servidor. Uma única aplicação web responsiva (mobile‑first, manifest PWA básico).

```
Navegador ──► Next.js (Server Components + Server Actions + Route Handlers)
                 │
                 ├─ src/server/actions/*      formulário → valida sessão/papel → chama serviço
                 ├─ src/server/services/*     regras + AUTORIZAÇÃO + transações (fonte da verdade)
                 │      └─ src/server/domain/* regras puras (estado, dinheiro, máscaras)
                 ├─ src/server/adapters/*     storage | email | payments (trocáveis)
                 └─ src/server/db/*           Drizzle ORM ──► PostgreSQL
```

## Decisões principais (detalhes em [DECISIONS.md](DECISIONS.md))

| Tema | Escolha | Por quê |
|---|---|---|
| Framework | Next.js 16, App Router, Server Actions | Um só deploy para UI e backend; formulários funcionam sem JS; proteção CSRF embutida nas actions |
| Renderização | `cacheComponents: false` (renderização dinâmica clássica) | Quase toda página depende da sessão; reduz complexidade no MVP. Reavaliar para landings estáticas |
| Banco | PostgreSQL + Drizzle ORM + migrations SQL versionadas | Integridade referencial, CHECKs, triggers, transações com lock; portável (Supabase, Neon, RDS) |
| Autenticação | Sessões próprias em banco (token aleatório, só o hash SHA‑256 no banco, cookie httpOnly), senhas argon2id | Sem dependência de provedor; revogação imediata (suspensão derruba sessões) |
| Autorização | Na camada de serviço, por papel **e** propriedade do registro; páginas e actions também checam | Esconder botões nunca é a proteção |
| Estado | Máquina de estados pura + UPDATE condicional `WHERE status IN (...)` sob `SELECT ... FOR UPDATE` | Impede operações fora de ordem e corridas |
| Arquivos | Adaptador de storage; local no MVP; servidos por rota autenticada | Nada privado em `/public`; troca para S3/Supabase Storage sem mudar o resto |
| E‑mail | Adaptador; driver `console` grava em `outbound_messages` sem enviar | Sem custo até haver domínio/provedor |
| Pagamentos | Adaptador `PaymentProvider`; só `offline` existe | Piloto sem cobrança; Asaas/MP plugáveis depois |
| Rate limit | Tabela no Postgres (janela fixa, upsert atômico) | Funciona com várias instâncias sem Redis |
| Analytics | Tabela própria, lista fechada de eventos | Sem terceiros; LGPD |
| Jobs | Função `runMaintenance()` via script ou rota protegida | Qualquer agendador (cron do host, GitHub Actions, Vercel Cron) |

## Fluxo de uma operação (exemplo: aceitar proposta)

1. Formulário (`AcceptQuoteForm`, client component) chama `acceptQuoteAction` (Server Action).
2. Action: `requireUser(["client"])` → `acceptQuote(actor, input)`.
3. Serviço, em transação: lê proposta → `SELECT ... FOR UPDATE` na solicitação → `checkActionGuards("accept_quote")` → valida proposta/horário/profissional → `UPDATE ... WHERE status = 'open'` → marca proposta aceita e as demais como `superseded` → evento na linha do tempo → notificações.
4. Erros de domínio (`DomainError`) viram mensagens em português na UI (`run()` em `src/server/actions/run.ts`); erros inesperados são logados sem dados pessoais.

## Trocar provedores

| Para trocar | Implemente | Arquivo |
|---|---|---|
| Armazenamento (S3/R2/Supabase) | `StorageDriver { put, get, delete }` e um valor novo em `STORAGE_DRIVER` | `src/server/adapters/storage.ts`, `src/server/env.ts` |
| E‑mail (Resend/SES/SMTP) | novo ramo em `sendEmail` atualizando `outbound_messages.status` | `src/server/adapters/email.ts` |
| Pagamentos | novo `PaymentProvider` + webhooks em `src/app/api/…` | `src/server/adapters/payments.ts` |
| WhatsApp/SMS/push | novo canal em `outbound_messages.channel` + chamada em `notify()` | `src/server/services/notifications.ts` |
| Mapas/geocodificação | substituir `resolveRegionByCep` | `src/server/services/catalog.ts` |
| IA (triagem de pedido, categorização) | serviço novo que **sugere** dados; decisão sempre do usuário/equipe | ver ROADMAP fase 8 |

## Hospedagem (recomendação, nada contratado)

- App: Vercel ou Render/Railway/Fly (Node 22). Região próxima a São Paulo quando disponível.
- Banco: Supabase ou Neon com região `sa-east-1` (São Paulo), backups diários + PITR.
- Arquivos: Supabase Storage ou Cloudflare R2 (privado).
- Cron: agendador do host chamando `POST /api/cron/maintenance` a cada 10–15 min.
- Observações: em serverless, ajustar `DATABASE_POOL_MAX` e usar pooler (PgBouncer/Supavisor). O storage local **não funciona** em serverless — trocar o driver antes do deploy.

## Limitações conhecidas

- Todas as páginas são dinâmicas (o layout lê a sessão). Para SEO/performance das landings, mover o header autenticado para um boundary (Cache Components) no futuro.
- Sem fila: e‑mails/notificações são gravados na mesma transação; envio real exigirá um worker que leia `outbound_messages`.
- Upload de fotos passa pelo servidor da aplicação (limite 26 MB por requisição). Em escala, usar upload direto assinado para o storage.
