# Run from this directory: terragrunt init && terragrunt apply
# Requires: ECR repos + API image pushed (see ../scripts/).

locals {
  workshop_root = abspath("${get_terragrunt_dir()}/../..")
  # Keep state next to this file so Terragrunt's cache copy still uses the same state as plain `terraform apply`.
  tfstate_path = abspath("${get_terragrunt_dir()}/terraform.tfstate")
}

inputs = {
  repo_root = local.workshop_root
}

generate "backend" {
  path      = "backend.tf"
  if_exists = "overwrite_terragrunt"
  contents  = <<EOF
terraform {
  backend "local" {
    path = "${local.tfstate_path}"
  }
}
EOF
}

terraform {
  source = "."
}

