# Pesquisa de mercado e decisões de base

> Pesquisa feita em 29/10/2026 por busca na web. Os sites dos concorrentes **não puderam ser abertos daqui** (a rede deste ambiente bloqueia esses endereços), então o que está aqui vem de reportagens, relatórios de resultados e páginas indexadas. Convenção: **[Fato]** = fonte citada; **[Estimativa]** = cálculo com premissas declaradas; **[Hipótese]** = a validar; **[A conferir]** = padrão conhecido do mercado que não foi confirmado nesta pesquisa. Confirme preços nas páginas oficiais antes de contratar qualquer coisa.
>
> Complementa o [BUSINESS.md](BUSINESS.md) (concorrência no Brasil, comissão e pagamentos). Aqui o foco é: como os grandes sites são estruturados, como ganham dinheiro, como escalaram, e as decisões de base (banco, servidor, segurança, cadastro, visual, domínio, e-mail).

## 1. Resumo em 10 linhas

1. Existem **três modelos** nesse mercado: vender contatos (GetNinjas, Thumbtack, Angi), cobrar comissão do serviço fechado (Triider, TaskRabbit, Arrumaê) e operar o serviço de ponta a ponta (Urban Company, Parafuzo, Homejoy). Cada um escala de um jeito diferente (§3).
2. **Vender contato** dá margem alta e pouca operação, mas é o que gera mais reclamação de profissional, e a receita do líder brasileiro e do líder americano está parada ou caindo (§2).
3. **Operar de ponta a ponta** cobra mais (~27% na Urban Company), mas exige treinar e controlar a qualidade de cada profissional. A Homejoy quebrou tentando crescer rápido demais nesse modelo.
4. **Comissão** (o nosso caminho) fica no meio. O risco principal é o vazamento: depois do primeiro serviço, cliente e profissional combinam direto pelo WhatsApp.
5. Serviço em casa é **local**: cada cidade e cada serviço é um mercado novo que começa do zero. Escalar = ter densidade (profissionais suficientes perto do cliente), não ter servidor maior.
6. **A dor existe:** 77,8% dos brasileiros acham difícil encontrar profissional confiável para obra e reparo (pesquisa Obramax/Opinion Box, mai/2026). Falta provar que o cliente usa **a nossa** solução e que o profissional aceita comissão (§5.8).
7. **Banco:** manter PostgreSQL. Firebase não combina com o nosso modelo (relacional, com transações). Supabase ou Neon grátis servem para teste, não para produção (§5.1).
8. **Servidor:** o plano grátis da Vercel **proíbe uso comercial**; o do Render dorme depois de 15 min. Grátis só para homologação (§5.2).
9. **Segurança:** a base já está boa (argon2id, sessão no banco, auditoria). Falta: criptografar o CPF no banco, "esqueci minha senha" e 2FA para admins. JWT e Python não são necessários agora (§5.4).
10. **Domínio .com.br** custa R$ 40/ano no Registro.br; **e-mail profissional** a partir de R$ 5/usuário/mês no Zoho. Ambos dependem da sua autorização (§5.3).

## 2. Como cada site funciona

| Site (país) | Quem paga e quanto | Como o site é organizado | Como escalou / números | Lição para nós |
|---|---|---|---|---|
| **GetNinjas** (BR) | O profissional compra pacotes de "moedas" e gasta para liberar o contato de cada pedido. Pacotes de R$ 149 a R$ 599 em 2022; moedas valem 1 ano [Fato: [Outras Palavras](https://outraspalavras.net/tecnologiaemdisputa/getninjas-o-perverso-leilao-digital-de-trabalho-humano/), [Tecnoblog](https://tecnoblog.net/responde/como-funciona-o-getninjas/)]. É a única fonte de receita [Fato: [Monitor Mercantil](https://monitormercantil.com.br/getninjas-ninj3-avaliacao-sobre-2023-e-perspectivas-para-2024/)] | Páginas por grande área e por serviço (ex.: [/reformas-e-reparos](https://www.getninjas.com.br/reformas-e-reparos)); pedido feito por questionário; app separado para o profissional [A conferir: telas] | Centenas de categorias. 1T24: 1,18 mi pedidos, receita R$ 16,7 mi; 3T24: receita R$ 14 mi (−11%) e EBITDA ajustado negativo [Fato: BUSINESS.md, fontes 3 e 4] | Escala de categorias sem operação, mas o profissional paga e não tem garantia de fechar. É a queixa que exploramos ("nunca pagar por contato") |
| **Triider** (BR) | Comissão sobre o serviço fechado: 16% segundo a [Terra](https://www.terra.com.br/byte/inovacao/uber-da-reforma-triider-soma-forcas-com-gigantes-da-construcao,460d58ad912af68d15a447a9eb85ef0917o0yznv.html); de 19% a 25% na modalidade pós-paga, com taxa menor no plano profissional, segundo o [blog da Triider](https://www.triider.com.br/blog/6199-2/). O profissional não paga mensalidade nem para orçar [Fato: [Softonic](https://triider-para-profissionais.en.softonic.com/android)] | Cliente paga com cartão em até 6x **depois** do serviço ([página de pagamento](https://www.triider.com.br/pagamento/)); preço fixo em parte das cidades e orçamento nas capitais; app do cliente e app do profissional separados | Comprada pela MadeiraMadeira em out/2025 [Fato: BUSINESS.md, fonte 6] → tende a montagem ligada a varejo | É o modelo mais parecido com o nosso. Pagamento, checagem e garantia **não diferenciam**: eles já têm |
| **Parafuzo** (BR) | Preço fechado por serviço (foco em limpeza) | Cliente escolhe o serviço e o horário; o preço aparece antes [A conferir] | Outra vertical | Preço fechado reduz a negociação; bom para serviços padronizados (troca de tomada, montagem de móvel) |
| **Thumbtack** (EUA) | Pay-per-lead: o profissional paga entre US$ 10 e US$ 75 por contato, sem mensalidade; o preço muda com o serviço, a região e a concorrência, e o mesmo contato pode ir para vários profissionais [Fato: [Leadgen Economy](https://www.leadgen-economy.com/blog/home-improvement-lead-marketplaces-angi-thumbtack-homeadvisor/), [LeadCapture](https://leadcapture.io/blog/thumbtack-lead-cost/)] | Busca "o quê + CEP" → questionário → lista de profissionais com preço estimado e avaliações. Páginas de serviço × cidade e guias de "quanto custa" para o Google [A conferir; proposta externa em [AirOps](https://www.airops.com/growth-strategies/thumbtack-3f7g9k2h1j)] | Cresceu com SEO: milhares de páginas por serviço e cidade | O SEO por serviço × cidade funciona **se tiver dado local real** (preço, prazo); página que só troca o nome da cidade não funciona mais [Fato: [Stacc](https://thestacc.com/de/blog/programmatic-seo-home-services/), [Cloudswitched](https://www.cloudswitched.com/blog/guide-to-programmatic-seo-service-businesses)] |
| **Angi** (EUA) | Mensalidade do profissional (US$ 0–350) + valor por contato; o mesmo contato pode ir para 4–5 profissionais [Fato: [Leadgen Economy](https://www.leadgen-economy.com/blog/home-improvement-lead-marketplaces-angi-thumbtack-homeadvisor/), [Skill Mammoth](https://skillmammoth.com/vs/thumbtack-vs-angi)] | Diretório + pedido de orçamento | Receita de contatos nos EUA caiu 18% no 1º semestre de 2025; a empresa atribui a ajustes de qualidade e marketing, corte da equipe de vendas e à adoção de "o cliente escolhe" em jan/2025 [Fato: [relatório 10-Q à SEC](https://www.sec.gov/Archives/edgar/data/1705110/000170511025000099/angi-20250630.htm)] | Vender o mesmo contato para vários profissionais desgasta os dois lados |
| **TaskRabbit** (EUA, da IKEA) | **O cliente paga as taxas** (taxa de serviço + taxa de "confiança e suporte", em % do valor); o profissional fica com 100% do preço dele e das gorjetas e paga só US$ 25 de cadastro em algumas cidades [Fato: [Lilach Bullock](https://www.lilachbullock.com/how-much-does-taskrabbit-take/), [Rideshare Guy](https://therideshareguy.com/taskrabbit-review/)] | O cliente escolhe o profissional pelo perfil, pelo preço por hora e pelas avaliações | Canal de varejo (montagem de móveis da IKEA) | Uma alternativa à comissão do profissional: **taxa paga pelo cliente**. Pode facilitar o recrutamento, mas encarece para o cliente |
| **Urban Company** (Índia) | Operação de ponta a ponta: preço fixo por cardápio; fica com 27–28% do valor [Fato: nota de análise do IPO, [ICICI Direct](https://www.icicidirect.com/mailcontent/idirect_urbancompany_iporeview.pdf)] | Cardápio de serviços com preço; o cliente não escolhe o profissional, a plataforma escala | Treinamento próprio (247 salas em 17 cidades, migrando para módulos online); 83% dos novos profissionais vêm por indicação [Fato: notas de análise do IPO, [Chittorgarh](https://www.chittorgarh.net/reports/ipo_notes/deven-choksey-research_subscribe-ipo-note.pdf), [Finology](https://ticker.finology.in/discover/market-update/urban-company-ipo-drhp-filed-details-analysis), [Finshots](https://finshots.in/archive/the-urban-company-ipo-explained-urban-clap-ipo-uc-ipo/)] | Qualidade padronizada cobra mais, mas custa caro (treinamento, controle). Riscos citados: consistência e rotatividade |
| **Homejoy** (EUA, fechou em 2015) | Comissão de ~25% sobre limpeza | Preço fixo com desconto agressivo na 1ª limpeza (US$ 19, contra US$ 85 da concorrência) | Expandiu rápido para muitas cidades; processos sobre vínculo trabalhista; com ~25% de corte, o profissional ganhava pouco, a qualidade caiu e os melhores passaram a atender os clientes por fora [Fato: [Forbes](https://www.forbes.com/sites/ellenhuet/2015/07/17/cleaning-startup-homejoy-shuts-down-citing-worker-misclassification-lawsuits/), [TechCrunch](https://techcrunch.com/2015/07/31/why-homejoy-failed-and-the-future-of-the-on-demand-economy), [Entrepreneur](https://www.entrepreneur.com/science-technology/what-the-homejoy-failure-tells-us-about-the-future-of-the/248896)] | Não crescer de cidade antes de ter densidade e recompra; não comprar cliente com desconto que não volta; cuidado com subordinação (LEGAL.md §3) |

**Comparação com outros apps:** iFood Plano Básico 12% + 3,2% do pagamento online e Plano Entrega 23% + 3,2% ([iFood](https://blog-parceiros.ifood.com.br/taxas-ifood/)); Uber ~20% segundo o CEO ([55content](https://55content.com.br/noticia/a-taxa-que-a-uber-cobra-dos-motoristas-no-brasil-e-cerca-de-20-diz-ceo-da-uber/)). A nossa hipótese continua 0% no piloto e 12–15% sobre a mão de obra depois; a decisão está em aberto ([BUSINESS.md §2](BUSINESS.md#2-monetização)).

## 3. Os três modelos e como cada um escala

| | Vender contato | Comissão (o nosso) | Operar de ponta a ponta |
|---|---|---|---|
| Exemplos | GetNinjas, Thumbtack, Angi | Triider, TaskRabbit, Arrumaê | Urban Company, Parafuzo, Homejoy |
| Receita | Por contato, mesmo que o serviço não feche | % do serviço concluído | % maior, preço definido pela plataforma |
| Operação | Mínima | Média (verificação, suporte, contestação) | Alta (treinamento, padrão, escala de agenda) |
| Precisa de pagamento pela plataforma? | Não | Sim, para cobrar a comissão de forma confiável | Sim |
| Risco principal | Profissional insatisfeito, contato de baixa qualidade | **Vazamento** (combinar por fora depois do 1º serviço) | Custo e qualidade; vínculo trabalhista |
| Como escala | Rápido em categorias e cidades (é anúncio) | Cidade por cidade, com densidade | Lento: cada cidade exige equipe e treinamento |

**O que limita a escala nesse mercado não é tecnologia:**
- **Densidade local:** o cliente quer proposta rápida de alguém perto. Por isso o piloto começa com 2–3 regiões e 3–5 serviços (ROADMAP). Abrir a próxima região só quando a atual bater as metas do GROWTH.md por 2 meses.
- **Vazamento:** para o cliente e o profissional continuarem usando a plataforma no 2º serviço, ela precisa entregar algo que o WhatsApp não entrega: registro do combinado, pagamento parcelado, histórico, suporte que decide contestação, "pedir de novo com este profissional" (ROADMAP). Comissão menor na recompra também ajuda (ver BUSINESS.md).
- **Recrutamento de profissional:** na Urban Company, 83% chegam por indicação. Vale um programa de indicação entre profissionais quando houver volume.

**E a tecnologia?** O que temos (um só app Next.js + PostgreSQL) aguenta o piloto e bem mais que isso: um Postgres gerenciado comum processa milhares de pedidos por dia. O que precisaria mudar com escala está mapeado em ARCHITECTURE.md ("Limitações conhecidas"): upload direto para o storage, fila para e-mail/WhatsApp, cache das páginas públicas. Nenhuma dessas é urgente.

## 4. Estrutura de site que funciona nesse mercado

Padrões que aparecem nos sites acima, comparados com o que o Arrumaê já tem:

| Padrão | Quem usa | Arrumaê hoje |
|---|---|---|
| Primeira tela com "do que você precisa?" e os serviços em destaque | Todos | Sim (home + cartões dos 5 serviços) |
| Pedido por questionário guiado, com perguntas por serviço | GetNinjas, Thumbtack | Sim, em etapas; as perguntas ainda são iguais para todos os serviços → **melhorar** com perguntas específicas (ex.: "quantas tomadas?") |
| Preço ou faixa de preço **antes** de pedir | Parafuzo, Urban Company, Thumbtack (estimativa) | Não → mostrar faixas reais quando tivermos 30+ serviços concluídos (nunca inventar faixa) |
| Perfil do profissional com avaliações e o que foi verificado | Thumbtack, TaskRabbit | Sim (perfil público; selo diz exatamente o que foi verificado) |
| Páginas por serviço × cidade/bairro para o Google | Thumbtack, GetNinjas | Parcial (landings por serviço e região). Expandir só com conteúdo local real |
| Guias "quanto custa" | Thumbtack (guias de custo) [A conferir] | Não → bom canal de SEO quando houver dado próprio |
| Área do profissional separada (às vezes app próprio) | Todos | Sim (`/profissional`), no navegador; app nativo fica para depois |
| Pagamento parcelado depois do serviço | Triider | Não (piloto paga direto ao profissional) |

**O que olhar quando você abrir os sites deles** (vale fazer com o celular, que é onde o cliente está):
1. Quantos toques do início até enviar um pedido? Quais perguntas fazem?
2. Pedem cadastro antes ou depois de descrever o problema? (Nós: depois.)
3. O que mostram sobre o profissional? O que dizem que verificaram, e isso é explicado?
4. Mostram preço? Como?
5. Como é a página "seja um profissional"? O que prometem ao profissional?
6. Rodapé: CNPJ, canal de atendimento, termos. Nota no Reclame Aqui.
7. Tipografia, cores, fotos ou ilustrações: o que passa confiança para você e o que parece genérico.

## 5. Decisões de base (o seu checklist)

### 5.1 Banco de dados

| Opção | Grátis | Combina com o Arrumaê? |
|---|---|---|
| **PostgreSQL** (o que usamos) | Sim, no seu computador. Na nuvem, ver Supabase/Neon | **Sim.** O sistema usa transações, trava de linha, triggers, views de relatório e 32 tabelas relacionadas |
| **Supabase** (é um PostgreSQL gerenciado + extras) | 500 MB de banco, 1 GB de arquivos, 2 projetos; **pausa depois de 1 semana sem uso** [Fato: [UI Bakery](https://uibakery.io/blog/supabase-pricing), [MyKavo](https://mykavo.app/blog/supabase-free-tier-limits)] | Sim, como Postgres. Grátis só para teste; produção precisa do plano pago (≈ US$ 25/mês [A conferir]) |
| **Neon** (PostgreSQL "serverless") | 100 projetos; o banco desliga após 5 min sem uso e religa no próximo acesso; 0,5–1 GB por projeto [Fato: [Neon](https://neon.com/guides/neon-vs-supabase-free-plan)] | Sim. Ótimo para homologação |
| **Firebase** (Firestore, banco de documentos do Google) | 1 GiB, 50 mil leituras e 20 mil gravações por dia; desde 2026 o armazenamento de arquivos exige o plano pago com cartão [Fato: [Costbench](https://costbench.com/software/database-as-service/firestore/free-plan/), [Omid Saffari](https://omidsaffari.com/blog/firebase-pricing)] | **Não.** Não é relacional: pedido, propostas, agenda e pagamento precisam mudar juntos numa transação. Trocar = reescrever os serviços e os relatórios |
| **MySQL** | Sim, local; poucas opções grátis na nuvem | Funcionaria, mas não ganhamos nada e perderíamos recursos do Postgres que já usamos. Migrar custaria semanas |

**Recomendação:** manter PostgreSQL. Desenvolvimento no computador (grátis). Homologação em Neon ou Supabase grátis. Produção num Postgres gerenciado em São Paulo, com backup diário e recuperação a um ponto no tempo (pago, **requer autorização**). Se for Supabase, usar só como banco: não ligar a API de dados deles sem regras de acesso (aviso no DATABASE.md).

### 5.2 Servidor (hospedagem do site)

| Opção | Plano grátis | Serve para produção? |
|---|---|---|
| **Vercel** | Hobby: **somente uso pessoal, não comercial**; pode remover o projeto sem aviso [Fato: [Convika](https://convika.com/compare/vercel-hobby-commercial-use/), [Justin McKelvey](https://justinmckelvey.com/blog/is-vercel-free)] | Só no Pro (US$ 20/desenvolvedor/mês [Fato: [Costbench](https://costbench.com/software/developer-tools/vercel/)]) |
| **Render** | Dorme após 15 min sem acesso, leva ~1 min para acordar, perde arquivos locais a cada reinício [Fato: [Render docs](https://render.com/docs/free), [changelog](https://render-www.onrender.com/changelog/free-web-services-now-remain-active-while-receiving-websocket-messages)] | Só no pago (a partir de ~US$ 7/mês [Fato: [Temps](https://temps.sh/blog/render-pricing-2026)]) |
| Railway, Fly.io | Não verificado nesta pesquisa | — |

Em qualquer opção o site precisa de: Node 22+, um agendador chamando `/api/cron/maintenance` a cada 10–15 min (o n8n já faz) e armazenamento de arquivos na nuvem (o armazenamento local some em servidor gratuito ou serverless; está no ROADMAP).

**Recomendação:** homologação grátis (Render free + Neon free) para vocês testarem pelo celular. Produção: Vercel Pro ou Render pago + Postgres gerenciado em São Paulo. **[Estimativa]** US$ 30–50/mês no começo. Requer autorização.

### 5.3 Domínio e e-mail profissional

- **Domínio `.com.br`:** R$ 40/ano no [Registro.br](https://registro.br), mesmo valor na renovação [Fato: [Teletime](https://teletime.com.br/14/10/2026/br-6-milhoes/), [TecMundo](https://www.tecmundo.com.br/internet/405860-descubra-quanto-custa-um-dominio-de-site-e-como-registrar-o-seu.htm)]. Outros registradores cobram menos no 1º ano e mais na renovação (ex.: Hostinger R$ 11 → R$ 64,99/ano [Fato: [Hostinger](https://www.hostinger.com/br/tld/dominio-com-br)]). Antes de registrar: **busca da marca no INPI** (LEGAL.md §7), para não investir num nome que outra empresa já tem.
- **E-mail com o domínio** (ex.: `contato@arrumae.com.br`):
  - Zoho Mail grátis: até 5 usuários, 5 GB cada, só pelo site/app do Zoho; **pode não estar disponível para quem se cadastra do Brasil** [Fato: [Zoho](https://www.zoho.com/pt-br/mail/zohomail-pricing.html), [HomeHost](https://www.homehost.com.br/blog/contas-de-email/melhores-provedores-de-email-gratuitos/)].
  - Zoho Mail Lite: R$ 5/usuário/mês (anual) [Fato: [Domailo](https://domailo.app/en/comparisons/zoho-mail-vs-google-workspace)].
  - Google Workspace Business Starter: R$ 40,90/usuário/mês (anual) [Fato: [Domailo](https://domailo.app/en/comparisons/zoho-mail-vs-google-workspace)].
- **E-mail automático do sistema** ("esqueci minha senha", avisos) é outra coisa: sai por um provedor de envio (Resend, Amazon SES), com o domínio verificado (registros SPF, DKIM e DMARC). Está no ROADMAP.

**Recomendação:** Registro.br + Zoho Lite para 2 caixas (`contato@` e `suporte@`): **[Estimativa]** R$ 40/ano + R$ 10/mês. Requer autorização e a busca no INPI antes.

### 5.4 Autenticação, criptografia, JWT, Python e LGPD

**O que já existe** (SECURITY.md): senha com argon2id (o padrão recomendado hoje), sessão guardada no banco (o navegador guarda só um código aleatório; o banco guarda só o hash dele), cookie protegido, permissão conferida no servidor em toda operação, limite de tentativas, auditoria que não pode ser apagada.

**JWT, precisa?** JWT é um "crachá assinado": o servidor confere a assinatura sem consultar o banco. É útil entre serviços ou em app de celular. O problema é que **não dá para cancelar antes de vencer**: se um admin suspende um profissional ou alguém troca a senha, o JWT continua valendo até expirar. Com sessão no banco, cancelar é imediato, e isso importa num marketplace. **Recomendação:** manter a sessão no banco. Se vier app nativo, ele usa o mesmo tipo de token pelo cabeçalho `Authorization`.

**Criptografia, em três camadas:**
1. **No caminho** (navegador ↔ site ↔ banco): HTTPS e SSL no banco. Já é exigido em produção.
2. **No disco do provedor:** os bancos gerenciados já criptografam o disco.
3. **Nos campos sensíveis:** **feito em 29/10/2026.** O CPF/CNPJ do profissional e o segredo do 2FA ficam cifrados na aplicação (AES-256-GCM com a chave fora do banco), com um "índice cego" (HMAC) para conferir CPF repetido sem decifrar. Um vazamento do banco não expõe o CPF.

Senha nunca é "criptografada", é transformada em hash irreversível (argon2id). Isso já está feito.

**Python, precisa?** Não para o site: o sistema inteiro é TypeScript, e reescrever em Python (Django/FastAPI) seria refazer tudo sem ganho. Python faz sentido depois, para análise de dados e modelos de previsão, lendo as views de relatório com o usuário só-leitura (`arrumae_reporting`, ver DATABASE.md).

**LGPD**, o que falta (detalhes em LEGAL.md §2): nomear o encarregado (DPO), registro das operações de tratamento, política de retenção de documentos, contratos com os fornecedores e plano de incidente. **Atenção:** biometria (selfie comparada com documento) é **dado pessoal sensível** na LGPD (art. 5º, II), com regras mais rígidas (art. 11). Se for usada, preferir um fornecedor que devolva só o resultado ("confere" / "não confere") e não guardar a imagem.

**Pendências de segurança antes de lançar** (ROADMAP): provedor de e-mail para o "esqueci minha senha" sair de verdade, armazenamento de arquivos na nuvem e monitoramento de erros. 2FA, recuperação de senha, CPF cifrado e CSP com nonce já foram feitos (SECURITY.md).

### 5.5 Cadastro de pessoas (CPF, RG)

- **Cliente:** e-mail, telefone e endereço do serviço. **Não pedir CPF nem RG** (a LGPD manda coletar só o necessário). Quando houver pagamento pela plataforma, alguns provedores exigem o CPF de quem paga [A conferir no provedor escolhido].
- **Profissional, hoje:** CPF (com conferência dos dígitos), foto de documento de identidade, comprovante de endereço e certificados (ex.: NR-10), com análise humana no painel admin.
- **RG:** cada estado emite num formato, e a nova Carteira de Identidade Nacional usa o **próprio CPF como número**. Por isso: pedir o CPF + foto de um documento com foto (RG, CNH ou CIN) e não guardar o número do RG à parte.
- **Níveis de verificação do profissional** (ir subindo conforme o volume justificar):

| Nível | O que confere | Custo | Quando |
|---|---|---|---|
| 0 (hoje) | CPF válido + foto do documento + análise humana + conversa por vídeo (concierge) | Zero | Piloto |
| 1 | CPF ativo na Receita e nome confere | ~R$ 1 por consulta [Fato: preço publicado pelo fornecedor [Validra](https://validra.api.br/)] | Antes de abrir cadastro em massa |
| 2 | Selfie comparada com o documento ou com a base oficial (biometria, dado sensível) | R$ 1,49 a R$ 7,99 por verificação [Fato: [Validra](https://validra.api.br/)]; Serpro via Clicksign R$ 4,50 [Fato: [Clicksign](https://ajuda.clicksign.com/biometria-facial-serpro)]; unico e idwall sem preço público | Se houver fraude de identidade ou exigência do provedor de pagamento |

Antecedentes criminais: **não coletamos** (LEGAL.md explica o risco jurídico). O selo do perfil diz exatamente o que foi verificado; nunca "profissional verificado" genérico.

### 5.6 Pagamentos

Já detalhado em [BUSINESS.md §4](BUSINESS.md#4-pagamentos). Resumo atualizado:
- **Piloto:** o cliente paga direto ao profissional; nada passa pela plataforma.
- **Depois:** um provedor brasileiro com divisão automática do valor (split). Tarifas públicas: Asaas Pix R$ 1,99 fixo e cartão 2,99% + R$ 0,49; Pagar.me e Mercado Pago Pix 0,99% [Fato: [Dardo](https://dardo.studio/pt/blog/gateway-de-pagamento/), [blog Asaas](https://blog.asaas.com/taxas-asaas/)]. **O preço do split não é público em nenhum deles**: pedir proposta com o volume previsto e comparar as regras de estorno e chargeback do contrato, não só a taxa [Fato: [Konta+](https://kontamais.com/blog/split-de-pagamento-marketplace-comparativo), [FWC](https://fwctecnologia.com/en/blog/post/payment-gateways-brazil-comparison-2026)].
- **Nunca guardamos dados de cartão:** o cartão é digitado no checkout do provedor.
- Exige CNPJ, contrato e autorização sua.

### 5.7 Interface (UI/UX) e tipografia

**Hoje:** títulos em Bricolage Grotesque, texto em Inter, letra base de 17 px (pensando em quem tem pouca familiaridade com celular), paleta própria e ilustrações feitas para o projeto. Tudo isso está em `src/app/globals.css`, e trocar é simples.

**Proposta de processo, já que ainda não definimos referências:**
1. Cada um de vocês escolhe de 3 a 5 sites de qualquer setor de que goste (não precisa ser concorrente) e diz em uma frase o que agrada: cor, letra, fotos, quantidade de texto, tom.
2. Eu monto de 2 a 3 versões da página inicial lado a lado na vitrine, para vocês compararem no celular.
3. Teste com 5 pessoas de fora: pedir que façam um pedido sem ajuda e observar onde travam. Cinco pessoas já mostram a maior parte dos problemas.

**Princípios para este público:** feito primeiro para o celular; poucas perguntas por tela; preço ou faixa visível o quanto antes; só sinais de confiança verdadeiros (nada de "milhares de clientes" sem dado); botões grandes e bom contraste; WhatsApp como canal de aviso (ROADMAP).

**Fontes grátis** (licença livre, podem ser servidas pelo próprio site como hoje): manter Bricolage + Inter, ou testar Plus Jakarta Sans, DM Sans, Manrope ou Nunito Sans (mais "amigáveis"), ou Fraunces nos títulos para um ar mais acolhedor.

### 5.8 Dor do cliente: faz sentido?

**Sim, há evidência de que a dor existe:**
- 77,8% dos brasileiros dizem ser difícil encontrar profissional confiável para obras e reformas; dificuldade de achar mão de obra confiável é o 2º motivo para adiar reparos (22,6%), atrás de falta de dinheiro (51,5%); 47,1% só cuidam da casa depois que o problema aparece [Fato: pesquisa Obramax/Opinion Box com 509 pessoas, mai/2026, via [Sincomavi](https://sincomavi.org.br/?p=17127) e [BRA 1](https://www.bra1.com.br/economia/id-689843/brasileiro_so_cuida_da_casa_quando_o_problema_estoura_e_paga_o_dobro_na_conta)]. A pesquisa é de uma empresa do setor: tratar como indicativo.
- O GetNinjas recebe mais de 1 milhão de pedidos por trimestre: a demanda por buscar profissional pela internet existe.
- Do lado do profissional, a queixa de pagar por contato que não fecha está documentada (BUSINESS.md §1).

**O que ainda não sabemos:** se o cliente troca a indicação do vizinho pelo Arrumaê, se o profissional aceita comissão e se os dois voltam no 2º serviço.

**Como validar sem gastar** (antes de investir em domínio, servidor e anúncio):
1. **15 a 20 conversas com clientes** em São Paulo. Perguntar sobre o passado, não sobre o futuro: "Conte a última vez que precisou de um eletricista. Como achou? O que deu errado? Quanto pagou? Como soube se o preço era justo?". Evitar "você usaria um app que…?": todo mundo diz que sim.
2. **10 conversas com profissionais:** como conseguem cliente hoje, quanto gastam com isso, se já usaram GetNinjas/Triider, o que achariam de pagar só quando o serviço fecha.
3. **Piloto concierge:** 20 pedidos reais em 2 regiões, com a equipe fazendo à mão o que ainda não está automatizado.
4. **Metas** (GROWTH.md §2): tempo até a 1ª proposta, % de pedidos com proposta, % que agenda, nota do cliente, % que volta. Se depois de 2 meses os números ficarem abaixo das metas, mudar serviço, região ou modelo antes de gastar mais.

## 6. Custos se tudo for contratado

**[Estimativa]**, nada contratado. Tudo isto **requer a sua autorização**.

| Item | Custo | Quando |
|---|---|---|
| Domínio `.com.br` | R$ 40/ano | Depois da busca no INPI |
| E-mail profissional (2 caixas, Zoho Lite) | R$ 10/mês | Junto com o domínio |
| Servidor do site (pago) | US$ 7–20/mês | Lançamento do piloto |
| Banco gerenciado em São Paulo | ≈ US$ 25/mês [A conferir] | Lançamento do piloto |
| Envio de e-mail automático | Plano grátis dos provedores costuma bastar no piloto [A conferir] | Junto com o "esqueci minha senha" |
| Verificação de identidade (nível 1–2) | R$ 1 a R$ 8 por profissional | Quando o volume justificar |
| Pagamentos | % por transação (§5.6) | Depois do piloto |
| Homologação (Render free + Neon free) | R$ 0 | Já, se você quiser testar pelo celular |

## 7. O que eu faria agora, em ordem

1. **Vocês:** escolher as referências visuais (§5.7) e fazer as conversas com clientes e profissionais (§5.8). É o que mais muda as próximas decisões, e não custa nada.
2. **Eu, sem custo:** ~~criptografia do CPF/CNPJ, "esqueci minha senha", 2FA para admins~~ (feitos), armazenamento de arquivos na nuvem, perguntas específicas por serviço no pedido.
3. **Com a sua autorização:** contas grátis de homologação (criadas por você, as senhas ficam com você) para testar pelo celular.
4. **Com a sua autorização e depois do INPI:** domínio e e-mail.
5. **Só com o piloto validado:** servidor e banco pagos, pagamento pela plataforma, anúncios.

## 8. Análise das páginas iniciais (31/10/2026, sites abertos no navegador)

Com o acesso liberado, as três páginas iniciais foram abertas num navegador real (celular de 390 px e computador de 1280 px). Os números abaixo são **o que cada site afirma na própria página**, não dados verificados.

| | GetNinjas | Triider | Parafuzo |
|---|---|---|---|
| Título principal | "Mais de 500 tipos de serviços em um só lugar." | "Uma nova forma de contratar profissionais" | "Serviços domésticos com praticidade e qualidade" |
| Primeira tela (celular) | Busca "O que você precisa?" + sugestões populares (Diarista, Marido de aluguel, Pintor…); botão "Seja um profissional" no topo; foto de um profissional real com nota | Busca "Serviço ou especialidade" + botão Pesquisar; grade de categorias com ícones logo abaixo | Três provas em lista (volume desde 2014, profissionais "aprovados e segurados", 200 cidades); cartões de serviço com foto e "Disponível para hoje" |
| Ordem das seções | Categorias → principais serviços (fotos) → app → depoimentos → 3 passos → pedidos frequentes → números → cadastro de profissional → blog → sobre → rodapé gigante de links por serviço e cidade | Busca → categorias → "acompanha teu pedido" (verificação, 6x sem juros, suporte) → serviços populares com nota e **preço médio** → reforma → **guia de preços** → depoimentos → números → onde estamos → guias de profissionais, categorias, estados e preços | Provas → serviços → como contratar (3 passos com tela do app) → **assinaturas com preço** → vantagens → vídeos de profissionais → benefícios aos profissionais → depoimentos → imprensa → parceiros → dúvidas |
| Prova social exibida | 4 mi serviços/ano, 165 mil clientes/mês, R$ 1 bi/ano; depoimentos | Nota 4,9 com 117 mil avaliações; +200 mil usuários; +30 mil projetos | 2 mi serviços; 15 mil avaliações; selo Reclame Aqui 2025; imprensa |
| Visual | Source Sans Pro; azul e amarelo; fotos de pessoas reais com camiseta da marca | Roboto + Raleway; laranja; mascote polvo; fotos | Open Sans; verde-água; fotos de banco de imagens |
| Altura da página (computador) | ~8.800 px | ~7.600 px | ~9.400 px |

**O que os três fazem igual:** busca ou escolha do serviço já na primeira tela; categorias visíveis sem rolar; "como funciona" em 3 passos; seção para recrutar profissionais; páginas por serviço e cidade para o Google; muita prova de volume.

**O que levamos para a nossa home (31/10/2026):**
- Busca no topo com sugestões populares, mas que vai além da busca: enquanto a pessoa escreve, o **combinado se monta** (serviço, o que entra, como vem o preço, quem vê o telefone). É o nosso diferencial ("combinado é combinado") mostrado funcionando, e não só descrito.
- Lista completa do que cada serviço faz, com cada item levando ao pedido já preenchido (como os "serviços populares" do Triider), mais o que fica de fora.
- 3 passos com as telas reais do app (como a Parafuzo).
- Cartões de bairro × serviço apontando para as nossas páginas por região (como os guias de cidade do GetNinjas e do Triider).
- Botão fixo "Pedir orçamento grátis" no rodapé do celular.

**O que não levamos, de propósito:** números de volume, notas, depoimentos, selos e imprensa (não temos, e inventar é proibido); preço médio por serviço (só com 30+ serviços concluídos); fotos de banco de imagens (D‑016); botão de baixar app (não existe app). No lugar da prova de volume, a home mostra **o que a equipe confere e o que ainda não faz**, coisa que nenhum dos três diz.

## 9. Como liberar o acesso aos sites dos concorrentes

Para eu abrir os sites (e não depender só de busca), libere estes endereços em **Configurações do ambiente → Acesso à rede → Domínios permitidos** ([documentação](https://code.claude.com/docs/en/cloud-environments#network-access)):
`www.getninjas.com.br`, `www.triider.com.br`, `www.parafuzo.com`, `www.taskrabbit.com`, `www.thumbtack.com`, `www.angi.com`, `www.urbancompany.com`.

Com isso eu consigo capturar as telas de cada um no celular e montar uma comparação visual (fluxo de pedido, perfil do profissional, preço, cadastro de profissional).
