#!/usr/bin/env bash
# Crea repositorios ECR para frontend y API (idempotente).
# Restricción taller: us-east-1 explícito.
set -euo pipefail

REGION="${AWS_REGION:-us-east-1}"

create_repo() {
  local name="$1"
  if aws ecr describe-repositories --region "${REGION}" --repository-names "${name}" &>/dev/null; then
    echo "ECR ya existe: ${name}"
    return 0
  fi
  aws ecr create-repository --region "${REGION}" \
    --repository-name "${name}" \
    --image-scanning-configuration scanOnPush=true \
    --encryption-configuration encryptionType=AES256
  echo "ECR creado: ${name}"
}

create_repo "next-drones-frontend"
create_repo "next-drones-api"
echo "Listo."
