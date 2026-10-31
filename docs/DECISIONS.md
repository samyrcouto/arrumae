# Registro de decisões

Formato: contexto → decisão → consequências. Decisões reversíveis podem ser revistas com dados do piloto.

### D‑001 — Projeto novo, sem código a preservar (24/10/2026)
O ambiente estava vazio (sem repositório, código ou infraestrutura). Projeto criado do zero (pasta hoje chamada `arrumae/`), com Git local. **Não há remoto configurado** — o fundador precisa criar o repositório e fazer o push.

### D‑002 — Next.js + PostgreSQL próprio com Drizzle, em vez de Supabase completo
**Contexto:** o prompt sugeria Supabase (banco + auth + storage + RLS). O Docker não está disponível no ambiente (o Supabase local depende dele); havia PostgreSQL 16 instalado.
**Decisão:** PostgreSQL acessado só pelo servidor via Drizzle; autorização na camada de serviço + restrições/triggers no banco; autenticação própria; storage por adaptador.
**Consequências:** portável (Supabase pode ser usado só como Postgres gerenciado + Storage em `sa-east-1`); sem RLS como primeira barreira — compensado por todo acesso passar por serviços testados. Reavaliar Supabase Auth se login por telefone/OTP virar prioridade.

### D‑003 — Autenticação própria com sessões em banco
argon2id, token aleatório com hash no banco, cookie httpOnly. Prós: revogação imediata, zero custo, sem dependência. Contras: recuperação de senha e 2FA precisam ser construídos (no roadmap, antes do lançamento).

### D‑004 — `cacheComponents: false`
O Next 16 gera projetos com Cache Components ligado, o que exige `<Suspense>` em toda leitura de sessão. Como quase todas as páginas são autenticadas, desligado para reduzir complexidade. Reversível; reavaliar para acelerar landings de SEO.

### D‑005 — Estados como máquina pura + UPDATE condicional
Transições definidas num único mapa (`REQUEST_ACTIONS`) com papéis, relação com o registro e regras de horário. Aplicação via lock de linha + `WHERE status IN (...)`. Impede botões que "mudam estado livremente" e corridas (testado com aceites simultâneos).

### D‑006 — Piloto sem pagamentos integrados
Integrar split exige contrato, KYC, decisão fiscal (risco de responsabilidade solidária no IBS/CBS a partir de 2027) e testes de chargeback. Para validar demanda/oferta rápido, o pagamento é direto ao profissional; o sistema registra economia e status declarado, nunca simula pagamento real. Comissão calculada e marcada como **dispensada**. Candidato para a fase integrada: Asaas (ver BUSINESS.md).

### D‑007 — Modelo de receita: comissão sobre concluído, nunca por contato
A principal queixa documentada contra o líder de mercado é pagar por leads ruins. Comissão hipotética de 15%, configurável por categoria.

### D‑008 — 5 categorias, com ar‑condicionado como experimento sazonal
Critérios: frequência, urgência, padronização e risco. Ar‑condicionado entra pelo verão (pico nov–mar) e pode ser pausado no admin.

### D‑009 — Regiões por prefixo de CEP (3–5 dígitos), sem API de mapas
Evita custo e dependência no piloto. Prefixo mais longo vence. Prefixos iniciais de 3 dígitos são **aproximações** e precisam de validação com a base dos Correios. Recomendação: ativar só 2 regiões no início.

### D‑010 — Máximo de 4 propostas e 8 convites por pedido
Equilíbrio entre escolha do cliente e chance real de o profissional ser escolhido. Configurável no admin.

### D‑011 — Contato e endereço revelados só após agendamento
Protege o cliente, reduz desintermediação e mantém o registro do combinado dentro da plataforma. Mensagens anteriores ao agendamento têm telefone/e‑mail/links de mensageiro mascarados.

### D‑012 — Analytics próprio, sem terceiros nem pixels
Atende ao princípio de minimização da LGPD e evita banner complexo. Eventos de servidor (sem PII) sempre; navegação só com consentimento. Pixels de anúncios só se houver campanha aprovada e consentimento específico.

### D‑013 — Papel único por conta
Cliente e profissional usam contas separadas. Simplifica autorização no MVP.

### D‑014 — Verificação humana obrigatória
Nenhuma automação aprova profissional. Aprovação exige documento de identidade e comprovante de endereço aceitos. Não fazemos checagem de antecedentes e não prometemos isso.

### D‑015 — Nome do MVP: "Arrumaê"
O nome provisório "Desenrola Casa" foi trocado por **Arrumaê** a pedido do fundador (24/10/2026): marca, logo, ícone, textos, cookies, chaves de armazenamento local, nomes de banco e contas de demonstração. Centralizado em `src/config/brand.ts`. Ainda falta busca no INPI e verificação de domínio.

### D‑016 — Identidade visual: ilustração própria + telas reais, sem fotos de banco
Inspirado nos padrões do segmento (GetNinjas, Triider, Parafuzo: entrada por categoria no topo, cards de serviço com imagem, passos ilustrados, seção de confiança, chamada para profissionais), mas com identidade própria:
logo com o acento do "ê" virando telhado e símbolo de casinha cujo chão é uma trena; ilustrações SVG feitas para a marca (paleta azul‑petróleo, amarelo‑trena e terracota); telas **reais** do app em molduras de celular (dados DEMO, com legenda); seção "o que conferimos e o que ainda não fazemos".
Sem fotos de banco de imagens (genéricas e com licença a verificar) e sem números, avaliações ou depoimentos inventados. Próximo passo recomendado: fotos reais dos primeiros profissionais do piloto, com autorização de uso de imagem.
Personagens desenhados (25/10/2026), refeitos em estilo **semi-realista** a pedido do fundador (sem contorno, sombreado suave, proporções naturais, segurando a ferramenta como nos sites de referência), com diversidade de gênero, tom de pele e cabelo, sobre fundo de casinha (eco do logo). Roupas sem logo da marca: profissionais são autônomos, não funcionários (LEGAL.md §3). Selos flutuantes só com fatos verdadeiros ("Documentos conferidos pela equipe", "Sem taxa para ver os pedidos") — nunca notas ou contagens inventadas.

### D‑017 — Integrações por eventos (outbox + webhook assinado), nunca escrita direta no banco
**Contexto:** o fundador quer usar n8n e automações. Ferramentas de automação costumam ser ligadas direto ao banco, o que pularia a máquina de estados, as permissões e a auditoria.
**Decisão:** os serviços gravam eventos em `integration_events` na mesma transação da operação; um job os entrega por webhook com assinatura HMAC, re‑tentativas e painel em `/admin/integracoes`. Para leitura, uma API com token e views agregadas. Nenhuma integração escreve no banco ou muda status.
**Consequências:** entrega "pelo menos uma vez" e sem ordem garantida (o receptor usa o `id`); atraso de até um ciclo do job (5 min com o workflow agendador); payloads sem dados pessoais, o que limita o que a automação pode fazer sozinha — de propósito.

### D‑018 — Schema `reporting` com views sem dados pessoais + papel somente leitura
Relatórios (n8n, planilhas, BI) leem só views agregadas/pseudonimizadas; o papel `arrumae_reporting` não enxerga as tabelas originais. Dados de demonstração ficam de fora. Toda migration que criar view nova termina com o bloco de GRANT condicional.

### D‑019 — IA: chamada única com resposta estruturada, sugestão revisada por humano, rodando no app
Triagem, resumos e sugestões serão chamadas únicas ao modelo com JSON validado — não agentes autônomos — e o resultado aparece como sugestão para a equipe. Itens que leem texto de usuários rodam no app (controle de dados pessoais, custo e falhas), não no n8n. Só serão implementados quando os gatilhos em [AUTOMACOES.md](AUTOMACOES.md) forem atingidos e com autorização de gasto. Nunca aprova, paga, verifica ou resolve disputas.

### D‑020 — Segurança de conta: sessão no banco (sem JWT), TOTP próprio, CPF cifrado na aplicação, CSP com nonce
- **Sessão no banco, não JWT:** a sessão é cancelada na hora (suspensão, troca de senha, ativação do 2FA). Um JWT valeria até expirar. Admin tem sessão de 12 h.
- **2FA por TOTP (app autenticador), não SMS:** SMS custa por mensagem e é vulnerável a troca de chip. Implementação própria da RFC 6238 (poucas linhas, testada com os vetores oficiais) em vez de dependência; só o QR code usa biblioteca (`qrcode`). Obrigatório para admin em produção e homologação.
- **CPF/CNPJ cifrados pela aplicação** (AES-256-GCM, chave fora do banco), em vez de depender só da criptografia de disco do provedor: um dump ou backup vazado não expõe documentos. Índice cego (HMAC) para achar CPF repetido. Texto puro antigo é regravado no `db:migrate`.
- **CSP com nonce por requisição** no `proxy.ts`: viável porque todas as páginas já são dinâmicas (D‑004). Estilos inline continuam liberados (risco menor).
- Recuperação de quem perdeu o celular e os códigos: só por script no servidor (`npm run db:reset-2fa`), nunca por atendimento sem conferir identidade.

### D‑021 — Home remodelada: "o produto se mostra funcionando", com a identidade mantida
- Análise das páginas de GetNinjas, Triider e Parafuzo (PESQUISA-MERCADO.md §8) e direção de arte pela skill `design-taste-frontend` (direção "The product performs", herói "Fragment on a shaped stage", sorteio 560003893, paleta e fontes da marca mantidas).
- **Ideia:** o combinado, nossa promessa central, vira a peça viva do topo: a pessoa escreve o problema e o cartão "Seu combinado" se monta; o envio leva a `/pedir` com serviço e resumo preenchidos (`src/lib/service-match.ts`, também usado no servidor).
- **Identidade:** o palco do topo tem o canto recortado no telhado "^" do ê do logo; petróleo, amarelo-fita, papel e tinta; Bricolage + Inter servidas pelo site; profissionais ilustrados; faixa de trena.
- **Divergências da skill, de propósito:** sem fotos de banco (D‑016) e sem vídeo; a faixa de trena e a faixa de desenvolvimento usam gradiente (identidade); fundo "papel" mantido. O herói sorteado primeiro (frase gigante com controles de tipografia) foi trocado por não servir a um marketplace e por tirar o profissional ilustrado; a seção de "logos de clientes" virou "o que a equipe confere" (não temos clientes para mostrar).
- Inspetor da skill: de 13 falhas para 2 defendidas (poucas fotos, por D‑016; título coberto pelo aviso de cookies na primeira visita).
