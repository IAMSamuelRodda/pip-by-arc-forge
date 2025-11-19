# Zero Agent

> **Purpose**: Project introduction and quick start guide
> **Lifecycle**: Stable (update when fundamentals change)

AI-powered accounting assistant for Xero, built with Claude Agent SDK and Model Context Protocol.

**Current Work**: See [`STATUS.md`](./STATUS.md)

---

## Overview

Zero Agent is a mobile-first Progressive Web App (PWA) that brings natural language interaction to Xero accounting software. Manage invoices, track expenses, generate financial reports, and reconcile bank accounts through conversational AI powered by Claude.

**Key Features:**
- **Conversational Invoicing** - Create, update, and manage invoices with natural language
- **Bank Reconciliation** - Automatic transaction matching with manual review support
- **Financial Reporting** - Generate profit & loss, balance sheets, and custom reports
- **Expense Tracking** - Record and categorize expenses conversationally
- **Multi-device Support** - Works on smartphones, tablets, and laptops
- **Offline Capable** - Draft invoices offline, sync when connected

---

## Quick Start

### Chat with Zero Agent (CLI)

The quickest way to try Zero Agent:

```bash
# 1. Clone and setup
git clone <repository-url>
cd zero-agent
pnpm install

# 2. Configure environment
cp .env.example .env
# Edit .env with your Xero and Anthropic credentials

# 3. Connect to Xero (one-time setup)
pnpm --filter @zero-agent/oauth-server dev
# Visit http://localhost:3000/auth/xero and authorize

# 4. Start chatting!
pnpm chat
```

See [`CHAT_GUIDE.md`](./CHAT_GUIDE.md) for detailed usage instructions.

### Full Development Setup

**For Developers:**
```bash
# Clone and setup
git clone <repository-url>
cd zero-agent
pnpm install

# Configure environment
cp .env.example .env
# Edit .env with your Xero API credentials and AWS settings

# Configure AWS CLI (for deployment)
aws configure  # Set region, credentials

# Initialize Terraform (for AWS deployment)
cd infrastructure/terraform
terraform init

# Run development servers
pnpm dev
```

**For AI Agents:**
See [`CONTRIBUTING.md`](./CONTRIBUTING.md) for workflow.

---

## Architecture

**Tech Stack:**
- **Frontend**: React + Vite (PWA with service workers)
- **Agent**: Claude Agent SDK (Lambda functions)
- **Integration**: MCP Server + xero-node SDK (Lambda)
- **Backend**: AWS Lambda (serverless Node.js 20+)
- **Database**: DynamoDB (single-table design)
- **Authentication**: AWS Cognito + Xero OAuth 2.0
- **Secrets**: AWS Secrets Manager (token encryption)
- **Infrastructure**: S3 + CloudFront + API Gateway
- **IaC**: Terraform (with optional CDK alternative)

**Architecture Pattern:**
```
PWA (S3/CloudFront) → API Gateway → Lambda Agent → Lambda MCP → Xero API
                           ↓              ↓              ↓
                       Cognito      DynamoDB     Secrets Manager
```

See [`ARCHITECTURE.md`](./ARCHITECTURE.md) for complete details.

---

## Documentation

- [`ARCHITECTURE.md`](./ARCHITECTURE.md) - System architecture, database schema, ADRs
- [`STATUS.md`](./STATUS.md) - Current work, known issues
- [`CONTRIBUTING.md`](./CONTRIBUTING.md) - Workflow, progress tracking
- [`DEVELOPMENT.md`](./DEVELOPMENT.md) - Git workflow, CI/CD, testing
- [`CHANGELOG.md`](./CHANGELOG.md) - Release history

---

## Testing

```bash
# Run all tests
pnpm test

# Unit tests only
pnpm test:unit

# E2E tests
pnpm test:e2e
```

See [`DEVELOPMENT.md`](./DEVELOPMENT.md) for complete testing setup.

---

## Contributing

See [`CONTRIBUTING.md`](./CONTRIBUTING.md) for workflow guide and best practices.

---

## License

MIT License

---

**Last Updated**: 2025-11-12
