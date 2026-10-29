# Segurança

## Controles implementados (e onde)

| Risco | Controle | Onde | Testado |
|---|---|---|---|
| Senhas vazadas | argon2id (m=19 MiB, t=2), política mínima, lista de senhas comuns; tempo de resposta equalizado para e‑mail inexistente | `auth/password.ts`, `services/accounts.ts` | sim |
| Roubo de sessão | Token de 256 bits; banco guarda só o hash; cookie `httpOnly`, `SameSite=Lax`, `Secure` em produção; expiração deslizante de 30 dias (**12 h para admin**); troca/redefinição de senha e suspensão derrubam sessões | `auth/session.ts`, `services/accounts.ts` | sim |
| Senha descoberta por terceiros | **Verificação em duas etapas (TOTP, RFC 6238)**: obrigatória para admin em produção/homologação (`ADMIN_REQUIRE_2FA`), opcional para os demais. Segredo cifrado; código vale uma vez (sem reuso); 10 códigos de recuperação de uso único guardados como HMAC; desafio de login com validade de 10 min e no máximo 5 tentativas; ativar encerra as outras sessões; admin sem 2FA obrigatório não age em lugar nenhum (`toActor`) | `services/mfa.ts`, `security/totp.ts`, `auth/session.ts` | sim (unidade com vetores da RFC + integração + E2E) |
| Recuperação de conta | "Esqueci minha senha" com token de 256 bits, só o hash no banco, 30 min, uso único (UPDATE condicional), pedir de novo invalida o anterior; mesma resposta exista ou não a conta; link nunca gravado em `outbound_messages`; página sem `Referer`; redefinir derruba todas as sessões e avisa por e-mail. Sem celular e sem códigos: `npm run db:reset-2fa` (só com acesso ao servidor, auditado) | `services/password-reset.ts`, `adapters/email.ts` | sim (integração + E2E) |
| Vazamento do banco (backup, dump, leitura indevida) | **CPF/CNPJ e segredo do 2FA cifrados pela aplicação** (AES-256-GCM, IV aleatório, contexto da coluna como dado autenticado) com `DATA_ENCRYPTION_KEY` fora do banco, obrigatória e diferente do `APP_SECRET` em produção; troca de chave com `DATA_ENCRYPTION_KEY_PREVIOUS` + `npm run db:encrypt-pii`; índice cego (HMAC) do CPF mostra ao admin cadastros com o mesmo CPF sem decifrar | `security/field-crypto.ts`, `services/pro-pii.ts`, `services/encryption.ts` | sim |
| Acesso a dados de outros usuários (IDOR) | Toda leitura/escrita passa por serviço que recebe o `Actor` e verifica papel **e** propriedade; recursos inacessíveis retornam 404 (não revelam existência) | `services/*` | sim |
| Escalada de privilégio | Admin só no serviço; layout/páginas/actions admin checam papel; profissional não altera verificação, avaliações nem financeiro | `services/admin.ts`, `app/admin/*` | sim |
| Vazamento de contato antes do acordo | Endereço, CEP completo, telefone e id do cliente ocultos para profissionais não designados; contatos mascarados em mensagens e propostas | `services/requests.ts`, `domain/contact-masking.ts` | sim |
| Operações fora de ordem / corrida | Máquina de estados + `SELECT FOR UPDATE` + UPDATE condicional | `domain/request-lifecycle.ts`, `services/requests.ts`, `services/quotes.ts` | sim (inclui aceite concorrente) |
| Duplicidade | Token de submissão, chaves únicas e idempotência de pagamento | schema | sim |
| CSRF | Server Actions verificam Origin×Host (Next); rotas `/api/*` mutáveis exigem Origin igual ao host (`proxy.ts`); cookies `SameSite=Lax` | `src/proxy.ts` | sim (manual) |
| Open redirect | `safePath()` só aceita caminhos internos em `next`/`returnTo` | `actions/run.ts` | — |
| Força bruta / abuso | Rate limit no Postgres: login (IP e e‑mail), cadastro, pedidos, propostas, mensagens, uploads, chamados, analytics | `security/rate-limit.ts` | sim |
| Upload malicioso | Tipo detectado por *magic bytes*; imagens re‑codificadas para WebP (remove EXIF/GPS e payloads), limite de pixels; PDFs com JavaScript/Launch/EmbeddedFile recusados; tamanho máx. 8 MB; chaves de armazenamento validadas (sem path traversal); arquivos servidos com `nosniff`, CSP `sandbox` e `attachment` para PDF | `security/uploads.ts`, `adapters/storage.ts`, `app/arquivos` | sim |
| XSS | React escapa conteúdo; nenhum `dangerouslySetInnerHTML`; **CSP com nonce novo por requisição** (`script-src 'self' 'nonce-…' 'strict-dynamic'`, sem `'unsafe-inline'` em scripts), `default-src 'self'`, `frame-ancestors 'none'`, `object-src 'none'` | `src/proxy.ts` | sim (E2E confere o cabeçalho e zero erros no navegador) |
| Clickjacking / sniffing | `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`, HSTS em produção | `next.config.ts` | — |
| Adulteração de registros | `audit_logs` append‑only e conteúdo de avaliações imutável por trigger; acesso a CPF/documentos pelo admin é auditado | migration `0001` | sim |
| Vazamento em logs | Erros inesperados logados só com nome/mensagem truncada; driver de e‑mail não loga conteúdo; analytics sem IP/PII | `actions/run.ts`, `adapters/email.ts` | — |
| Segredos | Validação de env na inicialização; `APP_SECRET` de dev bloqueado em produção; `.env*` no `.gitignore` (exceto `.env.example`) | `server/env.ts` | — |
| Rota de cron | Segredo ≥ 32 caracteres, comparação em tempo constante; sem segredo → 503 | `api/cron/maintenance`, `security/bearer.ts` | sim (manual: 401 sem token) |
| Integrações (n8n) | Eventos sem dados pessoais (teste verifica); webhook assinado com HMAC‑SHA256 sobre timestamp + corpo, recusa > 5 min; `https` obrigatório em produção; sem seguir redirecionamentos; API de leitura com token ≥ 32 caracteres, rate limit e só views agregadas; nenhuma integração escreve no banco | `services/integrations.ts`, `api/integrations/v1/*` | sim |
| Relatórios por SQL | Papel `arrumae_reporting` só lê o schema `reporting` (views sem PII), transações somente leitura, 3 conexões, 15 s por consulta | `scripts/sql/reporting-role.sql`, migration `0003` | sim (manual: "permission denied" em `users`) |
| Indexação indevida | `robots.txt` bloqueia tudo fora de produção e áreas privadas em produção | `app/robots.ts` | — |

## Riscos conhecidos e pendências

| Item | Risco | Ação |
|---|---|---|
| IP de cliente vem de `X-Forwarded-For` quando `TRUSTED_IP_HEADER` não está definido | Falsificável se o app não estiver atrás de proxy confiável → contorna rate limit por IP (o limite por e‑mail continua) | **Em produção, definir `TRUSTED_IP_HEADER`** com o cabeçalho do provedor (ex.: `x-vercel-forwarded-for`, `cf-connecting-ip`) |
| Estilos inline liberados na CSP (`style-src 'unsafe-inline'`) | Injeção de CSS (bem menos grave que script) | Aceito por ora; scripts já exigem nonce |
| E-mail ainda não sai de verdade (`EMAIL_DRIVER=console`) | "Esqueci minha senha" só funciona com provedor de e-mail | Ligar Resend/SES com domínio verificado (**requer autorização**) |
| Chave `DATA_ENCRYPTION_KEY` | Perder a chave = perder os CPFs gravados; vazar a chave junto com o banco = expor os CPFs | Guardar em cofre de senhas e nas variáveis do provedor, nunca no repositório; trocar se houver suspeita |
| Sem antivírus em uploads | PDFs maliciosos não detectados pelas regras simples | ClamAV/serviço do storage, ou aceitar só imagens |
| Arquivos órfãos | Falha após gravar arquivo e antes do commit (tratado com limpeza no `catch`, mas um crash do processo deixa sobra) | Job de varredura de órfãos |
| Dependências dev com aviso (`drizzle-kit` → `esbuild` antigo, GHSA‑67mh‑4wv8‑2f99) | Afeta só o servidor de dev do esbuild, que não é usado | Acompanhar atualização do drizzle-kit |
| Papel único por conta | Profissional que também quer contratar precisa de outra conta | Aceitável no MVP |
| Monitoramento | Sem alertas | Ver checklist de lançamento (Sentry/uptime) |

## Como reportar/verificar

- `npm test` cobre os controles marcados como testados (79 testes).
- `npm run test:e2e` cobre o fluxo real no navegador, incluindo 404 para profissional não convidado, redirecionamento para `/sem-permissao` quando um cliente abre `/admin` e 404 para arquivo de foto sem sessão.
- Revisão de segurança recomendada antes de cada release com mudança em `services/` ou `actions/`.
