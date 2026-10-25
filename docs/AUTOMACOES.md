# Automações, n8n e agentes de IA

Como o Arrumaê conversa com ferramentas de automação (n8n e similares), como os relatórios são lidos sem expor dados pessoais e qual é o plano para agentes de IA.

## Princípios (valem para tudo abaixo)

1. **O app é a fonte da verdade.** Regras de negócio, máquina de estados, permissões e auditoria ficam em `src/server/services/*`. Nenhuma automação escreve direto no banco nem muda o status de um pedido.
2. **Para fora, só o necessário e sem dados pessoais.** Eventos e relatórios levam ids, categorias, regiões, status e valores — nunca nome, e‑mail, telefone, endereço, CEP, CPF ou texto livre digitado por usuários. Um teste automatizado garante isso (`tests/integration/integrations.test.ts`).
3. **IA sugere, gente decide.** Nenhuma IA aprova pagamento, altera comissão, aprova profissional, resolve contestação ou fala com cliente sem revisão (ver [PRODUCT.md](PRODUCT.md) e [DECISIONS.md](DECISIONS.md) D‑014, D‑019).
4. **Começar simples.** No piloto, automação = avisos para a equipe e relatórios. Nada de fluxos que agem sozinhos sobre clientes ou profissionais.

## Arquitetura

```
 Serviço (ex.: criar pedido)
   └─ transação ─┬─ grava o pedido
                 └─ grava o evento em integration_events   ← mesma transação (outbox):
                                                             se a operação falhar, nada sai
 Job de manutenção (cron ou n8n, a cada 5 min)
   └─ dispatchIntegrationEvents ── POST assinado (HMAC) ──► n8n: Webhook ─► confere assinatura
                                    re-tenta: 1, 2, 4… min      └─► formata ─► Telegram / e‑mail / planilha
                                    até 6 h; 8 tentativas

 n8n (agenda diária) ── GET /api/integrations/v1/metrics (token) ──► views do schema "reporting"
 Planilha / Metabase ── usuário Postgres arrumae_reporting ─────────► views do schema "reporting"
```

| Peça | Onde |
|---|---|
| Fila de eventos (outbox) | tabela `integration_events` (migration `0002`) |
| Emissão dos eventos | `emitIntegrationEvent` em `src/server/services/integrations.ts`, chamado dentro das transações dos serviços |
| Entrega por webhook | `dispatchIntegrationEvents` (roda em `runMaintenance` → `npm run jobs` ou `POST /api/cron/maintenance`) |
| Alerta "pedido parado" | `detectStaleRequests` (aberto há > 2 h sem proposta → `request.stale`, uma vez por pedido) |
| API de leitura | `GET /api/integrations/v1/metrics?days=1..90` |
| Relatórios em SQL | schema `reporting` (migration `0003`) + papel `arrumae_reporting` (`scripts/sql/reporting-role.sql`) |
| Painel | `/admin/integracoes`: fila, entregues, falhas, último erro e botão "Reenviar eventos com falha" |
| Workflows prontos | `integrations/n8n/*.json` |

## Catálogo de eventos

Todo evento chega assim (corpo do POST):

```json
{
  "id": "uuid do evento (use para não processar duas vezes)",
  "type": "request.created",
  "createdAt": "2026-10-25T12:00:00.000Z",
  "env": "production",
  "data": { "...": "campos abaixo" }
}
```

| Evento | Quando | Campos em `data` |
|---|---|---|
| `request.created` | Cliente cria um pedido | `requestId`, `category {slug,name}`, `region {slug,name}`, `urgency`, `invitedPros`, `noEligiblePros`, `isDemo`, `adminUrl` |
| `request.status_changed` | Qualquer mudança de status (aceite, início, conclusão, confirmação, cancelamento, contestação, expiração…) | os de cima + `action`, `from`, `to`, `actorRole`; no aceite: `quoteId`, `quoteKind`, `agreedAmountCents`, `scheduledStart`; na conclusão: `finalAmountCents`; na contestação: `ticketId` |
| `request.stale` | Pedido aberto há mais de 2 h sem proposta pendente (uma vez por pedido) | os de `request.created` + `minutesOpen`, `invitedPros`, `pendingQuotes` |
| `quote.submitted` | Profissional envia ou atualiza proposta | `requestId`, `quoteId`, `kind`, `updated`, `amountCents`, `visitFeeCents`, `adminUrl` |
| `review.created` | Cliente avalia | `requestId`, `reviewId`, `rating`, `hasComment` (o texto não sai), `isDemo` |
| `pro.submitted_for_review` | Profissional envia o cadastro para análise | `proId`, `adminUrl` |
| `pro.verification_decided` | Equipe aprova, recusa ou suspende | `proId`, `decision`, `previous`, `adminUrl` |
| `support.ticket_opened` | Novo chamado (o assunto e a mensagem não saem) | `ticketId`, `category`, `priority`, `requestId`, `openerRole`, `adminUrl` |

Os links `adminUrl` exigem login de admin — não expõem nada a quem não tem acesso.

### Entrega e segurança do webhook

Cabeçalhos enviados:

| Cabeçalho | Conteúdo |
|---|---|
| `x-arrumae-event` | tipo do evento |
| `x-arrumae-delivery` | id do evento (igual a `id` no corpo) — use para descartar repetidos |
| `x-arrumae-timestamp` | segundos Unix do envio |
| `x-arrumae-signature` | `sha256=` + HMAC‑SHA256 de `"<timestamp>.<corpo>"` com `INTEGRATION_WEBHOOK_SECRET` |

Quem recebe deve: recalcular a assinatura e comparar; recusar se o timestamp tiver mais de 5 min (evita reenvio de mensagem capturada); responder 2xx rápido. Qualquer resposta fora de 2xx (ou demora > 8 s) conta como falha e é re‑tentada: 1, 2, 4, 8… min (até 6 h), no máximo 8 tentativas; depois o evento fica como "falhou" em `/admin/integracoes`, onde pode ser recolocado na fila. A entrega é **pelo menos uma vez** e a ordem não é garantida: use `id` para idempotência e `createdAt` para ordenar.

Retenção: entregues e falhos são apagados após 30 dias; sem webhook configurado, os eventos ficam 7 dias na fila e depois são marcados como falha.

## API de leitura (para o n8n, planilhas etc.)

`GET /api/integrations/v1/metrics?days=1` com `Authorization: Bearer <INTEGRATION_API_TOKEN>`. Sem o token configurado a rota responde 503; token errado, 401; mais de 60 chamadas por minuto, 429. Resposta (resumo, sem dados pessoais e sem dados de demonstração):

```json
{
  "periodDays": 1,
  "requests": { "created": 12, "with_quote": 9, "booked": 5, "completed": 2, "cancelled": 1, "expired": 0, "disputed": 0, "open": 4, "median_minutes_to_first_quote": 38 },
  "byCategory": [{ "category": "eletrica", "name": "Eletricista", "created": 5 }],
  "finance": { "services": 2, "grossCents": 42000, "commissionCents": 0 },
  "pros": { "pending_review": 3, "approved": 14 },
  "openTickets": [{ "category": "question", "priority": "normal", "status": "open", "tickets": 2 }],
  "staleOpenRequests": [{ "id": "…", "minutes_open": 150, "category_name": "Encanador", "region_name": "Pinheiros", "adminUrl": "…" }],
  "integrationQueue": { "pending": 0, "failed": 0 }
}
```

(números ilustrativos do formato — não são dados reais)

## n8n

### Onde rodar

| Opção | Quando usar | Custo |
|---|---|---|
| No seu computador (`npx n8n` com Node 20–24, ou Docker) | Testar os workflows | grátis |
| n8n Cloud | Piloto sem ninguém para cuidar de servidor | plano mensal — **requer sua autorização** (confira o preço atual) |
| n8n self‑hosted (Docker numa VPS pequena, de preferência em São Paulo) | Quando houver alguém técnico para atualizar e fazer backup | VPS mensal — **requer sua autorização** |

Recomendação para o piloto: começar no computador para validar; quando o app for para produção, n8n Cloud (menos manutenção). Proteja o painel do n8n com senha forte e 2FA.

### Workflows prontos (`integrations/n8n/`)

| Arquivo | O que faz | Precisa configurar |
|---|---|---|
| `01-alertas-da-equipe.json` | Recebe os eventos, **confere a assinatura**, responde 401 se for falsa e manda para a equipe no Telegram: pedido novo (e "nenhum profissional elegível"), pedido parado há 2 h, contestação, cancelamento, profissional que desistiu/faltou, cadastro para analisar, chamado novo, avaliação ≤ 3 | o segredo no nó "Calcular assinatura"; credencial do Telegram e o id do grupo |
| `02-relatorio-diario.json` | Todo dia às 8h (horário de Brasília) chama a API de leitura e manda o resumo do dia anterior no Telegram | URL do app; credencial "Header Auth" com o token; Telegram |
| `03-agendador-manutencao.json` | A cada 5 min chama `POST /api/cron/maintenance` (expira pedidos, confirma serviços, detecta pedidos parados e **envia os webhooks**). Dispensa outro serviço de cron | URL do app; credencial "Header Auth" com o `CRON_SECRET` |

O código dos nós de formatação também está em `formatar-alerta.js` e `formatar-relatorio.js`, para ficar fácil de revisar.

### Passo a passo

1. No app (`.env.local` ou variáveis do provedor), gere segredos longos e diferentes entre si (no PowerShell: `[guid]::NewGuid().ToString() + [guid]::NewGuid().ToString()`; no Linux/Mac: `openssl rand -hex 32`):
   ```
   INTEGRATION_WEBHOOK_URL=https://SEU-N8N/webhook/arrumae-eventos
   INTEGRATION_WEBHOOK_SECRET=<segredo 1>
   INTEGRATION_API_TOKEN=<segredo 2>
   CRON_SECRET=<segredo 3>
   ```
2. No n8n: *Workflows → Import from File* e importe os três arquivos.
3. Em **01**: abra o nó "Calcular assinatura" e troque `COLE_AQUI_O_INTEGRATION_WEBHOOK_SECRET` pelo segredo 1. No nó do Telegram, crie a credencial (token do bot criado no @BotFather) e coloque o id do grupo da equipe.
4. Em **02** e **03**: troque `https://SEU-APP` pela URL do app; crie credenciais do tipo *Header Auth* com nome `Authorization` e valor `Bearer <segredo 2>` (no 02) e `Bearer <segredo 3>` (no 03).
5. Ative os três workflows. Crie um pedido de teste e veja o evento em `/admin/integracoes` passar de "na fila" para "entregue" e a mensagem chegar no Telegram.

> Se não quiser Telegram, troque o último nó por e‑mail (SMTP), Slack, Discord ou Google Sheets — o resto do fluxo não muda. WhatsApp exige a API oficial do WhatsApp Business (paga, com aprovação da Meta); evite APIs não oficiais (risco de banimento e de vazamento).

### O que **não** fazer no n8n

- Conectar o n8n ao banco com o usuário da aplicação ou escrever em tabelas — use o webhook, a API de leitura ou o papel `arrumae_reporting`.
- Mandar mensagens automáticas para clientes/profissionais a partir do n8n no piloto (os avisos transacionais saem do app, com registro em `outbound_messages`).
- Colar dados pessoais em ferramentas de terceiros (planilhas públicas, IA) — os eventos já foram desenhados sem eles.

## Relatórios em SQL (planilha, Metabase, Looker Studio)

As views do schema `reporting` mostram o negócio sem dados pessoais e sem dados de demonstração:

| View | Uma linha por… |
|---|---|
| `reporting.requests` | pedido (categoria, região, status, tempos até a 1ª proposta, valores, UTM) |
| `reporting.daily_kpis` | dia: criados, com proposta, agendados, concluídos, cancelados, expirados, contestados, GMV, mediana até a 1ª proposta |
| `reporting.settlements` | serviço concluído: valor, comissão (sem identificar o profissional) |
| `reporting.pro_pipeline` | status de verificação: quantidade de profissionais |
| `reporting.open_tickets` | categoria × prioridade × status: quantidade de chamados |
| `reporting.stale_open_requests` | pedido aberto há > 2 h sem proposta |

Para ferramentas que se conectam direto ao Postgres, crie **uma vez** o papel somente leitura (como dono do banco, depois das migrations):

```
psql "$URL_DO_DONO_DO_BANCO" -v senha="'uma-senha-forte'" -f scripts/sql/reporting-role.sql
```

Ele só enxerga o schema `reporting`, em transações somente leitura, com no máximo 3 conexões e consultas de até 15 s. Testado localmente: lê as views e recebe "permission denied" nas tabelas com dados pessoais.

## Agentes de IA — plano (nada ligado ainda)

O caminho recomendado é o mais simples que resolve: **uma chamada ao modelo com resposta em formato fixo (JSON validado)**, disparada pelo app, cujo resultado vira uma **sugestão** na tela do admin. Só depois, se os dados mostrarem necessidade, evoluir para agentes com ferramentas.

| # | Automação | Gatilho (só implementar quando…) | Saída | Quem decide |
|---|---|---|---|---|
| 1 | **Triagem de chamados**: categoria, urgência, resumo de 2 linhas, rascunho de resposta | > 30 chamados/semana ou tempo de 1ª resposta > 4 h | campos sugeridos + rascunho na tela do chamado | atendente edita e envia |
| 2 | **Resumo de contestação**: linha do tempo do pedido, mensagens e aditivos em 5 tópicos, com o que cada parte alega | > 3 contestações/mês | resumo no detalhe da solicitação | admin resolve (nunca a IA) |
| 3 | **Pedido mais completo**: a partir do texto do cliente, sugerir título, categoria e perguntas que faltam (ex.: "qual a voltagem?") | > 20% dos pedidos sem proposta por falta de informação | sugestões no formulário | cliente confirma |
| 4 | **Rascunho de proposta** para o profissional | profissionais pedirem / propostas confusas | texto sugerido | profissional revisa e envia |
| 5 | **Leitura semanal dos indicadores** (texto curto sobre o que mudou) | quando o relatório diário estiver em uso | mensagem para a equipe | — (só informativo; usa apenas dados agregados) |
| 6 | **Sinais de fraude/abuso** (contato fora da plataforma, perfis repetidos) | volume que a equipe não consiga revisar | marcação "revisar" | equipe; a IA nunca bloqueia sozinha |

**Onde roda:** os itens 1–4 e 6 leem texto de usuários (dados pessoais), então rodam **no app** (`src/server/services/ai.ts`, atrás de um adaptador para trocar de provedor), fora das transações, com tempo limite, registro de custo por chamada e funcionamento normal se a IA estiver fora do ar. O item 5 usa só números agregados e pode rodar no próprio n8n.

**Modelo sugerido:** Claude Opus 5.5 (`claude-opus-5-5`) com esforço baixo (`output_config.effort: "low"`) para triagem e classificação, e esforço padrão para resumos de contestação; respostas em JSON validado (`output_config.format`). Ordem de grandeza: um chamado (~1.500 tokens de entrada e ~300 de saída) custa cerca de US$ 0,01 com os preços atuais de US$ 4 / US$ 20 por milhão de tokens — 300 chamados/mês ficam abaixo de US$ 5, sem contar o raciocínio interno, que aumenta a saída. Um modelo menor (Haiku) baratearia ainda mais; essa troca é decisão sua, depois de medir a qualidade com exemplos reais.

**Antes de ligar qualquer item:** autorizar o gasto e a conta no provedor; incluir o provedor de IA como suboperador na política de privacidade (revisão jurídica — [LEGAL.md](LEGAL.md)); montar 30–50 exemplos reais anonimizados para medir a qualidade; definir quem revisa cada sugestão.

**Nunca:** IA aprovando profissional, pagamento, reembolso, comissão ou contestação; IA respondendo cliente/profissional sem revisão humana; enviar documentos (RG, comprovantes) para IA.
