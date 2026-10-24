# Negócio

> Convenção: **[Fato]** = fonte citada; **[Estimativa]** = cálculo com premissas declaradas; **[Hipótese]** = a validar no piloto. Pesquisa feita em 24/10/2026 por busca na web. Os sites oficiais dos concorrentes e provedores não puderam ser acessados diretamente (bloqueio de rede do ambiente), então **confirme tarifas nas páginas oficiais antes de decidir**.

## 1. Concorrência

| Player | Modelo | O que já oferece | Lacunas/queixas observadas |
|---|---|---|---|
| **GetNinjas** (B3: NINJ3) | Profissional compra "moedas" para liberar contato do cliente; pedido fica visível 48h ou até 4 profissionais liberarem [Fato¹] | Escala: >500 categorias, >2 mi profissionais cadastrados (dado de ~2021) [Fato²]; 1,18 mi pedidos no 1T24 [Fato³] | Profissionais reclamam (ago/2026) de contatos vendidos após o cliente já ter contratado, clientes falsos ou que somem, e recusa de reembolso [Fato¹]. Negociação ocorre fora da plataforma: sem registro do combinado. Receita estável/em queda desde o IPO (3T24: R$ 14 mi, ‑11% a/a) [Fato⁴] |
| **Triider** | Comissão sobre serviço fechado (12%–16% conforme a fonte/ano) [Fato⁵]; pedido distribuído a ~6 profissionais | Pagamento por cartão em até 6x, checagem de antecedentes, garantia de até R$ 5 mil (dados antigos) [Fato⁵]; preço fixo em >225 cidades e orçamento em capitais [Fato⁶] | Adquirida pela **MadeiraMadeira em out/2025** [Fato⁶] → tende a focar montagem/reformas ligadas a varejo. Já cobre pagamento, verificação e garantia: **não são diferenciais para nós** |
| **Parafuzo** | Preço fechado, foco em limpeza/faxina | Reputação "Boa" no Reclame Aqui (~7,7) [Fato⁷] | Outra vertical (limpeza) — referência de preço fechado, não concorrente direto em reparos |
| **Varejo (Leroy Merlin, Mercado Livre "instaladores")** | Serviço atrelado à compra de produto | Leroy tinha >120 tipos de serviço e meta de 3 mil parceiros em 2022 [Fato⁸] | Atende quem comprou na loja; pouco para reparos avulsos |
| Informal (WhatsApp, indicação, Google Maps) | Direto | Grátis, confiança por indicação | Sem preço prévio, sem registro, sem a quem recorrer |

**Posicionamento proposto:** "combinado é combinado" — preço antes de agendar, mudança só com aprovação, contato protegido, registro de tudo e suporte que decide com base nesse registro; para o profissional, **nunca pagar por contato**. Isso ataca diretamente as queixas documentadas do líder (pay‑per‑lead) sem tentar competir de saída com a amplitude de categorias dele.

**Riscos competitivos:** GetNinjas pode copiar a ocultação de contatos/registro; Triider+MadeiraMadeira têm canal de varejo para montagem. Defesa: densidade local (tempo até proposta), qualidade da oferta e relacionamento com condomínios.

## 2. Monetização

| Modelo | Avaliação | Decisão |
|---|---|---|
| Comissão sobre serviço concluído | Alinha incentivos; só cobra quando há valor. Exige pagamento integrado para cobrar de forma confiável | **Modelo principal.** Hipótese 15% (configurável por categoria). **Dispensada durante o piloto** |
| Taxa de conveniência ao cliente | Pode reduzir conversão; só se houver valor claro (garantia, parcelamento) | Avaliar após pagamentos integrados |
| Planos para profissionais | Receita recorrente; risco de virar "pagar para trabalhar" | Só depois de provar volume de pedidos por profissional |
| Pay‑per‑lead | Principal fonte de reclamação do líder | **Descartado** |
| Contratos com condomínios/administradoras | Demanda recorrente, CAC baixo, ticket previsível | **Canal prioritário** para validar no piloto (ver GROWTH.md) |
| Serviços premium (garantia/seguro) | Exige processo real e parceiro (seguradora) | Não prometer antes de existir |

## 3. Economia por transação

**[Estimativa]** com premissas declaráveis — substituir por dados reais assim que houver 30+ serviços concluídos (o painel admin já calcula GMV, ticket médio e comissão reais).

| Item | Premissa | Valor |
|---|---|---|
| Ticket médio | [Hipótese] R$ 220 (faixas de mercado: troca de tomada R$ 50–85/un.; eletricista R$ 80–150/h; diária R$ 250–550 [Fato⁹]) | R$ 220,00 |
| Comissão | 15% | R$ 33,00 |
| Custo de pagamento | Mix 60% Pix (R$ 1,99) + 40% cartão à vista (2,99% + R$ 0,49) — tabela padrão Asaas publicada em out/2026 [Fato¹⁰] | − R$ 4,02 |
| Suporte | [Hipótese] 10 min/serviço a R$ 36/h (custo total) | − R$ 6,00 |
| Reembolsos, incentivos e cupons | [Hipótese] 3% do GMV | − R$ 6,60 |
| **Margem de contribuição antes de aquisição** | | **≈ R$ 16,40 por serviço** |

**Implicação central:** com ~R$ 16 por serviço, a aquisição paga só fecha a conta com **recompra**.

Sensibilidade do CPC máximo (break‑even) em busca paga, com conversão clique→pedido 8% e pedido→serviço concluído 45% (ambas [Hipótese]) ⇒ 1 serviço a cada ~28 cliques:

| Serviços por cliente em 24 meses | Contribuição acumulada | CPC máximo |
|---|---|---|
| 1 | R$ 16 | **R$ 0,59** |
| 3 | R$ 49 | R$ 1,77 |
| 6 | R$ 98 | R$ 3,54 |

Referências de CPC encontradas para serviços residenciais são muito maiores: "desentupidora sp" R$ 85/clique (levantamento antigo) e R$ 35/clique em outra fonte [Fato¹¹]. **Conclusão:** busca paga ampla não é viável no início; priorizar canais de CAC baixo (condomínios, parcerias de varejo para montagem, indicação, SEO local) e usar mídia paga apenas em testes pequenos com palavras de cauda longa, medidos contra estes limites. Ver [GROWTH.md](GROWTH.md).

Alavancas: ticket maior (ar‑condicionado, montagem de vários móveis), recompra (manutenção preventiva), redução de custo de suporte (registro do combinado + automações), comissão por categoria.

## 4. Pagamentos

### Estado atual (piloto)

**Pagamento direto ao profissional.** O sistema registra a economia de cada serviço (`settlements`) e um registro de pagamento com status `declared_offline` (cliente declarou que pagou) ou `pending`. **Nada é cobrado, retido ou reembolsado pela plataforma.** A interface diz isso em todos os pontos relevantes. Justificativa: integrar split exige contrato, KYC e validação contábil/tributária; o piloto precisa validar demanda e oferta primeiro (D‑006).

### Provedores avaliados para a fase integrada

| Critério | Asaas | Mercado Pago | Pagar.me (Stone) | Stripe Connect |
|---|---|---|---|---|
| Split marketplace | Sim, via API; subcontas; split executado no recebimento, sem data customizada (para repasse futuro: receber sem split e transferir depois) [Fato¹²] | Sim; OAuth por vendedor (token por profissional); `marketplace_fee` (Checkout Pro) / `application_fee` (Transparente); comissão MP descontada antes da do marketplace; 1:N só para carteira assistida; vendedor precisa KYC nível 6 [Fato¹³] | Sim; regras de split por recebedor, incluindo quem paga taxas e responsabilidade por chargeback [Fato¹⁴] | Pix via parceria com EBANX desde ago/2025; não confirmado para contas conectadas [Fato¹⁵] |
| Pix | R$ 1,99/recebido (padrão) [Fato¹⁰] | Gratuito para alguns perfis (dado antigo) — confirmar | Negociado | 1,19% (fonte secundária) |
| Cartão à vista | 2,99% + R$ 0,49 (padrão); 1,99% + R$ 0,49 promocional 3 meses [Fato¹⁰] | Confirmar na tabela oficial | Negociado | — |
| Onboarding do profissional | Subconta criada por API (white‑label) | Profissional precisa conta MP e autorizar OAuth | Recebedor criado por API | — |
| Observação | Tarifa pública simples; bom para começar | Marca conhecida pelo consumidor; fricção de OAuth por profissional | Melhor para volume (negociação) | Menos adequado ao Brasil doméstico hoje |

**Recomendação [Hipótese]:** começar a fase integrada com **Asaas** (Pix + cartão, subcontas por API, tarifa pública), mantendo a abstração `PaymentProvider` (`src/server/adapters/payments.ts`) para trocar por Mercado Pago ou Pagar.me sem reescrever o produto. Antes de integrar: contrato e tarifa negociada por escrito, validação de chargeback/estorno, modelo de emissão fiscal (ver LEGAL.md), sandbox.

Desenho de integração por etapas (planejado):
1. Pix com cobrança após conclusão (sem custódia), split automático da comissão.
2. Cartão com captura no agendamento e liberação após confirmação (custódia → exige avaliação regulatória e contratual).
3. Reembolso/estorno via painel com aprovação humana (tabela `refunds` já existe).
4. Webhooks idempotentes (`payments.idempotency_key` já é única).

## Fontes

1. Reclame Aqui — reclamações de profissionais sobre moedas (ago/2026): https://www.reclameaqui.com.br/getninjas/cobranca-indevida-por-contatos-desatualizados-e-falta-de-reembolso_bcVYyz20uPtKhPF4/ ; https://www.reclameaqui.com.br/getninjas/meus-pedidos-de-devolucao-de-moedas-nao-estao-sendo-atendidos_hvl-6LXizv_Y8Hm2/
2. Outras Palavras — análise do modelo: https://outraspalavras.net/tecnologiaemdisputa/getninjas-o-perverso-leilao-digital-de-trabalho-humano/ ; Monitor Mercantil: https://monitormercantil.com.br/getninjas-ninj3-modelo-de-negocio-operacao-e-perspectivas/
3. Investidor10 — 1T24: https://investidor10.com.br/noticias/sob-nova-administracao-getninjas-ninj3-reverte-prejuizo-no-1-tri-104363/
4. Investidor10 — 3T24: https://investidor10.com.br/noticias/getninjas-ninj3-lucra-r-3-8-milhoes-e-aprova-listagem-de-duas-subsidiarias-109052/
5. Triider — comissão/garantia (2017–2021): https://www.jornaldocomercio.com/2017/11/ge/noticias/599181-tinder-dos-servicos-une-profissionais-e-consumidores.html ; https://www.mobiletime.com.br/?p=622422 ; https://www.dci.com.br/tecnologia-e-games/triider-startup-pequenas-reformas-faturamento-2021/
6. Brazil Journal — aquisição pela MadeiraMadeira: https://braziljournal.com/madeiramadeira-faz-ma-para-crescer-em-servicos-domesticos-e-reformas/ ; Google Play: https://play.google.com/store/apps/details?id=com.triider.customer
7. Reclame Aqui — Parafuzo: https://www.reclameaqui.com.br/empresa/parafuzo-servicos-de-limpeza/
8. Leroy Merlin serviços (2022): https://gironews.com/construcao/leroy-merlin-amplia-servicos-67742/
9. Preços de mão de obra 2026 (fontes não oficiais): https://catracalivre.com.br/noticias/quanto-custa-instalar-tomadas-e-interruptores-qual-o-preco-de-um-eletricista-para-fazer-o-servico-em-2026/ ; https://larpontual.com.br/portal/quanto-custa-um-encanador ; https://monitordomercado.com.br/noticias/386086-quanto-um-pedreiro-um-eletricista-e-um-encanador-cobram-pela-mao-de-obra-em-maio-de-2026/
10. Tarifas Asaas (consulta de 16/10/2026, via QUASA) e promoção oficial: https://quasa.io/pt/media/asaas-ou-iugu-tarifa-publicada-vence-ate-o-volume-pedir-proposta ; https://www.asaas.com/link-pagamento ; https://heropay.ai/guias/taxas-de-pagamento
11. CPC de serviços: https://exame.com/marketing/os-15-termos-mais-caros-para-anuncios-no-google/ ; https://www.baguete.com.br/noticias/google-ads-voce-esta-comprando-cliques-ou-fechando-negocios
12. Asaas split (documentação): https://docs.asaas.com/docs/duvidas-frequentes-split
13. Mercado Pago split (documentação oficial): https://www.mercadopago.com.br/developers/pt/docs/split-payments/split-1-1/prerequisites ; https://www.mercadopago.com.br/developers/en/docs/split-payments/integration-configuration/integrate-marketplace
14. Pagar.me split: https://docs.pagar.me/reference/split-1
15. Stripe + EBANX Pix: https://www.finextra.com/newsarticle/46431/stripe-businesses-can-now-accept-pix-in-brazil
