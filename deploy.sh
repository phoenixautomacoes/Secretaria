#!/bin/bash
set -e

echo "==> Carregando variáveis..."
if [ ! -f .env ]; then
  echo "ERRO: arquivo .env não encontrado. Copie .env.example e preencha."
  exit 1
fi
source .env

echo "==> Subindo containers..."
docker compose up -d --build

echo "==> Aguardando backend iniciar..."
sleep 5

echo "==> Rodando seed inicial (apenas se banco estiver vazio)..."
docker compose exec -T backend node -e "
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.user.count().then(n => {
  if (n === 0) {
    console.log('Banco vazio — rodando seed...');
    require('child_process').execSync('npx prisma db seed', { stdio: 'inherit' });
  } else {
    console.log('Seed ignorado — banco já possui dados.');
  }
  process.exit(0);
}).catch(e => { console.error(e.message); process.exit(1); });
" 2>/dev/null || true

echo ""
echo "✅ Deploy concluído!"
echo "   Frontend: https://${APP_DOMAIN}"
echo "   Backend:  https://${API_DOMAIN}"
