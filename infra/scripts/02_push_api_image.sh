#!/usr/bin/env bash
# Build + push imagen next-drones-api a ECR de la cuenta actual.
#
# Variables opcionales:
#   NEXT_DRONES_API  ruta al repo next-drones-api (por defecto: hermano de aws2-workshop)
#   IMAGE_TAG        tag (default: latest)
set -euo pipefail

REGION="${AWS_REGION:-us-east-1}"
IMAGE_TAG="${IMAGE_TAG:-latest}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSHOP_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
DEFAULT_API="$(cd "${WORKSHOP_ROOT}/../next-drones-api" 2>/dev/null && pwd || true)"
API_ROOT="${NEXT_DRONES_API:-${DEFAULT_API}}"

[[ -n "${API_ROOT}" && -f "${API_ROOT}/Dockerfile" ]] || {
  echo "ERROR: No encuentro next-drones-api con Dockerfile." >&2
  echo "  Establece NEXT_DRONES_API=/ruta/al/repo" >&2
  exit 1
}

command -v aws >/dev/null || { echo "ERROR: falta aws CLI" >&2; exit 1; }
command -v docker >/dev/null || { echo "ERROR: falta docker" >&2; exit 1; }

ACCOUNT="$(aws sts get-caller-identity --region "${REGION}" --query Account --output text)"
REGISTRY="${ACCOUNT}.dkr.ecr.${REGION}.amazonaws.com"
IMAGE_URI="${REGISTRY}/next-drones-api:${IMAGE_TAG}"

echo "==> Login ECR"
aws ecr get-login-password --region "${REGION}" \
  | docker login --username AWS --password-stdin "${REGISTRY}"

echo "==> Build ${API_ROOT}"
docker build -t "next-drones-api:${IMAGE_TAG}" "${API_ROOT}"

echo "==> Push ${IMAGE_URI}"
docker tag "next-drones-api:${IMAGE_TAG}" "${IMAGE_URI}"
docker push "${IMAGE_URI}"
echo "Listo: ${IMAGE_URI}"
