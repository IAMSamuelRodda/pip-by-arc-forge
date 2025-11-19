# API Gateway for Zero Agent
# Provides REST API endpoints for PWA and OAuth callbacks

# REST API
resource "aws_api_gateway_rest_api" "main" {
  count = 1

  name        = "${var.project_name}-${var.environment}-api"
  description = "REST API for Zero Agent - PWA backend and OAuth"

  endpoint_configuration {
    types = ["REGIONAL"]
  }

  tags = merge(
    var.tags,
    {
      Name = "${var.project_name}-${var.environment}-api"
    }
  )
}

# ===== CORS Configuration Module =====
# Reusable CORS configuration for all routes

locals {
  cors_resources = {
    chat                = aws_api_gateway_resource.chat[0].id
    sessions            = aws_api_gateway_resource.sessions[0].id
    sessions_id         = aws_api_gateway_resource.sessions_id[0].id
    auth                = aws_api_gateway_resource.auth[0].id
    auth_xero           = aws_api_gateway_resource.auth_xero[0].id
    auth_xero_login     = aws_api_gateway_resource.auth_xero_login[0].id
    auth_xero_callback  = aws_api_gateway_resource.auth_xero_callback[0].id
    auth_xero_refresh   = aws_api_gateway_resource.auth_xero_refresh[0].id
    auth_status         = aws_api_gateway_resource.auth_status[0].id
  }
}

resource "aws_api_gateway_method" "cors_preflight" {
  for_each = local.cors_resources

  rest_api_id   = aws_api_gateway_rest_api.main[0].id
  resource_id   = each.value
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "cors_preflight" {
  for_each = aws_api_gateway_method.cors_preflight

  rest_api_id = aws_api_gateway_rest_api.main[0].id
  resource_id = each.value.resource_id
  http_method = each.value.http_method

  type = "MOCK"

  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

resource "aws_api_gateway_method_response" "cors_preflight" {
  for_each = aws_api_gateway_method.cors_preflight

  rest_api_id = aws_api_gateway_rest_api.main[0].id
  resource_id = each.value.resource_id
  http_method = each.value.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }

  response_models = {
    "application/json" = "Empty"
  }
}

resource "aws_api_gateway_integration_response" "cors_preflight" {
  for_each = aws_api_gateway_integration.cors_preflight

  rest_api_id = aws_api_gateway_rest_api.main[0].id
  resource_id = each.value.resource_id
  http_method = each.value.http_method
  status_code = aws_api_gateway_method_response.cors_preflight[each.key].status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,POST,PUT,DELETE,OPTIONS'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }
}

# ===== API Resources (Routes) =====

# Root level resources
resource "aws_api_gateway_resource" "chat" {
  count = 1

  rest_api_id = aws_api_gateway_rest_api.main[0].id
  parent_id   = aws_api_gateway_rest_api.main[0].root_resource_id
  path_part   = "chat"
}

resource "aws_api_gateway_resource" "sessions" {
  count = 1

  rest_api_id = aws_api_gateway_rest_api.main[0].id
  parent_id   = aws_api_gateway_rest_api.main[0].root_resource_id
  path_part   = "sessions"
}

resource "aws_api_gateway_resource" "sessions_id" {
  count = 1

  rest_api_id = aws_api_gateway_rest_api.main[0].id
  parent_id   = aws_api_gateway_resource.sessions[0].id
  path_part   = "{sessionId}"
}

resource "aws_api_gateway_resource" "auth" {
  count = 1

  rest_api_id = aws_api_gateway_rest_api.main[0].id
  parent_id   = aws_api_gateway_rest_api.main[0].root_resource_id
  path_part   = "auth"
}

# /auth nested resources
resource "aws_api_gateway_resource" "auth_xero" {
  count = 1

  rest_api_id = aws_api_gateway_rest_api.main[0].id
  parent_id   = aws_api_gateway_resource.auth[0].id
  path_part   = "xero"
}

resource "aws_api_gateway_resource" "auth_xero_login" {
  count = 1

  rest_api_id = aws_api_gateway_rest_api.main[0].id
  parent_id   = aws_api_gateway_resource.auth_xero[0].id
  path_part   = "login"
}

resource "aws_api_gateway_resource" "auth_xero_callback" {
  count = 1

  rest_api_id = aws_api_gateway_rest_api.main[0].id
  parent_id   = aws_api_gateway_resource.auth_xero[0].id
  path_part   = "callback"
}

resource "aws_api_gateway_resource" "auth_xero_refresh" {
  count = 1

  rest_api_id = aws_api_gateway_rest_api.main[0].id
  parent_id   = aws_api_gateway_resource.auth_xero[0].id
  path_part   = "refresh"
}

resource "aws_api_gateway_resource" "auth_status" {
  count = 1

  rest_api_id = aws_api_gateway_rest_api.main[0].id
  parent_id   = aws_api_gateway_resource.auth[0].id
  path_part   = "status"
}

# ===== Chat Endpoint =====
# POST /chat - Send message to agent

resource "aws_api_gateway_method" "chat_post" {
  count = 1

  rest_api_id   = aws_api_gateway_rest_api.main[0].id
  resource_id   = aws_api_gateway_resource.chat[0].id
  http_method   = "POST"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito[0].id
}

resource "aws_api_gateway_integration" "chat_post" {
  count = 1

  rest_api_id             = aws_api_gateway_rest_api.main[0].id
  resource_id             = aws_api_gateway_resource.chat[0].id
  http_method             = aws_api_gateway_method.chat_post[0].http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.agent[0].invoke_arn
}

resource "aws_api_gateway_method_response" "chat_post" {
  count = 1

  rest_api_id = aws_api_gateway_rest_api.main[0].id
  resource_id = aws_api_gateway_resource.chat[0].id
  http_method = aws_api_gateway_method.chat_post[0].http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin" = true
  }
}

# ===== Sessions Endpoints =====
# POST /sessions - Create new session
# GET /sessions/:id - Get session by ID

resource "aws_api_gateway_method" "sessions_post" {
  count = 1

  rest_api_id   = aws_api_gateway_rest_api.main[0].id
  resource_id   = aws_api_gateway_resource.sessions[0].id
  http_method   = "POST"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito[0].id
}

resource "aws_api_gateway_integration" "sessions_post" {
  count = 1

  rest_api_id             = aws_api_gateway_rest_api.main[0].id
  resource_id             = aws_api_gateway_resource.sessions[0].id
  http_method             = aws_api_gateway_method.sessions_post[0].http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.agent[0].invoke_arn
}

resource "aws_api_gateway_method" "sessions_get" {
  count = 1

  rest_api_id   = aws_api_gateway_rest_api.main[0].id
  resource_id   = aws_api_gateway_resource.sessions_id[0].id
  http_method   = "GET"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito[0].id

  request_parameters = {
    "method.request.path.sessionId" = true
  }
}

resource "aws_api_gateway_integration" "sessions_get" {
  count = 1

  rest_api_id             = aws_api_gateway_rest_api.main[0].id
  resource_id             = aws_api_gateway_resource.sessions_id[0].id
  http_method             = aws_api_gateway_method.sessions_get[0].http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.agent[0].invoke_arn
}

# ===== Auth Endpoints =====
# GET /auth/xero/login - Initiate Xero OAuth
# GET /auth/xero/callback - OAuth callback
# POST /auth/xero/refresh - Refresh Xero tokens
# GET /auth/status - Check auth status

resource "aws_api_gateway_method" "auth_xero_login" {
  count = 1

  rest_api_id   = aws_api_gateway_rest_api.main[0].id
  resource_id   = aws_api_gateway_resource.auth_xero_login[0].id
  http_method   = "GET"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito[0].id
}

resource "aws_api_gateway_integration" "auth_xero_login" {
  count = 1

  rest_api_id             = aws_api_gateway_rest_api.main[0].id
  resource_id             = aws_api_gateway_resource.auth_xero_login[0].id
  http_method             = aws_api_gateway_method.auth_xero_login[0].http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.auth[0].invoke_arn
}

resource "aws_api_gateway_method" "auth_xero_callback" {
  count = 1

  rest_api_id   = aws_api_gateway_rest_api.main[0].id
  resource_id   = aws_api_gateway_resource.auth_xero_callback[0].id
  http_method   = "GET"
  authorization = "NONE"  # OAuth callback doesn't require Cognito auth

  request_parameters = {
    "method.request.querystring.code"  = true
    "method.request.querystring.state" = true
  }
}

resource "aws_api_gateway_integration" "auth_xero_callback" {
  count = 1

  rest_api_id             = aws_api_gateway_rest_api.main[0].id
  resource_id             = aws_api_gateway_resource.auth_xero_callback[0].id
  http_method             = aws_api_gateway_method.auth_xero_callback[0].http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.auth[0].invoke_arn
}

resource "aws_api_gateway_method" "auth_xero_refresh" {
  count = 1

  rest_api_id   = aws_api_gateway_rest_api.main[0].id
  resource_id   = aws_api_gateway_resource.auth_xero_refresh[0].id
  http_method   = "POST"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito[0].id
}

resource "aws_api_gateway_integration" "auth_xero_refresh" {
  count = 1

  rest_api_id             = aws_api_gateway_rest_api.main[0].id
  resource_id             = aws_api_gateway_resource.auth_xero_refresh[0].id
  http_method             = aws_api_gateway_method.auth_xero_refresh[0].http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.auth[0].invoke_arn
}

resource "aws_api_gateway_method" "auth_status" {
  count = 1

  rest_api_id   = aws_api_gateway_rest_api.main[0].id
  resource_id   = aws_api_gateway_resource.auth_status[0].id
  http_method   = "GET"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito[0].id
}

resource "aws_api_gateway_integration" "auth_status" {
  count = 1

  rest_api_id             = aws_api_gateway_rest_api.main[0].id
  resource_id             = aws_api_gateway_resource.auth_status[0].id
  http_method             = aws_api_gateway_method.auth_status[0].http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.auth[0].invoke_arn
}

# ===== Cognito Authorizer =====

resource "aws_api_gateway_authorizer" "cognito" {
  count = 1

  name          = "${var.project_name}-${var.environment}-cognito-authorizer"
  rest_api_id   = aws_api_gateway_rest_api.main[0].id
  type          = "COGNITO_USER_POOLS"
  provider_arns = [aws_cognito_user_pool.main[0].arn]

  identity_source = "method.request.header.Authorization"
}

# ===== Deployment & Stage =====

resource "aws_api_gateway_deployment" "main" {
  count = 1

  rest_api_id = aws_api_gateway_rest_api.main[0].id

  # Force redeployment on any change
  triggers = {
    redeployment = sha1(jsonencode([
      aws_api_gateway_resource.chat,
      aws_api_gateway_resource.sessions,
      aws_api_gateway_resource.auth,
      aws_api_gateway_method.chat_post,
      aws_api_gateway_method.sessions_post,
      aws_api_gateway_method.sessions_get,
      aws_api_gateway_method.auth_xero_login,
      aws_api_gateway_method.auth_xero_callback,
      aws_api_gateway_method.auth_xero_refresh,
      aws_api_gateway_method.auth_status,
      aws_api_gateway_integration.chat_post,
      aws_api_gateway_integration.sessions_post,
      aws_api_gateway_integration.sessions_get,
      aws_api_gateway_integration.auth_xero_login,
      aws_api_gateway_integration.auth_xero_callback,
      aws_api_gateway_integration.auth_xero_refresh,
      aws_api_gateway_integration.auth_status,
    ]))
  }

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_api_gateway_stage" "main" {
  count = 1

  deployment_id = aws_api_gateway_deployment.main[0].id
  rest_api_id   = aws_api_gateway_rest_api.main[0].id
  stage_name    = var.environment

  # Enable CloudWatch logging
  access_log_settings {
    destination_arn = aws_cloudwatch_log_group.api_gateway[0].arn
    format = jsonencode({
      requestId      = "$context.requestId"
      ip             = "$context.identity.sourceIp"
      caller         = "$context.identity.caller"
      user           = "$context.identity.user"
      requestTime    = "$context.requestTime"
      httpMethod     = "$context.httpMethod"
      resourcePath   = "$context.resourcePath"
      status         = "$context.status"
      protocol       = "$context.protocol"
      responseLength = "$context.responseLength"
    })
  }

  # Enable detailed CloudWatch metrics
  xray_tracing_enabled = false  # Enable in production

  tags = merge(
    var.tags,
    {
      Name = "${var.project_name}-${var.environment}-api-stage"
    }
  )
}

# CloudWatch Log Group for API Gateway access logs
resource "aws_cloudwatch_log_group" "api_gateway" {
  count = 1

  name              = "/aws/apigateway/${var.project_name}-${var.environment}"
  retention_in_days = var.environment == "prod" ? 30 : 7

  tags = merge(
    var.tags,
    {
      Name = "${var.project_name}-${var.environment}-api-gateway-logs"
    }
  )
}

# ===== API Gateway Method Settings =====
# Configure throttling and caching per stage

resource "aws_api_gateway_method_settings" "main" {
  count = 1

  rest_api_id = aws_api_gateway_rest_api.main[0].id
  stage_name  = aws_api_gateway_stage.main[0].stage_name
  method_path = "*/*"

  settings {
    # Throttling
    throttling_burst_limit = var.environment == "prod" ? 5000 : 100
    throttling_rate_limit  = var.environment == "prod" ? 2000 : 50

    # Logging
    logging_level      = var.environment == "prod" ? "INFO" : "INFO"
    data_trace_enabled = var.environment == "prod" ? false : true
    metrics_enabled    = true

    # Caching (disabled for dev, optional for prod)
    caching_enabled = false
  }
}
