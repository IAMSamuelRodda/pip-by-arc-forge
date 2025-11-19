# Agent Core

Claude Agent SDK orchestrator for Zero Agent.

## Overview

This package implements the main agent orchestrator and specialized sub-agents using the Claude Agent SDK. It coordinates conversation flow, manages sessions, handles memory persistence, and delegates tasks to appropriate sub-agents.

## Architecture

### Main Agent (Orchestrator)
- Analyzes user intent
- Routes requests to sub-agents
- Maintains conversation context
- Manages session state in DynamoDB

### Sub-Agents (Workers)

**Invoice Agent**
- Create, read, update, list invoices
- Send invoices to customers
- Handle invoice-specific queries

**Reconciliation Agent**
- Match bank transactions with invoices
- Suggest potential matches using AI
- Handle reconciliation workflows

**Reporting Agent**
- Generate financial reports (P&L, balance sheet)
- Analyze report data with Claude
- Provide financial insights

**Expense Agent**
- Track and categorize expenses
- Suggest appropriate categories using AI
- Handle expense queries

## Memory System

Implements ADR-007: Memory persistence and relationship building

### Core Memory (Free Tier)
- User preferences (Xero org, timezone, etc.)
- Relationship stage (colleague → partner → friend)
- Key milestones
- Critical context

### Extended Memory (Paid Tier)
- Full conversation history
- Semantic search capabilities
- Deep learning patterns
- Emotional context

## Session Management

Sessions stored in DynamoDB with:
- Automatic TTL expiration
- Conversation history
- Agent context
- User metadata

## Development

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

## Usage

```typescript
import { AgentOrchestrator } from '@zero-agent/agent-core';

const orchestrator = new AgentOrchestrator();

// Create session
const sessionId = await orchestrator.createSession('user-123');

// Process message
const response = await orchestrator.processMessage({
  userId: 'user-123',
  sessionId,
  message: 'Create an invoice for $500 to ACME Corp',
});

console.log(response.message);
```

## Configuration

Environment variables:

```bash
AWS_REGION=us-east-1
DYNAMODB_TABLE_NAME=zero-agent-dev-main
LAMBDA_MCP_FUNCTION_NAME=zero-agent-dev-mcp
ANTHROPIC_API_KEY=sk-...
```

## Deployment

Deployed as AWS Lambda function. See `../../functions/agent/` for Lambda handler.

## References

- [Claude Agent SDK](https://docs.claude.com/en/api/agent-sdk/overview)
- [DynamoDB Single-Table Design](https://www.alexdebrie.com/posts/dynamodb-single-table/)
- Project Architecture: `../../ARCHITECTURE.md`
