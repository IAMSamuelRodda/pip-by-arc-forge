# DynamoDB Single-Table Design
# See ARCHITECTURE.md for complete schema and access patterns

resource "aws_dynamodb_table" "main" {
  count = 1

  name         = "${var.project_name}-${var.environment}-main"
  billing_mode = var.dynamodb_billing_mode

  # Primary key
  hash_key  = "PK"
  range_key = "SK"

  # Provisioned capacity (only used if billing_mode = "PROVISIONED")
  read_capacity  = var.dynamodb_billing_mode == "PROVISIONED" ? var.dynamodb_read_capacity : null
  write_capacity = var.dynamodb_billing_mode == "PROVISIONED" ? var.dynamodb_write_capacity : null

  # Primary key attributes
  attribute {
    name = "PK"
    type = "S"
  }

  attribute {
    name = "SK"
    type = "S"
  }

  # GSI1: Organization -> Users lookup, Active session queries
  attribute {
    name = "GSI1PK"
    type = "S"
  }

  attribute {
    name = "GSI1SK"
    type = "S"
  }

  # GSI2: Relationship stage queries for cohort analysis
  attribute {
    name = "GSI2PK"
    type = "S"
  }

  attribute {
    name = "GSI2SK"
    type = "S"
  }

  # Global Secondary Index 1: Organization -> Users, Sessions
  global_secondary_index {
    name            = "GSI1"
    hash_key        = "GSI1PK"
    range_key       = "GSI1SK"
    projection_type = "ALL"

    read_capacity  = var.dynamodb_billing_mode == "PROVISIONED" ? var.dynamodb_read_capacity : null
    write_capacity = var.dynamodb_billing_mode == "PROVISIONED" ? var.dynamodb_write_capacity : null
  }

  # Global Secondary Index 2: Relationship stage queries
  global_secondary_index {
    name            = "GSI2"
    hash_key        = "GSI2PK"
    range_key       = "GSI2SK"
    projection_type = "ALL"

    read_capacity  = var.dynamodb_billing_mode == "PROVISIONED" ? var.dynamodb_read_capacity : null
    write_capacity = var.dynamodb_billing_mode == "PROVISIONED" ? var.dynamodb_write_capacity : null
  }

  # TTL for automatic expiration (sessions, cache, extended memory)
  ttl {
    attribute_name = "expiresAt"
    enabled        = true
  }

  # Point-in-time recovery for production
  point_in_time_recovery {
    enabled = var.environment == "prod"
  }

  # Encryption at rest (AWS managed keys)
  server_side_encryption {
    enabled = true
  }

  # Prevent accidental deletion in production
  deletion_protection_enabled = var.environment == "prod"

  tags = merge(
    var.tags,
    {
      Name        = "${var.project_name}-${var.environment}-main"
      Description = "Single-table design for users, sessions, organizations, tokens, memory"
    }
  )
}

# CloudWatch Alarms for DynamoDB (production monitoring)
resource "aws_cloudwatch_metric_alarm" "dynamodb_read_throttle" {
  count = var.environment == "prod" ? 1 : 0

  alarm_name          = "${var.project_name}-${var.environment}-dynamodb-read-throttle"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "ReadThrottleEvents"
  namespace           = "AWS/DynamoDB"
  period              = 300
  statistic           = "Sum"
  threshold           = 10
  alarm_description   = "Triggers when DynamoDB read throttle events exceed threshold"
  treat_missing_data  = "notBreaching"

  dimensions = {
    TableName = aws_dynamodb_table.main[0].name
  }

  tags = var.tags
}

resource "aws_cloudwatch_metric_alarm" "dynamodb_write_throttle" {
  count = var.environment == "prod" ? 1 : 0

  alarm_name          = "${var.project_name}-${var.environment}-dynamodb-write-throttle"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "WriteThrottleEvents"
  namespace           = "AWS/DynamoDB"
  period              = 300
  statistic           = "Sum"
  threshold           = 10
  alarm_description   = "Triggers when DynamoDB write throttle events exceed threshold"
  treat_missing_data  = "notBreaching"

  dimensions = {
    TableName = aws_dynamodb_table.main[0].name
  }

  tags = var.tags
}

# DynamoDB table for Terraform state locking (optional, for team collaboration)
resource "aws_dynamodb_table" "terraform_state_lock" {
  count = var.environment == "prod" ? 1 : 0

  name         = "${var.project_name}-terraform-state-lock"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "LockID"

  attribute {
    name = "LockID"
    type = "S"
  }

  server_side_encryption {
    enabled = true
  }

  tags = merge(
    var.tags,
    {
      Name        = "${var.project_name}-terraform-state-lock"
      Description = "Terraform state locking for team collaboration"
    }
  )
}
