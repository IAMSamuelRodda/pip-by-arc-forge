# Zero Agent - Architecture

> **Purpose**: Technical reference for system design, database schema, and architectural decisions
> **Lifecycle**: Living (update as architecture evolves)

**Last Updated**: 2025-11-29

---

## System Overview

Zero Agent uses a **monolithic VPS architecture** for cost efficiency and simplicity:

```
┌─────────────────────────────────────────────────────┐
│ Presentation Layer: PWA (React + Vite)              │
│  - Mobile-first responsive UI                       │
│  - Service workers for offline support              │
│  - Served from Express static middleware            │
└────────────────┬────────────────────────────────────┘
                 │ HTTPS (Caddy reverse proxy)
┌────────────────▼────────────────────────────────────┐
│ Application Layer: Express Server + Agent Core      │
│  - Single Node.js process with API routes           │
│  - Agent orchestration with native tool calling     │
│  - Session management via SQLite                    │
└────────────────┬────────────────────────────────────┘
                 │ Direct integration (in-process)
┌────────────────▼────────────────────────────────────┐
│ Integration Layer: Xero Client                      │
│  - OAuth token management (SQLite)                  │
│  - xero-node SDK wrapper                            │
│  - Automatic token refresh                          │
└────────────────┬────────────────────────────────────┘
                 │ REST API (HTTPS)
┌────────────────▼────────────────────────────────────┐
│ External API: Xero Accounting API                   │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ VPS Infrastructure (DigitalOcean)                   │
│  Docker | Caddy | SQLite | cron (backups)          │
└─────────────────────────────────────────────────────┘
```

---

## Architecture Pattern

**Pattern**: Monolithic server with embedded agent orchestration

**Structure**: Monorepo with packages
```
zero-agent/
├── packages/
│   ├── core/                # LLM + Database abstractions
│   ├── agent-core/          # Agent orchestrator + Xero tools
│   ├── server/              # Express API server
│   ├── pwa-app/             # Progressive Web App (React)
│   ├── mcp-remote-server/   # Remote MCP server (Claude.ai/ChatGPT) ← NEW
│   └── mcp-xero-server/     # MCP server (legacy/unused)
├── deploy/
│   ├── docker-compose.vps-integration.yml  # VPS deployment
│   └── Caddyfile.pip-mcp    # Caddy config for pip.arcforge.au
├── examples/
│   ├── chat.ts              # CLI chat interface
│   └── view-history.ts      # Session history viewer
├── docker-compose.yml       # VPS deployment config
├── Dockerfile               # Multi-stage production build
└── Caddyfile                # Reverse proxy config
```

---

## Technology Stack

### Frontend/Client
| Technology | Version | Purpose |
|------------|---------|---------|
| React | 18+ | UI framework |
| TypeScript | 5+ | Type safety |
| Vite | 6+ | Build tool |
| Zustand | 5+ | State management |
| TailwindCSS | 3+ | Styling |
| React Router | 7+ | Client-side routing |
| Vite PWA Plugin | 0.21+ | PWA features |

### Backend/Server
| Technology | Version | Purpose |
|------------|---------|---------|
| Express | 4+ | HTTP server |
| Anthropic SDK | Latest | LLM provider |
| xero-node | 13+ | Xero API client |
| better-sqlite3 | Latest | SQLite database |
| helmet | 8+ | Security headers |
| cors | 2+ | CORS middleware |

### Infrastructure (VPS)
| Component | Purpose |
|-----------|---------|
| **Docker** | Container runtime |
| **Caddy** | Reverse proxy with auto-HTTPS |
| **SQLite** | Persistent database |
| **cron** | Scheduled backups (daily) |
| **DigitalOcean** | VPS hosting (shared droplet) |

---

## Database Schema (SQLite)

The database uses SQLite for simplicity and zero operational cost. Schema defined in `packages/core/src/database/sqlite.ts`.

### Tables

**sessions**
```sql
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  messages TEXT NOT NULL,  -- JSON array of messages
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  expires_at INTEGER
);
CREATE INDEX idx_sessions_user ON sessions(user_id);
```

**core_memory**
```sql
CREATE TABLE core_memory (
  user_id TEXT PRIMARY KEY,
  preferences TEXT NOT NULL,  -- JSON object
  relationship_stage TEXT DEFAULT 'colleague',
  key_milestones TEXT,        -- JSON array
  critical_context TEXT,      -- JSON array
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
```

**oauth_tokens**
```sql
CREATE TABLE oauth_tokens (
  user_id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  tenant_name TEXT,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  scope TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
```

**extended_memory** (future)
```sql
CREATE TABLE extended_memory (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  conversation_summary TEXT,
  embedding BLOB,            -- Vector for semantic search
  topics TEXT,               -- JSON array
  created_at INTEGER NOT NULL,
  expires_at INTEGER         -- TTL for subscription tier
);
CREATE INDEX idx_extended_memory_user ON extended_memory(user_id);
```

### Database Location
- **Development**: `./data/zero-agent.db`
- **Production (Docker)**: `/app/data/zero-agent.db` (mounted volume)

### Backup Strategy
- Daily automated backups via cron at 3am UTC
- 7-day retention with automatic cleanup
- Backup script: `/opt/backups/backup-zero-agent.sh` on VPS

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

### Xero OAuth 2.0

**Current Implementation** (single-user mode):
- No user authentication required (MVP)
- Xero OAuth tokens stored in SQLite
- Single organization per deployment

**Xero OAuth Integration:**
1. User clicks "Connect to Xero" in PWA
2. Server redirects to Xero authorization endpoint
3. User grants permissions to Xero organization
4. Callback receives authorization code at `/auth/xero/callback`
5. Server exchanges code for Xero tokens
6. Store tokens in SQLite `oauth_tokens` table
7. Redirect user back to PWA

**Token Refresh:**
- Xero access tokens: 30-minute expiration
- Xero refresh tokens: 60-day validity (Xero extended from 30 days)
- Requires `offline_access` scope
- Automatic refresh on API calls via XeroClient wrapper

**API Requests:**
1. Frontend sends request to Express API
2. Server retrieves tokens from SQLite
3. Check expiration, refresh if needed
4. Make Xero API call with valid access token
5. Return response to frontend

---

## Security

### Token Security
- **Storage**: OAuth tokens in SQLite database file
- **Secrets**: Environment variables for API keys (`.env` file)
- **Access Control**: VPS filesystem permissions (600 for .env)
- **Rotation**: Automatic Xero token refresh via XeroClient wrapper

### Data Protection
- **In Transit**: TLS 1.3 via Caddy auto-HTTPS (Let's Encrypt)
- **At Rest**: SQLite file on encrypted VPS volume
- **Backups**: Daily encrypted backups with 7-day retention

### Server Security
- Helmet.js for security headers
- CORS configured for production domain
- Rate limiting on API endpoints
- Non-root Docker user (uid 1001)

### Content Security Policy (via Helmet)
```
default-src 'self';
script-src 'self' 'unsafe-inline';
style-src 'self' 'unsafe-inline';
connect-src 'self' https://api.xero.com;
img-src 'self' data: https:;
```

---

## Agent Architecture

### Orchestrator Pattern
- Single `AgentOrchestrator` class in `packages/agent-core`
- Lazy initialization (server starts without API key)
- Native Claude tool calling (no JSON parsing)
- Automatic conversation context management

### Tool Integration
Tools defined in `packages/agent-core/src/tools/`:
1. **Xero Tools** - Organization info, invoices, contacts, reports
2. **Future**: Bank reconciliation, expense tracking

### Conversation Flow
```
User Message → Orchestrator → LLM (Claude)
                    ↓              ↓
              Session Store   Tool Calls
                    ↓              ↓
              History Update   Xero API
                    ↓              ↓
              Response ← Tool Results
```

### LLM Abstraction
Provider-agnostic interface in `packages/core/src/llm/`:
- **Anthropic Provider**: Claude 4.5 Sonnet, 3.7 Sonnet, 3.5 Haiku
- **Ollama Provider**: Local models (free, private)
- Factory pattern for easy provider switching

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

### VPS Configuration
- **Provider**: DigitalOcean (shared droplet)
- **Location**: Sydney (syd1) for AU/NZ users
- **Memory**: 384MB allocated (of ~2.3GB available)
- **Storage**: Docker volume for SQLite persistence

### Caddy Reverse Proxy
- Auto-HTTPS via Let's Encrypt
- HTTP/2 support
- Automatic certificate renewal
- Domains: `app.pip.arcforge.au` (main app), `mcp.pip.arcforge.au` (MCP server)

### Docker Configuration
- Multi-stage build for minimal image size
- Node.js 20 Alpine base
- Non-root user (uid 1001) for security
- Health check endpoint at `/health`

### Deployment Process
```
Local Development → Git Push → SSH to VPS
  ↓
git pull on VPS
  ↓
docker build -t zero-agent .
  ↓
docker compose up -d
  ↓
Health check verification
```

### API Endpoints
- `GET /health` - Health check
- `POST /api/chat` - Chat with agent
- `GET /api/sessions` - List sessions
- `GET /auth/xero` - Initiate Xero OAuth
- `GET /auth/xero/callback` - OAuth callback
- `GET /auth/status` - Check Xero connection

---

## Cost Analysis

### Current Infrastructure Cost

**VPS Deployment (Shared Droplet):**
- **Zero Agent allocation**: $0/month (shared with other services)
- **Anthropic API**: Usage-based (~$0.003/chat interaction)
- **Domain**: Included in existing DNS
- **Total**: **~$0/month** fixed + API usage

### Cost Comparison (AWS vs VPS)

| Aspect | AWS (Previous) | VPS (Current) |
|--------|----------------|---------------|
| Fixed Cost | $0.80/month (Secrets Manager) | $0/month |
| Scaling | Pay-per-use | Fixed capacity |
| Cold Starts | Yes (Lambda) | No |
| Complexity | High (40+ resources) | Low (1 container) |
| Migration Time | ~4 hours | 30 minutes |

### API Cost Estimates (Anthropic)

Using Claude 3.5 Sonnet:
- **Input**: $3.00 per 1M tokens
- **Output**: $15.00 per 1M tokens
- **Typical chat**: ~500 input + ~200 output tokens = ~$0.003

**Monthly Estimates:**
- 100 chats/month: ~$0.30
- 1,000 chats/month: ~$3.00
- 10,000 chats/month: ~$30.00

---

## Performance Targets

### PWA Metrics
- **Lighthouse Score**: 95+
- **Largest Contentful Paint (LCP)**: < 2.5s
- **First Input Delay (FID)**: < 100ms
- **Cumulative Layout Shift (CLS)**: < 0.1

### API Latency
- **Agent Response**: < 5s (p95, depends on LLM response time)
- **Xero API Calls**: < 1s (p95)
- **Token Refresh**: < 500ms
- **Health Check**: < 50ms

---

## Implementation Status

### Completed (v0.1.0-alpha)

**Core Infrastructure** ✅
- VPS deployment with Docker + Caddy
- SQLite database with automatic backups
- Express server with API routes
- PWA frontend with chat interface

**LLM Integration** ✅
- Provider-agnostic abstraction layer
- Anthropic provider (Claude 3.5 Sonnet)
- Ollama provider (local models)
- Native tool calling support

**Xero Integration** ✅
- OAuth 2.0 flow with token refresh
- Organization info retrieval
- Invoice queries (list, unpaid)
- Contact management

**Database Layer** ✅
- SQLite provider (default)
- DynamoDB provider (available)
- Session persistence
- OAuth token storage

### Future Development

**Phase 2: Enhanced Features**
- User authentication (multi-user support)
- Extended memory with semantic search
- Additional Xero tools (expenses, reconciliation)
- Reporting and analytics

**Phase 3: Premium Features**
- Voice-to-voice integration
- Subscription management
- Multi-organization support

---

## MCP Remote Server Architecture

The MCP Remote Server (`packages/mcp-remote-server`) enables Pip to work directly within Claude.ai and ChatGPT, with users bringing their own LLM subscription.

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│         Claude.ai / ChatGPT (User's Subscription)           │
│                      LLM Inference                          │
└────────────────────┬────────────────────────────────────────┘
                     │ SSE Connection
                     ▼
┌─────────────────────────────────────────────────────────────┐
│         MCP Remote Server (mcp.pip.arcforge.au)             │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              Lazy-Loading Layer                      │   │
│  │  ┌─────────────────┐  ┌─────────────────────────┐   │   │
│  │  │get_tools_in_    │  │    execute_tool         │   │   │
│  │  │   category      │  │                         │   │   │
│  │  └────────┬────────┘  └───────────┬─────────────┘   │   │
│  └───────────┼───────────────────────┼─────────────────┘   │
│              │                       │                      │
│  ┌───────────▼───────────────────────▼─────────────────┐   │
│  │              Tool Registry (10 tools)                │   │
│  │  invoices (3) │ reports (2) │ banking (2)           │   │
│  │  contacts (2) │ organisation (1)                     │   │
│  └──────────────────────────┬──────────────────────────┘   │
│                             │                               │
└─────────────────────────────┼───────────────────────────────┘
                              │ Xero API
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Xero Accounting API                      │
└─────────────────────────────────────────────────────────────┘
```

### Key Components

| Component | Purpose |
|-----------|---------|
| SSE Transport | Real-time bidirectional MCP communication |
| JWT Auth | Multi-tenant user authentication |
| Lazy-Loading | 2 meta-tools expose 10 underlying tools on demand |
| Session Manager | Per-connection state management |
| Xero Client | OAuth token management, API calls |

### Lazy-Loading Pattern

**Problem**: Exposing all tools consumes ~2000 tokens immediately
**Solution**: Expose 2 meta-tools, expand on demand

```
Initial Connection:
  tools/list → [get_tools_in_category, execute_tool]  (~300 tokens)

On Demand:
  get_tools_in_category("invoices") → [get_invoices, get_aged_receivables, get_aged_payables]
  execute_tool("get_invoices", {status: "AUTHORISED"}) → Invoice data
```

**Context Reduction**: 85% (2000 → 300 tokens)

### Deployment

- **URL**: https://mcp.pip.arcforge.au
- **Container**: `pip-mcp` (256MB memory limit)
- **Network**: `droplet_frontend` (shared with Caddy)
- **Storage**: Shared SQLite volume with main server
- **DNS**: Cloudflare A records (DNS Only, required for SSE compatibility)

---

## Recent Architecture Changes

### 2025-11-29: MCP Remote Server with Lazy-Loading

**Change:** Added MCP remote server for Claude.ai/ChatGPT distribution

**Reason:**
- Enable $0 LLM inference costs (users bring their own subscription)
- Distribute Pip to Claude.ai and ChatGPT users
- Implement context-efficient lazy-loading pattern

**Impact:**
- New package: `packages/mcp-remote-server`
- New deployment: https://mcp.pip.arcforge.au
- Token reduction: 85% via lazy-loading
- Same pattern applicable to Claude Desktop

---

### 2025-11-27: AWS to VPS Migration

**Change:** Migrated from AWS serverless to DigitalOcean VPS

**Reason:**
- AWS cost was ~$4/day even with minimal usage
- Cold starts added latency to Lambda functions
- Complexity of managing 40+ AWS resources
- VPS provides simpler deployment model

**Impact:**
- Monthly cost: ~$120/month → $0/month (shared VPS)
- Latency: Eliminated cold starts
- Complexity: 40+ resources → 1 Docker container
- Deployment: Terraform → git pull + docker build

**Implementation:**
- Express server replaces API Gateway + Lambda
- SQLite replaces DynamoDB (with DynamoDB still available)
- Caddy replaces CloudFront + ACM
- Environment variables replace Secrets Manager
- Daily cron backups replace DynamoDB TTL

### 2025-11-17: Open Source Platform Pivot

**Change:** Pivoted from proprietary SaaS to open source platform

**Impact:**
- LLM abstraction layer (any provider)
- Database abstraction (SQLite or DynamoDB)
- Self-hosting support via Docker
- MIT license

---

## References

- [Anthropic API Documentation](https://docs.anthropic.com/)
- [Xero API Reference](https://developer.xero.com/documentation/api/accounting/overview)
- [xero-node SDK](https://github.com/XeroAPI/xero-node)
- [Express.js Documentation](https://expressjs.com/)
- [Caddy Web Server](https://caddyserver.com/)
- [better-sqlite3](https://github.com/WiseLibs/better-sqlite3)

---

**Last Updated**: 2025-11-29
