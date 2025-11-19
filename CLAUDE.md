# Zero Agent - CLAUDE.md

> **Purpose**: Minimal navigation hub for AI agents (pointers to detailed documentation)
> **Lifecycle**: Living (target: ~100 lines max)

## 📍 Critical Documents

**Before starting work:**
1. `STATUS.md` → Current issues, active work, blockers
2. `ARCHITECTURE.md` → System design, database schema, tech stack
3. `CONTRIBUTING.md` → Progress tracking workflow

**Before finishing work:**
1. Update `STATUS.md` → Document investigation notes
2. Update issues → Close completed tasks, link commits
3. Check `DEVELOPMENT.md` → Run pre-commit checklist

---

## 🏗️ Architecture Quick Facts

**Style**: Multi-tier serverless on AWS (PWA → Lambda Agent → Lambda MCP → Xero API)

**Structure**: Monorepo with packages + Lambda functions + Terraform IaC

See `ARCHITECTURE.md` for complete details.

---

## 🎯 Naming Conventions

- **Packages**: kebab-case (`mcp-xero-server`, `pwa-app`)
- **Files**: kebab-case for modules, PascalCase for React components
- **Functions**: camelCase for functions, PascalCase for React components
- **MCP Tools**: snake_case (`create_invoice`, `get_bank_transactions`)

---

## ⚠️ Critical Constraints

1. **ALWAYS use `pnpm`** for package management (NOT npm or yarn)
2. **OAuth tokens in Secrets Manager ONLY** - never in environment variables or DynamoDB
3. **Xero OAuth**: 30-min access token expiry, 30-day refresh token validity, requires `offline_access` scope
4. **DynamoDB single-table design** - define access patterns before schema
5. **IAM least privilege** - separate Lambda roles for agent, MCP, and auth
6. **HTTPS mandatory** - enforced by CloudFront + API Gateway for PWA and OAuth callbacks

---

## 🔄 Workflow Quick Reference

**Branch from dev, PR to dev** (NOT main). See `CONTRIBUTING.md` for details.

```bash
# Development
pnpm install
pnpm dev

# Testing
pnpm test

# Infrastructure
cd infrastructure/terraform
terraform plan
terraform apply

# Deployment
pnpm build
aws s3 sync packages/pwa-app/dist s3://<bucket>
aws cloudfront create-invalidation --distribution-id <id> --paths "/*"
```

---

**Last Updated**: 2025-11-12
