# DynamoDB Outputs
output "dynamodb_table_name" {
  description = "Name of the main DynamoDB table"
  value       = try(aws_dynamodb_table.main[0].name, "")
}

output "dynamodb_table_arn" {
  description = "ARN of the main DynamoDB table"
  value       = try(aws_dynamodb_table.main[0].arn, "")
}

# Lambda Outputs
output "lambda_agent_function_name" {
  description = "Name of the agent Lambda function"
  value       = try(aws_lambda_function.agent[0].function_name, "")
}

output "lambda_agent_function_arn" {
  description = "ARN of the agent Lambda function"
  value       = try(aws_lambda_function.agent[0].arn, "")
}

output "lambda_mcp_function_name" {
  description = "Name of the MCP Lambda function"
  value       = try(aws_lambda_function.mcp[0].function_name, "")
}

output "lambda_mcp_function_arn" {
  description = "ARN of the MCP Lambda function"
  value       = try(aws_lambda_function.mcp[0].arn, "")
}

# API Gateway Outputs
output "api_gateway_url" {
  description = "URL of the API Gateway REST API"
  value       = try(aws_api_gateway_stage.main[0].invoke_url, "")
}

output "api_gateway_id" {
  description = "ID of the API Gateway REST API"
  value       = try(aws_api_gateway_rest_api.main[0].id, "")
}

# Cognito Outputs
output "cognito_user_pool_id" {
  description = "ID of the Cognito User Pool"
  value       = try(aws_cognito_user_pool.main[0].id, "")
}

output "cognito_user_pool_arn" {
  description = "ARN of the Cognito User Pool"
  value       = try(aws_cognito_user_pool.main[0].arn, "")
}

output "cognito_user_pool_client_id" {
  description = "ID of the Cognito User Pool Client (PWA)"
  value       = try(aws_cognito_user_pool_client.pwa[0].id, "")
  sensitive   = true
}

output "cognito_user_pool_domain" {
  description = "Cognito User Pool hosted UI domain"
  value       = try(aws_cognito_user_pool_domain.main[0].domain, "")
}

output "cognito_identity_pool_id" {
  description = "ID of the Cognito Identity Pool"
  value       = try(aws_cognito_identity_pool.main[0].id, "")
}

# S3 Outputs (disabled - not deployed in dev)
# output "s3_bucket_name" {
#   description = "Name of the S3 bucket for PWA hosting"
#   value       = try(aws_s3_bucket.pwa[0].id, "")
# }

# output "s3_bucket_arn" {
#   description = "ARN of the S3 bucket for PWA hosting"
#   value       = try(aws_s3_bucket.pwa[0].arn, "")
# }

# CloudFront Outputs (disabled - not deployed in dev)
# output "cloudfront_distribution_id" {
#   description = "ID of the CloudFront distribution"
#   value       = try(aws_cloudfront_distribution.pwa[0].id, "")
# }

# output "cloudfront_domain_name" {
#   description = "Domain name of the CloudFront distribution"
#   value       = try(aws_cloudfront_distribution.pwa[0].domain_name, "")
# }

# output "cloudfront_url" {
#   description = "Full URL of the CloudFront distribution"
#   value       = try("https://${aws_cloudfront_distribution.pwa[0].domain_name}", "")
# }

# Secrets Manager Outputs
output "secrets_manager_api_keys_arn" {
  description = "ARN of the Secrets Manager secret for shared API keys"
  value       = try(aws_secretsmanager_secret.api_keys[0].arn, "")
}

output "secrets_manager_xero_oauth_arn" {
  description = "ARN of the Secrets Manager secret for Xero OAuth credentials"
  value       = try(aws_secretsmanager_secret.xero_oauth[0].arn, "")
}

# IAM Outputs
output "lambda_agent_role_arn" {
  description = "ARN of the IAM role for agent Lambda"
  value       = try(aws_iam_role.lambda_agent[0].arn, "")
}

output "lambda_mcp_role_arn" {
  description = "ARN of the IAM role for MCP Lambda"
  value       = try(aws_iam_role.lambda_mcp[0].arn, "")
}

# Environment Summary
output "environment_summary" {
  description = "Summary of the deployed environment"
  value = {
    environment         = var.environment
    region              = var.aws_region
    project             = var.project_name
    pwa_url             = var.domain_name != "" ? "https://${var.domain_name}" : "http://localhost:5173"
    api_url             = try(aws_api_gateway_stage.main[0].invoke_url, "")
    dynamodb_table      = try(aws_dynamodb_table.main[0].name, "")
    cognito_user_pool   = try(aws_cognito_user_pool.main[0].id, "")
  }
}
