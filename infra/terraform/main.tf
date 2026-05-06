terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    null = {
      source  = "hashicorp/null"
      version = "~> 3.2"
    }
  }
}

provider "aws" {
  region = var.region
}

data "aws_caller_identity" "current" {}

data "aws_vpc" "default" {
  default = true
}

data "aws_subnets" "default" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.default.id]
  }
  filter {
    name   = "default-for-az"
    values = ["true"]
  }
}

data "aws_ami" "al2023" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["al2023-ami-*-x86_64"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

locals {
  registry   = "${data.aws_caller_identity.current.account_id}.dkr.ecr.${var.region}.amazonaws.com"
  api_image  = "${local.registry}/${var.ecr_api_repo}:${var.image_tag}"
  fe_image   = "${local.registry}/${var.ecr_frontend_repo}:${var.image_tag}"
  db_host    = aws_db_instance.workshop.address
  db_url     = "postgresql://${var.db_username}:${var.db_password}@${local.db_host}:5432/${var.db_name}"
  api_origin = "http://${aws_instance.api.public_dns}:8000"
  gw_url     = "https://${aws_api_gateway_rest_api.workshop.id}.execute-api.${var.region}.amazonaws.com/prod"
}

resource "aws_security_group" "frontend" {
  name        = "workshop-sg-frontend"
  description = "Next.js shop: SSH + port 3000"
  vpc_id      = data.aws_vpc.default.id

  ingress {
    description = "SSH"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = [var.public_ingress_cidr]
  }

  ingress {
    description = "Next.js"
    from_port   = 3000
    to_port     = 3000
    protocol    = "tcp"
    cidr_blocks = [var.public_ingress_cidr]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_security_group" "api" {
  name        = "workshop-sg-api"
  description = "FastAPI: SSH + port 8000"
  vpc_id      = data.aws_vpc.default.id

  ingress {
    description = "SSH"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = [var.public_ingress_cidr]
  }

  ingress {
    description = "FastAPI"
    from_port   = 8000
    to_port     = 8000
    protocol    = "tcp"
    cidr_blocks = [var.public_ingress_cidr]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_security_group" "rds" {
  name        = "workshop-sg-rds"
  description = "Postgres for workshop"
  vpc_id      = data.aws_vpc.default.id

  ingress {
    description     = "Postgres from API EC2"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.api.id]
  }

  ingress {
    description = "Postgres from Internet (DBeaver, lab only)"
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = [var.rds_extra_ingress_cidr]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_db_subnet_group" "workshop" {
  name       = "workshop-db-subnets"
  subnet_ids = data.aws_subnets.default.ids

  tags = {
    Name = "workshop-db-subnets"
  }
}

resource "aws_db_instance" "workshop" {
  identifier                 = var.db_identifier
  engine                     = "postgres"
  engine_version             = "16"
  instance_class             = "db.t3.micro"
  allocated_storage          = 20
  storage_type               = "gp3"
  db_name                    = var.db_name
  username                   = var.db_username
  password                   = var.db_password
  publicly_accessible        = true
  vpc_security_group_ids     = [aws_security_group.rds.id]
  db_subnet_group_name       = aws_db_subnet_group.workshop.name
  skip_final_snapshot        = true
  deletion_protection        = false
  backup_retention_period    = 0
  auto_minor_version_upgrade = true

  tags = {
    Name = var.db_identifier
  }
}

resource "aws_instance" "api" {
  depends_on                  = [aws_db_instance.workshop]
  ami                         = data.aws_ami.al2023.id
  instance_type               = var.instance_type
  subnet_id                   = sort(data.aws_subnets.default.ids)[0]
  vpc_security_group_ids      = [aws_security_group.api.id]
  iam_instance_profile        = var.iam_instance_profile_name
  associate_public_ip_address = true

  user_data = base64encode(templatefile("${path.module}/templates/user_data_api.sh.tpl", {
    region        = var.region
    registry      = local.registry
    image_uri     = local.api_image
    database_url  = "postgresql://${var.db_username}:${var.db_password}@${aws_db_instance.workshop.address}:5432/${var.db_name}"
  }))

  tags = {
    Name = "workshop-api"
  }

  user_data_replace_on_change = true
}

resource "aws_cognito_user_pool" "workshop" {
  name = "workshop-pool"

  username_attributes      = ["email"]
  auto_verified_attributes = ["email"]

  password_policy {
    minimum_length    = 8
    require_lowercase = true
    require_numbers   = true
    require_symbols   = false
    require_uppercase = false
  }

  schema {
    name                     = "name"
    attribute_data_type      = "String"
    developer_only_attribute = false
    mutable                  = true
    required                 = false
    string_attribute_constraints {}
  }

  schema {
    name                     = "phone_number"
    attribute_data_type      = "String"
    developer_only_attribute = false
    mutable                  = true
    required                 = false
    string_attribute_constraints {}
  }

  schema {
    name                     = "address"
    attribute_data_type      = "String"
    developer_only_attribute = false
    mutable                  = true
    required                 = false
    string_attribute_constraints {}
  }

  account_recovery_setting {
    recovery_mechanism {
      name     = "verified_email"
      priority = 1
    }
  }
}

resource "aws_cognito_user_pool_client" "shop_client" {
  name         = "shop-user-client"
  user_pool_id = aws_cognito_user_pool.workshop.id

  generate_secret               = false
  enable_token_revocation       = true
  prevent_user_existence_errors = "ENABLED"

  explicit_auth_flows = [
    "ALLOW_USER_PASSWORD_AUTH",
    "ALLOW_USER_SRP_AUTH",
    "ALLOW_REFRESH_TOKEN_AUTH",
  ]

  supported_identity_providers = ["COGNITO"]
}

resource "aws_api_gateway_rest_api" "workshop" {
  name        = "workshop-api"
  description = "Next Drones workshop Edge REST API"

  endpoint_configuration {
    types = ["EDGE"]
  }
}

resource "aws_api_gateway_authorizer" "cognito" {
  name                             = "cognito-workshop"
  rest_api_id                      = aws_api_gateway_rest_api.workshop.id
  type                             = "COGNITO_USER_POOLS"
  provider_arns                    = [aws_cognito_user_pool.workshop.arn]
  identity_source                  = "method.request.header.Authorization"
  authorizer_result_ttl_in_seconds = 300
}

resource "aws_api_gateway_resource" "root_proxy" {
  rest_api_id = aws_api_gateway_rest_api.workshop.id
  parent_id   = aws_api_gateway_rest_api.workshop.root_resource_id
  path_part   = "{proxy+}"
}

resource "aws_api_gateway_method" "proxy_any" {
  rest_api_id   = aws_api_gateway_rest_api.workshop.id
  resource_id   = aws_api_gateway_resource.root_proxy.id
  http_method   = "ANY"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id

  request_parameters = {
    "method.request.path.proxy" = false
  }
}

resource "aws_api_gateway_integration" "proxy" {
  rest_api_id = aws_api_gateway_rest_api.workshop.id
  resource_id = aws_api_gateway_resource.root_proxy.id
  http_method = aws_api_gateway_method.proxy_any.http_method

  type                    = "HTTP_PROXY"
  integration_http_method = "ANY"
  uri                     = "http://${aws_instance.api.public_dns}:8000/{proxy}"

  connection_type = "INTERNET"

  request_parameters = {
    "integration.request.path.proxy" = "method.request.path.proxy"
  }
}

resource "aws_api_gateway_deployment" "prod" {
  rest_api_id = aws_api_gateway_rest_api.workshop.id

  triggers = {
    redeployment = sha1(jsonencode([
      aws_api_gateway_resource.root_proxy.id,
      aws_api_gateway_method.proxy_any.id,
      aws_api_gateway_integration.proxy.id,
      aws_api_gateway_authorizer.cognito.id,
      aws_instance.api.public_dns,
    ]))
  }

  lifecycle {
    create_before_destroy = true
  }

  depends_on = [
    aws_api_gateway_integration.proxy,
  ]
}

resource "aws_api_gateway_stage" "prod" {
  deployment_id = aws_api_gateway_deployment.prod.id
  rest_api_id   = aws_api_gateway_rest_api.workshop.id
  stage_name    = "prod"
}

resource "aws_instance" "frontend" {
  depends_on = [
    aws_api_gateway_stage.prod,
    aws_cognito_user_pool_client.shop_client,
    aws_instance.api,
  ]

  ami                         = data.aws_ami.al2023.id
  instance_type               = var.instance_type
  subnet_id                   = sort(data.aws_subnets.default.ids)[0]
  vpc_security_group_ids      = [aws_security_group.frontend.id]
  iam_instance_profile        = var.iam_instance_profile_name
  associate_public_ip_address = true

  user_data = base64encode(templatefile("${path.module}/templates/user_data_frontend.sh.tpl", {
    region                           = var.region
    registry                         = local.registry
    image_uri                        = local.fe_image
    server_fastapi_origin            = local.api_origin
    next_public_api_gw_url           = local.gw_url
    next_public_cognito_user_pool_id = aws_cognito_user_pool.workshop.id
    next_public_cognito_client_id    = aws_cognito_user_pool_client.shop_client.id
  }))

  tags = {
    Name = "workshop-frontend"
  }

  user_data_replace_on_change = true
}
