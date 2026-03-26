#!/usr/bin/env bash
set -euo pipefail

DOMAIN="${1:?usage: ./run.sh your.domain.com your@email.com}"
EMAIL="${2:?usage: ./run.sh your.domain.com your@email.com}"
DOCKER_PORT=9876
IMAGE_NAME="civil-proxy"
CONTAINER_NAME="civil-proxy"

if [ "$(id -u)" -ne 0 ]; then
  echo "error: must be run as root"
  exit 1
fi

echo "installing dependencies..."
apt-get update -qq
apt-get install -y \
  docker.io \
  nginx \
  certbot \
  python3-certbot-nginx \
  git \
  curl

echo "configuring docker..."
systemctl enable docker
systemctl start docker

echo "building docker image..."
docker build -t "${IMAGE_NAME}" .

echo "stopping existing container if running..."
docker rm -f "${CONTAINER_NAME}" 2>/dev/null || true

echo "starting docker container..."
docker run -d \
  --name "${CONTAINER_NAME}" \
  --restart unless-stopped \
  -p "127.0.0.1:${DOCKER_PORT}:${DOCKER_PORT}" \
  -e REVERSE_PROXY=true \
  "${IMAGE_NAME}"

echo "waiting for container to be ready..."
for i in $(seq 1 30); do
  if curl -sf "http://127.0.0.1:${DOCKER_PORT}" > /dev/null 2>&1; then
    echo "container is ready"
    break
  fi
  if [ "${i}" -eq 30 ]; then
    echo "error: container did not become ready in time"
    docker logs "${CONTAINER_NAME}"
    exit 1
  fi
  sleep 1
done

echo "configuring nginx..."
cat > /etc/nginx/sites-available/civil <<EOF
server {
    listen 80;
    server_name ${DOMAIN};

    location / {
        proxy_pass http://127.0.0.1:${DOCKER_PORT};
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 86400;
        proxy_send_timeout 86400;
    }
}
EOF

ln -sf /etc/nginx/sites-available/civil /etc/nginx/sites-enabled/civil
rm -f /etc/nginx/sites-enabled/default

nginx -t
systemctl enable nginx
systemctl restart nginx

echo "obtaining ssl certificate..."
certbot --nginx \
  -d "${DOMAIN}" \
  --email "${EMAIL}" \
  --agree-tos \
  --non-interactive \
  --redirect

echo "enabling certbot auto-renewal..."
systemctl enable certbot.timer
systemctl start certbot.timer

echo ""
echo "done. civil proxy is live at https://${DOMAIN}"
echo "container status:"
docker ps --filter "name=${CONTAINER_NAME}"