<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Contexto do projeto (para novas sessões)

- Leia primeiro `README.md`, `WORKLOG.md` e `docs/ROADMAP.md`.
- Regras de negócio e autorização ficam em `src/server/services/*`; nunca acesse o banco direto de páginas para escrever.
- Mudou o schema? `npm run db:generate` e commit da migration em `drizzle/`.
- Antes de concluir qualquer mudança: `npm run typecheck && npm run lint && npm test` (precisa de Postgres; ver README). Para fluxos de UI: `npm run test:e2e`.
- Não crie dados que pareçam reais (avaliações, profissionais, transações). Demonstração = `is_demo` + "[DEMO]".
- Atualize `WORKLOG.md` e o status em `docs/PRODUCT.md` ao terminar.
