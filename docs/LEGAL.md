# Questões legais, regulatórias e tributárias

> **Este documento não é parecer jurídico.** Lista o que foi pesquisado, o que o produto já faz e o que **precisa de advogado e contador** antes do lançamento. Ter termos de uso não torna a plataforma juridicamente segura.

## 1. Responsabilidade da plataforma (CDC)

- Tribunais tendem a tratar marketplaces como parte da cadeia de consumo e responsabilizá‑los solidariamente, sobretudo quando a plataforma **participa da transação** (pagamento, segurança) ou cria expectativa no consumidor. O STJ já afastou o Marco Civil (art. 19) em relações de consumo. Há tema com repercussão geral no STF sobre limites de responsabilidade de intermediários (Tema 1.413 — verificar status).
  Fontes (comentário, não decisões): https://www.migalhas.com.br/depeso/438480/responsabilidade-civil-em-fraudes-digitais ; https://www.conjur.com.br/2025-ago-21/responsabilidade-solidaria-e-irrestrita-na-cadeia-de-consumo-e-os-riscos-a-inovacao/
- **Implicação de produto:** quanto mais a plataforma controla (preço, pagamento, garantia), maior a responsabilidade. Por isso o MVP: não promete garantia/seguro; não processa pagamento; descreve exatamente o que verifica (documentos, sem antecedentes); registra o combinado; tem canal de reclamação e contestação com análise humana.
- **Para o advogado:** redação dos termos (papel de intermediadora, deveres dos profissionais, canal de reclamação, prazos), política de cancelamento/ausência como cláusula, adequação ao CDC (informação clara de preço — art. 6º/31; direito de arrependimento não se aplica a serviço já executado mas avaliar para contratações online), SAC/Decreto do SAC se aplicável.

## 2. LGPD

| Tema | O que o produto faz | Pendente |
|---|---|---|
| Minimização | Coleta só o necessário; analytics sem IP/PII; endereço e telefone só revelados após agendamento | Revisar campos com DPO |
| Bases legais | Execução de contrato (conta, pedido), legítimo interesse (segurança, prevenção a fraude), consentimento (marketing, analytics) | Registro de operações (ROPA) e LIA para legítimo interesse |
| Dados de profissionais | CPF e documentos com acesso restrito a admins e acesso auditado | Política de retenção de documentos (ex.: excluir imagens após aprovação e manter só o resultado?) |
| Antecedentes criminais | **Não coletados.** Jurisprudência trabalhista (TST, Tema 1) só admite exigir certidão com previsão legal ou natureza do ofício; plataforma ≠ empregador, mas o princípio de necessidade se aplica | Se for adotado: base legal, proporcionalidade, transparência e RIPD |
| Direitos do titular | Exportação JSON e exclusão (anonimização) self‑service; correção de dados de contato | Prazos de retenção legal pós‑exclusão; canal do encarregado |
| Encarregado (DPO) | — | Designar e publicar contato |
| Operadores | Hospedagem, banco, storage, e‑mail (futuro), pagamentos (futuro) | Contratos com cláusulas de proteção de dados; lista na política |
| Incidentes | Auditoria append‑only; sessões revogáveis | Plano de resposta e comunicação à ANPD |
| Fotos | Metadados (GPS) removidos; portfólio exige declaração de direitos e orienta a não mostrar pessoas/endereços | — |

Fontes: https://judit.io/?p=13579 ; https://www.gov.br/pf/pt-br/acesso-a-informacao/tratamento-de-dados-pessoais/DPAExtratoRIPDEmissodeCertidodeAntecedentesCriminaisextrato.pdf

## 3. Relação com profissionais (risco trabalhista)

- Profissionais são independentes: definem preço, escolhem os pedidos, recusam sem penalidade, usam as próprias ferramentas, não têm exclusividade nem jornada. O produto foi desenhado assim (sem atribuição automática de serviço, sem metas, sem punição por recusar convite).
- Penalidades existem apenas por **descumprimento de compromisso assumido** (cancelar ou faltar após aceite) e são registros, não multas.
- **Para o advogado:** contrato de adesão do profissional; cuidado com controle excessivo (preço tabelado imposto, avaliação usada para "demitir") que caracterize subordinação; acompanhar regulação de trabalho por plataformas.

## 4. Habilitação técnica

- Escopo do piloto exclui serviços que exigem responsável técnico registrado (projeto elétrico, padrão de entrada, gás). NR‑10 trata de segurança em eletricidade e exige capacitação de trabalhadores expostos a risco elétrico; certificados (ex.: NR‑10) podem ser enviados como documento opcional e ajudam a análise.
- **Para validar:** quais serviços residenciais exigem habilitação formal (CREA/CFT, ART/TRT) e como comunicar isso nas categorias; responsabilidade em caso de dano.
  Fontes: https://www.osetoreletrico.com.br/?p=159608 ; https://sienge.com.br/blog/o-que-e-nr-10/

## 5. Tributário e fiscal

- **Reforma tributária (IBS/CBS):** pela LC 214/2025 (art. 22), plataformas digitais podem ser **solidariamente responsáveis** pelo IBS/CBS quando o fornecedor brasileiro **não emitir documento fiscal eletrônico**, e o split payment com recolhimento na liquidação financeira começa de forma gradual a partir de 2027; plataformas devem se cadastrar. Fontes: https://netcpa.com.br/colunas/split-payment-em-marketplaces-responsabilidade-das-plataformas/26222 ; https://www.pwc.com.br/pt/thinking-about-taxes/tax-intelligence/2026/tax-intelligence-raciocinios-ed-07_marketplaces.pdf ; https://focusnfe.com.br/blog/reforma-tributaria-marketplaces/
- **NFS‑e padrão nacional:** obrigatória para ME/EPP do Simples a partir de set. ou nov./2026 (fontes divergem — Resolução CGSN 189/2026); situação do MEI a confirmar. Fontes: https://documentacao.senior.com.br/exigenciaslegais/noticias/federal/2026/2026-04-30-simples-nacional-nfs-e-de-padrao-nacional-sera-obrigatoria-para-optantes-do-simples-nacional ; https://notagateway.com.br/blog/obrigatoriedade-da-nfs-e-nacional-para-me-e-epp-do-simples-comeca-em-1o-de-novembro-de-2026/
- **Implicação de produto:** na fase de pagamentos integrados, provavelmente exigir que profissionais sejam MEI/PJ e registrar a emissão de NFS‑e por serviço (campo `cnpj` já existe). A plataforma emite NFS‑e da **própria comissão**.
- **Para o contador:** enquadramento da empresa (CNAE de intermediação), regime tributário, ISS sobre comissão, tratamento dos valores que transitam (agente de pagamento × receita), obrigações do split a partir de 2027, retenções.

## 6. Pagamentos

- Ao integrar: confirmar com o provedor quem é responsável por chargeback e estorno (no Pagar.me isso é configurável por recebedor), se haverá custódia de valores (pode atrair regulação de arranjos de pagamento — o uso de subadquirente/split do provedor é o caminho usual para evitar ser instituição de pagamento) e as regras de reembolso ao consumidor.

## 7. Marca

- "Arrumaê" é **provisório**: não houve busca no INPI nem verificação de domínio. Antes de investir em marca: busca de anterioridade nas classes 35/37/42, depósito, registro de domínio `.com.br`. Tudo de marca está centralizado em `src/config/brand.ts` e nos tokens de `globals.css`.

## Checklist para assessoria (antes do lançamento)

- [ ] Termos de uso e política de privacidade revisados (rascunhos em `/termos` e `/privacidade`)
- [ ] Contrato do profissional
- [ ] DPO designado, ROPA, LIA, plano de incidentes
- [ ] Política de retenção de dados e documentos
- [ ] Enquadramento tributário e emissão fiscal da comissão
- [ ] Modelo fiscal para profissionais (MEI/NFS‑e) na fase de pagamentos
- [ ] Busca e depósito da marca
