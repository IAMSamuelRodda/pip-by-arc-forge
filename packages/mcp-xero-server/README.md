# MCP Xero Server

Model Context Protocol (MCP) server for Xero API integration.

## Overview

This package provides a standardized MCP server that exposes Xero accounting functionality as tools for AI agents. It handles OAuth token management, API requests, caching, and error handling.

## Features

### Invoice Management
- `create_invoice` - Create new invoices
- `get_invoice` - Retrieve invoice details
- `update_invoice` - Update existing invoices
- `list_invoices` - List invoices with filters
- `send_invoice` - Email invoices to customers

### Bank Transactions
- `get_bank_transactions` - Retrieve bank transactions
- `create_bank_transaction` - Create manual transactions
- `reconcile_transaction` - Match transactions with invoices

### Financial Reporting
- `generate_profit_loss` - P&L reports
- `generate_balance_sheet` - Balance sheet reports
- `generate_bank_summary` - Bank account summaries

### Expense Tracking
- `create_expense` - Record expenses
- `categorize_expense` - Update expense categories
- `list_expenses` - List expenses with filters

## Development

### Prerequisites

- Node.js 20+
- pnpm 9+
- AWS credentials (for Secrets Manager access)
- Xero developer account

### Setup

```bash
# Install dependencies
pnpm install

# Run in development mode
pnpm dev

# Build
pnpm build

# Run tests
pnpm test
```

### Architecture

```
src/
├── index.ts              # MCP server entry point
├── tools/                # Tool definitions (schemas)
│   ├── invoices.ts
│   ├── bank-transactions.ts
│   ├── reporting.ts
│   └── expenses.ts
├── handlers/             # Tool implementations
│   ├── invoices.ts
│   ├── bank-transactions.ts
│   ├── reporting.ts
│   └── expenses.ts
├── lib/                  # Shared utilities
│   ├── xero-client.ts    # Xero API client wrapper
│   ├── token-manager.ts  # OAuth token management
│   ├── cache.ts          # DynamoDB caching
│   └── schemas.ts        # Zod validation schemas
└── types/                # TypeScript types
```

## Configuration

Environment variables (Lambda or local):

```bash
AWS_REGION=us-east-1
SECRETS_MANAGER_XERO_TOKENS_ARN=arn:aws:secretsmanager:...
SECRETS_MANAGER_API_KEYS_ARN=arn:aws:secretsmanager:...
DYNAMODB_TABLE_NAME=pip-dev-main
```

## Token Management

Xero OAuth tokens are stored in AWS Secrets Manager:
- Access tokens (30-minute expiry)
- Refresh tokens (30-day validity)
- Automatic refresh handled by token-manager

Token metadata stored in DynamoDB for quick lookups.

## Caching

API responses cached in DynamoDB to reduce Xero API calls:
- Invoice lists: 5 minutes TTL
- Reports: 1 hour TTL
- Individual invoices: 5 minutes TTL

## Error Handling

- Automatic retry with exponential backoff
- Rate limit handling (429 responses)
- Token refresh on 401 errors
- Detailed error messages for debugging

## Testing

```bash
# Run unit tests
pnpm test

# Run integration tests (requires AWS credentials)
pnpm test:integration

# Test coverage
pnpm test:coverage
```

## Deployment

Deployed as AWS Lambda function. See `../../functions/mcp/` for Lambda handler.

## References

- [Model Context Protocol Spec](https://modelcontextprotocol.io/)
- [Xero API Documentation](https://developer.xero.com/documentation/api/accounting/overview)
- [xero-node SDK](https://github.com/XeroAPI/xero-node)
- Project Architecture: `../../ARCHITECTURE.md`
