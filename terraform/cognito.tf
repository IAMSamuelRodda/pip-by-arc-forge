# Cognito User Pool for Xero Agent authentication
# Provides user sign-up, sign-in, and JWT token management

# User Pool
resource "aws_cognito_user_pool" "main" {
  count = 1

  name = "${var.project_name}-${var.environment}-users"

  # Allow users to sign in with email
  username_attributes      = ["email"]
  auto_verified_attributes = ["email"]

  # Password policy
  password_policy {
    minimum_length                   = 8
    require_lowercase                = true
    require_uppercase                = true
    require_numbers                  = true
    require_symbols                  = true
    temporary_password_validity_days = 7
  }

  # Account recovery
  account_recovery_setting {
    recovery_mechanism {
      name     = "verified_email"
      priority = 1
    }
  }

  # Email configuration
  email_configuration {
    email_sending_account = "COGNITO_DEFAULT"
  }

  # Custom attributes for Xero integration
  schema {
    name                = "xero_tenant_id"
    attribute_data_type = "String"
    mutable             = true
    required            = false

    string_attribute_constraints {
      min_length = 0
      max_length = 256
    }
  }

  schema {
    name                = "subscription_tier"
    attribute_data_type = "String"
    mutable             = true
    required            = false

    string_attribute_constraints {
      min_length = 0
      max_length = 50
    }
  }

  # MFA configuration (optional for free tier, required for pro/enterprise)
  mfa_configuration = "OPTIONAL"

  software_token_mfa_configuration {
    enabled = true
  }

  # User pool policies
  user_pool_add_ons {
    advanced_security_mode = var.environment == "prod" ? "ENFORCED" : "AUDIT"
  }

  # Lambda triggers (for future custom auth flows)
  # lambda_config {
  #   pre_sign_up       = aws_lambda_function.cognito_pre_signup[0].arn
  #   post_confirmation = aws_lambda_function.cognito_post_confirmation[0].arn
  # }

  # User account settings
  admin_create_user_config {
    allow_admin_create_user_only = false
  }

  # Delete protection for production
  deletion_protection = var.environment == "prod" ? "ACTIVE" : "INACTIVE"

  tags = merge(
    var.tags,
    {
      Name = "${var.project_name}-${var.environment}-user-pool"
    }
  )
}

# User Pool Client (for PWA)
resource "aws_cognito_user_pool_client" "pwa" {
  count = 1

  name         = "${var.project_name}-${var.environment}-pwa-client"
  user_pool_id = aws_cognito_user_pool.main[0].id

  # OAuth flows
  explicit_auth_flows = [
    "ALLOW_USER_SRP_AUTH",
    "ALLOW_REFRESH_TOKEN_AUTH",
    "ALLOW_USER_PASSWORD_AUTH"
  ]

  # OAuth configuration
  allowed_oauth_flows_user_pool_client = true
  allowed_oauth_flows                  = ["code", "implicit"]
  allowed_oauth_scopes                 = ["email", "openid", "profile"]

  # Callback URLs (localhost for dev, update later with production URLs)
  callback_urls = concat(
    var.domain_name != "" ? ["https://${var.domain_name}/auth/callback"] : [],
    ["http://localhost:5173/auth/callback", "http://localhost:3000/auth/callback"]
  )

  logout_urls = concat(
    var.domain_name != "" ? ["https://${var.domain_name}/"] : [],
    ["http://localhost:5173/", "http://localhost:3000/"]
  )

  # Supported identity providers
  supported_identity_providers = ["COGNITO"]

  # Token validity
  id_token_validity      = 60   # 1 hour
  access_token_validity  = 60   # 1 hour
  refresh_token_validity = 30   # 30 days

  token_validity_units {
    id_token      = "minutes"
    access_token  = "minutes"
    refresh_token = "days"
  }

  # Prevent secret generation (not needed for SPA)
  generate_secret = false

  # Read/write attributes
  read_attributes = [
    "email",
    "email_verified",
    "custom:xero_tenant_id",
    "custom:subscription_tier"
  ]

  write_attributes = [
    "email",
    "custom:xero_tenant_id",
    "custom:subscription_tier"
  ]

  # Enable token revocation
  enable_token_revocation = true

  # Prevent user existence errors
  prevent_user_existence_errors = "ENABLED"
}

# User Pool Domain (for hosted UI)
resource "aws_cognito_user_pool_domain" "main" {
  count = 1

  domain       = "${var.project_name}-${var.environment}-${random_string.cognito_domain_suffix[0].result}"
  user_pool_id = aws_cognito_user_pool.main[0].id
}

# Random string for unique Cognito domain
resource "random_string" "cognito_domain_suffix" {
  count = 1

  length  = 8
  special = false
  upper   = false
}

# Identity Pool (for AWS service access - optional)
resource "aws_cognito_identity_pool" "main" {
  count = 1

  identity_pool_name               = "${var.project_name}-${var.environment}-identity"
  allow_unauthenticated_identities = false

  cognito_identity_providers {
    client_id               = aws_cognito_user_pool_client.pwa[0].id
    provider_name           = aws_cognito_user_pool.main[0].endpoint
    server_side_token_check = true
  }

  tags = merge(
    var.tags,
    {
      Name = "${var.project_name}-${var.environment}-identity-pool"
    }
  )
}

# IAM role for authenticated users (Identity Pool)
resource "aws_iam_role" "cognito_authenticated" {
  count = 1

  name = "${var.project_name}-${var.environment}-cognito-authenticated"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Federated = "cognito-identity.amazonaws.com"
        }
        Action = "sts:AssumeRoleWithWebIdentity"
        Condition = {
          StringEquals = {
            "cognito-identity.amazonaws.com:aud" = aws_cognito_identity_pool.main[0].id
          }
          "ForAnyValue:StringLike" = {
            "cognito-identity.amazonaws.com:amr" = "authenticated"
          }
        }
      }
    ]
  })

  tags = merge(
    var.tags,
    {
      Name = "${var.project_name}-${var.environment}-cognito-authenticated-role"
    }
  )
}

# IAM policy for authenticated users
resource "aws_iam_role_policy" "cognito_authenticated" {
  count = 1

  name = "${var.project_name}-${var.environment}-cognito-authenticated-policy"
  role = aws_iam_role.cognito_authenticated[0].id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "execute-api:Invoke"
        ]
        Resource = [
          "${aws_api_gateway_rest_api.main[0].execution_arn}/*"
        ]
      }
    ]
  })
}

# Attach identity pool to roles
resource "aws_cognito_identity_pool_roles_attachment" "main" {
  count = 1

  identity_pool_id = aws_cognito_identity_pool.main[0].id

  roles = {
    authenticated = aws_iam_role.cognito_authenticated[0].arn
  }
}

# CloudWatch Log Group for Cognito advanced security
resource "aws_cloudwatch_log_group" "cognito" {
  count = 1

  name              = "/aws/cognito/${var.project_name}-${var.environment}"
  retention_in_days = var.environment == "prod" ? 30 : 7

  tags = merge(
    var.tags,
    {
      Name = "${var.project_name}-${var.environment}-cognito-logs"
    }
  )
}
