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
