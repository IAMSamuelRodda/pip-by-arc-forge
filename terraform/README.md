# Xero Agent - Terraform Infrastructure

AWS infrastructure for Xero Agent using Terraform.

## Quick Start

### Prerequisites

1. **AWS CLI configured** with credentials:
   ```bash
   aws configure
   ```

2. **Terraform installed** (>= 1.6.0):
   ```bash
   terraform --version
   ```

3. **Xero Developer Account**:
   - Create app at: https://developer.xero.com/app/manage
   - Note your Client ID and Client Secret

4. **Anthropic API Key**:
   - Get from: https://console.anthropic.com/

### Initial Setup

1. **Copy configuration template**:
   ```bash
   cp terraform.tfvars.example terraform.tfvars
   ```

2. **Edit terraform.tfvars** with your values:
   ```bash
   # Required fields
   aws_region            = "us-east-1"  # Change based on user location
   xero_client_id        = "your-client-id"
   xero_client_secret    = "your-client-secret"
   anthropic_api_key     = "your-api-key"
   ```

3. **Initialize Terraform**:
   ```bash
   terraform init
   ```

4. **Validate configuration**:
   ```bash
   terraform validate
   terraform fmt
   ```

5. **Preview changes**:
   ```bash
   terraform plan
   ```

6. **Deploy infrastructure**:
   ```bash
   terraform apply
   ```

## Configuration

See `terraform.tfvars.example` for all available options.

### Cost Optimization

For dev/POC environments, disable expensive resources:

```hcl
enable_nat_gateway = false  # Saves ~$50/month
enable_alb         = false  # Saves ~$25/month
enable_cloudfront  = true   # Keep enabled (within free tier)
```

### Region Selection

**IMPORTANT**: Choose AWS region based on user location to minimize latency:

- **US users**: `us-east-1` (default) or `us-west-2`
- **EU users**: `eu-west-1` (Ireland) or `eu-central-1` (Frankfurt)
- **APAC users**: `ap-southeast-2` (Sydney) or `ap-northeast-1` (Tokyo)

See CLAUDE.md for details on latency impact.

## Architecture

This Terraform configuration creates:

- **DynamoDB**: Single-table design with GSIs
- **Lambda**: Functions for agent, MCP, and auth
- **API Gateway**: REST API with Cognito authorizer
- **Cognito**: User pool for authentication
- **S3 + CloudFront**: PWA hosting (if enabled)
- **Secrets Manager**: Xero tokens and API keys
- **IAM**: Least-privilege roles for all services
- **CloudWatch**: Logging and monitoring

See `../../ARCHITECTURE.md` for complete system design.

## Outputs

After deployment, Terraform outputs key values:

```bash
terraform output

# Get specific values
terraform output pwa_url
terraform output api_gateway_url
terraform output dynamodb_table_name
```

## Deployment Workflow

### Development

```bash
terraform workspace select dev  # Or create: terraform workspace new dev
terraform apply -var="environment=dev"
```

### Staging

```bash
terraform workspace select staging
terraform apply -var="environment=staging"
```

### Production

```bash
terraform workspace select prod
terraform apply -var="environment=prod"
```

**Production differences**:
- Point-in-time recovery enabled for DynamoDB
- Deletion protection enabled
- KMS customer-managed keys for Secrets Manager
- CloudWatch alarms configured

## State Management

### Local State (Default)

For solo development, Terraform state is stored locally in `.terraform/`.

### Remote State (Team Collaboration)

For team collaboration, configure S3 backend in `versions.tf`:

1. **Create S3 bucket and DynamoDB table** (one-time):
   ```bash
   aws s3 mb s3://xero-agent-terraform-state --region us-east-1
   # DynamoDB table created by Terraform (see dynamodb.tf)
   ```

2. **Uncomment backend config** in `versions.tf`:
   ```hcl
   backend "s3" {
     bucket         = "xero-agent-terraform-state"
     key            = "prod/terraform.tfstate"
     region         = "us-east-1"
     encrypt        = true
     dynamodb_table = "xero-agent-terraform-state-lock"
   }
   ```

3. **Migrate state**:
   ```bash
   terraform init -migrate-state
   ```

## Common Tasks

### Update Lambda Functions

```bash
# Update function code (after building packages)
terraform apply -target=aws_lambda_function.agent
terraform apply -target=aws_lambda_function.mcp
```

### Rotate Secrets

```bash
# Manual rotation via AWS Console or CLI
aws secretsmanager rotate-secret \
  --secret-id xero-agent/dev/xero-tokens
```

### View Logs

```bash
# Agent logs
aws logs tail /aws/lambda/xero-agent-dev-agent --follow

# MCP logs
aws logs tail /aws/lambda/xero-agent-dev-mcp --follow
```

### Destroy Infrastructure

**WARNING**: This deletes all resources and data!

```bash
terraform destroy
```

## Troubleshooting

### Common Issues

**1. DynamoDB Throttling**:
- Check CloudWatch metrics
- Consider switching to PROVISIONED mode with auto-scaling
- Or increase PAY_PER_REQUEST capacity

**2. Lambda Cold Starts**:
- Enable provisioned concurrency (production):
  ```hcl
  lambda_provisioned_concurrency = 2
  ```

**3. Xero Token Refresh Failures**:
- Check Lambda logs for errors
- Verify Secrets Manager permissions
- Ensure `offline_access` scope granted

**4. High Costs**:
- Review enabled resources (NAT Gateway, ALB)
- Check DynamoDB read/write units
- Monitor CloudWatch metrics

See `terraform-aws-infrastructure` skill in CLAUDE.md for detailed troubleshooting.

## Security

- **Secrets**: Never commit `terraform.tfvars` or `.tfstate` files
- **IAM**: All roles follow least-privilege principle
- **Encryption**: At-rest encryption enabled for all data stores
- **TLS**: Enforced for all APIs via API Gateway and CloudFront

## References

- [Terraform AWS Provider](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
- [AWS Lambda Best Practices](https://docs.aws.amazon.com/lambda/latest/dg/best-practices.html)
- [DynamoDB Single-Table Design](https://www.alexdebrie.com/posts/dynamodb-single-table/)
- Project Architecture: `../../ARCHITECTURE.md`
- Development Guide: `../../DEVELOPMENT.md`
