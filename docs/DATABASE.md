# Banco de dados

PostgreSQL 16. Schema em `src/server/db/schema.ts` (Drizzle); migrations SQL versionadas em `drizzle/` (geradas com `npm run db:generate`, aplicadas com `npm run db:migrate`). Nunca edite uma migration já aplicada em produção: crie outra.

## Convenções

- Dinheiro em **centavos** (`integer`); percentuais em **basis points** (1500 = 15%).
- Datas `timestamptz` em UTC; exibição em `America/Sao_Paulo` (`src/lib/datetime.ts`).
- IDs `uuid` (exceto logs/eventos: `bigserial`).
- `is_demo = true` marca dados de demonstração (usuários, solicitações, avaliações). Indicadores do admin os excluem.

## Entidades

```
users ─┬─< sessions
       ├── pro_profiles ─┬─< pro_categories >── categories
       │                 ├─< pro_regions >──── regions
       │                 ├─< pro_availability
       │                 ├─< pro_documents
       │                 └─< pro_photos
       ├─< service_requests ─┬─< request_photos
       │      (cliente)      ├─< request_invitations >── users (profissional)
       │                     ├─< request_events (linha do tempo)
       │                     ├─< quotes ──< messages
       │                     ├─< price_revisions
       │                     ├── reviews (1:1)
       │                     ├─< payments ──< refunds
       │                     └── settlements (1:1)
       ├─< notifications, outbound_messages
       ├─< support_tickets ──< ticket_messages
       └─< data_requests (LGPD)
commercial_settings, coupons, audit_logs, rate_limits, analytics_events
```

| Tabela | Papel | Regras de integridade relevantes |
|---|---|---|
| `users` | Conta (papel único: client, pro, admin) | e‑mail único sem diferenciar maiúsculas (`unique(lower(email))`); `status` active/suspended/deleted; versão dos termos aceita |
| `sessions` | Sessões | PK = SHA‑256 do token; `on delete cascade` |
| `pro_profiles` | Perfil do profissional | `verification_status` só alterado por serviço admin; contadores de cancelamento/ausência |
| `pro_availability` | Grade semanal | CHECK dia 0–6, minutos 0–1440, início < fim |
| `pro_documents` | Documentos de verificação | hash SHA‑256 do arquivo; status e revisor |
| `categories` / `regions` | Catálogo | `slug` único; regiões por prefixos de CEP (3–5 dígitos; vence o mais longo) |
| `service_requests` | Solicitação e execução | `unique(client_id, submission_token)` = idempotência; status via máquina de estados |
| `request_invitations` | Quem pode ver/propor | PK (request, pro) |
| `request_events` | Linha do tempo | toda transição grava from/to/ator |
| `quotes` | Propostas | `unique(request_id, pro_id)`; CHECK: fixed ⇒ valor > 0; visit ⇒ taxa ≥ 0 |
| `price_revisions` | Aditivos de preço | índice único parcial: **1 pendente por solicitação**; CHECK valor > 0 |
| `reviews` | Avaliações | `unique(request_id)`; CHECK nota 1–5; **trigger impede alterar nota/comentário** |
| `payments` | Registros de pagamento | `idempotency_key` única |
| `settlements` | Economia por serviço concluído | `unique(request_id)`; snapshot da comissão vigente |
| `audit_logs` | Ações sensíveis | **trigger bloqueia UPDATE/DELETE** (append‑only) |
| `rate_limits` | Contadores | upsert atômico |
| `analytics_events` | Funil | sem IP, sem dados pessoais |

## Por que algumas regras estão no banco

Mesmo com bug na aplicação, o banco recusa: avaliação duplicada, avaliação editada, dois aditivos pendentes, proposta duplicada, pagamento duplicado, pedido duplicado por reenvio, alteração de auditoria. Os testes de integração verificam isso.

## Retenção e exclusão

Exclusão de conta **anonimiza** (`users` vira "Usuário removido", e‑mail inválido único, telefone nulo, senha inutilizada; endereço e descrição das solicitações e mensagens enviadas são apagados; CPF/CNPJ removidos; sessões e notificações apagadas). Registros transacionais desidentificados permanecem — prazos de retenção a validar com advogado (LEGAL.md).

## Backup e recuperação (a configurar no provedor)

- Produção: backups diários automáticos + PITR (Supabase Pro/Neon), retenção ≥ 7 dias.
- Testar restauração mensalmente em banco separado e registrar no WORKLOG.
- Arquivos (documentos/fotos): versionamento/replicação no bucket.
- RPO alvo: ≤ 24h no piloto (≤ 5 min com PITR). RTO alvo: ≤ 4h.
