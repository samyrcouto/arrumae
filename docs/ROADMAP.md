# Roadmap

Status por fase em 29/10/2026. Critério de conclusão em cada fase.

| Fase | Status | Critério de conclusão |
|---|---|---|
| 1. Diagnóstico e estratégia | **concluída** | Concorrência, riscos, recorte e stack documentados (BUSINESS, PRODUCT, DECISIONS, LEGAL) |
| 2. Fundação técnica | **concluída** | App roda localmente; migrations; auth; permissões; testes base |
| 3. MVP funcional | **concluída** | Fluxos de cliente, profissional e admin ponta a ponta (E2E aprovado) |
| 4. Segurança e qualidade | **parcial** | 57 testes + E2E aprovados; faltam 2FA admin, reset de senha, antivírus de upload, teste de carga, revisão externa |
| 5. Piloto e monetização | **em preparação** | Ver checklist abaixo; pagamentos integrados planejados para depois da validação |
| 6. Produção | **não iniciada** | Depende de contas/credenciais do fundador |
| 7. Aquisição | **instrumentação pronta** | Landings, UTM, funil e plano de experimentos prontos; nenhuma campanha ativa |
| 8. Automação e IA | **automação pronta; IA planejada** | Eventos para n8n (webhook assinado), API de leitura, relatórios SQL e 3 workflows testados ponta a ponta; IA só com dados reais de gargalos ([AUTOMACOES.md](AUTOMACOES.md)) |
| 9. Escala | **não iniciada** | Só com métricas do piloto acima das metas por 2 meses |

## Próximas tarefas (prioridade)

1. **Recuperação de senha por e‑mail** + driver de e‑mail real (Resend/SES) — bloqueado por: conta no provedor + domínio verificado.
2. **2FA (TOTP) para admins.**
3. **Driver de storage S3‑compatível** (Supabase Storage/R2) — necessário para qualquer deploy serverless.
4. Validar prefixos de CEP das 2 regiões iniciais e desativar as demais no admin.
5. "Pedir de novo com este profissional" e profissionais favoritos.
6. Worker para `outbound_messages` (e‑mail; depois WhatsApp Business API).
7. Pagamentos integrados (Asaas → ver BUSINESS.md §4), cupons aplicados, repasses e reembolsos com aprovação humana.
8. Upload direto assinado e varredura de arquivos órfãos.
9. Avaliação do cliente pelo profissional (reputação de dois lados).
10. Monitoramento (Sentry) e uptime. (Alerta de pedido sem proposta há > 2 h: **feito** — evento `request.stale` + workflow 01 do n8n.)

## Operação manual do piloto (concierge — não automatizar ainda)

- **Diariamente:** fila de verificação (`/admin/profissionais`), pedidos sem convidados ou sem proposta há > 2h (`/admin/solicitacoes?status=open`, coluna "Convidados/propostas" em vermelho) → ligar para profissionais e recrutar; chamados (`/admin/suporte`).
- **A cada pedido concluído:** confirmar com o cliente por telefone (amostragem) a qualidade e o pagamento.
- **Semanalmente:** indicadores vs. metas (GROWTH.md §2), avaliações denunciadas, profissionais com cancelamentos/ausências.
- **Rotinas automáticas:** agendar `npm run jobs` (ou a rota de cron) a cada 5–15 min — o workflow `03-agendador-manutencao.json` do n8n faz isso.
- **Avisos da equipe:** workflows `01` (alertas em tempo quase real) e `02` (resumo diário às 8h) do n8n, no Telegram do grupo da equipe.

## Checklist de lançamento do piloto

### Depende do fundador (contas, dinheiro, decisões)
- [x] Criar repositório remoto (GitHub) e fazer push do código
- [ ] Contratar hospedagem do app e banco gerenciado em São Paulo (custo mensal) — **requer autorização**
- [ ] Bucket de armazenamento privado
- [ ] Provedor de e‑mail transacional + domínio verificado — **requer autorização**
- [ ] Registrar domínio (após busca de marca) — **requer autorização**
- [ ] Revisão jurídica dos termos/privacidade, contrato do profissional, DPO (LEGAL.md)
- [ ] Contador: enquadramento e emissão fiscal
- [ ] E‑mail/telefone de suporte reais (`src/config/brand.ts`)
- [ ] Decidir regiões iniciais e recrutar a primeira leva de profissionais
- [ ] Orçamento para experimentos de aquisição (GROWTH.md §4) — **requer autorização**

### Técnico (pode ser feito pela engenharia)
- [ ] Variáveis de produção: `APP_ENV=production`, `APP_SECRET` forte, `CRON_SECRET`, `DATABASE_URL` com SSL
- [ ] `npm run db:migrate` + `npm run db:seed` (sem `--demo`) + `npm run db:create-admin`
- [ ] Driver de storage S3‑compatível
- [ ] Cron chamando `/api/cron/maintenance`
- [ ] Backups + PITR + teste de restauração
- [ ] Sentry/uptime/alertas
- [ ] 2FA admin e reset de senha
- [ ] Confiar apenas no header de IP do provedor (SECURITY.md)
- [ ] Teste E2E contra o ambiente de homologação
- [ ] Revisar textos de `/como-funciona`, `/termos`, `/privacidade`

## O que NÃO fazer ainda
App nativo, IA generativa na operação, mais de 5 categorias, mais de 2–3 regiões, mídia paga ampla, garantia/seguro sem processo e parceiro reais.

## Fase 8 — IA: candidatos e limites (planejado, nada implementado)

Plano atualizado, com gatilhos, modelo sugerido e custos estimados: [AUTOMACOES.md](AUTOMACOES.md#agentes-de-ia--plano-nada-ligado-ainda).

Só implementar quando o gargalo aparecer nos dados e o benefício superar o custo do modelo.

| Uso | Benefício esperado | Limite/controle |
|---|---|---|
| Estruturar a descrição do cliente (título, categoria sugerida, perguntas faltantes) | Pedidos mais completos → propostas mais rápidas | Só **sugere**; cliente confirma. Sem PII enviada além do texto do pedido |
| Classificar chamados e resumir contestações | Menos tempo de suporte | Resumo para a equipe; decisão sempre humana |
| Detectar pedidos/mensagens suspeitos | Prevenção de fraude | Marca para revisão; nunca bloqueia sozinho |
| Ajudar o profissional a redigir a proposta | Propostas mais claras | Profissional revisa e envia |

Arquitetura prevista: serviço `src/server/services/ai.ts` atrás de um adaptador (provedor trocável), chamado fora de transações, com timeout, registro de custo por chamada e fallback sem IA. Proibido: aprovar pagamentos, alterar comissão, aprovar verificação ou resolver disputa.
