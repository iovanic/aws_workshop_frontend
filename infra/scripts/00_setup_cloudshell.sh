#!/usr/bin/env bash
# Instala Terraform y Terragrunt en AWS CloudShell (Amazon Linux).
# Uso: bash infra/scripts/00_setup_cloudshell.sh
set -euo pipefail

TF_VER="${TF_VER:-1.9.8}"
TG_VER="${TG_VER:-0.72.4}"

need_sudo() {
  if [[ "$(id -u)" -eq 0 ]]; then
    echo "$@"
  else
    sudo "$@"
  fi
}

TMP="$(mktemp -d)"
trap 'rm -rf "${TMP}"' EXIT

echo "==> Terraform ${TF_VER}"
curl -fsSL -o "${TMP}/terraform.zip" \
  "https://releases.hashicorp.com/terraform/${TF_VER}/terraform_${TF_VER}_linux_amd64.zip"
unzip -q -o "${TMP}/terraform.zip" -d "${TMP}"
need_sudo install -m 0755 "${TMP}/terraform" /usr/local/bin/terraform
terraform version

echo "==> Terragrunt ${TG_VER}"
curl -fsSL -o "${TMP}/terragrunt" \
  "https://github.com/gruntwork-io/terragrunt/releases/download/v${TG_VER}/terragrunt_linux_amd64"
chmod +x "${TMP}/terragrunt"
need_sudo install -m 0755 "${TMP}/terragrunt" /usr/local/bin/terragrunt
terragrunt --version

echo "OK: terraform y terragrunt en PATH (/usr/local/bin)."
