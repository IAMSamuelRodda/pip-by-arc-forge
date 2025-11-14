# Lambda Functions for Xero Agent
# Three functions: Agent (orchestrator), MCP (Xero tools), Auth (OAuth)

# Agent Lambda Function
resource "aws_lambda_function" "agent" {
  count = 1

  function_name = "${var.project_name}-${var.environment}-agent"
  description   = "Claude Agent orchestrator for Xero Agent"

  filename         = "${path.module}/../functions/agent/agent-lambda.zip"
  source_code_hash = filebase64sha256("${path.module}/../functions/agent/agent-lambda.zip")

  runtime = var.lambda_runtime
  handler = "dist/index.handler"

  role = aws_iam_role.lambda_agent[0].arn

  memory_size = var.lambda_memory_size_agent
  timeout     = var.lambda_timeout_agent

  environment {
    variables = {
      ANTHROPIC_API_KEY = try(jsondecode(aws_secretsmanager_secret_version.api_keys[0].secret_string)["anthropic_api_key"], "")
      MCP_LAMBDA_ARN    = try(aws_lambda_function.mcp[0].arn, "")
      DYNAMODB_TABLE    = aws_dynamodb_table.main[0].name
      AWS_REGION        = var.aws_region
      ENVIRONMENT       = var.environment
    }
  }

  # VPC configuration (optional - disable for development)
  # vpc_config {
  #   subnet_ids         = var.private_subnet_ids
  #   security_group_ids = [aws_security_group.lambda.id]
  # }

  tags = merge(
    var.tags,
    {
      Name        = "${var.project_name}-${var.environment}-agent"
      Description = "Agent orchestrator Lambda"
    }
  )

  # Provisioned concurrency for production (disabled for dev)
  # provisioned_concurrent_executions = var.lambda_provisioned_concurrency

  # Ignore changes to source_code_hash for manual deployments
  lifecycle {
    ignore_changes = [source_code_hash]
  }
}

# MCP Lambda Function
resource "aws_lambda_function" "mcp" {
  count = 1

  function_name = "${var.project_name}-${var.environment}-mcp"
  description   = "MCP Xero Server for tool execution"

  filename         = "${path.module}/../functions/mcp/mcp-lambda.zip"
  source_code_hash = filebase64sha256("${path.module}/../functions/mcp/mcp-lambda.zip")

  runtime = var.lambda_runtime
  handler = "dist/index.handler"

  role = aws_iam_role.lambda_mcp[0].arn

  memory_size = var.lambda_memory_size_mcp
  timeout     = var.lambda_timeout_mcp

  environment {
    variables = {
      DYNAMODB_TABLE  = aws_dynamodb_table.main[0].name
      AWS_REGION      = var.aws_region
      ENVIRONMENT     = var.environment
      MCP_SERVER_PATH = "/opt/nodejs/mcp-xero-server/dist/index.js"
    }
  }

  # Lambda Layer for MCP server dependencies (optional)
  # layers = [aws_lambda_layer_version.mcp_server.arn]

  tags = merge(
    var.tags,
    {
      Name        = "${var.project_name}-${var.environment}-mcp"
      Description = "MCP Xero Server Lambda"
    }
  )

  lifecycle {
    ignore_changes = [source_code_hash]
  }
}

# Auth Lambda Function
resource "aws_lambda_function" "auth" {
  count = 1

  function_name = "${var.project_name}-${var.environment}-auth"
  description   = "OAuth and authentication handler"

  filename         = "${path.module}/../functions/auth/auth-lambda.zip"
  source_code_hash = filebase64sha256("${path.module}/../functions/auth/auth-lambda.zip")

  runtime = var.lambda_runtime
  handler = "dist/index.handler"

  role = aws_iam_role.lambda_auth[0].arn

  memory_size = 256  # Auth Lambda is lightweight
  timeout     = 30   # OAuth callback needs more time

  environment {
    variables = {
      XERO_OAUTH_SECRET_ARN  = aws_secretsmanager_secret.xero_oauth[0].arn
      REDIRECT_URI           = "PLACEHOLDER_UPDATE_AFTER_DEPLOY"  # Update after API Gateway is created
      FRONTEND_URL           = var.domain_name != "" ? "https://${var.domain_name}" : "http://localhost:5173"
      COGNITO_USER_POOL_ID   = aws_cognito_user_pool.main[0].id
      DYNAMODB_TABLE         = aws_dynamodb_table.main[0].name
      AWS_REGION             = var.aws_region
      ENVIRONMENT            = var.environment
    }
  }

  tags = merge(
    var.tags,
    {
      Name        = "${var.project_name}-${var.environment}-auth"
      Description = "OAuth handler Lambda"
    }
  )

  lifecycle {
    ignore_changes = [source_code_hash]
  }
}

# CloudWatch Log Groups (auto-created by Lambda, but defining for retention policy)
resource "aws_cloudwatch_log_group" "agent" {
  count = 1

  name              = "/aws/lambda/${aws_lambda_function.agent[0].function_name}"
  retention_in_days = var.environment == "prod" ? 30 : 7

  tags = merge(
    var.tags,
    {
      Name = "${var.project_name}-${var.environment}-agent-logs"
    }
  )
}

resource "aws_cloudwatch_log_group" "mcp" {
  count = 1

  name              = "/aws/lambda/${aws_lambda_function.mcp[0].function_name}"
  retention_in_days = var.environment == "prod" ? 30 : 7

  tags = merge(
    var.tags,
    {
      Name = "${var.project_name}-${var.environment}-mcp-logs"
    }
  )
}

resource "aws_cloudwatch_log_group" "auth" {
  count = 1

  name              = "/aws/lambda/${aws_lambda_function.auth[0].function_name}"
  retention_in_days = var.environment == "prod" ? 30 : 7

  tags = merge(
    var.tags,
    {
      Name = "${var.project_name}-${var.environment}-auth-logs"
    }
  )
}

# Lambda permission for API Gateway to invoke Agent Lambda
resource "aws_lambda_permission" "api_gateway_agent" {
  count = 1

  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.agent[0].function_name
  principal     = "apigateway.amazonaws.com"

  source_arn = "${try(aws_api_gateway_rest_api.main[0].execution_arn, "*")}/*/*"
}

# Lambda permission for API Gateway to invoke Auth Lambda
resource "aws_lambda_permission" "api_gateway_auth" {
  count = 1

  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.auth[0].function_name
  principal     = "apigateway.amazonaws.com"

  source_arn = "${try(aws_api_gateway_rest_api.main[0].execution_arn, "*")}/*/*"
}

# Lambda Layer for MCP Server (optional - for shared dependencies)
# Uncomment if you want to use Lambda Layers instead of bundling everything
# resource "aws_lambda_layer_version" "mcp_server" {
#   count = 1
#
#   layer_name          = "${var.project_name}-${var.environment}-mcp-server"
#   description         = "MCP Xero Server shared dependencies"
#   compatible_runtimes = [var.lambda_runtime]
#
#   filename         = "${path.module}/../packages/mcp-xero-server/mcp-layer.zip"
#   source_code_hash = filebase64sha256("${path.module}/../packages/mcp-xero-server/mcp-layer.zip")
#
#   tags = merge(
#     var.tags,
#     {
#       Name = "${var.project_name}-${var.environment}-mcp-layer"
#     }
#   )
# }
