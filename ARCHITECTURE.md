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

**tokens** (stored in DynamoDB with encryption at rest)
```typescript
{
  PK: "USER#<userId>",
  SK: "TOKEN#<organizationId>",
  userId: string,
  organizationId: string,
  xeroTenantId: string,
  accessToken: string,     // Encrypted at rest by DynamoDB
  refreshToken: string,    // Encrypted at rest by DynamoDB
  expiresAt: number,       // Access token expiry (30 minutes)
  refreshExpiresAt: number, // Refresh token expiry (30 days)
  scopes: string[],
  createdAt: number,
  updatedAt: number
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
6. Store tokens in DynamoDB (encrypted at rest with AWS managed KMS)
7. Tokens associated with userId + organizationId composite key

**API Requests:**
1. Frontend sends request with Cognito JWT
2. API Gateway validates JWT via Cognito authorizer
3. Lambda retrieves user tokens from DynamoDB (userId from JWT)
4. Check expiration (30 minutes for Xero access tokens)
5. Refresh if expired using Xero refresh token (stored in same DynamoDB row)
6. Update tokens in DynamoDB if refreshed
7. Make Xero API call with valid access token

**Token Refresh:**
- Xero access tokens: 30-minute expiration
- Xero refresh tokens: 30-day validity
- Requires `offline_access` scope
- Cognito tokens: 1-hour expiration (configurable)

---

## Security

### Token Security
- **Storage**: User OAuth tokens encrypted in DynamoDB (AWS managed KMS)
- **Shared Secrets**: Anthropic API key + Xero client credentials in Secrets Manager
- **Access Control**: IAM policies with least-privilege access
- **Rotation**: Automatic Xero token refresh via Lambda (30-day refresh tokens)
- **Cognito Tokens**: Short-lived JWTs with secure refresh flow
- **Cost Optimization**: DynamoDB storage scales to millions of users at $0/month (free tier)

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
- **Lambda**: 1M free requests/month + 400,000 GB-seconds ✅
- **DynamoDB**: 25 GB storage + 25 RCU/WCU (includes encrypted tokens) ✅
- **S3**: 5 GB storage + 20,000 GET requests ✅
- **CloudFront**: 1 TB data transfer out ✅
- **Cognito**: 50,000 MAUs free ✅
- **Secrets Manager**: $0.40/secret/month (no free tier) ⚠️
- **API Gateway**: 1M requests/month free (first 12 months) ✅

#### Estimated Infrastructure Costs

**Development Environment (< 50 users):**
- **Secrets Manager**: $0.80/month (2 secrets: API keys + Xero OAuth)
  - `shared/dev/api-keys` - Shared across all dev apps
  - `xero-agent/dev/xero-oauth` - App-specific Xero credentials
- **Lambda**: $0 (< 1M requests/month)
- **DynamoDB**: $0 (< 25GB storage, includes user tokens)
- **API Gateway**: $0 (< 1M requests/month, first 12 months)
- **Cognito**: $0 (< 50k MAUs)
- **CloudWatch Logs**: $0 (< 5GB)
- **Total**: **$0.80/month** ✅

**Scalability:**
- 1 user: $0.80/month
- 100 users: $0.80/month (same cost!)
- 10,000 users: $0.80/month (still same!)
- 50,000 users: $0.80/month (Cognito free tier limit)

**Key Insight:** User tokens in DynamoDB (free, encrypted) instead of Secrets Manager
- Old design: 100 users × $0.40 = $40/month ❌
- New design: 100 users × $0 = $0.80/month ✅

**Production Environment (Per Profitable App):**
- Secrets Manager: $0.80/month (shared API keys + app OAuth)
- Lambda: $5-10/month (depends on usage)
- DynamoDB: $2-5/month (on-demand pricing)
- API Gateway: $3.50 per million requests
- CloudWatch: $1-2/month
- **Total**: ~$10-20/month per production app

**Multi-App Strategy:**
- Shared `shared/dev/api-keys` secret across all dev apps
- Only 1 additional secret per app ($0.40) for app-specific OAuth
- See `docs/COST_OPTIMIZATION_MULTI_APP.md` for details

**Example: 20 Apps in Development**
- Old approach: 20 apps × 3 secrets × $0.40 = $24/month
- New approach: 1 shared secret + 20 OAuth secrets = $8.80/month
- Savings: $15.20/month (63% reduction)

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

## Recent Architecture Changes

### 2025-11-14: Cost Optimization - Token Storage Migration

**Change:** Migrated user OAuth tokens from Secrets Manager to DynamoDB

**Reason:**
- Secrets Manager costs $0.40/secret/month with no free tier
- Per-user tokens would cost $40/month for 100 users (not scalable)
- DynamoDB provides free encryption at rest with AWS managed KMS

**Impact:**
- Monthly cost: $1.20 → $0.80 (33% reduction)
- Scalability: Cost stays flat regardless of user count
- Security: No compromise - DynamoDB encryption equivalent to Secrets Manager for this use case

**Implementation:**
- User tokens stored in DynamoDB with `PK: USER#<userId>, SK: TOKEN#<organizationId>`
- Tokens encrypted at rest automatically with AWS managed KMS keys
- IAM policies restrict access to Lambda functions only
- Automatic expiration via DynamoDB TTL (30 days for refresh tokens)

**Secrets Manager Usage (Final):**
1. `shared/dev/api-keys` - Anthropic API key (shared across all apps)
2. `xero-agent/dev/xero-oauth` - Xero client ID/secret (per-app)

**See:** `docs/COST_OPTIMIZATION_MULTI_APP.md` for multi-app scaling strategy

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

**Last Updated**: 2025-11-14
