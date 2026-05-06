output "account_id" {
  value = data.aws_caller_identity.current.account_id
}

output "ecr_registry" {
  value = "${data.aws_caller_identity.current.account_id}.dkr.ecr.${var.region}.amazonaws.com"
}

output "rds_endpoint" {
  value = aws_db_instance.workshop.address
}

output "rds_port" {
  value = aws_db_instance.workshop.port
}

output "api_ec2_public_dns" {
  value = aws_instance.api.public_dns
}

output "api_url" {
  value = "http://${aws_instance.api.public_dns}:8000"
}

output "frontend_ec2_public_dns" {
  value = aws_instance.frontend.public_dns
}

output "frontend_url" {
  value = "http://${aws_instance.frontend.public_dns}:3000"
}

output "api_gateway_url" {
  value = "https://${aws_api_gateway_rest_api.workshop.id}.execute-api.${var.region}.amazonaws.com/prod"
}

output "cognito_user_pool_id" {
  value = aws_cognito_user_pool.workshop.id
}

output "cognito_client_id" {
  value = aws_cognito_user_pool_client.shop_client.id
}

output "security_group_ids" {
  value = {
    frontend = aws_security_group.frontend.id
    api      = aws_security_group.api.id
    rds      = aws_security_group.rds.id
  }
}
