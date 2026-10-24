# Crescimento

> Nenhuma campanha foi criada ou ativada e nenhuma verba foi gasta. Tudo aqui é plano para revisão do fundador.

## 1. Funil e instrumentação (implementado)

| Etapa | Evento | Onde | Consentimento |
|---|---|---|---|
| Visita à landing | `landing_view` | `/servicos/*` (cliente) | só com "Permitir medição anônima" |
| Visita | `page_view` | demais páginas | idem |
| Início do pedido | `request_started`, `request_step` | wizard `/pedir` | idem |
| Cadastro | `signup` (props: papel, via) | servidor | sempre (sem dado pessoal) |
| Pedido criado | `request_created` (categoria, região, urgência, nº convidados, UTM) | servidor | sempre |
| Fora da área | `out_of_area` (prefixo CEP 3 dígitos, categoria) | servidor | sempre |
| Proposta enviada / aceita | `quote_submitted`, `quote_accepted` | servidor | sempre |
| Concluído | `request_completed` (valor) | servidor | sempre |
| Avaliação | `review_created` (nota) | servidor | sempre |

- **Atribuição:** UTMs do primeiro toque da sessão ficam no `sessionStorage` e vão junto com o pedido (`service_requests.utm_*`). Painel admin mostra pedidos e concluídos por `utm_source`.
- **Privacidade:** analytics próprio, sem terceiros, sem IP, sem dados pessoais em `props` (lista fechada de eventos em `src/server/services/analytics.ts`). Identificador anônimo só com consentimento.
- **Remarketing/pixels de anúncios:** **não implementados** de propósito. Se forem adicionados, exigem consentimento específico e revisão da política de privacidade.

## 2. Indicadores (painel `/admin`)

Já calculados com dados reais: solicitações, % com ≥ 1 proposta, tempo mediano até 1ª proposta, taxa de conclusão, GMV, ticket médio, comissão registrada/dispensada, nota média, ausências, cancelamentos, expirados, chamados abertos, funil de eventos e pedidos por origem.

A calcular quando houver mídia/pagamento: custo por lead, custo por solicitação qualificada, CAC por cliente pagante, receita líquida por contratação, margem de contribuição real, recompra/retenção (coorte por mês do 1º pedido), ROI de marketing.

### Metas do piloto (critérios de validação — [Hipótese])

| Métrica | Meta para considerar o piloto validado (8 semanas) |
|---|---|
| Pedidos com ≥ 1 proposta | ≥ 80% |
| Tempo mediano até 1ª proposta | ≤ 2h (urgência "hoje": ≤ 1h) |
| Pedido → serviço concluído | ≥ 40% |
| Ausência do profissional | ≤ 3% dos agendados |
| Nota média | ≥ 4,5 |
| Contestações | ≤ 5% dos concluídos |
| Recompra em 60 dias | ≥ 15% dos clientes |
| Profissionais ativos com ≥ 4 serviços/mês | ≥ 60% dos aprovados |

## 3. Canais, em ordem de prioridade

1. **Oferta primeiro (lado do profissional):** recrutar 8–15 profissionais por categoria nas 2 regiões iniciais — indicação de profissionais bem avaliados, lojas de material de construção do bairro, grupos de profissionais. Sem oferta densa, toda verba de demanda é desperdiçada.
2. **Condomínios e administradoras:** síndicos e zeladores concentram demanda recorrente; CAC baixo; parceria simples (canal de pedido dedicado com `utm_source=condominio-<nome>`).
3. **Parcerias de varejo para montagem:** lojas de móveis/colchões locais e marketplaces regionais (link com UTM no pós‑compra).
4. **Indicação:** cliente indica cliente (cupom após pagamento integrado); profissional indica profissional.
5. **SEO local:** landings `/servicos/<categoria>/<regiao>` já existem (30 páginas no seed: 5 de categoria + 25 de categoria × região), com sitemap. Próximo passo: conteúdo útil por problema ("disjuntor desarmando", "chuveiro não esquenta").
6. **Busca paga (teste controlado):** apenas palavras de cauda longa e bairro, contra o CPC máximo calculado em [BUSINESS.md](BUSINESS.md#3-economia-por-transação).
7. **Social pago:** só após recompra comprovada; público geográfico das regiões ativas.

## 4. Plano de experimentos (todos dependem de autorização de orçamento)

| # | Hipótese | Teste | Orçamento sugerido | Sucesso | Parar se |
|---|---|---|---|---|---|
| E1 | Síndicos divulgam para moradores | 5 condomínios em Pinheiros, cartaz/QR com UTM | R$ 0–300 (impressão) | ≥ 10 pedidos em 3 semanas | < 3 pedidos em 3 semanas |
| E2 | Montagem tem demanda via varejo local | 2 lojas, cartão no pós‑venda | R$ 0–200 | ≥ 8 pedidos de montagem/mês | < 2 pedidos/mês |
| E3 | Busca paga de cauda longa converte | Google Ads, 10 termos "<serviço> <bairro>", 2 regiões | R$ 600 (2 semanas, teto diário R$ 45) | CPC ≤ R$ 2 e clique→pedido ≥ 8% | após R$ 300 sem pedido concluído, ou CPC > R$ 4 |
| E4 | Urgência "hoje" é diferencial | Destacar "atendimento hoje" na landing de eletricista | R$ 0 | ≥ 25% dos pedidos com urgência hoje e ≥ 70% atendidos | atendimento < 50% |
| E5 | Recompra com lembrete de manutenção | E‑mail 60 dias após serviço de ar‑condicionado (com consentimento) | R$ 0 (após provedor de e‑mail) | ≥ 10% de recompra | < 3% |

Registro de cada experimento: hipótese, datas, gasto real, resultado e decisão — adicionar ao [WORKLOG.md](../WORKLOG.md).

## 5. Retenção

- Pós‑serviço: avaliação + atalho "pedir de novo com este profissional" (planejado).
- Manutenção recorrente: ar‑condicionado (semestral), revisão elétrica — lembretes com consentimento (planejado).
- Profissionais favoritos por cliente (planejado, após dados de recompra).
