# Worklog

## 2026-10-24 — Sessão 1: diagnóstico, fundação e MVP

### Ambiente encontrado
- Diretório vazio (sem código, repositório ou infraestrutura a preservar).
- Node 22, npm, PostgreSQL 16 local (cluster parado → iniciado), Docker CLI **sem daemon** (Supabase local inviável), Chromium + Playwright 1.63 pré‑instalados.
- Rede: apenas registries de pacotes liberados; sites de concorrentes/provedores bloqueados para acesso direto → pesquisa feita por busca na web (fontes em `docs/BUSINESS.md`).

### Feito
1. **Pesquisa**: GetNinjas, Triider (adquirida pela MadeiraMadeira em 10/2025), Parafuzo, varejo; provedores de pagamento (Asaas, Mercado Pago, Pagar.me, Stripe); reforma tributária (LC 214/2025 art. 22), NFS‑e nacional, LGPD/antecedentes, NR‑10, CPC. → `docs/BUSINESS.md`, `docs/LEGAL.md`.
2. **Fundação**: Next.js 16.4 + TS + Tailwind 4, Drizzle + Postgres, 2 migrations (schema + triggers de auditoria/avaliação imutável), env validado, seed de catálogo e de demonstração.
3. **Domínio e serviços**: máquina de estados, propostas (fixa/visita), aceite atômico, revisões de preço, mensagens com mascaramento de contato, avaliações, suporte, admin, configurações comerciais, analytics, rate limit, uploads sanitizados, storage/e‑mail/pagamento por adaptadores, rotinas de expiração e confirmação automática.
4. **Interface**: home, landings por categoria/região, wizard de pedido com cadastro embutido, área do cliente, área do profissional (onboarding, documentos, portfólio, disponibilidade, oportunidades, agenda, avaliações), perfil público, notificações, suporte, conta (exportar/excluir), painel admin completo, páginas de regras/termos/privacidade (rascunhos).
5. **Documentação**: README + 9 documentos em `docs/`.

### Testes executados (todos aprovados)
- `npm run typecheck` ✅ · `npm run lint` ✅ · `npm run build` ✅
- `npm test`: **49 testes** (20 unitários + 29 de integração com Postgres real) ✅ — inclui permissões/IDOR, transições inválidas, aceite concorrente, idempotência, limite de propostas, imutabilidade de avaliação e auditoria, exclusão LGPD, uploads (EXIF removido, arquivo disfarçado recusado), rate limit.
- `npm run test:e2e`: navegador real (390×844) — visitante cria pedido + conta → profissional propõe (telefone mascarado, endereço oculto) → cliente aceita → profissional inicia/conclui → cliente confirma e avalia → admin vê indicadores/financeiro → controles de acesso. **Sem erros de JavaScript.** ✅

### Problemas encontrados e corrigidos
- Datas em SQL bruto não serializadas pelo driver (`runLifecycleJobs`, métricas) → operadores tipados/ISO com cast.
- Profissionais convidados recebiam CEP completo e id do cliente → mascarados até o agendamento (teste adicionado).
- Lint do React (setState em effect, `Math.random` na renderização) → corrigido com `useSyncExternalStore`, ajuste de estado na renderização e reset via DOM.
- `robots.txt` estático congelaria `APP_ENV` do build → dinâmico.
- Rótulos da barra de progresso sobrepostos no celular → etapa atual em linha própria.

### Simulações / limitações explícitas
- **Pagamentos:** nenhum. Provedor `offline` só registra "cliente declarou que pagou". Comissão calculada e **dispensada**.
- **E‑mail:** driver `console` grava em `outbound_messages` com status `skipped`; nada é enviado.
- **Dados de demonstração:** marcados `is_demo`, com "[DEMO]" no nome e selo "Demo" na interface; seed bloqueado em produção.
- **Regiões:** prefixos de CEP aproximados (hipótese).
- Cupons cadastráveis mas não aplicados (dependem de pagamento).

### Bloqueios / depende do fundador
- Remoto Git (não há repositório remoto; commits estão só locais).
- Contas pagas (hospedagem, banco, e‑mail, domínio) — nada contratado.
- Revisão jurídica e contábil.

### Próximo passo sugerido
Ver `docs/ROADMAP.md` → "Próximas tarefas": reset de senha + e‑mail real, 2FA admin, storage S3, validação dos CEPs e recrutamento de profissionais para 2 regiões.

## 2026-10-24 — Sessão 1 (continuação): marca, repositório e vitrine

- Marca renomeada para **Arrumaê** (D‑015); bancos locais recriados como `arrumae_*`.
- Repositório publicado em https://github.com/samyrcouto/arrumae (histórico em commits por funcionalidade).
- README com passo a passo no Windows (PowerShell/`npm.cmd`, SQL Shell) e problemas comuns; e2e multiplataforma.
- **Vitrine estática** para GitHub Pages: `npm run vitrine` gera 38 capturas reais (19 telas × celular/computador) com dados DEMO; `npm run vitrine:publicar` publica no branch `gh-pages`.
- **GitHub Codespaces**: `.devcontainer/` com Node 22 + PostgreSQL 16, setup automático e site iniciado sozinho. `allowedOrigins`/`allowedDevOrigins` para `*.app.github.dev` só quando `CODESPACES=true`.
- Testado: typecheck, lint, 49 testes, build, e2e. **Não testado:** o Codespace em si (sem Docker neste ambiente) e o e2e no Windows.

## 2026-10-24 — Redesenho visual (branch `redesign-visual`)

- Logo novo (símbolo casinha + trena; "ê" com telhado), favicon, cabeçalho com navegação para visitantes, rodapé escuro com faixa de trena.
- Ilustrações SVG próprias: cena da home, 5 serviços, profissional. Novas cores de apoio (terracota, madeira, água, folha).
- Home refeita: entrada por serviço no topo, faixa de promessas, cards de serviço, 3 passos com telas reais do app, cartão "Combinado", transparência sobre verificação, seção de profissionais, regiões, FAQ e CTA final.
- Landings de serviço, formulário de pedido e página de profissionais com as ilustrações.
- `npm run vitrine` agora também gera `public/marketing/*.webp` (telas reais para as molduras de celular).
- Sites dos concorrentes não puderam ser abertos daqui (rede bloqueada); a referência veio de pesquisa e de padrões do segmento (D‑016).

## 2026-10-25 — Personagens desenhados

- Componente `Person` (SVG configurável: pele, cabelo, capacete/boné, barba, óculos, brincos, roupa, cinto, ferramenta).
- Home: eletricista no topo sobre fundo de casinha com selo "Documentos conferidos pela equipe"; equipe de 3 profissionais na seção de profissionais; cena da sala na chamada final.
- "Seja um profissional": montador com selo "Sem taxa para ver os pedidos".
- Removida a ilustração antiga do celular (`ProScene`), sem uso.

## 2026-10-25 — Personagens semi-realistas

- Fundador achou os personagens em cartum feios e pediu algo mais realista (sem chegar a foto).
- Novo `src/components/people.tsx`: `RealPerson` sem contorno, com sombreado, olhos com íris e brilho, nariz e lábios, gola polo, bolso com caneta, capacete/boné com volume e mão segurando furadeira; `HeroPro` (eletricista / montador) e `ProTeam`.
- Removidos os personagens antigos de `illustrations.tsx`.

## 2026-10-25 — Ajuste da mão e dos capacetes

- Fundador achou a mão da furadeira "torta/invertida" e os capacetes estranhos.
- Mão redesenhada como um punho fechado no cabo (dedos por baixo, polegar por cima) e braço dobrado natural: braço junto ao corpo, cotovelo e antebraço em diagonal até a mão.
- Capacete refeito: casco mais largo e arredondado, nervuras curvas e aba contínua com sombra na testa; coque ajustado para aparecer por baixo do capacete.

## 2026-10-25 — Corpo, braços e profissionais por serviço

- Fundador achou o corpo gigante e os braços "colados". Tronco afinado (ombros ~2,4 cabeças), braços desenhados como membros separados: a parte de cima sai da manga atrás do tronco e o antebraço vem na frente. Pose padrão: uma mão erguendo a ferramenta ao lado do ombro e a outra na cintura, com fundo aparecendo entre braço e corpo.
- Punho novo com quatro dedos dobrados e polegar com unha; o mesmo punho, girado, faz a mão na cintura.
- Um profissional por serviço (`TRADES` em `people.tsx`): eletricista (chave de fenda isolada), encanador (chave de grifo), técnica de ar-condicionado (manômetro), montador (furadeira) e pequenos reparos (martelo).
- Landings `/servicos/[categoria]` mostram o profissional do serviço; a equipe da home virou eletricista + encanador + técnica de ar-condicionado. `HeroPro` agora recebe `trade` (slug) em vez de `variant`.

## 2026-10-25 — Mãos de verdade e poses variadas

- Fundador: mão "com dedos a mais, invertida", poses todas iguais e uma personagem parecendo careca.
- Causa da mão estranha: o cabo passava na mesma direção do antebraço. Agora o punho é visto pelas costas (4 nós dos dedos + polegar do lado de fora), o cabo atravessa a mão perpendicular ao antebraço e a ponta da ferramenta sai pelo lado do polegar; a mão esquerda é o espelho da direita. Mão na cintura com 4 dedos e polegar escondido.
- Poses (`POSES` em `people.tsx`): `ergue`, `ergue-direita`, `mostra`, `forca`, `cruzados`, `cintura`. Eletricista ergue a chave de fenda; encanador ergue a chave de grifo do outro lado com o braço solto; técnica de ar-condicionado mostra o manômetro na frente do peito; montador com a furadeira ao lado do ombro; pequenos reparos de braços cruzados com o martelo.
- Cabelo agora aparece embaixo de boné/capacete para todos (costeletas); encanador ganhou bigode — antes parecia uma mulher careca.

## 2026-10-25 — Cabelo cacheado e mãos mais naturais

- Técnica de ar-condicionado parecia careca: o cabelo cacheado era só uma coroa de cachos e a testa aparecia no alto da cabeça. Agora tem volume cobrindo a cabeça, cachos na linha da testa e textura.
- Mãos redesenhadas com silhueta lisa e poucos traços (os "calombos" de cada nó deixavam a mão estranha).
- Bug corrigido: a mão na cintura estava girada 180° (dedos voltados para o cotovelo). Agora o pulso dobra e os dedos apontam para baixo sobre o quadril, encostando no corpo; nos braços cruzados a mão segue o antebraço (`grip: "tuck"`).

## 2026-10-25 — Dedos e braços

- Braços mais grossos (braço 44, antebraço 38, manga 56) — estavam finos para o tronco.
- Punho com os quatro nós dos dedos no contorno, dobra das falanges e polegar separado com unha envolvendo o cabo; mão na cintura com quatro pontas de dedos separadas (médio e anelar mais longos). Mãos 20–30% maiores, proporcionais ao novo antebraço.

## 2026-10-25 — Cotovelo e dedos (de novo)

- Cotovelo: cada braço era dois "bastões" sobrepostos com sombra deslocada, o que criava uma bola e um crescente escuro no cotovelo. Agora o braço inteiro é uma forma só (`armPath`: ombro → cotovelo → pulso, afinando), cotovelo arredondado por fora e dobra marcada por dentro (`elbowCrease`). A sombra é a mesma forma mais fina e deslocada, então nunca vaza do contorno. O antebraço é redesenhado na frente do tronco com a mesma geometria (`forearmPath`).
- Punho: quatro dedos como segmentos arredondados separados por linhas finas, brilho em arco no topo de cada um (sem "pintas") e polegar liso do lado de fora.
- Mão na cintura: dorso com topo arredondado que se encaixa no pulso, pulso dobrado só até a metade do caminho e quatro dedos separados.

## 2026-10-25 — Mão fechada e joinha

- Fundador: dedos "pra fora"; pediu aspecto de mão fechada, e a outra mão aberta ou fazendo joinha.
- Punho que segura a ferramenta virou um bloco compacto: nós dos dedos dentro do contorno (faixa clara com três divisões), polegar abraçando o cabo — nada sai do contorno.
- Mão na cintura (que mostrava dedos esticados) foi substituída por **joinha** (`ThumbsUp`): dedos dobrados empilhados e polegar para cima saindo do lado dos nós. Eletricista e montador fazem joinha; encanador e técnica de ar-condicionado ficam com o outro braço solto; nos braços cruzados a mão de baixo fica escondida.
- Removidos `HipHand` e as poses de mão na cintura; pose padrão sem ferramenta agora é `joinha`.

## 2026-10-25 — Mãos baseadas em fotos de referência

- Fundador mandou duas fotos (mulher segurando rolo de pintura; profissional segurando furadeira) como referência de mão fechada.
- Novo `GripHand`: o cabo passa entre a palma e os dedos; os quatro dedos ficam empilhados em volta do cabo (indicador em cima, mínimo embaixo), com unhas nas pontas quando a palma está para a frente (`view="palm"`, como na foto do rolo) ou nós quando são as costas da mão (`"back"`, como na foto da furadeira); polegar fecha por cima. A ferramenta é desenhada entre a palma e os dedos.
- Poses refeitas como na foto: antebraço quase vertical e mão ao lado do ombro, com o cabo levemente inclinado. Cada mão com ferramenta tem `angle`, `mirror` e `view` explícitos na pose. Manômetro continua sempre em pé e sem espelhar.

## 2026-10-25 — Polegar atrás do cabo

- Fundador: o polegar devia ficar atrás do que está sendo segurado. Agora o polegar é desenhado antes da ferramenta (atrás do cabo); aparecem só a base, junto da palma, e a ponta do outro lado do cabo, acima do indicador — como na foto de referência.

## 2026-10-25 — Polegar sem unha

- Removida a unha da ponta do polegar (que aparece atrás do cabo) para ficar mais natural; as unhas dos outros dedos continuam na vista da palma.
- Correção: o que ainda parecia unha era a ponta do polegar pintada num tom mais claro sobre o polegar escuro. Agora o polegar inteiro tem o tom da pele, com só uma linha fina separando do indicador.

## 2026-10-25 — Mãos do lado certo e sem a técnica de ar-condicionado

- Mãos invertidas para o lado certo, como nas fotos de referência: as pontas dos dedos apontam para o meio do corpo e o dorso/pulso fica do lado de fora. Novo `toolFlip` mantém cada ferramenta virada como antes (a furadeira continua apontando para fora).
- Fundador pediu para excluir a técnica de ar-condicionado: removida de `TRADES`, junto com o manômetro e a pose `mostra`. A landing de ar-condicionado voltou para a ilustração do aparelho (`CategoryArt`); a equipe da home agora é encanador, eletricista e pequenos reparos.

## 2026-10-25 — Sem joinha e herói masculino na home

- Joinha removido (`ThumbsUp` e pose `joinha`): a mão livre agora fica com o braço solto ao lado do corpo. Pose padrão sem ferramenta: `solto`.
- Página inicial com eletricista homem (`HeroPro home`: capacete, bigode, sem brincos). A landing de elétrica continua com a eletricista.

## 2026-10-25 — Ferramentas viradas como o martelo e mão nos braços cruzados

- Fundador: só o martelo estava virado certo. Regra do martelo aplicada a todas: a ferramenta acompanha a mão (frente do lado das pontas dos dedos) e o topo inclina para o lado do pulso, para fora. Removido `toolFlip`, que espelhava a ferramenta sozinha (a furadeira ficava segurada ao contrário). Chave de fenda e chave de grifo agora inclinam para fora; furadeira aponta para cima com a empunhadura na mão.
- Braços cruzados: a mão de baixo voltou a aparecer, segurando o braço do outro lado (`grip: "hold"`, costas da mão).

## 2026-10-25 — Cenários de sala e cozinha

- Novo `src/components/scenes.tsx`: cenários em SVG com cores suaves (sem contorno), montados com peças reutilizáveis (janela com cortina, quadro, luminária, sofá, planta, tomada, piso; armários, azulejos, bancada, torneira, panela).
- `HeroPro`: o cômodo fica dentro da casinha (recortado pelo contorno), mantendo a moldura e o telhado amarelo. Cada profissional tem `scene` em `TRADES`: eletricista e montador na sala; encanador e pequenos reparos na cozinha. A home (eletricista) usa a sala.
- `ProTeam`: painel largo com cozinha à esquerda e sala à direita atrás da equipe; o capacete do eletricista "sai" do painel.

## 2026-10-25 — Banco para relatórios, integrações com n8n e plano de agentes

- Fundador perguntou como ficam o banco (SQL), automações/agentes e o n8n, e pediu para avançar no que fosse possível sem gastar.
- **Fila de eventos (outbox)**: tabela `integration_events` (migration `0002`). Os serviços gravam eventos na mesma transação da operação: `request.created`, `request.status_changed`, `request.stale` (pedido > 2 h sem proposta, uma vez), `quote.submitted`, `review.created`, `pro.submitted_for_review`, `pro.verification_decided`, `support.ticket_opened`. Sem dados pessoais (teste confere).
- **Webhook assinado**: `dispatchIntegrationEvents` (no job de manutenção) envia com HMAC‑SHA256 sobre timestamp + corpo, re‑tenta 1, 2, 4… min até 6 h (8 tentativas), lease contra execução dupla; retenção de 30 dias. Painel `/admin/integracoes` com fila, falhas e "Reenviar".
- **API só leitura**: `GET /api/integrations/v1/metrics?days=N` com `INTEGRATION_API_TOKEN` (401/503/429).
- **Relatórios SQL**: schema `reporting` com 6 views sem PII (migration `0003`) + `scripts/sql/reporting-role.sql` (papel somente leitura). Testado: lê as views, "permission denied" em `users`, não cria tabela.
- **n8n**: 3 workflows em `integrations/n8n/` (alertas da equipe com verificação de assinatura, relatório diário, agendador da manutenção). Testados ponta a ponta com n8n 1.123.87 local (a 2.x exige Node 24; instalação precisou forçar `xlsx@0.18.5` porque o CDN do SheetJS é bloqueado aqui) e um Telegram simulado.
- Docs: novo `docs/AUTOMACOES.md` (arquitetura, catálogo de eventos, passo a passo do n8n, plano de agentes de IA com gatilhos, modelo e custo estimado); DATABASE (relatórios + plano de produção, alerta da Data API do Supabase), SECURITY, ARCHITECTURE, DECISIONS (D‑017 a D‑019), ROADMAP, PRODUCT, `.env.example`.
- Testes: 57 (8 novos de integrações), typecheck, lint, e2e + vitrine (nova captura do painel de integrações).
- **Não feito (depende do fundador):** hospedar o n8n (Cloud ou VPS), criar o bot do Telegram, contratar banco gerenciado, qualquer uso de IA (custo + revisão jurídica).

## 2026-10-29 — Pesquisa de mercado e decisões de base

- Fundador pediu um panorama dos sites que já existem (modelo de negócio, estrutura, escala) e opinião sobre banco, autenticação/criptografia/JWT/Python/LGPD, UI/UX e tipografia, pagamentos, cadastro com CPF/RG, dor do cliente, domínio, servidor e e-mail.
- Novo `docs/PESQUISA-MERCADO.md`: GetNinjas, Triider, Parafuzo, Thumbtack, Angi, TaskRabbit, Urban Company e Homejoy (quem paga, estrutura do site, escala, lição); os três modelos (contato, comissão, ponta a ponta) e o que limita a escala; padrões de site comparados com o Arrumaê; recomendações por tema; custos estimados; ordem sugerida; validação da dor com roteiro de entrevistas.
- Sites dos concorrentes **não acessíveis** deste ambiente (bloqueio de rede): pesquisa feita por busca na web, fontes linkadas em cada linha. Lista de domínios para liberar no §8.
- Achados que mudaram docs: o plano grátis da Vercel proíbe uso comercial (ARCHITECTURE corrigido); CPF/CNPJ do profissional fica em texto no banco → nova pendência em SECURITY e duas tarefas novas no ROADMAP (criptografar CPF/CNPJ; perguntas específicas por serviço no pedido).
- Nada contratado, nenhuma conta criada. Só documentação.

## 2026-10-29 — Segurança da conta: 2FA, "esqueci minha senha", CPF cifrado, CSP com nonce

- Fundador mandou referências visuais (barrettjflowers.dev, bizar.ro, 2024.bizar.ro) e pediu prioridade em segurança. Os três sites estão **bloqueados** pela rede deste ambiente (curl 000, WebFetch ENOTFOUND; busca não encontrou descrição confiável): nada sobre o visual deles foi presumido. Aguardando liberação dos domínios ou capturas de tela.
- **CPF/CNPJ cifrados** (AES-256-GCM, chave `DATA_ENCRYPTION_KEY` fora do banco, contexto da coluna como dado autenticado, id da chave no valor para permitir troca). Índice cego `cpf_hash` (HMAC): o admin vê outros cadastros com o mesmo CPF. CPF antigo em texto puro é regravado no `db:migrate`; `db:encrypt-pii` para troca de chave.
- **Esqueci minha senha:** `/entrar/esqueci` e `/entrar/redefinir`. Token de 256 bits (só o hash no banco), 30 min, uso único, um link por vez, mesma resposta exista ou não a conta, rate limit por IP e e-mail, derruba sessões, e-mail de aviso. O link nunca é gravado em `outbound_messages`; o driver `console` só o mostra no terminal em dev (e no E2E com `EMAIL_DEV_LINKS=1`).
- **Verificação em duas etapas (TOTP):** `/conta/seguranca` com QR code (SVG desenhado no servidor; conferido com leitor jsQR) e chave para digitar; `/entrar/verificacao` depois da senha (desafio de 10 min, 5 tentativas). Código não pode ser reusado; 10 códigos de recuperação (HMAC). Obrigatória para admin em produção/homologação (`ADMIN_REQUIRE_2FA`): admin sem 2FA é levado ao cadastro e não age em nenhum serviço, rota de arquivo ou exportação. `npm run db:reset-2fa` para quem perdeu tudo.
- **Sessão de admin de 12 h** (demais: 30 dias); entradas de admin na auditoria com o fator usado.
- **CSP com nonce** por requisição no `proxy.ts` (`'strict-dynamic'`, sem `'unsafe-inline'` em scripts), seguindo `node_modules/next/dist/docs/01-app/02-guides/content-security-policy.md`. Saiu do `next.config.ts`.
- **`TRUSTED_IP_HEADER`** para o rate limit usar só o IP informado pelo provedor.
- Migration `0004_security` (3 tabelas, 4 colunas). Dependência nova: `qrcode` 1.5.4 (`npm audit --omit=dev`: 0 vulnerabilidades).
- Testes: **79** (22 novos: vetores da RFC 6238, criptografia, adulteração, migração de texto puro, reset, 2FA, reuso, tentativas, obrigatoriedade do admin, sessão), typecheck, lint, E2E com 3 etapas novas (CSP, senha esquecida pelo link do e-mail, ativação do 2FA + login com código) sem erros no navegador.
- Docs: SECURITY, DECISIONS (D‑020), PRODUCT, ROADMAP, VISAO-GERAL, README, `.env.example`.
- **Depende do fundador:** provedor de e-mail para o link sair de verdade; gerar e guardar a `DATA_ENCRYPTION_KEY` de produção.

## 2026-10-29 — Roteiro de testes manuais para vídeo

- Fundador pediu os testes para gravar um vídeo, conferindo no banco. Novo `docs/ROTEIRO-TESTES.md`: preparação no Windows (PowerShell + SQL Shell), 10 testes com o passo a passo no navegador, a consulta SQL de cada um, o que deve aparecer e uma caixa de seleção para marcar. Cobre CPF cifrado, CPF repetido (admin), esqueci minha senha, 2FA, código de recuperação, admin obrigado a ativar (`ADMIN_REQUIRE_2FA=true`), sessão de 12 h, auditoria, CSP e testes automáticos.
- Usa contas novas `@video.arrumae.invalid`: trocar o CPF de um profissional de demonstração aprovado o mandaria de volta para análise (sem documentos para reaprovar).
- Conferido antes: todas as consultas SQL rodaram no banco do E2E; os Testes 1 e 2 simulados no navegador (modo dev), sem erros; páginas do admin sem rolagem lateral no celular (390 px).
- `scripts/reset-2fa.ts`: e-mail inexistente agora mostra só a mensagem ("Conta não encontrada."), sem rastreamento de erro.

## 2026-10-31 — Skill de design para o Claude Code

- Adicionada a skill `design-taste-frontend` (Taste Skill, `Leonxlnx/taste-skill`) em `.claude/skills/`, para direção de arte nas páginas e telas. Código de terceiros, instalado com `npx skills add Leonxlnx/taste-skill`.
- `.claude/**` incluído nos ignores do ESLint, para os scripts `.mjs` da skill não entrarem no `npm run lint`.
