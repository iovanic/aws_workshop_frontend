variable "region" {
  type        = string
  description = "AWS region (workshop: us-east-1 only)."
  default     = "us-east-1"
}

variable "repo_root" {
  type        = string
  description = "Absolute path to aws2-workshop repo root (Docker build context for frontend). No longer used; image is pushed manually before terraform apply."
  default     = ""
}

variable "db_identifier" {
  type        = string
  default     = "aws-workshop-db"
}

variable "db_name" {
  type        = string
  default     = "workshop"
}

variable "db_username" {
  type        = string
  default     = "workshopadmin"
}

variable "db_password" {
  type        = string
  default     = "postgres_pw"
  sensitive   = true
}

variable "instance_type" {
  type        = string
  default     = "t3.micro"
}

variable "ecr_frontend_repo" {
  type    = string
  default = "next-drones-frontend"
}

variable "ecr_api_repo" {
  type    = string
  default = "next-drones-api"
}

variable "image_tag" {
  type    = string
  default = "latest"
}

variable "iam_instance_profile_name" {
  type        = string
  description = "AWS Academy Lab instance profile (no IAM creation)."
  default     = "LabInstanceProfile"
}

variable "public_ingress_cidr" {
  type        = string
  description = "CIDR for SSH and app ports from the Internet (lab convenience)."
  default     = "0.0.0.0/0"
}

variable "rds_extra_ingress_cidr" {
  type        = string
  description = "Extra CIDR for Postgres (e.g. DBeaver). Lab uses 0.0.0.0/0; tighten after class."
  default     = "0.0.0.0/0"
}
