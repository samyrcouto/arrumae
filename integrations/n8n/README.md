# Workflows do n8n

Arquivos prontos para importar no n8n (*Workflows → Import from File*). Guia completo, catálogo de eventos e segurança: [docs/AUTOMACOES.md](../../docs/AUTOMACOES.md).

| Arquivo | O que faz |
|---|---|
| `01-alertas-da-equipe.json` | Recebe os eventos do app, confere a assinatura (401 se for falsa) e avisa a equipe no Telegram |
| `02-relatorio-diario.json` | Às 8h busca os indicadores do dia e manda o resumo no Telegram |
| `03-agendador-manutencao.json` | A cada 5 min roda a manutenção do app (que também envia os eventos) |

Depois de importar, troque os textos `COLE_AQUI_...` e `https://SEU-APP` e escolha as credenciais (Telegram e Header Auth).

Os JSON são gerados por `gerar-workflows.py` a partir de `formatar-alerta.js` e `formatar-relatorio.js` — edite os `.js` e rode `python3 gerar-workflows.py` aqui dentro.

Testado em 25/10/2026 com n8n 1.123.87 local: evento sem assinatura → 401; 11 eventos reais entregues; alertas e resumo diário chegaram a um Telegram simulado; nenhum dado pessoal nas mensagens.
