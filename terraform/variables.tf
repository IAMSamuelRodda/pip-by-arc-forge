# Core Configuration
variable "aws_region" {
  description = "AWS region for all resources"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
  default     = "dev"

  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be dev, staging, or prod."
  }
}

variable "project_name" {
  description = "Project name used for resource naming"
  type        = string
  default     = "xero-agent"
}

# Application Configuration
variable "domain_name" {
  description = "Custom domain name for the application (optional)"
  type        = string
  default     = ""
}

variable "xero_client_id" {
  description = "Xero OAuth2 client ID (from Xero Developer Portal)"
  type        = string
  sensitive   = true
  default     = ""
}

variable "xero_client_secret" {
  description = "Xero OAuth2 client secret (from Xero Developer Portal)"
  type        = string
  sensitive   = true
  default     = ""
}

variable "anthropic_api_key" {
  description = "Anthropic API key for Claude Agent SDK"
  type        = string
  sensitive   = true
  default     = ""
}

# DynamoDB Configuration
variable "dynamodb_billing_mode" {
  description = "DynamoDB billing mode (PROVISIONED or PAY_PER_REQUEST)"
  type        = string
  default     = "PAY_PER_REQUEST"

  validation {
    condition     = contains(["PROVISIONED", "PAY_PER_REQUEST"], var.dynamodb_billing_mode)
    error_message = "Billing mode must be PROVISIONED or PAY_PER_REQUEST."
  }
}

variable "dynamodb_read_capacity" {
  description = "DynamoDB read capacity units (only for PROVISIONED mode)"
  type        = number
  default     = 5
}

variable "dynamodb_write_capacity" {
  description = "DynamoDB write capacity units (only for PROVISIONED mode)"
  type        = number
  default     = 5
}

# Lambda Configuration
variable "lambda_runtime" {
  description = "Lambda runtime version"
  type        = string
  default     = "nodejs20.x"
}

variable "lambda_memory_size_agent" {
  description = "Memory allocation for agent Lambda (MB)"
  type        = number
  default     = 1024
}

variable "lambda_memory_size_mcp" {
  description = "Memory allocation for MCP Lambda (MB)"
  type        = number
  default     = 512
}

variable "lambda_timeout_agent" {
  description = "Timeout for agent Lambda (seconds)"
  type        = number
  default     = 30
}

variable "lambda_timeout_mcp" {
  description = "Timeout for MCP Lambda (seconds)"
  type        = number
  default     = 15
}

variable "lambda_provisioned_concurrency" {
  description = "Provisioned concurrency for agent Lambda (0 to disable)"
  type        = number
  default     = 0
}

# Cognito Configuration
variable "cognito_password_minimum_length" {
  description = "Minimum password length for Cognito"
  type        = number
  default     = 12
}

variable "cognito_mfa_configuration" {
  description = "MFA configuration (OFF, OPTIONAL, ON)"
  type        = string
  default     = "OPTIONAL"

  validation {
    condition     = contains(["OFF", "OPTIONAL", "ON"], var.cognito_mfa_configuration)
    error_message = "MFA configuration must be OFF, OPTIONAL, or ON."
  }
}

# Cost Optimization Flags
variable "enable_nat_gateway" {
  description = "Enable NAT Gateway (~$50/month). Disable for POC/dev to reduce costs."
  type        = bool
  default     = false
}

variable "enable_alb" {
  description = "Enable Application Load Balancer (~$25/month). Disable for POC/dev to reduce costs."
  type        = bool
  default     = false
}

variable "enable_cloudfront" {
  description = "Enable CloudFront CDN for PWA distribution"
  type        = bool
  default     = true
}

# Tags
variable "tags" {
  description = "Additional tags to apply to all resources"
  type        = map(string)
  default     = {}
}
