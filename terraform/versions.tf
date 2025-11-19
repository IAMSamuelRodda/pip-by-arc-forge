terraform {
  required_version = ">= 1.6.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # Backend configuration for remote state (S3 + DynamoDB for locking)
  # Uncomment and configure when ready for team collaboration
  # backend "s3" {
  #   bucket         = "zero-agent-terraform-state"
  #   key            = "prod/terraform.tfstate"
  #   region         = "us-east-1"
  #   encrypt        = true
  #   dynamodb_table = "terraform-state-lock"
  # }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "zero-agent"
      Environment = var.environment
      ManagedBy   = "terraform"
    }
  }
}
