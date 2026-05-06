#!/usr/bin/env bash
# Sprint 1 — ECR + EC2 + Docker (Next.js frontend en instancia pública)
#
# Restricción taller (AWS Academy): no crear IAM; usar un instance profile que
# el lab ya proporcione (permisos de lectura ECR en la instancia). En tu terminal
# solo necesitas credenciales habituales para ECR push y EC2 API.
#
# Requisitos locales: aws CLI, docker, región us-east-1.
#
# Variables opcionales:
#   EC2_INSTANCE_TYPE   (default: t3.micro)
#   EC2_KEY_NAME        nombre del key pair (opcional; sin él no podrás SSH con clave)
#   EC2_IAM_INSTANCE_PROFILE  nombre del instance profile del lab (recomendado).
#                          Sin perfil, la instancia no podrá hacer get-login-password a ECR;
#                          tendrías que autenticar/pull manualmente por SSH (no cubierto aquí).
#   PUBLIC_CIDR         CIDR para 22 y 3000 (default 0.0.0.0/0)
#
# --- Comandos manuales si algo es interactivo o falla ---
#
# 1) Sesión AWS en tu portátil (SSO, MFA, etc.):
#    aws sts get-caller-identity --region us-east-1
#
# 2) Login en ECR desde tu máquina (si docker push falla por no estar logueado):
#    ACCOUNT_ID=$(aws sts get-caller-identity --region us-east-1 --query Account --output text)
#    aws ecr get-login-password --region us-east-1 \
#      | docker login --username AWS --password-stdin "${ACCOUNT_ID}.dkr.ecr.us-east-1.amazonaws.com"
#
# 3) Si la instancia no tiene instance profile con permisos ECR, enlázalo en la
#    consola EC2 (el laboratorio suele ofrecer uno predefinido) o pide al instructor.
#
set -euo pipefail

REGION="us-east-1"
REPO_NAME="next-drones-frontend"
IMAGE_TAG="${IMAGE_TAG:-latest}"
SG_NAME="sprint1-next-drones-ec2-sg"
INSTANCE_TYPE="${EC2_INSTANCE_TYPE:-t3.micro}"
PUBLIC_CIDR="${PUBLIC_CIDR:-0.0.0.0/0}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

export AWS_DEFAULT_REGION="${AWS_DEFAULT_REGION:-${REGION}}"

info() { printf '%s\n' "$*" >&2; }
die() { info "ERROR: $*"; exit 1; }

need_cmd() { command -v "$1" >/dev/null 2>&1 || die "Falta el comando: $1"; }

need_cmd aws
need_cmd docker

ACCOUNT_ID="$(aws sts get-caller-identity --region "${REGION}" --query Account --output text)"
[[ -n "${ACCOUNT_ID}" && "${ACCOUNT_ID}" != "None" ]] || die "No se pudo obtener Account Id (¿credenciales AWS?)"

REGISTRY="${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com"
IMAGE_URI="${REGISTRY}/${REPO_NAME}:${IMAGE_TAG}"

info "==> ECR: repositorio ${REPO_NAME}"
if ! aws ecr describe-repositories --region "${REGION}" --repository-names "${REPO_NAME}" &>/dev/null; then
  aws ecr create-repository --region "${REGION}" --repository-name "${REPO_NAME}" \
    --image-scanning-configuration scanOnPush=true \
    --encryption-configuration encryptionType=AES256
  info "Repositorio creado."
else
  info "Repositorio ya existe (idempotente)."
fi

info "==> Docker: build (contexto: ${REPO_ROOT})"
(
  cd "${REPO_ROOT}"
  docker build -t "${REPO_NAME}:${IMAGE_TAG}" .
)

info "==> Docker: tag + push a ${IMAGE_URI}"
docker tag "${REPO_NAME}:${IMAGE_TAG}" "${IMAGE_URI}"
# Si falla el login, ver comentarios al inicio del script (login ECR manual).
aws ecr get-login-password --region "${REGION}" \
  | docker login --username AWS --password-stdin "${REGISTRY}"
docker push "${IMAGE_URI}"

info "==> VPC por defecto + security group ${SG_NAME}"
VPC_ID="$(aws ec2 describe-vpcs --region "${REGION}" \
  --filters "Name=isDefault,Values=true" \
  --query 'Vpcs[0].VpcId' --output text)"
[[ -n "${VPC_ID}" && "${VPC_ID}" != "None" ]] || die "No hay VPC por defecto en ${REGION}"

SG_ID="$(aws ec2 describe-security-groups --region "${REGION}" \
  --filters "Name=vpc-id,Values=${VPC_ID}" "Name=group-name,Values=${SG_NAME}" \
  --query 'SecurityGroups[0].GroupId' --output text 2>/dev/null || true)"
if [[ -z "${SG_ID}" || "${SG_ID}" == "None" ]]; then
  SG_ID="$(aws ec2 create-security-group --region "${REGION}" \
    --group-name "${SG_NAME}" \
    --description "Sprint1 Next Drones: SSH + Next.js 3000" \
    --vpc-id "${VPC_ID}" \
    --query 'GroupId' --output text)"
  info "Security group creado: ${SG_ID}"
else
  info "Security group ya existe: ${SG_ID}"
fi

authorize_port() {
  local port="$1" desc="$2"
  local out ec=0
  out="$(aws ec2 authorize-security-group-ingress --region "${REGION}" \
    --group-id "${SG_ID}" \
    --ip-permissions "IpProtocol=tcp,FromPort=${port},ToPort=${port},IpRanges=[{CidrIp=${PUBLIC_CIDR},Description=${desc}}]" 2>&1)" || ec=$?
  if [[ "${ec}" -eq 0 ]]; then
    info "Regla puerto ${port} añadida (${PUBLIC_CIDR})."
  elif echo "${out}" | grep -q 'InvalidPermission\.Duplicate'; then
    info "Regla puerto ${port} ya presente."
  else
    die "authorize-security-group-ingress puerto ${port}: ${out}"
  fi
}

authorize_port 22 "ssh-workshop"
authorize_port 3000 "nextjs-http"

info "==> AMI Amazon Linux 2023 (x86_64)"
AMI_ID="$(aws ssm get-parameters --region "${REGION}" \
  --names /aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-x86_64 \
  --query 'Parameters[0].Value' --output text)"
[[ -n "${AMI_ID}" && "${AMI_ID}" != "None" ]] || die "No se pudo resolver AMI AL2023"

SUBNET_ID="$(aws ec2 describe-subnets --region "${REGION}" \
  --filters "Name=vpc-id,Values=${VPC_ID}" "Name=default-for-az,Values=true" \
  --query 'Subnets[0].SubnetId' --output text)"
[[ -n "${SUBNET_ID}" && "${SUBNET_ID}" != "None" ]] || die "No se encontró subnet por defecto"

# User data: instala Docker en AL2023, login ECR con rol de instancia, pull y run.
USER_DATA_FILE="$(mktemp)"
trap 'rm -f "${USER_DATA_FILE}"' EXIT

# Heredoc sin comillas: solo expanden ${REGION}, ${REGISTRY}, ${IMAGE_URI} en esta máquina.
cat > "${USER_DATA_FILE}" <<userdata
#!/bin/bash
set -euxo pipefail
exec >> /var/log/sprint1-user-data.log 2>&1

dnf update -y -q
dnf install -y docker
command -v aws >/dev/null 2>&1 || dnf install -y awscli
systemctl enable docker
systemctl start docker

aws ecr get-login-password --region ${REGION} \\
  | docker login --username AWS --password-stdin ${REGISTRY}

docker pull ${IMAGE_URI}

docker stop next-drones-frontend 2>/dev/null || true
docker rm next-drones-frontend 2>/dev/null || true

docker run -d --name next-drones-frontend --restart unless-stopped \\
  -p 3000:3000 \\
  ${IMAGE_URI}
userdata

RUN_INSTANCE_ARGS=(
  --region "${REGION}"
  --image-id "${AMI_ID}"
  --instance-type "${INSTANCE_TYPE}"
  --subnet-id "${SUBNET_ID}"
  --associate-public-ip-address
  --security-group-ids "${SG_ID}"
  --tag-specifications "ResourceType=instance,Tags=[
    {Key=Name,Value=next-drones-frontend-ec2},
    {Key=WorkshopSprint,Value=sprint1},
    {Key=Service,Value=frontend}
  ]"
  --user-data "file://${USER_DATA_FILE}"
  --metadata-options "HttpTokens=optional"
)

if [[ -n "${EC2_KEY_NAME:-}" ]]; then
  RUN_INSTANCE_ARGS+=(--key-name "${EC2_KEY_NAME}")
fi

if [[ -n "${EC2_IAM_INSTANCE_PROFILE:-}" ]]; then
  RUN_INSTANCE_ARGS+=(--iam-instance-profile "Name=${EC2_IAM_INSTANCE_PROFILE}")
else
  info ""
  info "AVISO: EC2_IAM_INSTANCE_PROFILE vacío. La instancia podría no poder autenticarse en ECR."
  info "        Exporta el nombre del instance profile de tu lab, por ejemplo:"
  info "          export EC2_IAM_INSTANCE_PROFILE=LabInstanceProfile"
  info ""
fi

info "==> EC2: buscar instancia existente (tags WorkshopSprint=sprint1, Service=frontend)"
EXISTING_IDS="$(aws ec2 describe-instances --region "${REGION}" \
  --filters \
    "Name=tag:WorkshopSprint,Values=sprint1" \
    "Name=tag:Service,Values=frontend" \
    "Name=instance-state-name,Values=pending,running,stopping,stopped" \
  --query 'Reservations[].Instances[].InstanceId' --output text)"
INSTANCE_ID=""
if [[ -n "${EXISTING_IDS}" ]]; then
  INSTANCE_ID="${EXISTING_IDS%% *}"
  STATE="$(aws ec2 describe-instances --region "${REGION}" --instance-ids "${INSTANCE_ID}" \
    --query 'Reservations[0].Instances[0].State.Name' --output text)"
  info "Instancia existente: ${INSTANCE_ID} (${STATE})"
  if [[ "${STATE}" == "stopped" ]]; then
    info "Iniciando instancia detenida..."
    aws ec2 start-instances --region "${REGION}" --instance-ids "${INSTANCE_ID}"
  fi
else
  info "Lanzando nueva instancia..."
  INSTANCE_ID="$(aws ec2 run-instances "${RUN_INSTANCE_ARGS[@]}" \
    --query 'Instances[0].InstanceId' --output text)"
  info "Instancia creada: ${INSTANCE_ID}"
fi

info "Esperando running + status checks (puede tardar 1–3 min)..."
aws ec2 wait instance-running --region "${REGION}" --instance-ids "${INSTANCE_ID}"
aws ec2 wait instance-status-ok --region "${REGION}" --instance-ids "${INSTANCE_ID}"

PUBLIC_DNS="$(aws ec2 describe-instances --region "${REGION}" --instance-ids "${INSTANCE_ID}" \
  --query 'Reservations[0].Instances[0].PublicDnsName' --output text)"
PUBLIC_IP="$(aws ec2 describe-instances --region "${REGION}" --instance-ids "${INSTANCE_ID}" \
  --query 'Reservations[0].Instances[0].PublicIpAddress' --output text)"

HOST_FOR_URL="${PUBLIC_DNS}"
if [[ -z "${HOST_FOR_URL}" || "${HOST_FOR_URL}" == "None" ]]; then
  HOST_FOR_URL="${PUBLIC_IP}"
fi
[[ -n "${HOST_FOR_URL}" && "${HOST_FOR_URL}" != "None" ]] || die "Sin DNS ni IP pública (¿subnet sin mapPublicIp?)"

APP_URL="http://${HOST_FOR_URL}:3000"

info ""
info "==> Verificación HTTP (esperando a que user-data termine pull/run; hasta ~5 min)"
ok=0
for i in $(seq 1 60); do
  if curl -fsS --connect-timeout 5 --max-time 15 "${APP_URL}" >/dev/null 2>&1; then
    ok=1
    break
  fi
  sleep 5
done

if [[ "${ok}" -eq 1 ]]; then
  info "curl OK: ${APP_URL}"
else
  info "curl aún sin respuesta 200. Revisa en la instancia: /var/log/sprint1-user-data.log"
  info "Comando sugerido:"
  info "  curl -v --connect-timeout 5 ${APP_URL}"
fi

info ""
info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
info "URL de la tienda (abre en el navegador):"
info "  ${APP_URL}"
info "InstanceId: ${INSTANCE_ID}"
info "Imagen ECR:  ${IMAGE_URI}"
info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
info ""
info "Nota idempotencia: volver a ejecutar este script actualiza la imagen en ECR."
info "Si la instancia ya existía desde antes, user-data no se vuelve a ejecutar;"
info "para desplegar el último push: entra por SSH y ejecuta docker pull + docker run,"
info "o termina la instancia, borra el tag/instancia y vuelve a lanzar el script."
