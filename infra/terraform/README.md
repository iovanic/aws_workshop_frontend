# Terraform / Terragrunt — Sprints 1–5

AWS Academy: **no IAM**, **`LabInstanceProfile`** en EC2, región **`us-east-1`**.

## Orden recomendado

1. **Instalar herramientas (AWS CloudShell)**

   ```bash
   bash infra/scripts/00_setup_cloudshell.sh
   ```

2. **Repos ECR + imagen API** (manual/alumnos)

   ```bash
   bash infra/scripts/01_create_ecr_repos.sh
   bash infra/scripts/02_push_api_image.sh   # usa sibling ../next-drones-api por defecto
   ```

3. **Clonar el taller** en CloudShell (necesitas la raíz del repo `aws2-workshop` para el build del frontend).

4. **Desplegar infra**

   Desde `infra/terraform`:

   ```bash
   cd infra/terraform
   terragrunt init -migrate-state   # primera vez si ya existe terraform.tfstate sin backend
   terragrunt apply
   ```

   Sin Terragrunt:

   ```bash
   terraform init
   terraform apply -var="repo_root=$(cd ../.. && pwd)"
   ```

El estado local queda en **`infra/terraform/terraform.tfstate`** (también cuando Terragrunt usa `.terragrunt-cache`).

## Qué crea el stack

- SG + RDS Postgres pública + EC2 API (Docker `next-drones-api`) + seed catálogo
- Cognito `workshop-pool` + client `shop-user-client`
- API Gateway REST **EDGE** + `{proxy+}` → FastAPI
- **Build/push** imagen **frontend** (`docker build` con `NEXT_PUBLIC_*`) + EC2 tienda

Requiere **Docker** en la máquina donde ejecutas `apply` (CloudShell o portátil).

Ver outputs al final: URLs API Gateway, Cognito ids, DNS EC2, RDS endpoint.
