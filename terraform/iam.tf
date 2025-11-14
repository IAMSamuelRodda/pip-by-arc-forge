# IAM Roles for Lambda Functions
# Principle of least privilege - separate roles for agent, MCP, and auth

# Agent Lambda Role
resource "aws_iam_role" "lambda_agent" {
  count = 1

  name = "${var.project_name}-${var.environment}-lambda-agent"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })

  tags = merge(
    var.tags,
    {
      Name        = "${var.project_name}-${var.environment}-lambda-agent"
      Description = "IAM role for agent orchestrator Lambda"
    }
  )
}

# Agent Lambda Policy
resource "aws_iam_role_policy" "lambda_agent" {
  count = 1

  name = "${var.project_name}-${var.environment}-lambda-agent-policy"
  role = aws_iam_role.lambda_agent[0].id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "DynamoDBAccess"
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem",
          "dynamodb:Query",
          "dynamodb:Scan"
        ]
        Resource = [
          aws_dynamodb_table.main[0].arn,
          "${aws_dynamodb_table.main[0].arn}/index/*"
        ]
        Condition = {
          StringEquals = {
            "dynamodb:LeadingKeys" = ["USER#*", "SESSION#*", "ORG#*"]
          }
        }
      },
      {
        Sid    = "InvokeMCPLambda"
        Effect = "Allow"
        Action = [
          "lambda:InvokeFunction"
        ]
        Resource = [
          try(aws_lambda_function.mcp[0].arn, "*")
        ]
      },
      {
        Sid    = "CloudWatchLogs"
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:${var.aws_region}:*:log-group:/aws/lambda/${var.project_name}-${var.environment}-agent:*"
      }
    ]
  })
}

# Attach AWS managed policy for Lambda basic execution
resource "aws_iam_role_policy_attachment" "lambda_agent_basic" {
  count = 1

  role       = aws_iam_role.lambda_agent[0].name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# MCP Lambda Role
resource "aws_iam_role" "lambda_mcp" {
  count = 1

  name = "${var.project_name}-${var.environment}-lambda-mcp"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })

  tags = merge(
    var.tags,
    {
      Name        = "${var.project_name}-${var.environment}-lambda-mcp"
      Description = "IAM role for MCP server Lambda"
    }
  )
}

# MCP Lambda Policy
resource "aws_iam_role_policy" "lambda_mcp" {
  count = 1

  name = "${var.project_name}-${var.environment}-lambda-mcp-policy"
  role = aws_iam_role.lambda_mcp[0].id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "DynamoDBUserTokensAccess"
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem",
          "dynamodb:Query"
        ]
        Resource = [
          aws_dynamodb_table.main[0].arn
        ]
        Condition = {
          StringEquals = {
            "dynamodb:LeadingKeys" = ["CACHE#*", "TOKEN#*"]
          }
        }
      },
      {
        Sid    = "CloudWatchLogs"
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:${var.aws_region}:*:log-group:/aws/lambda/${var.project_name}-${var.environment}-mcp:*"
      }
    ]
  })
}

# Attach AWS managed policy for Lambda basic execution
resource "aws_iam_role_policy_attachment" "lambda_mcp_basic" {
  count = 1

  role       = aws_iam_role.lambda_mcp[0].name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# Auth Lambda Role (for OAuth callback and Cognito triggers)
resource "aws_iam_role" "lambda_auth" {
  count = 1

  name = "${var.project_name}-${var.environment}-lambda-auth"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })

  tags = merge(
    var.tags,
    {
      Name        = "${var.project_name}-${var.environment}-lambda-auth"
      Description = "IAM role for auth Lambda functions"
    }
  )
}

# Auth Lambda Policy
resource "aws_iam_role_policy" "lambda_auth" {
  count = 1

  name = "${var.project_name}-${var.environment}-lambda-auth-policy"
  role = aws_iam_role.lambda_auth[0].id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "CognitoAccess"
        Effect = "Allow"
        Action = [
          "cognito-idp:AdminGetUser",
          "cognito-idp:AdminUpdateUserAttributes",
          "cognito-idp:AdminAddUserToGroup",
          "cognito-idp:AdminRemoveUserFromGroup"
        ]
        Resource = [
          try(aws_cognito_user_pool.main[0].arn, "*")
        ]
      },
      {
        Sid    = "SecretsManagerReadXeroOAuth"
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue",
          "secretsmanager:DescribeSecret"
        ]
        Resource = [
          try(aws_secretsmanager_secret.xero_oauth[0].arn, "*")
        ]
      },
      {
        Sid    = "DynamoDBUserAccess"
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem"
        ]
        Resource = [
          aws_dynamodb_table.main[0].arn
        ]
        Condition = {
          StringEquals = {
            "dynamodb:LeadingKeys" = ["USER#*", "ORG#*", "TOKEN#*"]
          }
        }
      },
      {
        Sid    = "CloudWatchLogs"
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:${var.aws_region}:*:log-group:/aws/lambda/${var.project_name}-${var.environment}-auth-*:*"
      }
    ]
  })
}

# Attach AWS managed policy for Lambda basic execution
resource "aws_iam_role_policy_attachment" "lambda_auth_basic" {
  count = 1

  role       = aws_iam_role.lambda_auth[0].name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}
