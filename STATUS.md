# Project Status

> **Purpose**: Current work, active bugs, and recent changes (2-week rolling window)
> **Lifecycle**: Living (update daily/weekly during active development)

**Last Updated**: 2025-11-27
**Current Phase**: VPS Deployment 🚀 Deploying to zero.rodda.xyz
**Version**: 0.1.0-alpha (Pre-release)
**Infrastructure**: DigitalOcean VPS (shared with do-vps-prod services)

---

## Business Direction (2025-11-26)

### Upcoming Validation
- **Demo scheduled**: Thursday 10am (next week) with dental practice owner
- **Purpose**: Validate product-market fit, gather feedback, identify missing features
- **Key questions**: Does it solve the pain? What's missing? What would they pay?

### Target Market Exploration
Primary segments under consideration:
1. **Healthcare Practice Owners** (dentists, physios, GPs) - HIGH priority (direct validation path)
2. **Small Business Owners** (general Xero users) - MEDIUM priority
3. **Web3/Crypto Businesses** - MEDIUM priority (may require wallet integration)
4. **Accountants/Bookkeepers** - LOW priority (B2B, longer sales cycle)

### Distribution Strategy
| Platform | Priority | Status | Notes |
|----------|----------|--------|-------|
| PWA (web) | HIGH | Scaffolded | ✅ `display: standalone` configured - native-like experience |
| Self-hosted (Docker) | HIGH | 🔵 Deploying | Docker + systemd configs ready |
| VPS (zero.rodda.xyz) | HIGH | 🔵 Deploying | DNS configured, deployment in progress |
| iOS App Store | MEDIUM | Future | Required for scale |
| Google Play Store | MEDIUM | Future | Broader Android reach |
| F-Droid | LOW | Future | Privacy-conscious users |

**Note**: PWA with `display: standalone` in manifest provides near-native experience without app store overhead. Evaluate native app investment after 6 months based on adoption data.

### Strategic Documents
- Business orchestration: `~/repos/arcforge-business-planning/strategic-direction-finance-2025.md`
- Avatar research: `~/repos/arcforge-business-planning/avatar-investigation-2025.md`

---

## Quick Overview

| Aspect | Status | Notes |
|--------|--------|-------|
| Architecture | 🟢 | Open source platform, LLM + database agnostic |
| Infrastructure | 🔵 | **Migrating to VPS** - AWS terminated, `packages/server` created |
| LLM Abstraction | 🟢 | Provider-agnostic interface (Anthropic + Ollama) |
| Database Abstraction | 🟢 | SQLite (default) + DynamoDB providers |
| Agent Foundation | 🟢 | Native tool calling + CLI chat interface working |
| VPS Server | 🟢 | `packages/server` - unified Express server ready |
| CLI Chat Interface | 🟢 | Interactive REPL ready - `pnpm chat` to start |
| Self-Hosting | 🔵 | Server package ready, deployment docs pending |
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
| API keys | ⚠️ **Required** | ANTHROPIC_API_KEY not set |
| Xero OAuth | ⚪ Pending | Add callback URL to Xero app |

**Live URL**: https://zero.rodda.xyz
**Health Status**: ✅ Healthy (server running, chat needs API key)
**VPS**: production-syd1 (170.64.169.203) - shared with Nextcloud, Joplin, etc.
**Memory Budget**: 384MB (of ~2.3GB available)

**To complete setup:**
1. Add `ZERO_AGENT_ANTHROPIC_KEY` to `/opt/docker/droplet/.env`
2. Add Xero callback URL: `https://zero.rodda.xyz/auth/callback`
3. Add `ZERO_AGENT_XERO_CLIENT_ID` and `ZERO_AGENT_XERO_CLIENT_SECRET` to `.env`
4. Restart: `cd /opt/docker/droplet && docker compose -f docker-compose.zero-agent.yml up -d`

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

**In Progress:**
- ⚪ **Next Phase**: PWA Frontend or Docker Compose self-hosting setup

**Next Up (Priority Order):**
1. **Test & Integrate LLM Abstraction** ✅ COMPLETE
   - [x] Create `packages/core/llm/LLMProvider.ts` interface ✅
   - [x] Implement Anthropic adapter (MVP - cheapest for testing) ✅
   - [x] Implement Ollama adapter (local, free) ✅
   - [x] Test with example script (Anthropic + Ollama) ✅
   - [x] Update agent-core package to use new abstraction ✅
   - [ ] Add OpenAI, Google, Grok adapters (optional - later)
   - [ ] Add provider selection to config system

2. **Implement Database Abstraction** ✅ COMPLETE
   - [x] Create `packages/core/database/DatabaseProvider.ts` interface ✅
   - [x] Implement SQLite adapter (self-host default) ✅
   - [x] Implement DynamoDB adapter (managed service) ✅
   - [x] Integrate into SessionManager and MemoryManager ✅
   - [ ] Add PostgreSQL adapter (optional - deferred)

3. **Xero OAuth Integration** ✅ COMPLETE
   - [x] User: Register Xero app at https://developer.xero.com/app/manage ✅
   - [x] User: Get XERO_CLIENT_ID and XERO_CLIENT_SECRET ✅
   - [x] User: Add credentials to .env file ✅
   - [x] Implement OAuth flow (Express server for local testing) ✅
   - [x] Test token storage and refresh cycle ✅
   - [x] Build XeroClient wrapper with auto-refresh ✅
   - [x] Create tool definitions for agent ✅
   - [x] Test end-to-end with real Xero data ✅

4. **Self-Hosting Setup** (Week 2)
   - [ ] Create `docker-compose.yml` for self-hosting
   - [ ] Write `docs/self-hosting.md` guide
   - [ ] Test local deployment with Ollama + SQLite
   - [ ] Add environment variable configuration

5. **Xero OAuth Proxy** (Week 2)
   - [ ] Design OAuth relay service for self-hosted users
   - [ ] Implement proxy API (Lambda or Express)
   - [ ] Document OAuth modes (own app vs proxy)

5. **Managed Service Deployment** (Week 3)
   - [ ] Obtain Xero OAuth credentials
   - [ ] Deploy to Sydney region (terraform apply)
   - [ ] Test end-to-end with managed infrastructure
   - [ ] Set up billing (Stripe integration)

6. **Open Source Launch** (Week 4)
   - [ ] Update LICENSE to MIT
   - [ ] Polish README.md for GitHub
   - [ ] Create CONTRIBUTING.md
   - [ ] Set up GitHub Discussions
   - [ ] Launch on HN, Reddit, Twitter

---

## Deployment Status

### Self-Hosted (Community)
- **Status**: Not yet available (Week 2 target)
- **Cost**: $0 (user runs own infrastructure)
- **Requirements**: Docker + Docker Compose, or manual setup
- **LLM Options**: User's API keys OR local Ollama
- **Database**: SQLite (default) or PostgreSQL
- **Support**: GitHub Discussions (community)

### Managed - Development (dev branch → AWS Sydney)
- **Status**: ALL RESOURCES DELETED - Clean slate for refactor
- **Region**: ap-southeast-2 (Sydney) - ready for fresh deployment
- **URL**: None (will be created on next terraform apply)
- **Cost**: $0/month (all resources deleted)
- **Purpose**: Will be deployed after LLM abstraction layer complete
- **Last Activity**: 2025-11-17 (cleanup completed)
- **Next Deploy**: After LLM + DB abstraction implementation

### Managed - Production
- **Status**: Not yet configured (post-MVP)
- **Region**: ap-southeast-2 (Sydney)
- **Target**: After open source launch + 50 users
- **URL**: TBD
- **Last Deployed**: N/A

---

## Known Issues

### Critical
None currently.

### High Priority
None currently.

### Architecture Debt (Post-Pivot)
1. **LLM Provider Hardcoded**: Currently tightly coupled to Anthropic
   - Need to implement abstraction layer before deploying
   - Target: Week 1 completion

2. **Database Hardcoded**: Currently assumes DynamoDB
   - Need SQLite adapter for self-hosting
   - Target: Week 1 completion

3. **No Self-Hosting Docs**: Docker Compose not yet created
   - Target: Week 2 completion

---

## Recent Achievements (Last 2 Weeks)

**Architecture Pivot to Open Source Platform** ✅
- Completed: 2025-11-17
- Researched LLM OAuth capabilities (Google Gemini available now)
- Designed LLM abstraction layer supporting 6+ providers
- Designed database abstraction for multi-backend support
- Created VISION.md - Platform philosophy
- Created ADR-012 - Complete open source architecture
- Migrated default region to Sydney (ap-southeast-2)

**Infrastructure Foundation** ✅
- Completed: 2025-11-14
- Built complete AWS infrastructure (79 Terraform resources)
- Implemented all 14 MCP tools with 95% token optimization
- Created Lambda deployment packages (Agent, MCP, Auth)
- Validated Terraform plan (ready to deploy after LLM refactor)

**Documentation Foundation** ✅
- Completed: 2025-11-12
- Established 7-document structure
- Created BLUEPRINT.yaml for project roadmap
- 10+ ADRs documenting key decisions

---

## Next Steps (Priority Order)

1. **Package Structure Setup**
   - Create monorepo with pnpm workspaces
   - Initialize packages: mcp-xero-server, agent-core, pwa-app
   - Create functions directory for Lambda handlers
   - Set up shared TypeScript configuration

2. **AWS Infrastructure (Terraform)**
   - Define DynamoDB single-table design
   - Configure Lambda functions (agent, MCP, auth)
   - Set up API Gateway (REST + Cognito authorizer)
   - Configure S3 + CloudFront for PWA hosting
   - Set up Secrets Manager for Xero tokens
   - Configure Cognito user pool
   - Set up IAM roles and policies

3. **Xero API Integration**
   - Register Xero developer application
   - Configure OAuth 2.0 flow (Cognito + Xero)
   - Implement token storage in Secrets Manager
   - Create Lambda function for OAuth callback

4. **MCP Server Implementation (Lambda)**
   - Define Xero tool schemas with Zod
   - Implement invoice management tools
   - Implement bank transaction tools
   - Implement reporting tools
   - Configure Lambda packaging and deployment

5. **Agent Core Development (Lambda)**
   - Set up Claude Agent SDK in Lambda
   - Create main orchestrator agent
   - Define specialized sub-agents
   - Implement DynamoDB session management
   - Configure Lambda cold start optimization

6. **Memory & Relationship System (Future Phase)**
   - Implement core memory persistence (always free)
   - Build extended memory with semantic search
   - Create relationship progression logic (colleague → partner → friend)
   - Vector embeddings integration (OpenSearch or Pinecone)
   - **Spike Required**: GDPR compliance, data export, retention policies

7. **Voice Integration (Premium Feature - Phase 2)**
   - Set up WebSocket infrastructure for streaming audio
   - Integrate AWS Transcribe for speech-to-text
   - Implement Amazon Polly or ElevenLabs for TTS
   - Build voice session tracking and billing
   - Optimize for < 2s latency

8. **Subscription & Billing (Phase 2)**
   - Integrate Stripe for payment processing
   - Implement subscription tier enforcement
   - Build usage tracking (voice minutes, agent requests)
   - Create graceful degradation for expired subscriptions
   - Implement 90-day extended memory retention for lapsed users

---

**Note**: Archive items older than 2 weeks to keep document focused.
