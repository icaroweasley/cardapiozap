#!/bin/bash

echo "=== Instalando Nginx e Certbot ==="
sudo apt-get update
sudo apt-get install -y nginx certbot python3-certbot-nginx

echo "=== Criando arquivo de configuração do Nginx ==="
cat << 'EOF' | sudo tee /etc/nginx/sites-available/zapgarcom
server {
    server_name zapgarcom.com.br www.zapgarcom.com.br;
    client_max_body_size 50M;

    location / {
        proxy_pass http://localhost:5173;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

server {
    server_name api.zapgarcom.com.br;
    client_max_body_size 50M;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

echo "=== Ativando o site ==="
sudo ln -sf /etc/nginx/sites-available/zapgarcom /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx

echo "=== Gerando Certificado SSL (Cadeado Verde HTTPS) ==="
# Substitua o e-mail pelo seu se quiser receber avisos de renovação
sudo certbot --nginx -d zapgarcom.com.br -d www.zapgarcom.com.br -d api.zapgarcom.com.br --non-interactive --agree-tos -m admin@zapgarcom.com.br --redirect

echo "=== TUDO PRONTO! Seu domínio está seguro e apontado. ==="
