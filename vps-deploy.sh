#!/bin/bash
echo "=== Parando serviços antigos ==="
pm2 delete all || true
pm2 save --force || true
sudo docker rm -f $(sudo docker ps -aq) || true

echo "=== Limpando VPS ==="
rm -rf whatsapp-bulk whatsapp-bulk-backend docker-compose.yml deploy* delete_all.js cardapiozap

echo "=== Baixando Cardápio Digital do GitHub ==="
git clone https://github.com/icaroweasley/cardapiozap.git

cd cardapiozap/backend
echo "=== Configurando Backend ==="
npm install
npx prisma generate
npx prisma db push --accept-data-loss
npx prisma db seed
npm run build
pm2 start dist/index.js --name "cardapio-backend"

echo "=== Subindo Evolution API no Docker ==="
sudo docker-compose up -d

cd ../frontend
echo "=== Configurando Frontend ==="
npm install
npm run build
sudo npm install -g serve
pm2 start "serve -s dist -l 5173" --name "cardapio-frontend"

pm2 save
echo "=== DEPLOY CONCLUÍDO! ==="
