# Claude Agent SDK - Key Concepts

> **Last Updated**: 2025-11-12
> **Purpose**: Developer reference for Claude Agent SDK implementation

## Overview

The Claude Agent SDK enables building AI agents with automatic context management, tool integration, and session persistence. It's the production-grade framework powering Claude Code.

**Source**: [Claude Agent SDK Documentation](https://docs.claude.com/en/api/agent-sdk/overview)

---

## Installation

### TypeScript/Node.js
```bash
npm install @anthropic-ai/sdk
# Note: Full Agent SDK package may be named differently
```

### Python
```bash
pip install anthropic
# Note: Check official docs for exact package name
```

---

## Core Concepts

### 1. Authentication

**Environment Variables:**
```bash
ANTHROPIC_API_KEY=sk-ant-...
```

**Supported Providers:**
- Anthropic API (default)
- Amazon Bedrock
- Google Vertex AI

### 2. Automatic Context Management

**Critical Feature**: The SDK automatically compacts and manages context to prevent token overflow.

**Why This Matters:**
- Claude has context window limits (200K tokens for Claude 3.5 Sonnet)
- Long conversations can exceed limits
- SDK handles automatic context compaction
- Preserves important context while removing less relevant messages

**Implementation:** No manual intervention needed - SDK handles this automatically.

### 3. System Prompts

Define agent behavior and expertise:

```typescript
const agent = new Agent({
  systemPrompt: `You are an expert Xero accounting assistant.

Your role:
- Help users with invoicing, expenses, and financial reporting
- Provide clear, concise accounting guidance
- Use Xero API tools to access real financial data
- Maintain professional, helpful tone

Your expertise:
- Xero accounting platform
- Small business accounting principles
- Financial reporting and analysis`,
});
```

### 4. Tool Permissions

Control which tools agents can access:

```typescript
const agent = new Agent({
  allowedTools: ['create_invoice', 'list_invoices', 'generate_report'],
  // OR
  disallowedTools: ['delete_invoice'], // Blacklist approach
  permissionMode: 'strict', // Enforce tool restrictions
});
```

### 5. Session Management

**Built-in Session Support:**
- Automatic conversation history tracking
- Session persistence across requests
- Context compaction per session

**Custom Session Storage:**
```typescript
// Store session state in DynamoDB
const session = await sessionManager.getSession(userId, sessionId);
agent.restoreSession(session.context);
```

---

## Architecture Patterns

### Main Agent (Orchestrator)

```typescript
class AgentOrchestrator {
  private mainAgent: Agent;

  async processMessage(userId: string, message: string) {
    // 1. Load session context from DynamoDB
    const session = await this.sessionManager.getSession(userId);

    // 2. Restore agent context
    this.mainAgent.restoreSession(session.context);

    // 3. Process message with available tools
    const response = await this.mainAgent.chat(message);

    // 4. Save updated session
    await this.sessionManager.updateSession(userId, {
      context: this.mainAgent.getContext(),
      messages: [...session.messages, { role: 'user', content: message }],
    });

    return response;
  }
}
```

### Sub-Agents (Workers)

Specialized agents for specific domains:

```typescript
// Invoice Agent - specialized for invoice operations
class InvoiceAgent {
  private agent: Agent;

  constructor() {
    this.agent = new Agent({
      systemPrompt: 'You are an invoice management specialist...',
      allowedTools: [
        'create_invoice',
        'update_invoice',
        'list_invoices',
        'send_invoice',
      ],
    });
  }

  async createInvoice(params: InvoiceParams) {
    return await this.agent.chat(
      `Create an invoice with these details: ${JSON.stringify(params)}`
    );
  }
}
```

---

## Tool Integration

### MCP Tool Registration

The SDK works seamlessly with Model Context Protocol (MCP) tools:

```typescript
import { MCPClient } from '@modelcontextprotocol/sdk/client/index.js';

const mcpClient = new MCPClient({
  serverPath: './mcp-xero-server',
  transport: 'stdio',
});

// Register MCP tools with agent
const tools = await mcpClient.listTools();
agent.registerTools(tools);
```

### Lambda-Based MCP Integration

For serverless architectures (like Zero Agent):

```typescript
class AgentOrchestrator {
  async invokeMCPTool(toolName: string, args: any) {
    // Invoke MCP Lambda function
    const result = await lambda.invoke({
      FunctionName: 'zero-agent-dev-mcp',
      Payload: JSON.stringify({ tool: toolName, arguments: args }),
    });

    return JSON.parse(result.Payload);
  }
}
```

---

## Advanced Features

### 1. Prompt Caching

**Automatic Optimization:**
- SDK caches common prompt segments
- Reduces latency and costs
- No manual configuration needed

### 2. Error Handling

```typescript
try {
  const response = await agent.chat(message);
} catch (error) {
  if (error.code === 'context_length_exceeded') {
    // SDK should prevent this, but handle gracefully
    await agent.compactContext();
    const response = await agent.chat(message);
  } else if (error.code === 'rate_limit_exceeded') {
    // Implement exponential backoff
    await sleep(1000);
    return await this.processMessage(userId, message);
  }
}
```

### 3. Memory Integration

**Core Memory (Always Available):**
```typescript
const memory = await memoryManager.getCoreMemory(userId);

agent.setSystemPrompt(`${basePrompt}

User Context:
- Preferred Xero organization: ${memory.preferences.xeroOrg}
- Communication style: ${memory.preferences.communicationStyle}
- Relationship stage: ${memory.relationshipStage}
- Key context: ${memory.criticalContext.join(', ')}`);
```

**Extended Memory (Paid Tier):**
```typescript
const recentMemories = await memoryManager.getExtendedMemory(userId, 10);
const relevantMemories = await memoryManager.searchMemory(userId, message, 5);

// Inject relevant memories into context
agent.addContext(`Recent conversations:
${recentMemories.map(m => m.conversationSummary).join('\n\n')}

Relevant context:
${relevantMemories.map(m => m.conversationSummary).join('\n\n')}`);
```

---

## Best Practices

### 1. Design for Workflows, Not API Endpoints

**Bad:**
```typescript
// Just wrapping API endpoints
tools: ['get_invoice', 'update_invoice_status', 'send_email']
```

**Good:**
```typescript
// Workflow-oriented tools
tools: [
  'create_and_send_invoice', // Combines creation + sending
  'reconcile_transaction',   // Matches transaction + updates invoice
  'generate_monthly_report', // Fetches data + formats + analyzes
]
```

### 2. Optimize for Limited Context

**Return Concise Responses:**
```typescript
async function listInvoices(filters: any, format: 'concise' | 'detailed' = 'concise') {
  const invoices = await xeroClient.getInvoices(filters);

  if (format === 'concise') {
    return invoices.map(inv => ({
      id: inv.invoiceNumber, // Human-readable, not UUID
      customer: inv.contactName,
      amount: inv.total,
      status: inv.status,
    }));
  }

  return invoices; // Full details only when needed
}
```

### 3. Design Actionable Error Messages

**Bad:**
```typescript
throw new Error('Invalid filter parameter');
```

**Good:**
```typescript
throw new Error(
  'Invalid filter parameter. Supported filters: status (DRAFT/PAID/AUTHORISED), ' +
  'contactName (string), fromDate (YYYY-MM-DD), toDate (YYYY-MM-DD). ' +
  'Try: { status: "DRAFT", fromDate: "2025-01-01" }'
);
```

### 4. Use Evaluation-Driven Development

Create test scenarios early:

```typescript
// Evaluation scenarios
const scenarios = [
  {
    input: 'Create an invoice for $500 to ACME Corp',
    expectedTools: ['create_invoice'],
    expectedOutcome: 'Invoice created with correct amount and customer',
  },
  {
    input: 'Show me all unpaid invoices from last month',
    expectedTools: ['list_invoices'],
    expectedOutcome: 'Filtered list of unpaid invoices',
  },
];
```

---

## Security Considerations

### 1. Tool Permissions

**Never expose destructive operations without explicit user confirmation:**

```typescript
const agent = new Agent({
  disallowedTools: [
    'delete_invoice',
    'void_invoice',
    'delete_transaction',
  ],
  permissionMode: 'strict',
});
```

### 2. User Data Isolation

**Always scope operations to current user:**

```typescript
async function listInvoices(userId: string, filters: any) {
  // Get user's Xero organization ID
  const user = await userManager.getUser(userId);

  // Ensure API calls are scoped to user's organization
  return await xeroClient.getInvoices({
    ...filters,
    tenantId: user.xeroTenantId,
  });
}
```

### 3. Rate Limiting

**Implement per-user rate limits:**

```typescript
class AgentOrchestrator {
  private rateLimiter = new RateLimiter({
    maxRequests: 50,
    windowMs: 60000, // 1 minute
  });

  async processMessage(userId: string, message: string) {
    if (!this.rateLimiter.check(userId)) {
      throw new Error('Rate limit exceeded. Please try again in a minute.');
    }

    return await this.mainAgent.chat(message);
  }
}
```

---

## Zero Agent Implementation

### Architecture

```
User Message
    ↓
Main Agent (Orchestrator)
    ↓ (analyzes intent)
    ├─→ Invoice Agent (invoice operations)
    ├─→ Reconciliation Agent (bank transactions)
    ├─→ Reporting Agent (financial reports)
    └─→ Expense Agent (expense tracking)
        ↓ (all invoke)
    MCP Lambda (Xero API tools)
        ↓
    Xero API
```

### Key Design Decisions

1. **Main Agent as Router**: Analyzes user intent and delegates to specialized sub-agents
2. **Sub-Agents as Specialists**: Each sub-agent has focused expertise and limited tool access
3. **MCP via Lambda**: MCP server runs as Lambda function, invoked by agents
4. **Session Persistence**: DynamoDB stores conversation history and agent context
5. **Memory Integration**: Core memory (free) + Extended memory (paid) for personalization

---

## References

- **Official Docs**: https://docs.claude.com/en/api/agent-sdk/overview
- **MCP Specification**: https://modelcontextprotocol.io/
- **Anthropic API**: https://docs.anthropic.com/
- **Project Architecture**: ../ARCHITECTURE.md
