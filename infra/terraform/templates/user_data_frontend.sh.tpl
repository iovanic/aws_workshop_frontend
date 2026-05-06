#!/bin/bash
# Bump frontend_deploy_revision in Terraform after pushing a new ECR image so this user_data changes and the instance is replaced (user_data_replace_on_change).
# deploy-revision: ${deploy_revision}
set -euxo pipefail
exec >>/var/log/workshop-user-data-frontend.log 2>&1
REGION="${region}"
REGISTRY="${registry}"
IMAGE_URI="${image_uri}"
SERVER_FASTAPI_ORIGIN="${server_fastapi_origin}"
NEXT_PUBLIC_API_GW_URL="${next_public_api_gw_url}"
NEXT_PUBLIC_COGNITO_USER_POOL_ID="${next_public_cognito_user_pool_id}"
NEXT_PUBLIC_COGNITO_CLIENT_ID="${next_public_cognito_client_id}"

dnf update -y -q
dnf install -y docker
command -v aws >/dev/null 2>&1 || dnf install -y aws-cli
systemctl enable docker
systemctl start docker
until docker info >/dev/null 2>&1; do sleep 2; done

aws ecr get-login-password --region "$REGION" \
  | docker login --username AWS --password-stdin "$REGISTRY"

docker pull "$IMAGE_URI"
docker rm -f next-drones-frontend 2>/dev/null || true
docker run -d --name next-drones-frontend --restart unless-stopped \
  --pull always \
  -p 3000:3000 \
  -e SERVER_FASTAPI_ORIGIN="$SERVER_FASTAPI_ORIGIN" \
  -e NEXT_PUBLIC_API_GW_URL="$NEXT_PUBLIC_API_GW_URL" \
  -e NEXT_PUBLIC_COGNITO_USER_POOL_ID="$NEXT_PUBLIC_COGNITO_USER_POOL_ID" \
  -e NEXT_PUBLIC_COGNITO_CLIENT_ID="$NEXT_PUBLIC_COGNITO_CLIENT_ID" \
  "$IMAGE_URI"
