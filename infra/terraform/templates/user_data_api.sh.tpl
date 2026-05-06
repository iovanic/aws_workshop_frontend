#!/bin/bash
set -euxo pipefail
exec >>/var/log/workshop-user-data-api.log 2>&1
REGION="${region}"
REGISTRY="${registry}"
IMAGE_URI="${image_uri}"
DATABASE_URL="${database_url}"

dnf update -y -q
dnf install -y docker
command -v aws >/dev/null 2>&1 || dnf install -y aws-cli
systemctl enable docker
systemctl start docker
until docker info >/dev/null 2>&1; do sleep 2; done

aws ecr get-login-password --region "$REGION" \
  | docker login --username AWS --password-stdin "$REGISTRY"

docker pull "$IMAGE_URI"
docker rm -f next-drones-api 2>/dev/null || true
docker run -d --name next-drones-api --restart unless-stopped \
  -p 8000:8000 \
  -e DATABASE_URL="$DATABASE_URL" \
  "$IMAGE_URI"

for _ in $(seq 1 45); do
  if curl -fsS "http://127.0.0.1:8000/health" >/dev/null 2>&1; then
    break
  fi
  sleep 2
done

docker exec next-drones-api python -m app.seed || true
