# Zero Agent - Deployment Guide

## Quick Start: Deploy to AWS

This guide will get your Zero Agent deployed and ready for manual testing in ~15 minutes.

**Cost:** $0.80/month (2 Secrets Manager secrets)

---

## Prerequisites

### 1. AWS Account Setup

```bash
# Install AWS CLI (if not installed)
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# Configure AWS credentials
aws configure
# AWS Access Key ID: <your-key>
# AWS Secret Access Key: <your-secret>
# Default region: us-east-1
# Default output format: json

# Verify
aws sts get-caller-identity
```

### 2. Xero Developer Account

1. Go to https://developer.xero.com/
2. Sign up / Log in
3. Click "My Apps" → "New App"
4. Fill in:
   - **App name:** Zero Agent Dev
   - **Integration type:** Web app
   - **Company/App URL:** https://yourdomain.com (can be localhost for dev)
   - **Redirect URI:** https://API_GATEWAY_URL/auth/xero/callback
     - ⚠️ **Note:** You'll update this after Terraform creates the API Gateway
5. Save your:
   - **Client ID:** (e.g., `ABC123...`)
   - **Client Secret:** (click "Generate a secret")

### 3. Anthropic API Key

1. Go to https://console.anthropic.com/
2. Navigate to "API Keys"
3. Create new key
4. Copy the key (starts with `sk-ant-...`)

---

## Step 1: Configure Terraform Variables

```bash
cd terraform

# Copy example config
cp terraform.tfvars.example terraform.tfvars

# Edit with your values
nano terraform.tfvars
```

**terraform.tfvars:**
```hcl
# AWS Configuration
aws_region  = "us-east-1"  # or your preferred region
environment = "dev"
project_name = "zero-agent"

# Xero OAuth (from Xero Developer Portal)
xero_client_id     = "YOUR_XERO_CLIENT_ID"
xero_client_secret = "YOUR_XERO_CLIENT_SECRET"

# Anthropic API Key (from Anthropic Console)
anthropic_api_key = "sk-ant-YOUR_KEY_HERE"

# Optional: Custom domain (leave empty for dev)
domain_name = ""

# Tags for cost tracking
tags = {
  Project     = "zero-agent"
  Environment = "dev"
  ManagedBy   = "terraform"
}
```

**⚠️ Security:**
```bash
# Ensure tfvars is gitignored (already done)
chmod 600 terraform.tfvars
```

---

## Step 2: Initialize Terraform

```bash
# Install providers and modules
terraform init

# Expected output:
# Terraform has been successfully initialized!
```

---

## Step 3: Review Infrastructure Plan

```bash
# See what will be created
terraform plan

# Expected resources (40+):
# - 1 DynamoDB table
# - 3 Lambda functions
# - 1 API Gateway
# - 1 Cognito User Pool
# - 2 Secrets Manager secrets
# - IAM roles and policies
# - CloudWatch log groups
```

**Cost estimate:** $0.80/month (all other services in free tier)

---

## Step 4: Deploy Infrastructure

```bash
# Create all resources
terraform apply

# Review the plan, then type: yes

# Deployment takes ~3-5 minutes
```

**Expected output:**
```
Apply complete! Resources: 42 added, 0 changed, 0 destroyed.

Outputs:

api_gateway_url = "https://abc123.execute-api.us-east-1.amazonaws.com/dev"
cognito_user_pool_id = "us-east-1_XYZ123"
cognito_user_pool_client_id = <sensitive>
dynamodb_table_name = "zero-agent-dev-main"
lambda_agent_function_name = "zero-agent-dev-agent"
lambda_mcp_function_name = "zero-agent-dev-mcp"

environment_summary = {
  "api_url" = "https://abc123.execute-api.us-east-1.amazonaws.com/dev"
  "cognito_user_pool" = "us-east-1_XYZ123"
  "dynamodb_table" = "zero-agent-dev-main"
  "environment" = "dev"
  "project" = "zero-agent"
  "pwa_url" = ""
  "region" = "us-east-1"
}
```

**Copy the `api_gateway_url`** - you'll need it for the next step!

---

## Step 5: Update Xero OAuth Redirect URI

1. Go back to https://developer.xero.com/myapps
2. Click your app
3. Update **Redirect URI** to:
   ```
   https://YOUR_API_GATEWAY_URL/auth/xero/callback
   ```
   Example: `https://abc123.execute-api.us-east-1.amazonaws.com/dev/auth/xero/callback`
4. Save

---

## Step 6: Create Test User in Cognito

```bash
# Get the Cognito User Pool ID from terraform output
POOL_ID=$(terraform output -raw cognito_user_pool_id)

# Create a test user
aws cognito-idp admin-create-user \
  --user-pool-id $POOL_ID \
  --username testuser@example.com \
  --user-attributes Name=email,Value=testuser@example.com Name=email_verified,Value=true \
  --temporary-password "TempPass123!" \
  --message-action SUPPRESS

# Set permanent password
aws cognito-idp admin-set-user-password \
  --user-pool-id $POOL_ID \
  --username testuser@example.com \
  --password "YourSecurePass123!" \
  --permanent

echo "✅ Test user created: testuser@example.com / YourSecurePass123!"
```

---

## Step 7: Test the API Endpoints

### Test 1: Health Check (API Gateway)

```bash
API_URL=$(terraform output -raw api_gateway_url)

# This should return 404 (expected - no root route)
curl $API_URL

# Expected: {"message":"Missing Authentication Token"}
# This means API Gateway is working ✅
```

### Test 2: Xero OAuth Flow

```bash
# Get Cognito credentials first
POOL_ID=$(terraform output -raw cognito_user_pool_id)
CLIENT_ID=$(terraform output -raw cognito_user_pool_client_id)

# Sign in to get JWT token
aws cognito-idp initiate-auth \
  --auth-flow USER_PASSWORD_AUTH \
  --client-id $CLIENT_ID \
  --auth-parameters USERNAME=testuser@example.com,PASSWORD=YourSecurePass123! \
  > auth_response.json

# Extract ID token
ID_TOKEN=$(cat auth_response.json | jq -r '.AuthenticationResult.IdToken')

# Test Xero OAuth initiation
curl -H "Authorization: Bearer $ID_TOKEN" \
  $API_URL/auth/xero/login

# Expected: Redirect URL to Xero authorization page
# {"authUrl":"https://login.xero.com/identity/connect/authorize?..."}
```

### Test 3: Create Session

```bash
# Create a new agent session
curl -X POST \
  -H "Authorization: Bearer $ID_TOKEN" \
  -H "Content-Type: application/json" \
  $API_URL/sessions

# Expected: {"sessionId":"uuid-here"}
```

### Test 4: Send Message to Agent

```bash
# Send a message to the agent
SESSION_ID="<session-id-from-above>"

curl -X POST \
  -H "Authorization: Bearer $ID_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message":"Hello! Can you help me with Xero?","sessionId":"'$SESSION_ID'"}' \
  $API_URL/chat

# Expected: Agent response with message
```

---

## Step 8: Monitor Logs

```bash
# Watch Agent Lambda logs
aws logs tail /aws/lambda/zero-agent-dev-agent --follow

# In another terminal: Watch MCP Lambda logs
aws logs tail /aws/lambda/zero-agent-dev-mcp --follow

# In another terminal: Watch Auth Lambda logs
aws logs tail /aws/lambda/zero-agent-dev-auth --follow
```

---

## Troubleshooting

### Issue: Terraform apply fails with "Secret already exists"

**Solution:**
```bash
# Delete existing secrets (if any)
aws secretsmanager delete-secret --secret-id shared/dev/api-keys --force-delete-without-recovery
aws secretsmanager delete-secret --secret-id zero-agent/dev/xero-oauth --force-delete-without-recovery

# Retry
terraform apply
```

### Issue: Lambda functions return "Internal Server Error"

**Check CloudWatch Logs:**
```bash
aws logs tail /aws/lambda/zero-agent-dev-agent --since 10m

# Common causes:
# - Missing environment variables
# - IAM permission issues
# - Lambda timeout (increase in terraform/variables.tf)
```

### Issue: Cognito authentication fails

**Verify user exists:**
```bash
POOL_ID=$(terraform output -raw cognito_user_pool_id)

aws cognito-idp admin-get-user \
  --user-pool-id $POOL_ID \
  --username testuser@example.com
```

### Issue: Xero OAuth callback fails

**Verify redirect URI:**
1. Check Xero Developer Portal → Your App → Redirect URIs
2. Must exactly match: `https://YOUR_API_GATEWAY_URL/auth/xero/callback`
3. No trailing slash!

---

## Cost Monitoring

### Set up billing alert:

```bash
# Create a budget for $5/month
aws budgets create-budget \
  --account-id $(aws sts get-caller-identity --query Account --output text) \
  --budget file://budget.json

# budget.json:
{
  "BudgetName": "XeroAgentDevBudget",
  "BudgetLimit": {
    "Amount": "5",
    "Unit": "USD"
  },
  "TimeUnit": "MONTHLY",
  "BudgetType": "COST"
}
```

### Check current costs:

```bash
# View cost for last 7 days
aws ce get-cost-and-usage \
  --time-period Start=2025-11-07,End=2025-11-14 \
  --granularity DAILY \
  --metrics BlendedCost \
  --group-by Type=SERVICE

# Expected services with costs:
# - Secrets Manager: $0.80/month
# - All others: $0 (free tier)
```

---

## Next Steps

Once deployed and tested:

1. **Build PWA Frontend**
   - See `packages/pwa-app/README.md`
   - Run locally: `pnpm --filter @zero-agent/pwa-app dev`
   - Connect to API Gateway URL

2. **Test Full OAuth Flow**
   - Sign up in PWA
   - Connect Xero account
   - Create invoice via chat

3. **Production Deployment**
   - Create `prod` workspace: `terraform workspace new prod`
   - Update `terraform.tfvars` with prod values
   - Deploy: `terraform apply`

---

## Cleanup (Delete Everything)

**⚠️ This deletes all resources and data!**

```bash
cd terraform

# Destroy all infrastructure
terraform destroy

# Type: yes

# Verify secrets are deleted
aws secretsmanager list-secrets --query 'SecretList[?Name==`shared/dev/api-keys`]'
```

**Cost after cleanup:** $0/month

---

## Architecture Summary

```
┌─────────────────────────────────────────────────────────┐
│ User → API Gateway → Lambda (Agent) → Lambda (MCP)     │
│          ↓              ↓                  ↓             │
│       Cognito      DynamoDB         Xero API            │
│                         ↓                                │
│                  Secrets Manager                        │
│                  (2 secrets = $0.80/month)              │
└─────────────────────────────────────────────────────────┘
```

**Secrets Storage:**
- ✅ Shared API keys → Secrets Manager ($0.40)
- ✅ Xero OAuth credentials → Secrets Manager ($0.40)
- ✅ User tokens → DynamoDB encrypted (free)
- ✅ User profiles → Cognito (free)

---

## Support

- **Documentation:** `docs/`
- **Architecture:** `ARCHITECTURE.md`
- **Status/Issues:** `STATUS.md`
- **Development:** `DEVELOPMENT.md`

---

**Last Updated:** 2025-11-14
