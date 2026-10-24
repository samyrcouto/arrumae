# Segurança

## Controles implementados (e onde)

| Risco | Controle | Onde | Testado |
|---|---|---|---|
| Senhas vazadas | argon2id (m=19 MiB, t=2), política mínima, lista de senhas comuns; tempo de resposta equalizado para e‑mail inexistente | `auth/password.ts`, `services/accounts.ts` | sim |
| Roubo de sessão | Token de 256 bits; banco guarda só o hash; cookie `httpOnly`, `SameSite=Lax`, `Secure` em produção; expiração deslizante 30 dias; troca de senha e suspensão derrubam sessões | `auth/session.ts`, `services/accounts.ts` | sim |
| Acesso a dados de outros usuários (IDOR) | Toda leitura/escrita passa por serviço que recebe o `Actor` e verifica papel **e** propriedade; recursos inacessíveis retornam 404 (não revelam existência) | `services/*` | sim |
| Escalada de privilégio | Admin só no serviço; layout/páginas/actions admin checam papel; profissional não altera verificação, avaliações nem financeiro | `services/admin.ts`, `app/admin/*` | sim |
| Vazamento de contato antes do acordo | Endereço, CEP completo, telefone e id do cliente ocultos para profissionais não designados; contatos mascarados em mensagens e propostas | `services/requests.ts`, `domain/contact-masking.ts` | sim |
| Operações fora de ordem / corrida | Máquina de estados + `SELECT FOR UPDATE` + UPDATE condicional | `domain/request-lifecycle.ts`, `services/requests.ts`, `services/quotes.ts` | sim (inclui aceite concorrente) |
| Duplicidade | Token de submissão, chaves únicas e idempotência de pagamento | schema | sim |
| CSRF | Server Actions verificam Origin×Host (Next); rotas `/api/*` mutáveis exigem Origin igual ao host (`proxy.ts`); cookies `SameSite=Lax` | `src/proxy.ts` | sim (manual) |
| Open redirect | `safePath()` só aceita caminhos internos em `next`/`returnTo` | `actions/run.ts` | — |
| Força bruta / abuso | Rate limit no Postgres: login (IP e e‑mail), cadastro, pedidos, propostas, mensagens, uploads, chamados, analytics | `security/rate-limit.ts` | sim |
| Upload malicioso | Tipo detectado por *magic bytes*; imagens re‑codificadas para WebP (remove EXIF/GPS e payloads), limite de pixels; PDFs com JavaScript/Launch/EmbeddedFile recusados; tamanho máx. 8 MB; chaves de armazenamento validadas (sem path traversal); arquivos servidos com `nosniff`, CSP `sandbox` e `attachment` para PDF | `security/uploads.ts`, `adapters/storage.ts`, `app/arquivos` | sim |
| XSS | React escapa conteúdo; nenhum `dangerouslySetInnerHTML`; CSP restritiva (`default-src 'self'`, `frame-ancestors 'none'`, `object-src 'none'`) | `next.config.ts` | — |
| Clickjacking / sniffing | `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`, HSTS em produção | `next.config.ts` | — |
| Adulteração de registros | `audit_logs` append‑only e conteúdo de avaliações imutável por trigger; acesso a CPF/documentos pelo admin é auditado | migration `0001` | sim |
| Vazamento em logs | Erros inesperados logados só com nome/mensagem truncada; driver de e‑mail não loga conteúdo; analytics sem IP/PII | `actions/run.ts`, `adapters/email.ts` | — |
| Segredos | Validação de env na inicialização; `APP_SECRET` de dev bloqueado em produção; `.env*` no `.gitignore` (exceto `.env.example`) | `server/env.ts` | — |
| Rota de cron | Segredo ≥ 32 caracteres, comparação em tempo constante; sem segredo → 503 | `api/cron/maintenance` | — |
| Indexação indevida | `robots.txt` bloqueia tudo fora de produção e áreas privadas em produção | `app/robots.ts` | — |

## Riscos conhecidos e pendências

| Item | Risco | Ação |
|---|---|---|
| IP de cliente vem de `X-Forwarded-For` | Falsificável se o app não estiver atrás de proxy confiável → contorna rate limit por IP (o limite por e‑mail continua) | Em produção, confiar apenas no header do provedor (ex.: `x-vercel-forwarded-for`) |
| CSP com `'unsafe-inline'` em scripts | Reduz proteção contra XSS | Migrar para nonces quando houver CDN/edge |
| Sem 2FA para admin | Comprometimento de conta admin | Obrigatório antes do lançamento: TOTP para admins ou SSO |
| Sem recuperação de senha | Suporte manual pode ser explorado por engenharia social | Implementar reset por e‑mail com token de uso único e expiração curta |
| Sem antivírus em uploads | PDFs maliciosos não detectados pelas regras simples | ClamAV/serviço do storage, ou aceitar só imagens |
| Arquivos órfãos | Falha após gravar arquivo e antes do commit (tratado com limpeza no `catch`, mas um crash do processo deixa sobra) | Job de varredura de órfãos |
| Dependências dev com aviso (`drizzle-kit` → `esbuild` antigo, GHSA‑67mh‑4wv8‑2f99) | Afeta só o servidor de dev do esbuild, que não é usado | Acompanhar atualização do drizzle-kit |
| Papel único por conta | Profissional que também quer contratar precisa de outra conta | Aceitável no MVP |
| Monitoramento | Sem alertas | Ver checklist de lançamento (Sentry/uptime) |

## Como reportar/verificar

- `npm test` cobre os controles marcados como testados (49 testes).
- `npm run test:e2e` cobre o fluxo real no navegador, incluindo 404 para profissional não convidado, redirecionamento para `/sem-permissao` quando um cliente abre `/admin` e 404 para arquivo de foto sem sessão.
- Revisão de segurança recomendada antes de cada release com mudança em `services/` ou `actions/`.
