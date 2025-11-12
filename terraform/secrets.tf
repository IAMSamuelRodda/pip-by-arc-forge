# AWS Secrets Manager for OAuth Tokens and API Keys

# Xero OAuth Tokens (per-organization)
# Actual token values stored here, metadata in DynamoDB
resource "aws_secretsmanager_secret" "xero_tokens" {
  count = 1

  name        = "${var.project_name}/${var.environment}/xero-tokens"
  description = "Xero OAuth access tokens and refresh tokens (per-organization)"

  # KMS encryption (customer managed key for production)
  kms_key_id = var.environment == "prod" ? aws_kms_key.secrets[0].id : null

  # Automatic rotation (30 days - matches Xero refresh token validity)
  rotation_rules {
    automatically_after_days = 30
  }

  tags = merge(
    var.tags,
    {
      Name        = "${var.project_name}-${var.environment}-xero-tokens"
      Description = "Xero OAuth tokens storage"
    }
  )
}

# Initial placeholder value (actual tokens added via OAuth callback)
resource "aws_secretsmanager_secret_version" "xero_tokens_initial" {
  count = 1

  secret_id = aws_secretsmanager_secret.xero_tokens[0].id
  secret_string = jsonencode({
    placeholder = "Initial value - tokens added via OAuth callback"
  })

  lifecycle {
    ignore_changes = [secret_string]
  }
}

# API Keys (Anthropic, OpenAI for embeddings, etc.)
resource "aws_secretsmanager_secret" "api_keys" {
  count = 1

  name        = "${var.project_name}/${var.environment}/api-keys"
  description = "API keys for external services (Anthropic, OpenAI, Stripe)"

  kms_key_id = var.environment == "prod" ? aws_kms_key.secrets[0].id : null

  tags = merge(
    var.tags,
    {
      Name        = "${var.project_name}-${var.environment}-api-keys"
      Description = "External API keys storage"
    }
  )
}

# API Keys secret value
resource "aws_secretsmanager_secret_version" "api_keys" {
  count = 1

  secret_id = aws_secretsmanager_secret.api_keys[0].id
  secret_string = jsonencode({
    anthropic_api_key = var.anthropic_api_key
    xero_client_id    = var.xero_client_id
    xero_client_secret = var.xero_client_secret
    # Add more keys as needed (OpenAI, Stripe, etc.)
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
