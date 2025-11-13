# Xero Agent - Architecture

> **Purpose**: Technical reference for system design, database schema, and architectural decisions
> **Lifecycle**: Living (update as architecture evolves)

**Last Updated**: 2025-11-12

---

## System Overview

Xero Agent uses a **multi-tier serverless architecture** on AWS with clear separation of concerns:

```
┌─────────────────────────────────────────────────────┐
│ Presentation Layer: PWA (React + Vite)              │
│  - Mobile-first responsive UI                       │
│  - Service workers for offline support              │
│  - S3 + CloudFront distribution                     │
└────────────────┬────────────────────────────────────┘
                 │ HTTPS/WebSocket (API Gateway)
┌────────────────▼────────────────────────────────────┐
│ Application Layer: Agent Core (Claude Agent SDK)   │
│  - Lambda functions for agent orchestration         │
│  - Main agent + specialized sub-agents              │
│  - Session management via DynamoDB                  │
└────────────────┬────────────────────────────────────┘
                 │ MCP Protocol (JSON-RPC)
┌────────────────▼────────────────────────────────────┐
│ Integration Layer: MCP Server                       │
│  - Lambda functions for Xero operations             │
│  - OAuth token management (Secrets Manager)         │
│  - xero-node SDK wrapper                            │
└────────────────┬────────────────────────────────────┘
                 │ REST API (HTTPS)
┌────────────────▼────────────────────────────────────┐
│ External API: Xero Accounting API                   │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ AWS Services Layer                                  │
│  DynamoDB | Cognito | Lambda | Secrets Manager     │
│  S3 | CloudFront | API Gateway | EventBridge       │
└─────────────────────────────────────────────────────┘
```

---

## Architecture Pattern

**Pattern**: Multi-tier serverless with Orchestrator-Worker agents

**Structure**: Monorepo with packages + infrastructure
```
xero-agent/
├── packages/
│   ├── mcp-xero-server/     # MCP server (Lambda)
│   ├── agent-core/          # Agent orchestrator (Lambda)
│   └── pwa-app/             # Progressive Web App
├── functions/
│   ├── auth/                # Cognito triggers + OAuth
│   ├── agent/               # Agent API handlers
│   └── mcp/                 # MCP tool implementations
└── infrastructure/
    ├── terraform/           # IaC for AWS resources
    └── cdk/                 # Alternative: AWS CDK (TypeScript)
```

---

## Technology Stack

### Frontend/Client
| Technology | Version | Purpose |
|------------|---------|---------|
| React | 18+ | UI framework |
| TypeScript | 5+ | Type safety |
| Vite | 5+ | Build tool |
| Zustand | 4+ | State management |
| TailwindCSS | 3+ | Styling |
| shadcn/ui | Latest | UI components |

### Backend/Server
| Technology | Version | Purpose |
|------------|---------|---------|
| Claude Agent SDK | Latest | Agent orchestration |
| @modelcontextprotocol/sdk | Latest | MCP server |
| xero-node | Latest | Xero API client |
| AWS Lambda | Node 20+ | Serverless compute |
| AWS SDK v3 | Latest | AWS service integration |

### Infrastructure (AWS)
| Service | Purpose |
|---------|---------|
| **S3 + CloudFront** | PWA hosting and global CDN |
| **DynamoDB** | NoSQL database (sessions, users, cache) |
| **Cognito** | User authentication and authorization |
| **Lambda** | Serverless compute for agents and APIs |
| **API Gateway** | HTTP/WebSocket APIs |
| **Secrets Manager** | OAuth token encryption and storage |
| **EventBridge** | Scheduled tasks (token cleanup) |
| **CloudWatch** | Logging and monitoring |

---

## Database Schema (DynamoDB)

### Tables

**users**
```typescript
{
  PK: "USER#<uid>",
  SK: "PROFILE",
  uid: string,
  email: string,
  displayName: string,
  organizationId: string,
  createdAt: number,      // Unix timestamp
  lastLoginAt: number,
  GSI1PK: "ORG#<organizationId>",
  GSI1SK: "USER#<uid>"
}
```

**organizations**
```typescript
{
  PK: "ORG#<id>",
  SK: "METADATA",
  id: string,
  name: string,
  xeroTenantId: string,
  settings: object,
  createdAt: number
}
```

**sessions**
```typescript
{
  PK: "USER#<userId>",
  SK: "SESSION#<sessionId>",
  sessionId: string,
  userId: string,
  agentContext: object,
  conversationHistory: Message[],
  createdAt: number,
  updatedAt: number,
  expiresAt: number,       // TTL for DynamoDB
  GSI1PK: "SESSION#<sessionId>",
  GSI1SK: "ACTIVE"
}
```

**tokens** (stored in Secrets Manager, metadata in DynamoDB)
```typescript
{
  PK: "USER#<userId>",
  SK: "TOKEN#<organizationId>",
  userId: string,
  organizationId: string,
  secretArn: string,       // Reference to Secrets Manager
  expiresAt: number,
  scopes: string[],
  createdAt: number
}
```

**cache**
```typescript
{
  PK: "CACHE#<key>",
  SK: "DATA",
  key: string,
  data: object,
  ttl: number,             // DynamoDB TTL
  createdAt: number
}
```

**user_memory** (Core + Extended)
```typescript
// Core Memory (permanent)
{
  PK: "USER#<uid>",
  SK: "MEMORY#CORE",
  preferences: {
    xeroOrg: string,
    reportingPreferences: object,
    communicationStyle: string,
    timezone: string
  },
  relationshipStage: "colleague" | "partner" | "friend",
  relationshipStartDate: number,
  keyMilestones: Array<{
    type: string,
    description: string,
    timestamp: number
  }>,
  criticalContext: string[]
}

// Extended Memory (subscription-gated)
{
  PK: "USER#<uid>",
  SK: "MEMORY#CONVERSATION#<timestamp>",
  conversationSummary: string,
  embedding: number[],         // Vector for semantic search
  learnedPatterns: object,
  emotionalContext: string,
  topics: string[],
  ttl: number,                 // Expires if subscription lapses
  createdAt: number
}
```

**voice_sessions** (Premium tier tracking)
```typescript
{
  PK: "USER#<uid>",
  SK: "VOICE#SESSION#<sessionId>",
  sessionId: string,
  audioTranscript: string,
  voiceSettings: {
    preferredVoice: string,
    speed: number,
    language: string
  },
  durationMinutes: number,
  cost: number,                // Track usage for billing
  createdAt: number
}
```

### Access Patterns

**GSI1** (Global Secondary Index):
- `GSI1PK` + `GSI1SK` for organization → users lookup
- `GSI1PK` + `GSI1SK` for active session queries

**GSI2** (Relationship Stage Index):
- `GSI2PK: "RELATIONSHIP#<stage>"` + `GSI2SK: "USER#<uid>"` for cohort analysis

**TTL Attribute**:
- `expiresAt` on sessions and cache for automatic cleanup
- `ttl` on extended memory for subscription-based retention

---

## MCP Tool Definitions

### Invoicing Tools
- `create_invoice(data: InvoiceInput): Invoice`
- `get_invoice(invoiceId: string): Invoice`
- `update_invoice(invoiceId: string, data: InvoiceUpdate): Invoice`
- `list_invoices(filters: InvoiceFilters): Invoice[]`
- `send_invoice(invoiceId: string): void`

### Bank Transaction Tools
- `get_bank_transactions(accountId: string, filters: TransactionFilters): Transaction[]`
- `create_bank_transaction(data: TransactionInput): Transaction`
- `reconcile_transaction(transactionId: string, invoiceId: string): void`

### Reporting Tools
- `generate_profit_loss(dateRange: DateRange): ProfitLossReport`
- `generate_balance_sheet(date: Date): BalanceSheetReport`
- `generate_bank_summary(accountId: string, dateRange: DateRange): BankSummaryReport`

### Expense Tools
- `create_expense(data: ExpenseInput): Expense`
- `categorize_expense(expenseId: string, category: string): void`
- `list_expenses(filters: ExpenseFilters): Expense[]`

---

## Authentication Flow

### Cognito + Xero OAuth 2.0

**Initial User Authentication:**
1. User signs up/logs in via Cognito (email/password or social)
2. Cognito issues JWT tokens (ID token, access token, refresh token)
3. Frontend stores Cognito tokens securely

**Xero OAuth Integration:**
1. User initiates Xero connection in PWA
2. Redirect to Xero authorization endpoint
3. User grants permissions to Xero organization
4. Callback receives authorization code
5. Backend Lambda exchanges code for Xero tokens
6. Store tokens in Secrets Manager (encrypted at rest)
7. Store token metadata in DynamoDB (SecretARN reference)

**API Requests:**
1. Frontend sends request with Cognito JWT
2. API Gateway validates JWT via Cognito authorizer
3. Lambda retrieves Xero token metadata from DynamoDB
4. Lambda retrieves actual tokens from Secrets Manager
5. Check expiration (30 minutes for Xero access tokens)
6. Refresh if expired using Xero refresh token
7. Make Xero API call with valid access token

**Token Refresh:**
- Xero access tokens: 30-minute expiration
- Xero refresh tokens: 30-day validity
- Requires `offline_access` scope
- Cognito tokens: 1-hour expiration (configurable)

---

## Security

### Token Security
- **Storage**: Xero tokens encrypted in AWS Secrets Manager (AES-256)
- **Access Control**: IAM policies restrict Lambda access only
- **Rotation**: Automatic Xero token refresh via Lambda
- **Cognito Tokens**: Short-lived JWTs with secure refresh flow

### Data Protection
- **In Transit**: TLS 1.3 (enforced by CloudFront + API Gateway)
- **At Rest**:
  - DynamoDB encryption enabled (AWS managed keys)
  - Secrets Manager encryption (KMS customer managed keys)
- **Application Layer**: Additional field-level encryption for PII

### IAM Policies
- Principle of least privilege for all Lambda functions
- Separate roles for agent, MCP server, and auth functions
- DynamoDB fine-grained access control via IAM conditions

### Content Security Policy
```
default-src 'self';
script-src 'self' 'unsafe-inline';
style-src 'self' 'unsafe-inline';
connect-src 'self' https://api.xero.com https://<api-id>.execute-api.<region>.amazonaws.com;
img-src 'self' data: https:;
```

---

## Agent Architecture

### Main Agent (Orchestrator)
- Runs in Lambda (invoked via API Gateway)
- Coordinates conversation flow
- Decomposes user requests into tasks
- Delegates to specialized sub-agents
- Maintains context in DynamoDB session table

### Sub-Agents (Workers)
1. **Invoice Agent** - Invoice CRUD operations
2. **Reconciliation Agent** - Bank transaction matching
3. **Reporting Agent** - Financial report generation
4. **Expense Agent** - Expense tracking and categorization

**Execution Pattern**: Step Functions for complex multi-agent workflows (optional)

---

## Architecture Decision Records

### ADR-001: AWS over Firebase
**Date**: 2025-11-12
**Status**: Accepted

**Context**: Need serverless backend with auth, database, hosting, and enterprise-grade security.

**Decision**: Use AWS (Lambda + DynamoDB + Cognito + S3/CloudFront + Secrets Manager).

**Consequences:**
- ✅ Enterprise-grade security and compliance (SOC2, HIPAA ready)
- ✅ Fine-grained IAM access control
- ✅ Better cost optimization at scale
- ✅ Secrets Manager for token security
- ✅ Native integration with AWS AI/ML services
- ❌ More complex initial setup than Firebase
- ❌ Requires infrastructure-as-code (Terraform/CDK)
- ❌ Steeper learning curve

**Alternatives Considered:**
- Firebase (rejected: preference for AWS ecosystem)
- Supabase (rejected: less mature, smaller AWS integration)

---

### ADR-002: Terraform for IaC
**Date**: 2025-11-12
**Status**: Accepted

**Context**: Need infrastructure-as-code for reproducible AWS deployments.

**Decision**: Use Terraform (with optional CDK alternative in TypeScript).

**Consequences:**
- ✅ Declarative infrastructure definitions
- ✅ State management for team collaboration
- ✅ Multi-environment support (dev, staging, prod)
- ✅ Large community and module ecosystem
- ❌ Requires learning HCL (HashiCorp Configuration Language)
- ❌ State file management complexity

**Alternatives Considered:**
- AWS CDK (accepted as alternative: TypeScript-native, can coexist)
- CloudFormation (rejected: verbose YAML, slower iterations)
- Serverless Framework (rejected: limited to Lambda, not full IaC)

---

### ADR-003: DynamoDB Single-Table Design
**Date**: 2025-11-12
**Status**: Accepted

**Context**: Need NoSQL database optimized for serverless access patterns.

**Decision**: Use DynamoDB with single-table design pattern.

**Consequences:**
- ✅ Predictable performance and cost
- ✅ Efficient access patterns via composite keys
- ✅ Built-in TTL for session/cache expiration
- ✅ Global secondary indexes for flexible queries
- ❌ Requires upfront access pattern design
- ❌ Less flexible than relational databases
- ❌ Steep learning curve for single-table design

**Alternatives Considered:**
- Aurora Serverless (rejected: higher cold start, more complex)
- RDS (rejected: not truly serverless, fixed costs)

---

### ADR-004: Claude Agent SDK over Raw API
**Date**: 2025-11-12
**Status**: Accepted

**Context**: Need agent framework with session management and context handling.

**Decision**: Use Claude Agent SDK instead of raw Anthropic API.

**Consequences:**
- ✅ Built-in session and context management
- ✅ Simplified tool registration
- ✅ Automatic context compaction
- ❌ Additional abstraction layer
- ❌ Less control over raw prompting

**Alternatives Considered:**
- Raw Anthropic API (rejected: too much boilerplate)
- LangChain (rejected: overkill for this use case)

---

### ADR-005: MCP for Xero Integration
**Date**: 2025-11-12
**Status**: Accepted

**Context**: Need standardized way for agent to interact with Xero API.

**Decision**: Implement Model Context Protocol (MCP) server for Xero.

**Consequences:**
- ✅ Standardized tool interface
- ✅ Reusable across different agent implementations
- ✅ Clear separation of concerns
- ❌ Additional layer of indirection

**Alternatives Considered:**
- Direct API integration in agent (rejected: tight coupling)

---

### ADR-006: PWA over Native Apps
**Date**: 2025-11-12
**Status**: Accepted

**Context**: Need mobile-first experience across devices.

**Decision**: Build Progressive Web App instead of native iOS/Android apps.

**Consequences:**
- ✅ Single codebase for all platforms
- ✅ No app store approval process
- ✅ Instant updates via CloudFront cache invalidation
- ❌ Limited offline capabilities compared to native
- ❌ Can't access all device features

**Alternatives Considered:**
- React Native (rejected: more complex for web-first approach)
- Flutter (rejected: team expertise in React)

---

### ADR-007: Memory Persistence and Relationship Building
**Date**: 2025-11-12
**Status**: Accepted

**Context**: Agent should build long-term relationships with users, learning preferences, patterns, and context over time. Inspired by star-atlas-agent's progression model (colleague → partner → friend). Need to balance data retention with subscription models.

**Decision**: Implement tiered memory persistence system:
1. **Core Memory** (permanent, free tier): User preferences, critical business context, relationship milestones
2. **Extended Memory** (paid tier): Detailed conversation history, deep learning patterns, advanced personalization
3. **Graceful Degradation**: Users who stop paying retain core memory but lose extended features

**Storage Strategy:**
- **Core Memory**: DynamoDB with indefinite retention (user-owned data)
- **Extended Memory**: S3 + DynamoDB with lifecycle policies
- **Vector Embeddings**: Store conversation embeddings for semantic search (Amazon OpenSearch or Pinecone)

**Memory Types:**
```typescript
// Core Memory (always retained)
{
  PK: "USER#<uid>",
  SK: "MEMORY#CORE",
  preferences: {
    xeroOrg: string,
    reportingPreferences: object,
    communicationStyle: string,
    timezone: string
  },
  relationshipStage: "colleague" | "partner" | "friend",
  keyMilestones: Milestone[],
  criticalContext: string[]
}

// Extended Memory (subscription tier)
{
  PK: "USER#<uid>",
  SK: "MEMORY#CONVERSATION#<timestamp>",
  conversationSummary: string,
  embedding: number[],          // For semantic search
  learnedPatterns: object,
  emotionalContext: string,
  ttl: number                   // Expires if subscription lapses
}
```

**Relationship Progression:**
- **Colleague** (0-3 months): Professional, task-focused, learning phase
- **Partner** (3-12 months): Proactive suggestions, understands workflows, anticipates needs
- **Friend** (12+ months): Deep context, personal touches, trusted advisor

**Consequences:**
- ✅ Users retain essential data even without subscription
- ✅ Creates incentive for paid tier (richer memory)
- ✅ Builds genuine long-term value
- ✅ Enables semantic search across conversation history
- ❌ Complex data lifecycle management
- ❌ Privacy concerns with long-term data retention
- ❌ Requires vector database for embeddings

**Alternatives Considered:**
- All-or-nothing retention (rejected: poor UX for lapsed users)
- No memory persistence (rejected: missed opportunity for differentiation)
- Client-side only storage (rejected: limits cross-device experience)

**Future Spike Required**: Define exact retention policies, GDPR compliance, user data export mechanisms.

---

### ADR-008: Voice-to-Voice Integration (Premium Tier)
**Date**: 2025-11-12
**Status**: Accepted

**Context**: Voice interaction is critical for accounting workflows (hands-free invoice creation, driving, mobile scenarios). Should be premium feature to offset API costs.

**Decision**: Implement voice-to-voice as premium tier feature using:
1. **Speech-to-Text**: AWS Transcribe (streaming or batch)
2. **Agent Processing**: Claude Agent SDK (existing)
3. **Text-to-Speech**: Amazon Polly or ElevenLabs for natural voice

**Architecture:**
```
User Voice → WebRTC/WebSocket → Lambda (Transcribe) → Agent → Lambda (Polly) → User Audio
                ↓
          DynamoDB (session + transcript)
```

**Pricing Tiers:**
- **Free**: Text-only interaction
- **Pro**: Voice-to-voice up to 1000 minutes/month
- **Enterprise**: Unlimited voice + custom voice cloning

**Technical Implementation:**
- **Input**: Real-time streaming via WebSocket (WebRTC → Lambda → Transcribe streaming)
- **Output**: Polly neural voices or ElevenLabs API
- **Latency Target**: < 2s end-to-end (voice → response → audio playback)
- **Storage**: Transcripts stored for compliance and learning

**DynamoDB Schema Addition:**
```typescript
{
  PK: "USER#<uid>",
  SK: "VOICE#SESSION#<sessionId>",
  audioTranscript: string,
  voiceSettings: {
    preferredVoice: string,
    speed: number,
    language: string
  },
  durationMinutes: number,
  createdAt: number
}
```

**Cost Considerations:**
- AWS Transcribe: $0.024/minute (streaming)
- Amazon Polly: $4.00 per 1M characters (neural voices)
- ElevenLabs: $0.18/1000 characters (premium voices)
- Estimated cost per user: $2-5/month for moderate usage

**Consequences:**
- ✅ Differentiating premium feature
- ✅ Hands-free accounting workflows
- ✅ Accessibility for vision-impaired users
- ✅ Mobile-first experience enhancement
- ❌ Higher infrastructure costs (justifies premium pricing)
- ❌ Requires WebSocket infrastructure
- ❌ Complex state management for streaming audio

**Alternatives Considered:**
- Client-side speech recognition (rejected: quality and privacy concerns)
- OpenAI Whisper + TTS (rejected: prefer AWS integration for simplicity)
- Make voice free tier (rejected: unsustainable cost structure)

**Implementation Priority**: Phase 2 (after core text-based agent is stable)

---

### ADR-009: MCP Context Window Optimization
**Date**: 2025-11-13
**Status**: Accepted

**Context**: Initial xero-mcp-server implementation scored 42/100 on the improving-mcps assessment framework (below production threshold of ≥75/100), consuming an estimated 95,000 tokens per conversation. This creates severe operational issues:
- **Cost Impact**: $9,500/month baseline vs optimized $500/month (94.7% waste)
- **Context Exhaustion**: Multi-turn conversations hitting 200K token limits within 2-3 exchanges
- **User Experience**: Slow responses, conversation resets, inability to handle complex workflows
- **Production Blocker**: Cannot deploy until score reaches ≥75/100

**Assessment Findings** (see `docs/MCP_SERVER_ASSESSMENT.md`):
```
Dimension                    Score    Max    Notes
═══════════════════════════════════════════════════════════
Progressive Disclosure       0/20     Critical: Monolithic tool loading
Response Optimization        3/15     Critical: Full API objects returned
Pagination Implementation    0/12     Critical: All results fetched at once
Workflow-Oriented Design     8/10     Good: Invoice/expense workflows
Error Handling Quality       8/10     Good: Comprehensive messages
Input Validation             5/8      Moderate: Basic validation only
Single Responsibility        8/8      Excellent: Clean tool separation
ResourceLink Pattern         0/7      Missing: Reports consume 50K+ tokens

TOTAL SCORE: 42/100 (BELOW THRESHOLD)
```

**Token Consumption Breakdown (Before Optimization)**:
- List invoices (100 items, full objects): ~20,000 tokens
- List bank transactions (200 items): ~30,000 tokens
- Generate profit/loss report (full nested structure): ~45,000 tokens
- **Total estimated usage**: 95,000 tokens/conversation

**Decision**: Implement comprehensive MCP optimization strategy in two phases:

**Phase 1 (P1) - Core Optimizations** [Implemented]:
1. **Cursor-Based Pagination** (MCP Protocol Revision 2025-03-26)
   - Opaque cursor tokens (base64-encoded offset + timestamp + pageSize)
   - 1-hour expiration for security
   - `nextCursor` parameter signaling more results
   - Implementation: `src/lib/pagination.ts` (encodeCursor, decodeCursor, createPaginatedResponse)
   - Applied to: list_invoices, list_bank_transactions, list_expenses

2. **Response Filtering** (85% token reduction)
   - Extract only essential fields from API responses
   - Invoice: 12 fields (invoiceID, invoiceNumber, contact, total, amountDue, amountPaid, status, date, dueDate) - excludes lineItems details, full contact object, payments array
   - Bank Transaction: 10 fields - excludes lineItems, full account/contact objects
   - Expense: 9 fields - excludes attachment data, full account details
   - Report: Summary format (section totals only) - excludes row-level details, nested cell structures
   - Implementation: `src/lib/response-filters.ts` (filterInvoiceSummary, filterBankTransactionSummary, filterExpenseSummary, filterReportSummary)

3. **Token Metrics Collection**
   - Automated tracking: estimateTokens() using ~4 chars/token heuristic
   - Structured logging: JSON format with toolName, tokens, responseLength, timestamp
   - Implementation: `src/lib/response-filters.ts` (logTokenMetrics)
   - Enables continuous optimization monitoring

**Phase 2 (P2) - Advanced Optimizations** [Implemented]:
1. **ResourceLink Pattern** (99% token reduction for large datasets)
   - Dual-response architecture: preview (first N items) + ResourceLink URI for out-of-band retrieval
   - Applied to: generate_profit_loss with `fullReport=true` parameter
   - Preview size: 10 rows (configurable)
   - Storage strategy: In-memory (development), DynamoDB + S3 (production)
   - 1-hour TTL with automatic cleanup
   - Implementation: `src/lib/resource-storage.ts` (createDualResponse, storeResource, retrieveResource)
   - Production schema:
     ```typescript
     // DynamoDB
     PK: "RESOURCE#<resourceId>"
     SK: "METADATA"
     type: "report" | "list" | "export"
     tenantId, userId, createdAt, expiresAt
     data: object (if <400KB)
     s3Key: string (if >400KB → S3)
     ttl: number (DynamoDB TTL)

     // S3
     s3://xero-agent-resources/resources/<resourceId>.json
     ```
   - **TODO**: Implement REST API Lambda for resource retrieval (GET /resources/:resourceId, GET /resources/:resourceId/data, POST /resources/:resourceId/query)

2. **Enhanced Input Validation**
   - JSON Schema constraints with min/max bounds and regex patterns
   - Applied to all tool definitions:
     - `create_invoice`: email pattern (^[a-zA-Z0-9._%+-]+@...), date format (YYYY-MM-DD), contactName length (1-255 chars), lineItems array (1-100 items), quantity range (0.0001-999999), unitAmount range (0.01-999999999), accountCode pattern (^[0-9]{1,10}$)
     - `generate_profit_loss`: date patterns, periods constraints (1-12), fullReport boolean
   - Implementation: Updated `src/tools/invoices.ts`, `src/tools/reporting.ts`

**Implementation Files**:
- `src/lib/pagination.ts` - Cursor utilities
- `src/lib/response-filters.ts` - Response filtering + token metrics
- `src/lib/resource-storage.ts` - ResourceLink pattern (dual-response)
- `src/handlers/invoices.ts` - Updated with pagination + filtering
- `src/handlers/bank-transactions.ts` - Updated with pagination + filtering
- `src/handlers/expenses.ts` - Updated with pagination + filtering
- `src/handlers/reporting.ts` - Updated with ResourceLink pattern
- `src/tools/invoices.ts` - Enhanced validation
- `src/tools/reporting.ts` - Added fullReport parameter

**Quantified Impact**:

Before optimization:
```
list_invoices (100 items): 20,000 tokens
  → Full Invoice objects with lineItems[], payments[], contact{}, etc.

generate_profit_loss: 45,000 tokens
  → Complete nested report structure with all rows, cells, sections

TOTAL: 95,000 tokens/conversation
COST: $9,500/month (10,000 conversations @ $0.95/conversation)
```

After P1 optimization (pagination + filtering):
```
list_invoices (20 items per page, filtered): 800 tokens (96% reduction)
  → 12 essential fields only, cursor for next page

generate_profit_loss (summary): 2,500 tokens (94.4% reduction)
  → Section totals only, no row-level details

ESTIMATED: ~17,000 tokens/conversation (82% overall reduction)
COST: ~$1,700/month
```

After P2 optimization (ResourceLink pattern):
```
generate_profit_loss (fullReport=true): 500 tokens (98.9% reduction)
  → Preview (10 rows) + ResourceLink URI + metadata
  → Full dataset retrieved out-of-band via REST API

ESTIMATED: ~5,000 tokens/conversation (94.7% overall reduction)
COST: ~$500/month
ANNUAL SAVINGS: $108,000/year
```

**Consequences:**
- ✅ **Massive Token Reduction**: 94.7% reduction (95,000 → 5,000 tokens)
- ✅ **Cost Optimization**: $108K/year savings at scale
- ✅ **Production Ready**: Expected score improvement to ≥75/100
- ✅ **Multi-Turn Conversations**: Can handle 40+ exchanges within 200K context
- ✅ **User Experience**: Faster responses, no conversation resets
- ✅ **Compliance**: MCP Protocol Revision 2025-03-26 cursor-based pagination
- ✅ **Monitoring**: Built-in token metrics for continuous optimization
- ✅ **Backward Compatible**: Summary mode remains default (fullReport=false)
- ❌ **Additional Infrastructure**: Requires DynamoDB + S3 + REST API Lambda for production ResourceLink
- ❌ **Complexity**: Three-tier loading (summary → full paginated → ResourceLink)
- ❌ **Out-of-Band Retrieval**: Users must make second request for complete reports

**Alternatives Considered:**
1. **No Optimization** (rejected: production blocker, unsustainable costs)
2. **Offset-Based Pagination** (rejected: MCP spec requires cursor-based)
3. **Field Selection Parameters** (rejected: increases API complexity, users must know schema)
4. **Streaming Responses** (rejected: MCP spec doesn't support streaming yet)
5. **Server-Side Progressive Disclosure** (deferred to Phase 3: requires tool registry refactoring)

**Validation Metrics** (to be measured after deployment):
- Re-run improving-mcps assessment (target: ≥75/100)
- Measure actual token consumption per tool via logTokenMetrics()
- Track context window utilization in CloudWatch
- Monitor conversation length before context exhaustion
- Measure user adoption of fullReport parameter

**Future Work**:
- [ ] Implement production resource storage (DynamoDB + S3)
- [ ] Create resource retrieval Lambda (REST API)
- [ ] Extend ResourceLink to list_invoices (for 1000+ invoice scenarios)
- [ ] Add regression tests (token budget assertions)
- [ ] Implement server-side progressive disclosure (tool registry refactoring)

**References:**
- MCP Optimization Guide: `docs/MCP_CONTEXT_OPTIMIZATION.md` (29,000+ words)
- Assessment Report: `docs/MCP_SERVER_ASSESSMENT.md`
- MCP Protocol Spec: https://modelcontextprotocol.io/specification/2025-03-26/protocol/
- improving-mcps Skill: `~/.claude/skills/improving-mcps/`

---

### ADR-010: Lean Infrastructure Strategy (No Production Until Revenue)
**Date**: 2025-11-13
**Status**: Accepted

**Context**: Traditional approach would deploy separate staging and production environments immediately. However, production infrastructure costs ~$500+/month baseline with zero users, burning runway before validation.

**Decision**: Deploy ONLY staging/dev environment initially. Production infrastructure will be created when we have actual paying users.

**Environment Strategy:**

```
CURRENT STATE (Pre-Launch):
├── dev branch → AWS Dev Environment
│   ├── Purpose: Development, testing, demos
│   ├── Cost: ~$1.32/month
│   └── Users: Developers + early testers
└── main branch → NO INFRASTRUCTURE (git only)
    └── Purpose: Source of truth, branch protection

FUTURE STATE (Post-First-Paying-Customer):
├── dev branch → AWS Dev Environment
│   └── Cost: ~$1.32/month
└── main branch → AWS Production Environment
    ├── Created via: terraform workspace new prod
    ├── Cost: ~$503/month (100 users)
    └── Revenue: $0-2,900/month (0-100 paying users)
```

**Infrastructure Deployment Timeline:**

1. **Week 1-2: Dev Environment Only**
   - Deploy to AWS dev workspace: `terraform workspace new dev && terraform apply`
   - Connect to dev Xero app (separate OAuth credentials)
   - Test with development team
   - Cost: $1.32/month

2. **Post-Launch: Main Branch Protected, No Infrastructure**
   - Main branch has branch protection (PR from dev only)
   - No AWS resources deployed
   - Terraform state exists but no `terraform apply` executed
   - Cost: $0/month

3. **Trigger: First Paying Customer (or 10+ Active Free Users)**
   - Create production Xero OAuth app
   - Deploy production: `terraform workspace new prod && terraform apply`
   - Promote dev → main → production deployment
   - Cost: $503/month baseline → offset by revenue

**Cost Implications:**

| Phase | Dev Cost | Prod Cost | Total | Revenue | Net |
|-------|----------|-----------|-------|---------|-----|
| Pre-Launch (Weeks 1-8) | $1.32/mo | $0 | **$10** (8 weeks) | $0 | **-$10** |
| Post-Launch (No users) | $1.32/mo | $0 | $1.32/mo | $0 | -$1.32/mo |
| First customer | $1.32/mo | $503/mo | $504/mo | $29/mo | **-$475/mo** |
| 20 customers | $1.32/mo | $503/mo | $504/mo | $580/mo | **+$76/mo** |
| 100 customers | $1.32/mo | $503/mo | $504/mo | $2,900/mo | **+$2,396/mo** |

**Breakeven**: ~18 paying customers ($522 revenue vs $504 cost)

**Consequences:**

✅ **Runway Preservation**:
- Save $500+/month pre-launch (4-8 weeks = $2,000-4,000 saved)
- Only pay for production when justified by users

✅ **Risk Mitigation**:
- Avoid paying for unused infrastructure
- Validate product-market fit before scaling costs

✅ **Faster Iteration**:
- Single environment = simpler deployments
- No production database to manage during pivots

✅ **Clear Migration Path**:
- Terraform workspaces make prod creation trivial
- Same IaC, just `terraform apply` when ready

❌ **Initial Production Delay**:
- 5-10 minutes to provision infrastructure on first customer
- Mitigated: Pre-create resources, keep stopped (still costs $0)

❌ **No "Production-Like" Testing**:
- Can't test production scale before launch
- Mitigated: Dev environment is identical architecture

❌ **Risk of "Launch Day Surprises"**:
- First production deploy could surface issues
- Mitigated: Terraform plan, comprehensive testing in dev

**Alternative Considered:**
- Deploy both dev + prod immediately (rejected: $500/month burn for 0 users)
- Use same environment for dev + prod (rejected: too risky, no isolation)
- Delay all infrastructure until first customer (rejected: can't demo or test)

**Migration Checklist (When Deploying Production):**

```bash
# 1. Create production workspace
cd terraform/
terraform workspace new prod
terraform workspace select prod

# 2. Update terraform.tfvars for production
cp terraform.tfvars.dev terraform.tfvars.prod
# Edit: production domain, Xero app credentials, etc.

# 3. Plan and review
terraform plan -var-file=terraform.tfvars.prod

# 4. Deploy (5-10 minutes)
terraform apply -var-file=terraform.tfvars.prod

# 5. Verify
curl https://api.xero-agent.com/health

# 6. Migrate first users from dev
# (export/import DynamoDB data if needed)
```

**Decision Point**: Deploy production infrastructure when EITHER:
1. First paying customer signs up
2. 10+ active free tier users (validates demand)
3. Demo to investor/partner requires "production" environment

---

## Deployment Architecture

### CloudFront + S3
- PWA static assets served from S3
- CloudFront global CDN with edge locations
- HTTPS enforced (ACM certificates)
- Cache invalidation on deployments

### API Gateway
- REST API for agent interactions
- WebSocket API for real-time updates (optional)
- Cognito authorizer for JWT validation
- Request/response validation
- Throttling and rate limiting

### Lambda Configuration
- **Runtime**: Node.js 20.x
- **Memory**: 1024 MB (agent), 512 MB (MCP tools)
- **Timeout**: 30s (agent), 15s (MCP tools)
- **Provisioned Concurrency**: 2 for agent orchestrator (reduce cold starts)
- **Environment Variables**: Encrypted via KMS

### CI/CD Pipeline
```
GitHub Push → GitHub Actions
  ↓
Build & Test (TypeScript, unit tests, linting)
  ↓
Security Scan (dependency audit, secret scanning, Checkov)
  ↓
Terraform Plan (staging)
  ↓
Deploy to Staging (terraform apply)
  ↓
E2E Tests (staging)
  ↓
Manual Approval
  ↓
Terraform Plan (production)
  ↓
Deploy to Production (terraform apply)
```

---

## Subscription Model & Pricing

### Pricing Tiers

**Free Tier** ($0/month)
- Text-only agent interaction (unlimited)
- Core memory persistence (user preferences, milestones)
- Basic Xero integration (invoices, expenses, reports)
- 50 agent requests/month
- Community support

**Pro Tier** ($29/month)
- Everything in Free +
- Voice-to-voice interaction (1000 minutes/month)
- Extended memory (full conversation history, semantic search)
- Relationship progression (colleague → partner → friend)
- Priority support
- 1000 agent requests/month
- Advanced reporting and analytics

**Enterprise Tier** (Custom pricing)
- Everything in Pro +
- Unlimited voice minutes
- Custom voice cloning (brand voice)
- Multi-organization support
- Dedicated support + SLA
- SSO integration
- Custom integrations
- Unlimited requests

### Subscription Management

**DynamoDB Schema Addition:**
```typescript
{
  PK: "USER#<uid>",
  SK: "SUBSCRIPTION",
  tier: "free" | "pro" | "enterprise",
  status: "active" | "cancelled" | "past_due",
  stripeCustomerId: string,
  stripeSubscriptionId: string,
  currentPeriodStart: number,
  currentPeriodEnd: number,
  voiceMinutesUsed: number,
  agentRequestsUsed: number,
  createdAt: number
}
```

**Graceful Degradation:**
- Pro → Free: Extended memory enters read-only mode (no new memories), voice disabled
- User retains core memory indefinitely
- Re-subscribing restores extended memory (if within 90 days)

### Cost Optimization

#### AWS Free Tier Considerations
- **Lambda**: 1M free requests/month + 400,000 GB-seconds
- **DynamoDB**: 25 GB storage + 25 RCU/WCU
- **S3**: 5 GB storage + 20,000 GET requests
- **CloudFront**: 1 TB data transfer out
- **Cognito**: 50,000 MAUs free
- **Secrets Manager**: $0.40/secret/month (no free tier)

#### Estimated Infrastructure Costs (Per User)

**Free Tier User:**
- Lambda: $0.50/month (50 requests)
- DynamoDB: $0 (within free tier)
- S3/CloudFront: $0 (within free tier)
- **Total**: ~$0.50/user/month

**Pro Tier User:**
- Lambda: $2-3/month (1000 requests)
- DynamoDB: $1/month (extended memory)
- Voice (Transcribe + Polly): $24-30/month (1000 minutes)
- S3/CloudFront: $0.50/month
- **Total**: ~$27-35/user/month (cost: $27-35, revenue: $29 → **margin: $0-2**)

**Enterprise Tier:**
- Custom infrastructure (dedicated resources)
- Cost-plus pricing model

**Margin Strategy:**
- Free tier is loss leader (subsidized by Pro/Enterprise)
- Pro tier breaks even or small margin (customer acquisition)
- Enterprise tier drives profitability (80% margin target)

---

## Performance Targets

### PWA Metrics
- **Lighthouse Score**: 95+
- **Largest Contentful Paint (LCP)**: < 2.5s
- **First Input Delay (FID)**: < 100ms
- **Cumulative Layout Shift (CLS)**: < 0.1

### API Latency
- **Agent Response**: < 3s (p95, cold start < 5s)
- **Xero API Calls**: < 1s (p95)
- **Token Refresh**: < 500ms
- **Lambda Cold Start**: < 1s (with provisioned concurrency: ~100ms)

---

## Implementation Roadmap

### Overview

Project tracked in GitHub: https://github.com/IAMSamuelRodda/xero-agent/projects/8

**Total Timeline**: 20.6 days (2.9 weeks) with AI-calibrated speedup (22.8x)
**Structure**: 9 epics, 34 features, 103 tasks, 146 GitHub issues
**Milestones**: 2 releases (v1.0 MVP Free Tier → v1.1 Premium Pro Tier)

### Phase 1: v1.0 MVP - Free Tier Release (Week 1-2)

**Epic 1: Infrastructure Foundation**
- Terraform AWS core (VPC, IAM, Lambda, API Gateway)
- DynamoDB single-table design with helper SDK
- CloudWatch logging and monitoring

**Epic 2: Authentication and Authorization**
- Cognito user pool with MFA
- Xero OAuth 2.0 integration with token refresh
- JWT authentication middleware

**Epic 3: MCP Xero Server**
- Invoice, expense, bank transaction, reporting tools
- Error handling and retry logic
- Unit and integration tests

**Epic 4: Agent Core (Claude Agent SDK)**
- Agent orchestrator with session management
- Sub-agent architecture (Invoice, Expense, Reconciliation, Reporting)
- Conversation history persistence and context compaction
- Tool permission management

**Epic 5: Core Memory Persistence**
- Core memory storage (preferences, relationship stage, milestones)
- Relationship progression: colleague → partner → friend
- Automatic memory updates and retrieval

**Epic 6: PWA Frontend (MVP)**
- React + Vite + TypeScript + TailwindCSS + shadcn/ui
- Authentication UI (sign-up, sign-in, password reset)
- Chat interface with message rendering
- Xero OAuth connection UI
- Basic data visualization (invoices, expenses, reports)

### Phase 2: v1.1 Premium - Pro Tier Release (Week 3-5)

**Epic 7: Extended Memory and Semantic Search**
- Vector embedding generation (OpenAI API)
- Vector database setup (OpenSearch Serverless or Pinecone)
- Semantic search implementation
- Extended memory TTL and graceful degradation

**Epic 8: Voice Integration**
- WebSocket API Gateway for audio streaming
- AWS Transcribe integration (speech-to-text)
- Amazon Polly integration (text-to-speech)
- Voice session tracking and usage metering
- <2s latency optimization

**Epic 9: Subscription Management and Billing**
- Stripe integration (checkout, webhooks)
- Tier enforcement at API Gateway
- Subscription management UI (upgrade, cancel, billing history)

### Critical Path Dependencies

```
Infrastructure Foundation
  ↓
Authentication & MCP Server (parallel)
  ↓
Agent Core
  ↓
Core Memory + PWA Frontend (parallel)
  ↓ [v1.0 MVP Release]
Extended Memory (Phase 2)
  ↓
Voice Integration + Subscription (parallel)
  ↓ [v1.1 Premium Release]
```

### Deferred to Future Phases

- **GDPR Compliance**: Data export, retention policies, right to deletion
- **Multi-tenancy**: Organization-level accounts with team access
- **Advanced Analytics**: Usage dashboards, financial insights
- **Mobile Native Apps**: iOS/Android (PWA serves as MVP)

For detailed task breakdown and current progress, see the [GitHub Project board](https://github.com/IAMSamuelRodda/xero-agent/projects/8).

---

## References

- **Detailed Firebase Architecture**: See `docs/archive/ARCHITECTURE.old.md` (deprecated)
- [AWS Lambda Best Practices](https://docs.aws.amazon.com/lambda/latest/dg/best-practices.html)
- [DynamoDB Single-Table Design](https://www.alexdebrie.com/posts/dynamodb-single-table/)
- [Claude Agent SDK Documentation](https://docs.claude.com/en/api/agent-sdk/overview)
- [Model Context Protocol Specification](https://modelcontextprotocol.io/)
- [Xero API Reference](https://developer.xero.com/documentation/api/accounting/overview)
- [Terraform AWS Provider](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)

---

**Last Updated**: 2025-11-12
