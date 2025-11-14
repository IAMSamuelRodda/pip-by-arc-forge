# AWS Secrets Manager for Shared Application Secrets
#
# Cost Optimization: User OAuth tokens stored in DynamoDB (free, encrypted at rest)
# Only shared application secrets stored here ($0.40/secret/month)

# Shared API Keys (all dev apps can use these)
# Scalable across multiple apps - see docs/COST_OPTIMIZATION_MULTI_APP.md
resource "aws_secretsmanager_secret" "api_keys" {
  count = 1

  name        = var.environment == "dev" ? "shared/${var.environment}/api-keys" : "${var.project_name}/${var.environment}/api-keys"
  description = "Shared API keys for external services (Anthropic, OpenAI, Stripe)"

  kms_key_id = var.environment == "prod" ? aws_kms_key.secrets[0].id : null

  tags = merge(
    var.tags,
    {
      Name        = var.environment == "dev" ? "shared-${var.environment}-api-keys" : "${var.project_name}-${var.environment}-api-keys"
      Description = "Shared external API keys (dev) or app-specific (prod)"
    }
  )
}

# API Keys secret value
resource "aws_secretsmanager_secret_version" "api_keys" {
  count = 1

  secret_id = aws_secretsmanager_secret.api_keys[0].id
  secret_string = jsonencode({
    anthropic_api_key = var.anthropic_api_key
    # Add more shared keys as needed:
    # openai_api_key = var.openai_api_key
    # stripe_test_key = var.stripe_test_key
  })

  lifecycle {
    ignore_changes = [secret_string]
  }
}

# Xero OAuth Credentials (app-specific, not shared)
# Each app needs its own Xero OAuth application
resource "aws_secretsmanager_secret" "xero_oauth" {
  count = 1

  name        = "${var.project_name}/${var.environment}/xero-oauth"
  description = "Xero OAuth client credentials for ${var.project_name}"

  kms_key_id = var.environment == "prod" ? aws_kms_key.secrets[0].id : null

  tags = merge(
    var.tags,
    {
      Name        = "${var.project_name}-${var.environment}-xero-oauth"
      Description = "Xero OAuth client ID and secret"
    }
  )
}

resource "aws_secretsmanager_secret_version" "xero_oauth" {
  count = 1

  secret_id = aws_secretsmanager_secret.xero_oauth[0].id
  secret_string = jsonencode({
    client_id     = var.xero_client_id
    client_secret = var.xero_client_secret
  })

  lifecycle {
    ignore_changes = [secret_string]
  }
}

# KMS Key for Secrets Manager (production only)
resource "aws_kms_key" "secrets" {
  count = var.environment == "prod" ? 1 : 0

  description             = "${var.project_name}-${var.environment}-secrets-key"
  deletion_window_in_days = 30
  enable_key_rotation     = true

  tags = merge(
    var.tags,
    {
      Name        = "${var.project_name}-${var.environment}-secrets-key"
      Description = "KMS key for Secrets Manager encryption"
    }
  )
}

resource "aws_kms_alias" "secrets" {
  count = var.environment == "prod" ? 1 : 0

  name          = "alias/${var.project_name}-${var.environment}-secrets"
  target_key_id = aws_kms_key.secrets[0].key_id
}

# KMS Key Policy
resource "aws_kms_key_policy" "secrets" {
  count = var.environment == "prod" ? 1 : 0

  key_id = aws_kms_key.secrets[0].id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "Enable IAM User Permissions"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"
        }
        Action   = "kms:*"
        Resource = "*"
      },
      {
        Sid    = "Allow Lambda to decrypt secrets"
        Effect = "Allow"
        Principal = {
          AWS = [
            aws_iam_role.lambda_agent[0].arn,
            aws_iam_role.lambda_mcp[0].arn,
            aws_iam_role.lambda_auth[0].arn
          ]
        }
        Action = [
          "kms:Decrypt",
          "kms:DescribeKey"
        ]
        Resource = "*"
      }
    ]
  })
}

# Data source for current AWS account ID
data "aws_caller_identity" "current" {}
