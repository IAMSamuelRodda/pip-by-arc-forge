# Multi-App AWS Cost Optimization Guide

## Overview

Strategies for managing 20-100+ applications in development without cost explosion.

**Target:** <$10/month for 100 dev apps

---

## Strategy 1: Shared Secrets Architecture (RECOMMENDED)

### Concept

All dev apps share the same third-party API keys, with app-specific secrets only for production.

### Structure

```
AWS Account
├── Secrets Manager (Shared - Dev Environment)
│   ├── shared/dev/anthropic-key          ($0.40/month)
│   ├── shared/dev/openai-key             ($0.40/month)
│   ├── shared/dev/stripe-test-key        ($0.40/month)
│   └── Total: $1.20/month for ALL dev apps ✅
│
├── Parameter Store (Free - App-Specific Config)
│   ├── /xero-agent/dev/xero_client_id
│   ├── /xero-agent/dev/database_name
│   ├── /todo-app/dev/notion_workspace_id
│   └── Total: $0/month (10k free parameters) ✅
│
└── Production Apps (Only when revenue starts)
    ├── xero-agent/prod/anthropic-key     ($0.40/month)
    ├── xero-agent/prod/xero-secret       ($0.40/month)
    └── Total: $0.80/month per PROFITABLE app
```

### Terraform Implementation

```hcl
# terraform/secrets-shared.tf

# Shared development secrets (used by ALL apps)
resource "aws_secretsmanager_secret" "shared_dev_anthropic" {
  name        = "shared/dev/anthropic-api-key"
  description = "Shared Anthropic API key for all dev environments"
}

resource "aws_secretsmanager_secret" "shared_dev_openai" {
  name        = "shared/dev/openai-api-key"
  description = "Shared OpenAI API key for all dev environments"
}

# App-specific config in Parameter Store (FREE)
resource "aws_ssm_parameter" "app_xero_client_id" {
  name  = "/${var.project_name}/${var.environment}/xero_client_id"
  type  = "String"
  value = var.xero_client_id
}

resource "aws_ssm_parameter" "app_xero_client_secret" {
  name  = "/${var.project_name}/${var.environment}/xero_client_secret"
  type  = "SecureString"  # Encrypted with AWS managed KMS (free)
  value = var.xero_client_secret
}
```

### Lambda Code Pattern

```typescript
// Shared secret (all apps)
const anthropicKey = await getSharedSecret('shared/dev/anthropic-key');

// App-specific config (free Parameter Store)
const xeroClientId = await getParameter('/xero-agent/dev/xero_client_id');
const xeroSecret = await getParameter('/xero-agent/dev/xero_client_secret');
```

### Cost Breakdown

| Apps | Shared Secrets | App Configs | Total/Month |
|------|----------------|-------------|-------------|
| 1    | $1.20          | $0          | $1.20       |
| 20   | $1.20          | $0          | $1.20       |
| 100  | $1.20          | $0          | $1.20       |

**Savings:** $118.80/month at 100 apps! 🎉

---

## Strategy 2: Dev = Parameter Store, Prod = Secrets Manager

### Concept

Use free Parameter Store for dev (manual rotation acceptable), Secrets Manager only for production (revenue-generating).

### Implementation

```hcl
# Use Parameter Store for dev
resource "aws_ssm_parameter" "anthropic_key" {
  count = var.environment == "dev" ? 1 : 0

  name  = "/${var.project_name}/dev/anthropic_key"
  type  = "SecureString"
  value = var.anthropic_api_key
}

# Use Secrets Manager for prod (only when profitable)
resource "aws_secretsmanager_secret" "anthropic_key" {
  count = var.environment == "prod" ? 1 : 0

  name = "${var.project_name}/prod/anthropic-key"

  rotation_rules {
    automatically_after_days = 90
  }
}
```

### Cost Breakdown

| Apps | Dev (Param Store) | Prod (Secrets Manager) | Total/Month |
|------|-------------------|------------------------|-------------|
| 100 dev | $0 | $0 | $0 ✅ |
| 100 dev + 5 prod | $0 | $15 (5×3 secrets) | $15 |

**When to promote to prod:** Only when app generates >$50/month revenue (covers AWS costs)

---

## Strategy 3: Multi-Tenant Single AWS Account

### Concept

Run all dev apps in one AWS account, separate prod apps to individual accounts.

### Structure

```
Development AWS Account (Personal)
├── 100 dev apps sharing infrastructure
├── 1 DynamoDB table (PAY_PER_REQUEST) - FREE
├── 100 Lambda functions - FREE (< 1M requests)
├── 1 API Gateway - FREE (< 1M requests)
├── 3 shared Secrets Manager secrets - $1.20/month
└── Total: $1.20/month ✅

Production AWS Accounts (Per Profitable App)
├── xero-agent-prod (Account 1)
│   └── Full infrastructure: ~$5-20/month
├── todo-app-prod (Account 2)
│   └── Full infrastructure: ~$5-20/month
└── Only create when app makes >$50/month
```

### Benefits

- **Cost isolation:** Prod apps can't affect each other
- **Security:** Complete separation for customer data
- **Billing:** Easy to track per-app costs

---

## Strategy 4: Aggressive Free Tier Optimization

### Services to ALWAYS Use Free Tier

| Service | Free Tier | Dev Strategy |
|---------|-----------|--------------|
| **Parameter Store** | 10,000 params | Use for ALL non-rotating secrets |
| **DynamoDB** | 25GB + 25 RCU/WCU | PAY_PER_REQUEST mode |
| **Lambda** | 1M requests + 400k GB-sec | Share across all apps |
| **API Gateway** | 1M calls/month (12 months) | Regional endpoints only |
| **Cognito** | 50k MAUs | Shared user pool for dev |
| **CloudWatch Logs** | 5GB ingestion | 7-day retention for dev |
| **S3** | 5GB storage + 20k GET | Use for static assets |
| **CloudFront** | 1TB transfer | Optional for dev |

### Services to AVOID in Dev

| Service | Cost | Alternative |
|---------|------|-------------|
| NAT Gateway | $32/month | Use public subnets or no VPC |
| ALB | $16/month | Use API Gateway directly |
| RDS | $15+/month | Use DynamoDB or local Docker |
| Secrets Manager | $0.40/secret | Parameter Store (free) |
| KMS (custom keys) | $1/month | AWS managed keys (free) |

---

## Strategy 5: Monorepo with Shared Infrastructure

### Concept

One Terraform state manages infrastructure for ALL dev apps.

```
repos/
├── aws-shared-infra/          # Single Terraform project
│   ├── terraform/
│   │   ├── shared-secrets.tf  # 3 secrets ($1.20/month)
│   │   ├── api-gateway.tf     # Shared API Gateway
│   │   └── dynamodb.tf        # Shared DynamoDB table
│   └── Cost: $1.20/month total
│
├── xero-agent/                # App 1
│   └── functions/             # Lambda code only
│
├── todo-app/                  # App 2
│   └── functions/
│
└── ... (98 more apps)
```

### Benefits

- **Single deploy:** `terraform apply` updates all apps
- **Shared resources:** 1 API Gateway, 1 DynamoDB table
- **Cost:** $1.20/month regardless of app count

---

## Recommended Approach for You

### Phase 1: 0-5 Apps (Current)
**Use:** Shared secrets + Parameter Store
**Cost:** $1.20/month
**Terraform:** Per-app repos with shared secrets module

### Phase 2: 5-20 Apps
**Use:** Monorepo infrastructure + shared resources
**Cost:** $1.20-2/month
**Terraform:** Single infra repo, per-app Lambda code

### Phase 3: 20-100 Apps
**Use:** Multi-tenant shared account
**Cost:** $2-5/month
**Consider:** Infrastructure-as-code templates/scaffolding

### Phase 4: First Profitable App
**Action:** Migrate to dedicated prod AWS account
**Cost:** $5-20/month per prod app
**Funding:** From app revenue

---

## Quick Reference: Secret Storage Decision Tree

```
Does the secret need automatic rotation?
├─ YES → Does the app generate revenue?
│         ├─ YES → Secrets Manager ($0.40/month)
│         └─ NO  → Parameter Store (free, manual rotation)
│
└─ NO  → Is it user-specific data?
          ├─ YES → DynamoDB encrypted (free)
          └─ NO  → Parameter Store (free)
```

---

## Action Items for Your Xero Agent

1. ✅ Keep `shared/dev/anthropic-key` in Secrets Manager ($0.40)
2. ✅ Keep `shared/dev/xero-client-secret` in Secrets Manager ($0.40)
3. ❌ Move per-user `xero-tokens` to DynamoDB (save $0.40)
4. ✅ Use Parameter Store for app-specific config (free)

**Result:** $0.80/month, scales to 100 apps with no cost increase

---

## Further Optimization: AWS Organizations

For 50+ apps, consider:

```
AWS Organization (Root)
├── Dev OU
│   └── Shared Dev Account ($2/month for all apps)
├── Prod OU
│   ├── xero-agent-prod ($10/month)
│   ├── todo-app-prod ($8/month)
│   └── ... (only profitable apps)
└── Consolidated Billing (track per-app costs)
```

---

## Cost Projection

| Milestone | Apps | Monthly Cost | Strategy |
|-----------|------|--------------|----------|
| Starting | 1 | $0.80 | This project |
| Exploring | 5 | $1.20 | Shared secrets |
| Building | 20 | $1.20 | Shared secrets + Parameter Store |
| Portfolio | 100 | $2-5 | Multi-tenant architecture |
| First revenue | 1 prod | +$5-20 | Dedicated prod account |

---

**Last Updated:** 2025-11-14
