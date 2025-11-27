# Project Status

> **Purpose**: Current work, active bugs, and recent changes (2-week rolling window)
> **Lifecycle**: Living (update daily/weekly during active development)

**Last Updated**: 2025-11-27
**Current Phase**: ✅ Production - Live at https://zero.rodda.xyz
**Version**: 0.1.0-alpha (Pre-release)
**Infrastructure**: DigitalOcean VPS (shared with do-vps-prod services)

---

## Business Direction (2025-11-26)

### Upcoming Validation
- **Demo scheduled**: Thursday 10am (next week) with dental practice owner
- **Purpose**: Validate product-market fit, gather feedback, identify missing features
- **Key questions**: Does it solve the pain? What's missing? What would they pay?

### Target Avatar (Refined 2025-11-27)
**Primary**: Small business owner managing own books

| Attribute | Definition |
|-----------|------------|
| Who | Owner-operator, 0-5 employees |
| Revenue | $100k-$500k/year (too small for full-time bookkeeper) |
| Current state | Using Xero, doing books themselves, stressed about BAS/GST |
| Core pain | "I didn't start this business to do bookkeeping" |
| Time reality | 3-5 hours/week on books (resents every minute) |
| Money reality | Bookkeeper = $400-800/month (can't justify yet) |
| Fear | Tax surprise, ATO letter, cash flow blindness |

**One-liner**: "Zero Agent is your AI bookkeeping assistant—ask questions about your business finances and get plain-English answers instantly."

**Platform note**: Currently supports Xero. MYOB and QuickBooks planned.

**Rebrand needed**: "Zero" sounds like "Xero" when spoken—brand collision risk. Keep name until validation complete, then rebrand.

### Beta Strategy (25 Users)
| Aspect | Decision |
|--------|----------|
| Size | Max 25 Xero connects |
| Price | Free (token costs absorbed) |
| Distribution | Manual approval only |
| Liability | Clear disclaimer: no liability for mistakes/corrupted data |
| Purpose | Validate usefulness, collect feedback, refine product |

### Distribution Strategy
| Platform | Priority | Status | Notes |
|----------|----------|--------|-------|
| PWA (web) | HIGH | ✅ Live | https://zero.rodda.xyz - functional chat interface |
| Self-hosted (Docker) | HIGH | ✅ Ready | Docker configs in repo, docs available |
| **MCP Server** | HIGH | 🔵 Research | Distribute via MCP standard for Claude/AI clients |
| **ChatGPT GPT** | MEDIUM | Future | GPT Store distribution after beta validation |
| iOS App Store | LOW | Future | Evaluate after 6 months based on adoption |
| Google Play Store | LOW | Future | Evaluate after 6 months based on adoption |

**MCP Research Required**: Deep dive into making zero-agent available as MCP server. This enables distribution to Claude Code users, other MCP-compatible AI assistants. See `docs/TODO-mcp-distribution-research.md`.

### Strategic Documents
- Business orchestration: `~/repos/arcforge-business-planning/strategic-direction-finance-2025.md`
- Avatar research: `~/repos/arcforge-business-planning/avatar-investigation-2025.md`

---

## Quick Overview

| Aspect | Status | Notes |
|--------|--------|-------|
| Architecture | 🟢 | Open source platform, LLM + database agnostic |
| Infrastructure | 🟢 | **VPS Live** - https://zero.rodda.xyz |
| LLM Abstraction | 🟢 | Provider-agnostic interface (Anthropic + Ollama) |
| Database Abstraction | 🟢 | SQLite (default) + DynamoDB providers |
| Agent Foundation | 🟢 | Native tool calling + Xero integration working |
| VPS Server | 🟢 | `packages/server` - Express server deployed |
| PWA Frontend | 🟢 | React chat interface live at root URL |
| CLI Chat Interface | 🟢 | Interactive REPL ready - `pnpm chat` to start |
| Self-Hosting | 🟢 | Docker configs ready, deployment docs available |
| SQLite Backups | 🟢 | Daily automated backups at 3am UTC |
| Test Coverage | ⚪ | No formal tests yet (manual testing only) |
| Known Bugs | 🟢 | None |

**Status Guide:** 🟢 Good | 🟡 Attention | 🔴 Critical | 🔵 In Progress | ⚪ Not Started

### VPS Migration Status (2025-11-27)

| Component | AWS (Old) | VPS (New) | Status |
|-----------|-----------|-----------|--------|
| Compute | Lambda x3 | Express server | ✅ Created `packages/server` |
| Database | DynamoDB | SQLite | ✅ Already supported |
| API Gateway | AWS API GW | Express routes | ✅ Implemented |
| Auth | Cognito | Session/JWT | 🔵 Basic (needs expansion) |
| OAuth | Lambda | Express routes | ✅ Implemented |
| CDN | CloudFront | Caddy | 🔵 DNS configured |

**Cost Savings**: ~$120/month → ~$0/month (shared VPS, no additional cost)

### Deployment Progress (2025-11-27)

| Step | Status | Details |
|------|--------|---------|
| Git cleanup | ✅ Done | Single `main` branch, deleted feature branches |
| Server package | ✅ Done | `packages/server` with Express + TypeScript |
| Docker config | ✅ Done | Dockerfile, docker-compose.yml |
| VPS integration | ✅ Done | Memory-limited config (384MB) for do-vps-prod |
| DNS record | ✅ Done | `zero.rodda.xyz` → 170.64.169.203 |
| Deploy container | ✅ Done | Built and running on VPS |
| Caddy config | ✅ Done | Reverse proxy configured, auto-HTTPS |
| Health check | ✅ Done | https://zero.rodda.xyz/health responding |
| API keys | ✅ Done | Anthropic + Xero credentials configured |
| Xero OAuth | ✅ Done | Callback URL added to Xero app |

**Live URL**: https://zero.rodda.xyz
**Health Status**: ✅ Fully Operational
**VPS**: production-syd1 (170.64.169.203) - shared with Nextcloud, Joplin, etc.
**Memory Budget**: 384MB (of ~2.3GB available)

**Endpoints:**
- Health: `GET https://zero.rodda.xyz/health`
- Chat: `POST https://zero.rodda.xyz/api/chat`
- Xero Auth: `GET https://zero.rodda.xyz/auth/xero`
- Sessions: `GET https://zero.rodda.xyz/api/sessions`

---

## Current Focus

### 🎯 Major Pivot: Open Source Platform (2025-11-17)

**Decision**: Pivoting from proprietary SaaS to open source platform (MIT license)
- See `VISION.md` for philosophy
- See `docs/ADR-012-open-source-platform-architecture.md` for technical architecture

**Key Changes**:
1. ✅ **LLM Agnostic**: Support ANY LLM provider (not just Anthropic)
   - API key support: Anthropic, OpenAI, Google Gemini, Grok
   - OAuth support: Google Gemini (now), OpenAI (coming soon)
   - Local models: Ollama, LM Studio, any OpenAI-compatible endpoint

2. ✅ **Database Agnostic**: Support multiple backends
   - SQLite (self-hosted default)
   - PostgreSQL (advanced self-hosting)
   - DynamoDB (managed service)
   - Supabase (future)

3. ✅ **Self-Hostable + Managed**: Hybrid deployment model
   - Self-host: Free, unlimited, all features (Docker Compose)
   - Managed: $20/month convenience tier (we run infrastructure)
   - Enterprise: $100/month with SSO, audit logs, priority support

4. ✅ **Region Optimized**: Default to Sydney (ap-southeast-2) for Australian market
   - Reduces latency from 200-300ms (US) to 10-50ms (Sydney)
   - Xero is NZ-based, 70%+ users are AU/NZ

**Completed Today/This Week:**
- ✅ Created project documentation structure (7 core documents)
- ✅ Migrated architecture from Firebase to AWS
- ✅ Defined DynamoDB single-table design (documentation)
- ✅ Added ADR-007: Memory persistence and relationship building
- ✅ Added ADR-008: Voice-to-voice integration (premium tier)
- ✅ Defined subscription model (Free, Pro, Enterprise tiers)
- ✅ Created monorepo directory structure (packages/, functions/, terraform/)
- ✅ Set up Terraform infrastructure foundation (9 files, 1,270 lines)
- ✅ Implemented DynamoDB single-table design in Terraform
- ✅ Created IAM roles with least-privilege policies (agent, MCP, auth)
- ✅ Configured Secrets Manager for Xero OAuth tokens
- ✅ Added terraform.tfvars.example and comprehensive README
- ✅ Moved Terraform to root level (standard project structure)
- ✅ Initialized mcp-xero-server package (MCP SDK, 14 tools defined)
- ✅ Initialized agent-core package (4 sub-agents, session/memory managers)
- ✅ Initialized pwa-app package (React 18, Vite 6, PWA configured)
- ✅ Configured pnpm workspaces and Turbo monorepo
- ✅ Documented Claude Agent SDK architecture and best practices
- ✅ Researched and documented Xero API integration (450+ lines)
- ✅ Implemented Xero client wrapper with token management
- ✅ Completed all 5 MCP invoice handlers with Xero API integration
- ✅ Created main branch with protection rules (PR from dev only)
- ✅ Configured dev branch protection (PR from feature branches only)
- ✅ Added enforce-dev-pr-source.yml workflow
- ✅ Created PR #149 (dev → main) following three-tier strategy
- ✅ Completed all 9 remaining MCP handlers (bank, reporting, expenses)
- ✅ Updated xero-node to v13.2.0 and fixed claude-agent-sdk package name
- ✅ All 14 MCP tools now fully implemented (Infrastructure Foundation 100%)
- ✅ Deep research on MCP context optimization (29,000+ word guide)
- ✅ Created improving-mcps skill (100/100 score, 15KB distributable zip)
- ✅ Assessed xero-mcp-server with 8-dimension rubric (42/100 → 76/100)
- ✅ Implemented P1+P2 optimizations (pagination, filtering, ResourceLink, metrics)
- ✅ Achieved 95% token reduction (95,000 → 4,750 tokens/conversation)
- ✅ Optimized dev environment cost ($1.32 → $0.80/month, <$1 budget achieved)
- ✅ Built all 3 Lambda function wrappers (Agent, MCP, Auth)
- ✅ Created Terraform Lambda resources (lambda.tf, 229 lines)
- ✅ Added Xero client secret to Secrets Manager
- ✅ Documented Lambda architecture (functions/README.md, 400+ lines)
- ✅ Created API Gateway Terraform resources (api-gateway.tf, 450+ lines, 7 endpoints)
- ✅ Created Cognito Terraform resources (cognito.tf, 270+ lines with custom attributes)
- ✅ Built Lambda deployment packages (agent: 49MB, mcp: 15MB, auth: 5.6MB)
- ✅ Optimized Secrets Manager cost ($1.20 → $0.80/month, tokens in DynamoDB)
- ✅ Created terraform.tfvars and comprehensive deployment guide
- ✅ Validated Terraform plan (79 resources ready to deploy)
- ✅ Fixed TypeScript compilation errors in Lambda functions
- ✅ Resolved Terraform dependency cycles and resource references
- ✅ **Architecture Pivot**: Researched and documented open source platform strategy
- ✅ **LLM OAuth Research**: Google Gemini has OAuth now, OpenAI coming soon
- ✅ **Region Migration**: Updated Terraform default to Sydney (ap-southeast-2)
- ✅ Created `VISION.md` - Open source platform philosophy
- ✅ Created `ADR-012` - Complete open source architecture specification
- ✅ Created `docs/SPIKE-anthropic-cost-control.md` - Multi-tenant cost analysis
- ✅ Created `docs/ADR-011-anthropic-billing-model.md` - BYOK vs managed comparison

**Completed Today:**
- ✅ **AWS Cleanup**: Destroyed all resources in ap-southeast-2 and us-east-1 (79 resources)
- ✅ **Cost Reduction**: Ongoing AWS costs now $0/month (clean slate)
- ✅ **LLM Abstraction Layer COMPLETE**:
  - ✅ Core interface defined (TypeScript with full typing)
  - ✅ Anthropic provider implemented (Claude 4.5 Sonnet, 3.7 Sonnet, 3.5 Haiku)
  - ✅ Ollama provider implemented (Local LLMs - FREE, private)
  - ✅ Factory pattern for easy provider creation
  - ✅ Usage tracking and cost calculation
  - ✅ Streaming support
  - ✅ Built and compiled successfully (`@zero-agent/core` package)
  - ✅ Example test script created
  - ✅ Tested with Anthropic API (cost: $0.000053 per test)
  - ✅ Secured API key in .env file (600 permissions)
- ✅ **LLM Integration into Agent Orchestrator COMPLETE**:
  - ✅ Updated agent-core package.json to use `@zero-agent/core`
  - ✅ Removed direct Anthropic SDK dependency (now abstracted)
  - ✅ Integrated LLM provider into AgentOrchestrator class
  - ✅ Implemented message processing with conversation context
  - ✅ Added system prompt generation with user memory context
  - ✅ Built and tested orchestrator with example conversation
  - ✅ Verified token tracking and usage metrics work correctly

- ✅ **Database Abstraction Layer COMPLETE**:
  - ✅ Database provider interface defined (comprehensive type system)
  - ✅ SQLite provider implemented (self-hosting default)
  - ✅ DynamoDB provider implemented (managed service)
  - ✅ Factory pattern for provider creation
  - ✅ Session persistence (conversation history with TTL)
  - ✅ Core Memory operations (user preferences, relationship tracking)
  - ✅ Extended Memory operations (semantic search ready)
  - ✅ OAuth token storage (Xero credentials with refresh)
  - ✅ Built and tested successfully (all CRUD operations verified)
- ✅ **Database Integration into Agent Core COMPLETE**:
  - ✅ Updated SessionManager to use database abstraction
  - ✅ Updated MemoryManager to use database abstraction
  - ✅ Integrated into AgentOrchestrator with async initialization
  - ✅ Removed duplicate types (re-export from @zero-agent/core)
  - ✅ Tested end-to-end with SQLite (conversation persistence working)
  - ✅ Verified conversation history retrieval (4 messages saved correctly)
- ✅ **Xero OAuth Integration COMPLETE**:
  - ✅ Registered Xero app (zero-agent-dev) with ngrok HTTPS tunnel
  - ✅ Implemented OAuth server with Express (auth flow + callback)
  - ✅ Created XeroClient wrapper with automatic token refresh
  - ✅ OAuth token storage in database with tenant information
  - ✅ Successfully tested with live Xero API (Organizations, Invoices)
  - ✅ Verified automatic token refresh cycle (30-minute expiry)
- ✅ **Agent Foundation COMPLETE**:
  - ✅ Created Xero tool definitions (6 tools: invoices, contacts, reports)
  - ✅ Integrated XeroClient and tools into AgentOrchestrator
  - ✅ Implemented tool calling in LLM conversation flow
  - ✅ Added tool detection and execution logic
  - ✅ Built conversational loop: query → tool call → result → response
  - ✅ Tested end-to-end with real Xero data (unpaid invoices, org info)
  - ✅ Verified natural language responses with live accounting data

**Completed Today (2025-11-18):**
- ✅ **Project Rename: Xero Agent → Zero Agent**:
  - ✅ Renamed all 73+ instances across codebase
  - ✅ Updated all package names (@xero-agent → @zero-agent)
  - ✅ Updated all import statements and dependencies
  - ✅ Updated all documentation (README, ARCHITECTURE, CLAUDE, STATUS)
  - ✅ Rebuilt packages successfully
- ✅ **Native Tool Calling Implementation**:
  - ✅ Added tool calling support to LLM abstraction layer
  - ✅ Updated Anthropic provider to use Claude's native tool use
  - ✅ Fixed orchestrator to detect and execute tool calls properly
  - ✅ Removed unreliable JSON parsing approach
  - ✅ Tested successfully - tools now execute automatically
- ✅ **CLI Chat Interface**:
  - ✅ Created interactive REPL (`examples/chat.ts`)
  - ✅ Added `pnpm chat` command to package.json
  - ✅ Created CHAT_GUIDE.md with full usage instructions
  - ✅ Updated README.md with quick start guide
  - ✅ Built chat history viewer (`examples/view-history.ts`)
  - ✅ Verified conversation persistence in SQLite

**Completed This Week (2025-11-27):**
- ✅ VPS deployment with Docker + Caddy
- ✅ PWA frontend with chat interface
- ✅ Xero OAuth integration working
- ✅ SQLite backup automation (daily at 3am UTC)
- ✅ AWS cleanup (removed terraform/ and functions/ directories)

**Next Up:**
1. **User Demo** - Thursday 10am next week
2. **PWA Improvements** - Better error handling, loading states
3. **Additional Xero Tools** - Expenses, bank reconciliation
4. **User Authentication** - Multi-user support

---

## Deployment Status

### Production (VPS)
- **Status**: ✅ Live
- **URL**: https://zero.rodda.xyz
- **VPS**: DigitalOcean Sydney (170.64.169.203)
- **Container**: Docker with Caddy reverse proxy
- **Database**: SQLite with daily backups
- **Cost**: $0/month (shared droplet)

### Self-Hosted
- **Status**: ✅ Available
- **Requirements**: Docker + Docker Compose
- **Guide**: See `specs/DEPLOYMENT.md`

---

## Known Issues

See **ISSUES.md** for detailed issue tracking.

**Summary**: 0 Critical | 0 High | 2 Medium | 1 Low

Active improvements:
- `issue_001`: PWA Connect button loading state (P2)
- `issue_002`: Chat message timestamps (P3)

Technical debt:
- `debt_001`: No formal test coverage (P2)

---

## Recent Achievements (Last 2 Weeks)

**VPS Deployment Complete** ✅
- Completed: 2025-11-27
- Migrated from AWS Lambda to DigitalOcean VPS
- Express server with SQLite database
- PWA frontend with chat interface
- Xero OAuth integration working
- Daily automated backups configured

**AWS Cleanup** ✅
- Completed: 2025-11-27
- Removed terraform/ directory (25 files)
- Removed functions/ directory (10 files)
- Cost reduced from ~$120/month to $0/month

**Core Features Complete** ✅
- LLM abstraction layer (Anthropic + Ollama)
- Database abstraction (SQLite + DynamoDB)
- Native tool calling integration
- Conversation persistence

---

## Next Steps (Priority Order)

1. **User Demo Preparation**
   - Prepare demo script for dental practice owner
   - Test common accounting queries
   - Document feedback gathering process

2. **PWA Improvements**
   - Better loading states for OAuth flow
   - Message timestamps in chat
   - Error handling improvements

3. **Additional Xero Tools**
   - Expense tracking
   - Bank reconciliation
   - Reporting enhancements

4. **MCP Distribution Research** (Future)
   - Research: Make Zero Agent available as MCP server for Claude Code users
   - See `docs/TODO-mcp-distribution-research.md` for full research spike
   - Key questions: OAuth flow in MCP context, token costs, distribution

5. **User Authentication** (Future)
   - Multi-user support
   - Session management
   - User preferences storage

6. **Premium Features** (Future)
   - Extended memory with semantic search
   - Voice-to-voice integration
   - Subscription management

---

**Note**: Archive items older than 2 weeks to keep document focused.
