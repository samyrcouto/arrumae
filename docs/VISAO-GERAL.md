# Visão geral do Arrumaê

Panorama para quem vai mexer no projeto: o que existe, com quais tecnologias, onde fica cada coisa e como mudar sem quebrar. Os detalhes estão nos outros documentos de `docs/` (links ao longo do texto).

## O que é e em que pé está

Marketplace de **pequenos reparos em casa**, com piloto em São Paulo. O cliente descreve o problema, até 4 profissionais aprovados mandam proposta com preço e horário, o cliente escolhe e acompanha tudo até a conclusão e a avaliação.

**Status (out/2026):** MVP funcional e testado, rodando só em ambiente local. **Nada está em produção**, não há cobrança real, e-mail real nem domínio. O que falta para lançar depende de contas e gastos que precisam da autorização do fundador ([ROADMAP.md](ROADMAP.md)).

| Em números | |
|---|---|
| Páginas | 40 (site público, área do cliente, do profissional e admin) |
| Tabelas no banco | 32, mais 6 views de relatório |
| Rotas de API | 5 (arquivos privados, exportar dados LGPD, cron, indicadores, analytics) |
| Testes | 57 automáticos (unidade e integração com banco real) + 1 teste de navegador do fluxo completo |
| Decisões registradas | 19 ([DECISIONS.md](DECISIONS.md)) |
| Código | ~11 mil linhas em `src/`, quase 50 commits |

## O que já foi feito

**Produto** ([PRODUCT.md](PRODUCT.md))
- **Cliente:** cadastro, pedido em etapas (serviço, descrição, fotos, CEP, urgência), comparação de propostas, escolha de horário, chat com o profissional, aprovação de aditivo de preço, confirmação, avaliação, contestação, suporte, exportar e excluir conta (LGPD).
- **Profissional:** cadastro com documentos e portfólio, envio para verificação, oportunidades da região, propostas (preço fechado ou visita técnica), agenda, início/conclusão do serviço, avaliações recebidas.
- **Admin:** indicadores, fila de verificação com análise de documentos, usuários, solicitações (cancelar, resolver contestação), avaliações, suporte, categorias e regiões, financeiro, cupons, configurações comerciais, integrações, auditoria.
- **Regras:** máquina de estados do pedido (aberto → agendado → em andamento → aguardando confirmação → concluído, além de cancelado, expirado e contestado); contato e endereço só liberados após o agendamento; no máximo 4 propostas e 8 convites por pedido; pedido expira em 72 h; confirmação automática em 72 h; comissão de 15% configurada, mas **dispensada no piloto**.

**Segurança** ([SECURITY.md](SECURITY.md)): senhas com argon2id, sessões no banco, autorização por papel e por dono do registro em todo serviço, proteção contra corrida (trava de linha e UPDATE condicional), rate limit, uploads re-codificados (sem EXIF/GPS), cabeçalhos e CSP, auditoria append-only no próprio banco.

**Visual** ([DECISIONS.md](DECISIONS.md) D-015/D-016): marca Arrumaê (logo com telhado no "ê"), paleta própria, ilustrações SVG feitas para o projeto (5 serviços, cena da sala, profissionais semi-realistas com ferramentas e cenários de sala e cozinha) e telas reais do app em molduras de celular.

**Integrações** ([AUTOMACOES.md](AUTOMACOES.md)): eventos para o n8n por webhook assinado, API de leitura de indicadores, relatórios SQL sem dados pessoais, 3 workflows prontos e plano de agentes de IA (nada de IA ligado).

**Entrega e ambiente:** repositório no GitHub, vitrine com capturas de todas as telas no GitHub Pages, configuração do GitHub Codespaces, passo a passo para Windows no README.

## Tecnologias

| Camada | Tecnologia | Versão | Por quê / observação |
|---|---|---|---|
| Linguagem | TypeScript | 5 | Tipos em todo o projeto (`npm run typecheck`) |
| Site e servidor | Next.js (App Router, Server Actions) | 16.4.3 | Um só projeto para telas e backend. **Versão nova, com mudanças em relação ao que se encontra na internet:** consulte `node_modules/next/dist/docs/` antes de mexer (aviso no `AGENTS.md`) |
| Interface | React | 19.3 | — |
| Estilo | Tailwind CSS | 4 | Cores e fontes como variáveis em `src/app/globals.css` |
| Fontes | Bricolage Grotesque (títulos) e Inter (texto) | via fontsource | Servidas pelo próprio site, sem Google Fonts |
| Banco | PostgreSQL | 16+ (testado em 16 e 18) | Regras de integridade e triggers no banco |
| Acesso ao banco | Drizzle ORM + driver `postgres` | 0.45 | Schema em TypeScript; migrations SQL versionadas em `drizzle/` |
| Validação | Zod | 4 | Formulários e entradas de API |
| Senhas | argon2id (`@node-rs/argon2`) | 2 | — |
| Imagens | sharp | 0.35 | Re-codifica uploads para WebP, sem metadados |
| Testes | Vitest e Playwright | 5 / 1.63 | Unidade/integração com banco real; navegador real no fluxo completo e na vitrine |
| Automação | n8n (externo) | testado na 1.123 | Workflows em `integrations/n8n/` |
| Hospedagem | — | — | Nada contratado. Recomendação em [ARCHITECTURE.md](ARCHITECTURE.md#hospedagem-recomendação-nada-contratado) |

Fora do projeto, de propósito: Supabase Auth, Stripe/Asaas, provedor de e-mail, Google Analytics, pixels e qualquer IA. Tudo isso entra pelos adaptadores quando for autorizado.

## Mapa do código

```
src/
  app/                 páginas e rotas (cada pasta = um endereço do site)
    admin/ cliente/ profissional/ ...   áreas logadas
    api/               rotas de API (cron, integrações, analytics, LGPD)
    globals.css        cores, fontes e estilos base (tokens da marca)
  components/          peças de tela
    people.tsx         personagens (profissionais), poses, mãos e ferramentas
    scenes.tsx         cenários de sala e cozinha
    illustrations.tsx  ilustrações dos serviços e da cena da home
    brand/logo.tsx     logo
    ui.tsx form.tsx    botões, cartões, campos
  config/brand.ts      nome, slogan, e-mail de suporte, cores
  lib/                 utilidades (datas, CPF/CEP, textos de status)
  server/
    services/          REGRAS DE NEGÓCIO (pedidos, propostas, avaliações, admin, integrações...)
    domain/            máquina de estados, dinheiro, mascaramento de contato, erros
    actions/           Server Actions (ligam os formulários aos serviços)
    db/schema.ts       todas as tabelas
    adapters/          e-mail, armazenamento de arquivos, pagamentos (trocáveis)
    auth/ security/    sessão, senha, rate limit, uploads, token
  proxy.ts             proteção de rotas (o antigo "middleware")
drizzle/               migrations SQL (nunca editar uma já aplicada)
scripts/               migrate, seed, criar admin, jobs, vitrine, SQL de papéis
tests/                 unit/, integration/ (banco de teste), e2e/ (navegador)
integrations/n8n/      workflows prontos do n8n
docs/                  documentação
```

## Onde mexer para…

| Quero… | Arquivo(s) |
|---|---|
| Trocar nome, slogan, e-mail de suporte | `src/config/brand.ts` |
| Trocar cores ou fontes | `src/app/globals.css` (e as cores espelhadas em `brand.ts`) |
| Mudar o logo | `src/components/brand/logo.tsx` e `public/icon.svg` |
| Mudar textos da home | `src/app/page.tsx` |
| Mudar personagens, poses ou cenários | `src/components/people.tsx` (`TRADES`, `POSES`) e `src/components/scenes.tsx` |
| Mudar ilustrações dos serviços | `src/components/illustrations.tsx` |
| Adicionar ou editar serviços e regiões | painel `/admin/catalogo` (dados); categorias iniciais em `scripts/seed.ts` |
| Mudar comissão, limite de propostas, prazos | painel `/admin/configuracoes` (padrões em `src/server/services/settings.ts`) |
| Mudar regras do pedido (quem pode fazer o quê e quando) | `src/server/domain/request-lifecycle.ts` + `src/server/services/requests.ts` |
| Adicionar um campo ou tabela | `src/server/db/schema.ts` → `npm run db:generate` → commit da migration em `drizzle/` |
| Criar uma página | nova pasta em `src/app/` com `page.tsx` |
| Ligar e-mail real, storage na nuvem ou pagamento | `src/server/adapters/*` + variável no `.env` ([ARCHITECTURE.md](ARCHITECTURE.md#trocar-provedores)) |
| Novo evento para o n8n | `INTEGRATION_EVENT_TYPES` + `emitIntegrationEvent` em `src/server/services/integrations.ts` |
| Textos legais | `src/app/termos`, `src/app/privacidade`, `src/config/legal.ts` (precisam de revisão de advogado) |

## Regras para mudar sem quebrar

1. **Regra de negócio só em `src/server/services/*`.** Páginas e formulários chamam os serviços; nunca escrevem direto no banco. Esconder um botão não protege nada: o serviço é quem confere permissão.
2. **Mudou o banco?** Edite `schema.ts`, rode `npm run db:generate` e faça commit da migration gerada. Nunca edite uma migration que já rodou.
3. **Antes de concluir:** `npm run typecheck`, `npm run lint` e `npm test` (precisam do Postgres). Mexeu em tela ou fluxo? Rode também `npm run test:e2e`.
4. **Nada de dados que pareçam reais.** Avaliações, profissionais, números e depoimentos de exemplo só com `is_demo` e a marca "[DEMO]". Selos e textos de marketing só com fatos verdadeiros.
5. **Segredos nunca no código nem no GitHub.** Tudo em `.env.local`, que não é enviado ao repositório. Use o `.env.example` como modelo.
6. **Registre o que fez** em `WORKLOG.md` e, se mudar o status de uma funcionalidade, em `docs/PRODUCT.md`.
7. **Next.js 16 é novo:** antes de usar uma API do Next, confira a documentação que vem em `node_modules/next/dist/docs/`.

## Como rodar e ver

- No computador: passo a passo no [README](../README.md) (Windows, Linux/Mac).
- Sem instalar nada: GitHub Codespaces (README) ou a vitrine com as capturas de todas as telas: https://samyrcouto.github.io/arrumae/
- Contas de demonstração: `cliente@demo.arrumae.invalid`, `pro1@demo.arrumae.invalid` e `admin@demo.arrumae.invalid`, todas com a senha `demo-senha-123`.

## O que falta (resumo)

Detalhes e ordem em [ROADMAP.md](ROADMAP.md):
- **Técnico, sem custo:** "esqueci minha senha", verificação em duas etapas para admins, armazenamento de arquivos na nuvem, monitoramento de erros.
- **Depende do fundador:** hospedagem e banco gerenciado, domínio e busca no INPI, provedor de e-mail, revisão jurídica, contador, n8n online, recrutamento dos primeiros profissionais.
- **Depois do piloto:** pagamento pela plataforma, IA, mais serviços e regiões, app de celular.
