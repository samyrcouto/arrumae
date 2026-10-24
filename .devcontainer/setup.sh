#!/usr/bin/env bash
# Preparação do Codespace (roda uma vez, na criação).
set -euo pipefail

npm install

if [ ! -f .env.local ]; then
  cp .env.example .env.local
  # Segredo aleatório só para este ambiente de desenvolvimento.
  sed -i "s|^APP_SECRET=.*|APP_SECRET=$(node -e 'console.log(require("crypto").randomBytes(32).toString("hex"))')|" .env.local
fi

# Espera o PostgreSQL ficar pronto antes das migrations.
for i in $(seq 1 30); do
  if npm run -s db:migrate; then break; fi
  echo "Aguardando o banco ficar pronto ($i/30)…"; sleep 2
done
npm run -s db:migrate:test
npm run -s db:seed -- --demo

echo
echo "✅ Pronto! O site abre sozinho na porta 3000 (aba PORTS)."
echo "   Contas de demonstração: senha demo-senha-123 — ver README."
