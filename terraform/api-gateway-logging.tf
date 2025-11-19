# API Gateway CloudWatch Logging Setup
# Required for enabling CloudWatch logs on API Gateway stages

# IAM role for API Gateway to write to CloudWatch Logs
resource "aws_iam_role" "api_gateway_cloudwatch" {
  count = 1

  name = "${var.project_name}-${var.environment}-api-gateway-cloudwatch"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "apigateway.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })

  tags = merge(
    var.tags,
    {
      Name = "${var.project_name}-${var.environment}-api-gateway-cloudwatch-role"
    }
  )
}

# Attach AWS managed policy for CloudWatch Logs
resource "aws_iam_role_policy_attachment" "api_gateway_cloudwatch" {
  count = 1

  role       = aws_iam_role.api_gateway_cloudwatch[0].name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonAPIGatewayPushToCloudWatchLogs"
}

# Set the CloudWatch Logs role for API Gateway (account-wide setting)
resource "aws_api_gateway_account" "main" {
  count = 1

  cloudwatch_role_arn = aws_iam_role.api_gateway_cloudwatch[0].arn
}
