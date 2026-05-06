# Next Drones Shop

Tienda demo de drones ficticios: **Next.js 14** (App Router), **TypeScript**, **Tailwind CSS**, **react-hook-form**, carrito con **useReducer** + **Context**, persistencia en **localStorage**.

## Desarrollo

```bash
npm install
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

### Nombre de la tienda

Por defecto el nombre mostrado es **Next Drones**. Puedes cambiarlo con `NEXT_PUBLIC_SHOP_NAME` o `SHOP_NAME` (mismo efecto) en [`.env.local.example`](.env.local.example) — copia a `.env.local` y ajusta. El valor se lee **en tiempo de ejecución**; reinicia el servidor de desarrollo tras cambiarlo.

## Producción (local)

```bash
npm run build
npm start
```

## Docker

Requiere Docker instalado.

Construir la imagen (desde la raíz del repo):

```bash
docker build -t next-drones .
```

Ejecutar en el puerto 3000:

```bash
docker run -p 3000:3000 next-drones
```

Abre [http://localhost:3000](http://localhost:3000).

El nombre de la tienda se puede pasar al **arrancar** el contenedor (también admite `SHOP_NAME`):

```bash
docker run -e NEXT_PUBLIC_SHOP_NAME="Ivan Drones" -p 3000:3000 next-drones
```

El `Dockerfile` usa la salida **standalone** de Next.js (Node 20 Alpine, usuario no root). La app raíz usa renderizado dinámico para leer el entorno en cada petición.

## Sprint 1 — User data (EC2 con Ubuntu)

Script de arranque para una instancia **Ubuntu** con Docker y AWS CLI: instala dependencias, obtiene el ID de cuenta, inicia sesión en ECR (`us-east-1`), descarga la imagen **`next-drones-frontend`** y la ejecuta en segundo plano mapeando el puerto **80** del host al **3000** del contenedor.

Asegúrate de que el security group permita el tráfico al puerto que expongas (p. ej. **80** o **3000**) y de que el rol de instancia permita `ecr:GetAuthorizationToken` y lectura del repositorio ECR.

```bash
#!/bin/bash
sudo apt update
sudo apt install docker.io -y
sudo apt install awscli -y
sudo usermod -aG docker ubuntu

ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin ${ACCOUNT_ID}.dkr.ecr.us-east-1.amazonaws.com

docker pull ${ACCOUNT_ID}.dkr.ecr.us-east-1.amazonaws.com/next-drones-frontend:latest

docker run -d -p 80:3000 ${ACCOUNT_ID}.dkr.ecr.us-east-1.amazonaws.com/next-drones-frontend:latest
```

Tras el primer arranque, cierra sesión y vuelve a entrar (o usa `newgrp docker`) para que el usuario `ubuntu` pueda usar Docker sin `sudo`. Si prefieres **Amazon Linux 2023** (como en [plan.md](plan.md)), adapta la instalación a `dnf`/`yum` en lugar de `apt`.

## Terraform / ECR

Flujo recomendado: definir en Terraform los repositorios ECR (y el resto de infra), y construir y publicar las imágenes fuera de Terraform (CLI o CI). El primer paso práctico suele ser **subir las imágenes** una vez existan los repos `next-drones-frontend` y `next-drones-api`.

### Subir imágenes a ECR (AWS CloudShell)

En **CloudShell** (o cualquier entorno con Docker y AWS CLI), el siguiente script exporta el ID de cuenta, inicia sesión en ECR, clona los repos públicos del taller, construye las imágenes y las publica con la etiqueta `latest`.

```bash
#!/usr/bin/env bash
set -euo pipefail

export AWS_REGION="${AWS_REGION:-us-east-1}"
export AWS_ACCOUNT_ID="$(aws sts get-caller-identity --query Account --output text)"
export ECR_REGISTRY="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"

echo "Account: ${AWS_ACCOUNT_ID}"
echo "Registry: ${ECR_REGISTRY}"

aws ecr get-login-password --region "${AWS_REGION}" \
  | docker login --username AWS --password-stdin "${ECR_REGISTRY}"

WORKDIR="${HOME}/workshop-build"
mkdir -p "${WORKDIR}"
cd "${WORKDIR}"

[ -d aws_workshop_frontend ] || git clone https://github.com/iovanic/aws_workshop_frontend.git
[ -d aws_workshop_api ]       || git clone https://github.com/iovanic/aws_workshop_api.git

cd "${WORKDIR}/aws_workshop_frontend"
docker build -t next-drones-frontend:build .
docker tag next-drones-frontend:build "${ECR_REGISTRY}/next-drones-frontend:latest"
docker push "${ECR_REGISTRY}/next-drones-frontend:latest"

cd "${WORKDIR}/aws_workshop_api"
docker build -t next-drones-api:build .
docker tag next-drones-api:build "${ECR_REGISTRY}/next-drones-api:latest"
docker push "${ECR_REGISTRY}/next-drones-api:latest"

echo "Listo. Imágenes:"
echo "  ${ECR_REGISTRY}/next-drones-frontend:latest"
echo "  ${ECR_REGISTRY}/next-drones-api:latest"
```

### Instalar Terraform en CloudShell (Amazon Linux)

```bash
sudo yum install -y yum-utils
sudo yum-config-manager --add-repo https://rpm.releases.hashicorp.com/AmazonLinux/hashicorp.repo
sudo yum -y install terraform
```

### Ejemplo mínimo de Terraform (provider + bucket S3)

```hcl
provider "aws" {
  region = "us-east-1"
}

resource "aws_s3_bucket" "mi_bucket" {
  bucket = "datalake-next-digital"

  tags = {
    Name        = "datalake"
    Environment = "Dev"
  }
}
```

### Desplegar la infra de este repo desde CloudShell

Clona el repositorio (si aún no lo tienes), entra en la carpeta de Terraform de este proyecto y ejecuta el ciclo típico:

```bash
cd /home/cloudshell-user/workshop-build/aws_workshop_frontend/infra/terraform
terraform init
terraform plan
terraform apply -auto-approve
```

Si ya clonaste el repo en otra ruta, sustituye el `cd` por la carpeta correcta hasta `infra/terraform`.

## Flujo

1. Catálogo: añade drones al carrito.
2. **Carrito**: revisa líneas, **Comprar** abre el formulario.
3. Formulario: correo (validación), teléfono (≥9 dígitos), dirección.
4. **Comprar** muestra un mensaje de agradecimiento con el nombre de la tienda (variables `NEXT_PUBLIC_SHOP_NAME` o `SHOP_NAME`) y vacía el carrito.
