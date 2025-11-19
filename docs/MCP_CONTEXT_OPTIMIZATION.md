# MCP Context Window Optimization Guide

> **Purpose**: Comprehensive guide for building efficient MCP servers that minimize context window usage
> **Last Updated**: 2025-11-13
> **Research Base**: Anthropic engineering article, MCP specifications, industry best practices 2025

---

## Table of Contents

1. [Context Window Challenge](#context-window-challenge)
2. [Core Optimization Principles](#core-optimization-principles)
3. [Architecture Patterns](#architecture-patterns)
4. [Tool Design Best Practices](#tool-design-best-practices)
5. [Response Optimization Techniques](#response-optimization-techniques)
6. [Pagination and Chunking](#pagination-and-chunking)
7. [ResourceLink Pattern for Large Datasets](#resourcelink-pattern-for-large-datasets)
8. [Implementation Guidelines](#implementation-guidelines)
9. [Performance Metrics](#performance-metrics)
10. [Application to Zero Agent](#application-to-zero-agent)

---

## Context Window Challenge

### The Problem

LLM context windows, while large, face fundamental constraints:
- **Quadratic complexity**: Self-attention mechanisms create O(n²) computational costs
- **Lost in the middle**: Extended contexts degrade model accuracy for middle sections
- **Token costs**: Excessive context increases inference costs and latency
- **Response limits**: Large tool responses reduce space for reasoning and output

### Industry Statistics

- **98.7% token reduction**: Google Drive-to-Salesforce workflow achieved 150,000 → 2,000 tokens through optimization (Anthropic engineering)
- **70-80% context consumption**: Reporting pipelines with multiple data sources typically exhaust most context before analysis begins (ResourceLink paper)
- **50%+ token reduction**: GraphQL-based MCP tools reduce context by selecting only required fields

---

## Core Optimization Principles

### 1. Progressive Disclosure

**Pattern**: Load tool definitions on-demand rather than front-loading all schemas.

**Implementation**:
```typescript
// ❌ BAD: Load all tools into context
const allTools = await loadAllToolSchemas(); // 150,000 tokens

// ✅ GOOD: Filesystem-based discovery
const toolCategories = await listToolCategories(); // 2,000 tokens
const invoiceTools = await loadToolsForCategory('invoices'); // 5,000 tokens
```

**Anthropic Quote**: "Models are great at navigating filesystems. Presenting tools as code on a filesystem allows models to read tool definitions on-demand."

### 2. Single Responsibility Principle

**Pattern**: Each MCP server focuses on one well-defined domain.

**Benefits**:
- Reduced tool set per context
- Independent scaling
- Smaller blast radius for errors
- Clearer cognitive load for LLMs

**Example**:
```typescript
// ❌ BAD: Monolithic server
@zero-agent/everything-server
  - invoices, bank-transactions, reporting, expenses, contacts, inventory...

// ✅ GOOD: Domain-specific servers
@zero-agent/invoice-server      // Only invoice operations
@zero-agent/reporting-server    // Only reporting tools
@zero-agent/banking-server      // Only bank transactions
```

### 3. Workflow-Oriented Tools

**Pattern**: Design tools around complete tasks, not CRUD operations.

**Benefits**:
- Reduces tool invocation chains
- Minimizes context round-trips
- Clearer semantic meaning for LLMs

**Example**:
```typescript
// ❌ BAD: Low-level CRUD
tools = [
  'get_invoice',
  'update_invoice_status',
  'get_contact_email',
  'send_email'
]
// Requires 4+ tool calls + intermediate context

// ✅ GOOD: Workflow consolidation
tools = [
  'send_invoice'  // Combines: authorize + get email + send
]
// Single tool call, minimal context
```

### 4. Least Privilege

**Pattern**: Expose only minimal methods and resources needed.

**Benefits**:
- Smaller tool schema footprint
- Reduced security surface
- Clearer agent decision-making

---

## Architecture Patterns

### Filesystem-Based Tool Organization

**Anthropic Pattern**: Organize tools hierarchically for progressive loading.

```
servers/
├── xero-invoicing/
│   ├── tools/
│   │   ├── create_invoice.ts
│   │   ├── send_invoice.ts
│   │   └── list_invoices.ts
│   └── index.ts
├── xero-reporting/
│   ├── tools/
│   │   ├── generate_profit_loss.ts
│   │   └── generate_balance_sheet.ts
│   └── index.ts
└── xero-banking/
    └── ...
```

**Discovery Pattern**:
```typescript
// Agent explores available servers
const servers = await listMCPServers();
// ["xero-invoicing", "xero-reporting", "xero-banking"]

// Load only needed tools
const invoiceTools = await loadToolsFromServer("xero-invoicing");
```

### Modular Server Design

**Mike O'Shea Pattern**: Break servers by domain to limit blast radius.

**Reference Implementations**:
- Separate servers for: GitHub, Postgres, Slack, Google Drive, Salesforce
- Each server: 5-15 tools (not 50+)
- Clear domain boundaries prevent tool confusion

### Code Execution Integration

**Anthropic Pattern**: Use MCP for data access, code execution for logic.

**Benefits**:
- Complex control flow runs natively (no context alternation)
- Data filtering happens before returning to LLM
- Intermediate results stored in execution environment

**Example**:
```javascript
// Code execution with MCP tool access
while (!found) {
  const messages = await slack.getChannelHistory(...);
  found = messages.some(m => m.text.includes('deployment complete'));

  if (!found) {
    // Filter large dataset BEFORE logging
    const summary = summarizeMessages(messages);
    console.log(summary); // Only summary in context
    await new Promise(r => setTimeout(r, 5000));
  }
}
```

---

## Tool Design Best Practices

### Response Format Optimization

**Principle**: Return only essential information, not entire API responses.

#### ❌ BAD: Full API Response
```typescript
export async function getInvoice(args: { invoiceId: string }) {
  const invoice = await xero.accountingApi.getInvoice(tenantId, invoiceId);

  return {
    content: [{
      type: 'text',
      text: JSON.stringify(invoice.body) // 2,000+ tokens
    }]
  };
}
```

**Problems**:
- Includes metadata, audit fields, internal IDs
- Nested objects with unused properties
- Redundant timestamps and status codes

#### ✅ GOOD: Filtered Response
```typescript
export async function getInvoice(args: { invoiceId: string }) {
  const response = await xero.accountingApi.getInvoice(tenantId, invoiceId);
  const invoice = response.body.invoices![0];

  // Extract only essential fields
  const summary = {
    invoiceNumber: invoice.invoiceNumber,
    contact: invoice.contact?.name,
    date: invoice.date,
    dueDate: invoice.dueDate,
    total: invoice.total,
    amountDue: invoice.amountDue,
    status: invoice.status,
    lineItems: invoice.lineItems?.map(item => ({
      description: item.description,
      quantity: item.quantity,
      unitAmount: item.unitAmount,
      lineAmount: item.lineAmount
    }))
  };

  return {
    content: [{
      type: 'text',
      text: JSON.stringify(summary, null, 2) // ~300 tokens
    }]
  };
}
```

**Token Reduction**: 2,000 → 300 tokens (85% reduction)

### Input Validation with Meaningful Errors

**Pattern**: Use Zod schemas with actionable error messages.

```typescript
import { z } from 'zod';

server.tool(
  'create_invoice',
  {
    date: z.string().refine((val) => !isNaN(Date.parse(val)), {
      message: 'Invalid date format. Use YYYY-MM-DD (e.g., 2025-11-13)'
    }),
    dueDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
      message: 'Invalid due date format. Use YYYY-MM-DD'
    }),
    lineItems: z.array(z.object({
      description: z.string().min(1, 'Description cannot be empty'),
      quantity: z.number().positive('Quantity must be positive'),
      unitAmount: z.number().positive('Unit amount must be positive')
    })).min(1, 'At least one line item required')
  },
  async (args) => {
    // Implementation
  }
);
```

**Benefits**:
- LLM receives clear correction guidance
- Reduces retry loops
- Minimizes back-and-forth context

### Actionable Error Messages

**MCP Best Practice**: Include troubleshooting steps in error responses.

```typescript
catch (error: any) {
  return {
    content: [{
      type: 'text',
      text: `Error creating invoice: ${error.message}.

Troubleshooting:
- Ensure contact exists in Xero or will be auto-created
- Verify date format is YYYY-MM-DD
- Check line items have valid quantities and amounts (> 0)
- Confirm Xero OAuth token is valid (not expired)
- Verify invoice number is unique if provided

If issue persists, check Xero API status at status.xero.com`
    }],
    isError: true
  };
}
```

### Domain-Specific Abstractions

**Pattern**: Design tools around business workflows, not API endpoints.

```typescript
// ❌ BAD: Generic CRUD
create_record({ entity: 'expense', data: {...} })
update_record({ entity: 'expense', id: '...', data: {...} })

// ✅ GOOD: Domain-specific
submit_expense_report({ description, amount, category, receipt })
approve_expense({ expenseId, approverNotes })
```

**Benefits**:
- Clearer semantic meaning
- Fewer parameters
- Reduced LLM decision-making complexity

---

## Response Optimization Techniques

### 1. Client-Side Aggregation

**Pattern**: Process large datasets in execution environment before returning summaries.

```typescript
export async function listInvoices(args: any) {
  const allInvoices = await fetchAllInvoices(args); // 10,000 invoices

  // ❌ BAD: Return all invoices
  // return { invoices: allInvoices }; // 500,000 tokens

  // ✅ GOOD: Return summary + pagination
  const summary = {
    totalCount: allInvoices.length,
    totalAmount: allInvoices.reduce((sum, inv) => sum + inv.total, 0),
    overdueCount: allInvoices.filter(inv => inv.status === 'OVERDUE').length,
    avgAmount: allInvoices.reduce((sum, inv) => sum + inv.total, 0) / allInvoices.length,
    recentSample: allInvoices.slice(0, 5) // First 5 for context
  };

  return { summary }; // ~1,000 tokens
}
```

**Token Reduction**: 500,000 → 1,000 tokens (99.8% reduction)

### 2. Intermediate Result Filtering

**Anthropic Example**: Filter 10,000 rows to 5 representative samples.

```typescript
// Code execution context
const allTransactions = await bank.getTransactions(accountId);

// Filter to representative samples BEFORE logging
const samples = {
  largest: allTransactions.sort((a, b) => b.amount - a.amount).slice(0, 2),
  smallest: allTransactions.sort((a, b) => a.amount - b.amount).slice(0, 2),
  mostRecent: allTransactions.sort((a, b) => b.date - a.date).slice(0, 1)
};

console.log(JSON.stringify(samples)); // Only samples in context
```

### 3. Structured Data Over Prose

**Pattern**: Return JSON, not verbose descriptions.

```typescript
// ❌ BAD: Prose response
return {
  content: [{
    type: 'text',
    text: 'Invoice INV-001 was created on 2025-11-13 for Acme Corp with a total amount of $1,500.00 USD. The invoice has 3 line items: Widget A ($500.00), Widget B ($700.00), and Shipping ($300.00). The due date is 2025-12-13 and the current status is AUTHORISED.'
  }]
};
// ~80 tokens of natural language

// ✅ GOOD: Structured JSON
return {
  content: [{
    type: 'text',
    text: JSON.stringify({
      invoiceNumber: 'INV-001',
      contact: 'Acme Corp',
      date: '2025-11-13',
      dueDate: '2025-12-13',
      total: 1500.00,
      status: 'AUTHORISED',
      lineItems: [
        { description: 'Widget A', amount: 500.00 },
        { description: 'Widget B', amount: 700.00 },
        { description: 'Shipping', amount: 300.00 }
      ]
    }, null, 2)
  }]
};
// ~40 tokens, easier to parse
```

**Benefits**:
- 50% token reduction
- LLM can extract specific fields efficiently
- Consistent formatting

### 4. GraphQL for Field Selection

**Pattern**: Use GraphQL to return only requested fields.

```typescript
// ❌ BAD: REST returns all fields
GET /api/invoices/123
// Returns 50+ fields, 2,000 tokens

// ✅ GOOD: GraphQL selects fields
query {
  invoice(id: "123") {
    invoiceNumber
    contact { name }
    total
    status
  }
}
// Returns 4 fields, 200 tokens
```

**Token Reduction**: 50%+ reduction through field selection

---

## Pagination and Chunking

### Official MCP Pagination Specification

**Pattern**: Cursor-based pagination (opaque tokens, not offsets).

#### Why Cursors Over Offsets

- **Implementation-agnostic**: Servers control internal logic
- **Stable results**: Data changes don't corrupt pagination
- **Distributed-friendly**: Works with external APIs
- **Security**: Clients can't manipulate position

#### Response Format

```typescript
interface PaginatedResponse {
  results: Array<any>;
  nextCursor?: string;  // Presence = more data; absence = done
}
```

#### Server Implementation

```typescript
export async function listInvoices(args: {
  cursor?: string,
  filters?: any
}) {
  const pageSize = 100; // Server determines size

  // Decode cursor (server-specific logic)
  const startPosition = cursor ? decodeCursor(cursor) : 0;

  const response = await xero.accountingApi.getInvoices(
    tenantId,
    undefined, // IFs
    buildWhereClause(args.filters),
    undefined, // order
    Math.floor(startPosition / pageSize) + 1, // Xero page number
    pageSize
  );

  const invoices = response.body.invoices || [];
  const hasMore = invoices.length === pageSize;

  return {
    content: [{
      type: 'text',
      text: JSON.stringify({
        count: invoices.length,
        invoices: invoices.map(formatInvoiceSummary),
        ...(hasMore && {
          nextCursor: encodeCursor(startPosition + pageSize)
        })
      }, null, 2)
    }]
  };
}
```

#### Client Handling

```typescript
// LLM-driven pagination
let cursor: string | undefined;
let allResults: any[] = [];

do {
  const response = await tools.listInvoices({ cursor });
  const data = JSON.parse(response.content[0].text);

  allResults.push(...data.invoices);
  cursor = data.nextCursor;

  // Exit if found what we need
  if (allResults.some(meetsCondition)) break;

} while (cursor);
```

**Key Rules**:
- Cursors are **opaque** (clients never parse/modify)
- Cursors are **ephemeral** (never persist between sessions)
- Missing `nextCursor` signals final page
- Invalid cursor returns `-32602` error

### Chunking Large Files

**Pattern**: Memory-efficient streaming for large datasets.

```typescript
export async function analyzeExpenses(args: {
  fromDate: string,
  toDate: string
}) {
  // ❌ BAD: Load all into memory
  const allExpenses = await fetchAllExpenses(args); // 100,000 records
  return { expenses: allExpenses }; // 10,000,000 tokens

  // ✅ GOOD: Stream and aggregate
  const aggregates = {
    totalAmount: 0,
    categoryBreakdown: {},
    monthlyTotals: {}
  };

  await streamExpenses(args, (chunk) => {
    // Process 1,000 records at a time
    chunk.forEach(expense => {
      aggregates.totalAmount += expense.amount;
      aggregates.categoryBreakdown[expense.category] =
        (aggregates.categoryBreakdown[expense.category] || 0) + expense.amount;

      const month = expense.date.slice(0, 7);
      aggregates.monthlyTotals[month] =
        (aggregates.monthlyTotals[month] || 0) + expense.amount;
    });
  });

  return {
    summary: aggregates,  // ~500 tokens
    recordsAnalyzed: aggregates.totalAmount / avgExpenseAmount
  };
}
```

---

## ResourceLink Pattern for Large Datasets

### The Dual-Response Pattern

**Source**: "Extending ResourceLink: Patterns for Large Dataset Processing in MCP Applications" (arXiv)

**Problem**: Reporting queries return datasets too large for context windows (70-80% context exhaustion).

**Solution**: Decouple query generation from data retrieval.

### Architecture

```typescript
interface DualResponseToolResult {
  preview: Array<Record<string, any>>;  // 10-100 samples
  resource: ResourceLink;                 // URI to complete dataset
  metadata: QueryMetadata;                // Context for validation
}

interface QueryMetadata {
  total_count: number;         // Accurate count from COUNT query
  executed_at: string;         // ISO timestamp
  columns: ColumnDefinition[]; // Schema information
  expires_at?: string;         // Resource TTL
}

interface ResourceLink {
  uri: string;                 // e.g., "resources://query/abc123"
  mimeType: string;            // "application/json"
}
```

### Implementation Pattern

```typescript
export async function generateReport(args: { query: string }) {
  // 1. Execute query with LIMIT for preview
  const previewQuery = `${args.query} LIMIT 100`;
  const preview = await database.execute(previewQuery);

  // 2. Execute COUNT query for accurate total
  const countQuery = `SELECT COUNT(*) FROM (${args.query}) as subquery`;
  const totalCount = await database.execute(countQuery);

  // 3. Store complete query for async retrieval
  const resourceId = generateUUID();
  await resourceStore.save(resourceId, {
    query: args.query,
    executedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 3600000).toISOString() // 1 hour
  });

  // 4. Return dual response
  return {
    content: [{
      type: 'text',
      text: JSON.stringify({
        preview: preview.rows.slice(0, 10),  // Only 10 samples in context
        resource: {
          uri: `resources://query/${resourceId}`,
          mimeType: 'application/json'
        },
        metadata: {
          total_count: totalCount.rows[0].count,
          executed_at: new Date().toISOString(),
          columns: preview.columns,
          expires_at: new Date(Date.now() + 3600000).toISOString()
        }
      }, null, 2)
    }]
  };
}
```

### Out-of-Band Retrieval

```typescript
// REST API for resource access (outside MCP protocol)
app.get('/resources/:resourceId', async (req, res) => {
  const resource = await resourceStore.get(req.params.resourceId);

  if (!resource || new Date(resource.expiresAt) < new Date()) {
    return res.status(404).json({ error: 'Resource not found or expired' });
  }

  // Execute complete query
  const result = await database.execute(resource.query);

  res.json({
    data: result.rows,
    metadata: {
      total_count: result.rows.length,
      executed_at: resource.executedAt
    }
  });
});

// Pagination support
app.post('/resources/:resourceId', async (req, res) => {
  const { offset, limit, sort } = req.body;
  const resource = await resourceStore.get(req.params.resourceId);

  // Add pagination to stored query
  const paginatedQuery = `
    ${resource.query}
    ORDER BY ${sort || 'id'}
    LIMIT ${limit || 100}
    OFFSET ${offset || 0}
  `;

  const result = await database.execute(paginatedQuery);
  res.json(result.rows);
});
```

### Query Refinement Workflow

**Zero-shot accuracy challenge**: Leading text-to-SQL systems achieve 80%+ accuracy, but 15-20% errors are invisible without validation.

```typescript
// LLM generates query
const query = await llm.generateSQL(userRequest);

// Execute with dual response
const result = await tools.generateReport({ query });

// LLM validates preview data
const validation = await llm.analyze(`
  User requested: "${userRequest}"
  Query executed: "${query}"
  Sample results: ${JSON.stringify(result.preview)}

  Does this data match the user's intent? If not, suggest a corrected query.
`);

if (validation.needsRefinement) {
  // Refine query based on observed results
  const refinedQuery = await llm.refineSQL(query, validation.suggestion);
  const finalResult = await tools.generateReport({ query: refinedQuery });
}

// Retrieve complete dataset out-of-band
const fullData = await fetch(`/resources/${result.resource.uri}`);
```

### Performance Impact

**Token Savings**:
- Preview data: 10-100 records (~2,000 tokens)
- Complete dataset: 10,000+ records (would be 500,000+ tokens)
- **Reduction**: 99%+ for large datasets

**Context Preservation**:
- Reporting pipelines: 70-80% context → 10-20% context
- Enables multi-turn dialogues with backed reports
- Supports speculative query execution (dozens of refinement iterations)

### Resource Lifecycle Management

```typescript
interface ResourceLifecycle {
  // Automatic expiration
  expiresAt: string;  // 1-24 hours typical

  // Explicit persistence
  pinned: boolean;    // User-requested persistence for dashboards

  // Garbage collection
  lastAccessed: string;
  accessCount: number;
}

// Cleanup job
async function cleanupExpiredResources() {
  const now = new Date();

  await resourceStore.deleteWhere({
    expiresAt: { $lt: now },
    pinned: false
  });
}
```

---

## Implementation Guidelines

### TypeScript vs Python for MCP Servers

**Industry Consensus (2025)**: TypeScript preferred for production.

**Advantages of TypeScript**:
- **Official SDK Support**: Better maintained, more features (notification debouncing, authInfo)
- **Type Safety**: Catches errors at compile-time, not runtime
- **Deployment**: Easier to containerize and deploy
- **Performance**: Node.js outperforms Python for I/O-heavy MCP servers
- **Token Efficiency**: Notification debouncing consolidates rapid changes into single notifications

**When to Use Python**:
- Rapid prototyping
- Data science integrations (pandas, numpy)
- Team expertise in Python ecosystem

### Project Structure

```
packages/mcp-xero-server/
├── src/
│   ├── index.ts              # Server initialization
│   ├── tools/                # Tool definitions (Zod schemas)
│   │   ├── invoices.ts
│   │   ├── reporting.ts
│   │   └── banking.ts
│   ├── handlers/             # Tool implementations
│   │   ├── invoices.ts       # Business logic
│   │   ├── reporting.ts
│   │   └── banking.ts
│   ├── lib/
│   │   ├── xero-client.ts    # API wrapper
│   │   ├── token-manager.ts  # OAuth handling
│   │   └── response-formatter.ts  # Optimization utilities
│   └── types.ts              # Shared types
├── package.json
└── tsconfig.json
```

### Testing Strategy

```typescript
// Unit tests: Tool logic
describe('createInvoice', () => {
  it('should format response efficiently', async () => {
    const result = await createInvoice({ ...validArgs });
    const text = result.content[0].text;
    const tokenCount = estimateTokens(text);

    expect(tokenCount).toBeLessThan(500); // Token budget
    expect(JSON.parse(text)).toHaveProperty('invoiceNumber');
  });
});

// Integration tests: MCP protocol
describe('MCP Server', () => {
  it('should handle pagination correctly', async () => {
    const page1 = await server.callTool('list_invoices', {});
    const data1 = JSON.parse(page1.content[0].text);

    expect(data1).toHaveProperty('nextCursor');

    const page2 = await server.callTool('list_invoices', {
      cursor: data1.nextCursor
    });
    const data2 = JSON.parse(page2.content[0].text);

    expect(data2.invoices[0].invoiceNumber).not.toBe(
      data1.invoices[0].invoiceNumber
    );
  });
});

// Token budget tests
describe('Token Efficiency', () => {
  it('should stay within token budgets', async () => {
    const operations = [
      ['create_invoice', createInvoiceArgs, 500],
      ['list_invoices', {}, 2000],
      ['generate_profit_loss', reportArgs, 3000]
    ];

    for (const [tool, args, budget] of operations) {
      const result = await server.callTool(tool, args);
      const tokens = estimateTokens(result.content[0].text);

      expect(tokens).toBeLessThan(budget);
    }
  });
});
```

### Performance Targets

**Industry Standards (2025)**:
- **Throughput**: >1,000 requests/second
- **Latency**: P95 <100ms
- **Error Rate**: <0.1%
- **Uptime**: >99.9%
- **Token Efficiency**: <5,000 tokens per tool call average

### Security Considerations

```typescript
// 1. Input validation (all tools)
server.tool('create_invoice', {
  amount: z.number()
    .positive('Amount must be positive')
    .max(1000000, 'Amount exceeds maximum')
}, async (args) => { ... });

// 2. Output sanitization
function sanitizeResponse(data: any) {
  // Remove sensitive fields
  delete data.internalId;
  delete data.apiKey;
  delete data.rawResponse;

  // Truncate long strings
  if (data.description?.length > 500) {
    data.description = data.description.slice(0, 500) + '... (truncated)';
  }

  return data;
}

// 3. Rate limiting
const rateLimiter = new RateLimiter({
  points: 100,      // 100 requests
  duration: 60,     // per 60 seconds
  blockDuration: 300 // block for 5 minutes if exceeded
});

server.onBeforeToolCall(async (toolName, args) => {
  await rateLimiter.consume(args.userId);
});

// 4. Audit logging
server.onToolCall((toolName, args, result) => {
  logger.info({
    tool: toolName,
    userId: args.userId,
    tokenCount: estimateTokens(result.content[0].text),
    duration: result.duration,
    timestamp: new Date().toISOString()
  });
});
```

---

## Performance Metrics

### Token Usage Measurement

```typescript
interface ToolMetrics {
  toolName: string;
  avgTokens: number;
  p50Tokens: number;
  p95Tokens: number;
  p99Tokens: number;
  callCount: number;
}

class MetricsCollector {
  private metrics: Map<string, number[]> = new Map();

  recordToolCall(toolName: string, responseText: string) {
    const tokens = estimateTokens(responseText);

    if (!this.metrics.has(toolName)) {
      this.metrics.set(toolName, []);
    }

    this.metrics.get(toolName)!.push(tokens);
  }

  getMetrics(toolName: string): ToolMetrics {
    const values = this.metrics.get(toolName) || [];
    values.sort((a, b) => a - b);

    return {
      toolName,
      avgTokens: values.reduce((a, b) => a + b, 0) / values.length,
      p50Tokens: values[Math.floor(values.length * 0.5)],
      p95Tokens: values[Math.floor(values.length * 0.95)],
      p99Tokens: values[Math.floor(values.length * 0.99)],
      callCount: values.length
    };
  }
}
```

### Optimization Benchmarks

```typescript
// Before optimization
{
  toolName: 'list_invoices',
  avgTokens: 45000,
  p95Tokens: 120000,
  callCount: 1000
}

// After optimization (pagination + filtering)
{
  toolName: 'list_invoices',
  avgTokens: 2000,    // 95.6% reduction
  p95Tokens: 5000,    // 95.8% reduction
  callCount: 1000
}
```

### Real-World Impact

**Anthropic Case Study**: Google Drive → Salesforce workflow
- **Before**: 150,000 tokens per operation
- **After**: 2,000 tokens per operation
- **Reduction**: 98.7%
- **Method**: Progressive disclosure + intermediate filtering

**ResourceLink Paper**: Reporting pipeline
- **Before**: 70-80% context consumed by data
- **After**: 10-20% context consumed by data
- **Method**: Dual-response pattern with preview samples

---

## Application to Zero Agent

### Current Architecture Assessment

**Zero Agent MCP Server** (`packages/mcp-xero-server/`):
- 14 tools across 4 categories (invoices, banking, reporting, expenses)
- Single monolithic server
- Full API responses returned (not optimized)
- No pagination implemented
- No token usage measurement

### Optimization Priorities

#### Priority 1: Response Filtering (Immediate - 85% reduction)

**Before**:
```typescript
export async function getInvoice(args: any) {
  const response = await xero.accountingApi.getInvoice(tenantId, invoiceId);

  return {
    content: [{
      type: 'text',
      text: JSON.stringify(response.body) // 2,000 tokens
    }]
  };
}
```

**After**:
```typescript
export async function getInvoice(args: any) {
  const response = await xero.accountingApi.getInvoice(tenantId, invoiceId);
  const invoice = response.body.invoices![0];

  const summary = {
    invoiceNumber: invoice.invoiceNumber,
    contact: invoice.contact?.name,
    date: invoice.date,
    dueDate: invoice.dueDate,
    total: invoice.total,
    amountDue: invoice.amountDue,
    status: invoice.status,
    lineItems: invoice.lineItems?.map(item => ({
      description: item.description,
      quantity: item.quantity,
      unitAmount: item.unitAmount,
      lineAmount: item.lineAmount
    }))
  };

  return {
    content: [{
      type: 'text',
      text: JSON.stringify(summary, null, 2) // 300 tokens
    }]
  };
}
```

**Effort**: 2-4 hours (apply to all 14 tools)
**Impact**: 85% token reduction per tool call

#### Priority 2: Pagination Implementation (High - 95% reduction for lists)

**Tools requiring pagination**:
- `list_invoices`
- `get_bank_transactions`
- `list_expenses`

**Implementation**:
```typescript
export async function listInvoices(args: {
  cursor?: string,
  where?: string
}) {
  const pageSize = 100;
  const page = cursor ? decodeCursor(cursor) : 1;

  const response = await xero.accountingApi.getInvoices(
    tenantId,
    undefined, // IFs
    args.where,
    undefined, // order
    page,
    pageSize
  );

  const invoices = response.body.invoices || [];
  const hasMore = invoices.length === pageSize;

  return {
    content: [{
      type: 'text',
      text: JSON.stringify({
        count: invoices.length,
        invoices: invoices.map(formatInvoiceSummary),
        ...(hasMore && {
          nextCursor: encodeCursor(page + 1)
        })
      }, null, 2)
    }]
  };
}
```

**Effort**: 4-6 hours
**Impact**: 95% reduction for large lists (10,000 → 100 records per call)

#### Priority 3: Reporting with Dual-Response Pattern (Critical - 99% reduction)

**Tools requiring dual-response**:
- `generate_profit_loss`
- `generate_balance_sheet`
- `generate_bank_summary`

**Problem**: Xero reports can contain thousands of line items.

**Implementation**:
```typescript
export async function generateProfitLoss(args: any) {
  const response = await xero.accountingApi.getReportProfitAndLoss(...);
  const report = response.body.reports![0];

  // Extract preview (top-level sections only)
  const preview = {
    reportName: report.reportName,
    reportDate: report.reportDate,
    topLevelSections: report.rows?.slice(0, 5).map(row => ({
      title: row.title,
      value: row.rows?.[0]?.cells?.[0]?.value
    }))
  };

  // Store complete report
  const resourceId = await storeReport(report);

  return {
    content: [{
      type: 'text',
      text: JSON.stringify({
        preview,
        resource: {
          uri: `resources://reports/${resourceId}`,
          mimeType: 'application/json'
        },
        metadata: {
          total_sections: report.rows?.length || 0,
          executed_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 3600000).toISOString()
        }
      }, null, 2)
    }]
  };
}
```

**Effort**: 8-12 hours (includes REST API for resource retrieval)
**Impact**: 99% reduction for large reports

#### Priority 4: Modular Server Split (Long-term - Progressive disclosure)

**Refactor single server into domain-specific servers**:
```
packages/
├── mcp-xero-invoicing/     # 5 tools
├── mcp-xero-banking/       # 3 tools
├── mcp-xero-reporting/     # 3 tools
└── mcp-xero-expenses/      # 3 tools
```

**Benefits**:
- LLM loads only relevant tool schemas
- Independent deployment and scaling
- Clearer separation of concerns

**Effort**: 16-24 hours (refactoring + testing)
**Impact**: 75% reduction in tool schema size (14 → 3-5 tools per context)

### Implementation Roadmap

**Phase 1: Quick Wins (Week 1)**
- [ ] Implement response filtering for all 14 tools
- [ ] Add token usage metrics collection
- [ ] Create `lib/response-formatter.ts` utility

**Phase 2: Pagination (Week 2)**
- [ ] Implement cursor-based pagination for list operations
- [ ] Add `nextCursor` support to client handlers
- [ ] Update documentation

**Phase 3: Dual-Response Pattern (Week 3-4)**
- [ ] Create resource storage service
- [ ] Implement REST API for resource retrieval
- [ ] Refactor reporting tools to use dual-response
- [ ] Add expiration and garbage collection

**Phase 4: Modular Architecture (Month 2)**
- [ ] Split single server into 4 domain servers
- [ ] Update Lambda functions for multiple servers
- [ ] Implement server discovery mechanism
- [ ] Update PWA to handle multiple servers

### Expected Outcomes

**Token Usage Reduction**:
- **Current**: ~50,000 tokens/conversation (estimated)
- **After Phase 1**: ~7,500 tokens/conversation (85% reduction)
- **After Phase 2**: ~2,500 tokens/conversation (95% reduction)
- **After Phase 3**: ~1,000 tokens/conversation (98% reduction)
- **After Phase 4**: ~500 tokens/conversation (99% reduction)

**Cost Savings** (assuming 1M conversations/month):
- Current: $5,000/month (50B tokens @ $0.10/1M tokens)
- Optimized: $50/month (500M tokens @ $0.10/1M tokens)
- **Savings**: $4,950/month or $59,400/year

**Performance Improvements**:
- Faster response times (less data to transfer)
- Reduced latency (smaller context processing)
- Better multi-turn conversations (more context available)

---

## References

### Primary Sources

1. **Anthropic Engineering**: "Code Execution with MCP"
   - https://www.anthropic.com/engineering/code-execution-with-mcp
   - Progressive disclosure, 98.7% token reduction case study

2. **MCP Specification**: Official pagination documentation
   - https://modelcontextprotocol.io/specification/2025-03-26/server/utilities/pagination
   - Cursor-based pagination, protocol details

3. **arXiv Paper**: "Extending ResourceLink: Patterns for Large Dataset Processing"
   - https://arxiv.org/html/2510.05968v1
   - Dual-response pattern, query refinement

4. **MCP Best Practices**: Community guide
   - https://modelcontextprotocol.info/docs/best-practices/
   - Security, architecture, performance targets

5. **Mike O'Shea**: "Model Context Protocol Best Practices"
   - https://oshea00.github.io/posts/mcp-practices/
   - Modular design, domain-specific abstractions

6. **freeCodeCamp**: "How to Build a Custom MCP Server with TypeScript"
   - https://www.freecodecamp.org/news/how-to-build-a-custom-mcp-server-with-typescript-a-handbook-for-developers/
   - Implementation patterns, testing strategies

### Additional Reading

- Official MCP TypeScript SDK: https://github.com/modelcontextprotocol/typescript-sdk
- Microsoft MCP for Beginners: https://github.com/microsoft/mcp-for-beginners
- MCP Servers Collection: https://github.com/modelcontextprotocol/servers

---

**Last Updated**: 2025-11-13
**Next Review**: 2025-12-13 (or when implementing Phase 1 optimizations)
