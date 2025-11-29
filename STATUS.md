# Project Status

> **Purpose**: Current work, active bugs, and recent changes (2-week rolling window)
> **Lifecycle**: Living (update daily/weekly during active development)

**Last Updated**: 2025-11-29 (evening - Domain Migration)
**Current Phase**: ✅ Production - Live at https://app.pip.arcforge.au + https://mcp.pip.arcforge.au
**Version**: 0.2.4-alpha (Consolidated under arcforge.au domain)
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

**Working name**: "Pip" (not finalized - market testing required)
- Approachable, friendly, non-threatening
- Pippin (LOTR) vibes - loyal, curious, learns as you go
- Star Atlas connection (future Web3 tie-in)
- Easy: "I'll ask Pip about my cash flow"

**Domain availability** (checked 2025-11-27):
| Domain | Status |
|--------|--------|
| pip.com | ❌ Taken |
| pip.com.au | ❌ Taken |
| pip.au | ❌ Taken (no active site - potential future acquisition) |
| **askpip.au** | ✅ **SECURED** (Black Friday 2024 - FREE) |
| askpip.com.au | ✅ Available (FREE bundle) |
| heypip.com.au | ✅ Available |
| getpip.com | ❌ Taken (Python pip - avoid!) |

**Status**: `askpip.au` secured. Open to paying for premium domains if name wins in market research.

**Rebrand from Zero**: "Zero" sounds like "Xero" when spoken—brand collision risk.

### Rename Plan (Zero Agent → Pip)
Status: Pending validation at Thursday demo

**After name finalized**:
- [ ] Register chosen domain (.com.au)
- [ ] Rename repo: `zero-agent` → `pip` or `askpip`
- [ ] Update packages: `@zero-agent/*` → `@askpip/*`
- [ ] Update PWA branding, copy, UI
- [ ] Update Xero app name in developer portal
- [ ] Update VISION.md, README.md, all docs
- [ ] Redirect app.pip.arcforge.au → new domain

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
| PWA (web) | HIGH | ✅ Live | https://app.pip.arcforge.au - functional chat interface |
| Self-hosted (Docker) | HIGH | ✅ Ready | Docker configs in repo, docs available |
| **MCP Remote Server** | HIGH | ✅ **DEPLOYED** | https://mcp.pip.arcforge.au - works with Claude.ai + ChatGPT |
| **ChatGPT App** | HIGH | 🔵 Testing | Same MCP server, ChatGPT Apps SDK integration |
| iOS App Store | LOW | Future | Evaluate after 6 months based on adoption |
| Google Play Store | LOW | Future | Evaluate after 6 months based on adoption |

**MCP-First Distribution Strategy (2025-11-29)**: Major pivot to distribute Pip as a Remote MCP Server. Users connect from their Claude.ai or ChatGPT subscription - we provide Xero tools + Pip personality, they provide LLM inference. **$0 LLM costs for Arc Forge.** See `docs/research-notes/SPIKE-pip-inside-claude-chatgpt.md`.

**MCP Remote Server (mcp.pip.arcforge.au)**:
- **Live URL**: https://mcp.pip.arcforge.au/sse
- **Health**: https://mcp.pip.arcforge.au/health
- **Login**: https://mcp.pip.arcforge.au/login (get token URL for Claude.ai)
- **Architecture**: Lazy-loading with 2 meta-tools (90% context reduction)
- **Categories**: invoices (3), reports (2), banking (2), contacts (2), organisation (1)
- **Pattern**: `docs/research-notes/PATTERN-lazy-loading-mcp-tools.md`

### Strategic Documents (Joplin: Arc Forge Business Planning)
- **Avatar Profile**: "Primary Avatar Profile: Small Business Owner (Self-Managing)"
- **Competitive Analysis**: "Competitive Analysis & Unique Value Proposition"
- **Deep Dive Competitors**: "Deep Dive: XBert & Zapier+ChatGPT Competitive Analysis"
- **Naming Research**: "Rebranding Research: Naming Trends & Directions"
- **Beta Marketing**: "Beta Marketing & Disclaimer Drafts"
- **Claude Agent SDK**: "Claude Agent SDK - How It Works" (Quick Capture)
- Code/docs: `~/repos/arcforge-business-planning/`

---

## Quick Overview

| Aspect | Status | Notes |
|--------|--------|-------|
| Architecture | 🟢 | Open source platform, LLM + database agnostic |
| Infrastructure | 🟢 | **VPS Live** - https://app.pip.arcforge.au |
| LLM Abstraction | 🟢 | Provider-agnostic interface (Anthropic + Ollama) |
| Database Abstraction | 🟢 | SQLite (default) + DynamoDB providers |
| Agent Foundation | 🟢 | Native tool calling + Xero integration working |
| **Business Context Layer** | 🟢 | **NEW** Document upload, parsing, context injection |
| VPS Server | 🟢 | `packages/server` - Express server deployed |
| PWA Frontend | 🟢 | React chat interface + document upload UI |
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
| Auth | Cognito | Session/JWT | ✅ Implemented (email + password + invite codes) |
| OAuth | Lambda | Express routes | ✅ Implemented |
| CDN | CloudFront | Caddy | ✅ Working |

**Cost Savings**: ~$120/month → ~$0/month (shared VPS, no additional cost)

### Deployment Progress (2025-11-27)

| Step | Status | Details |
|------|--------|---------|
| Git cleanup | ✅ Done | Single `main` branch, deleted feature branches |
| Server package | ✅ Done | `packages/server` with Express + TypeScript |
| Docker config | ✅ Done | Dockerfile, docker-compose.yml |
| VPS integration | ✅ Done | Memory-limited config (384MB) for do-vps-prod |
| DNS record | ✅ Done | `app.pip.arcforge.au` + `mcp.pip.arcforge.au` → 170.64.169.203 |
| Deploy container | ✅ Done | Built and running on VPS |
| Caddy config | ✅ Done | Reverse proxy configured, auto-HTTPS |
| Health check | ✅ Done | https://app.pip.arcforge.au/health responding |
| API keys | ✅ Done | Anthropic + Xero credentials configured |
| Xero OAuth | ✅ Done | Callback URL added to Xero app |

**Live URL**: https://app.pip.arcforge.au
**Health Status**: ✅ Fully Operational
**VPS**: production-syd1 (170.64.169.203) - shared with Nextcloud, Joplin, etc.
**Memory Budget**: 384MB (of ~2.3GB available)

**Endpoints:**
- Health: `GET https://app.pip.arcforge.au/health`
- Chat: `POST https://app.pip.arcforge.au/api/chat`
- Documents: `POST https://app.pip.arcforge.au/api/documents/upload`
- Documents: `GET https://app.pip.arcforge.au/api/documents`
- Xero Auth: `GET https://app.pip.arcforge.au/auth/xero`
- Sessions: `GET https://app.pip.arcforge.au/api/sessions`

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

**Completed This Week (2025-11-27 - 2025-11-28):**
- ✅ VPS deployment with Docker + Caddy
- ✅ PWA frontend with chat interface
- ✅ Xero OAuth integration working
- ✅ SQLite backup automation (daily at 3am UTC)
- ✅ AWS cleanup (removed terraform/ and functions/ directories)
- ✅ **Architectural Blueprint Created** (`specs/BLUEPRINT.yaml` - 942 lines)
  - 2 milestones, 3 epics, 11 features, 32+ tasks
  - Business Context Layer (core differentiator)
  - Pip Personality System (relationship progression)
  - Voice Mode Architecture (Chatterbox TTS + Whisper STT)
- ✅ **Document-Based Tracking** (alternative to GitHub Issues)
  - Updated PROGRESS.md with full blueprint extraction
  - Updated ISSUES.md with flagged items, spikes, risks
  - Updated skills: blueprint-creation, github-project-infrastructure
- ✅ **Context Management Research** (`docs/CONTEXT_MANAGEMENT_RESEARCH.md` - 757 lines)
  - Four-tier memory architecture analysis (from star-atlas-agent)
  - RAG implementation strategy with SQLite vector storage
  - Embedding options for VPS (Ollama nomic-embed-text recommended)
  - Progressive compression strategy (95% storage reduction)
  - **Decision**: Hybrid approach - RAG-ready schema, simple retrieval for demo
- ✅ **Claude Agent SDK Analysis**
  - Researched Anthropic's production agent framework
  - Key feature: Automatic context compaction (84% token reduction)
  - Built-in tools: File ops, Bash, Web Search, Memory
  - Multi-agent support with parallel subagents
  - **Decision**: Not yet for Pip - evaluate post-RAG implementation
  - Joplin note created: "Claude Agent SDK - How It Works" (Quick Capture)
- ✅ **Multi-Model Research & Cost-First MVP Strategy** (2025-11-28)
  - Researched codeforge multi-provider orchestration patterns
  - Consolidated research: Chatterbox (TTS), nomic-embed-text (embeddings), pdf-parse
  - Defined $0 MVP stack: Ollama + pdf-parse + SQLite
  - Target: <$1/month with 80% local query routing
- ✅ **Business Context Layer COMPLETE** (2025-11-28)
  - Added `business_context` table to SQLite (RAG-ready schema)
  - Created document upload API (`POST /api/documents/upload`)
  - Supports PDF, TXT, MD, DOCX parsing (pdf-parse + mammoth)
  - Auto-detects document types (business_plan, kpi, strategy, etc.)
  - Chunks documents into 2000-char segments
  - Injected business context into agent system prompt
  - Updated orchestrator with Pip personality
  - Added document management UI to PWA (upload/list/delete)
  - Rebranded UI from Zero Agent to Pip
  - **Tested**: Context-aware queries working ("Can I afford to hire?")

**Next Up (Demo Critical Path):**
1. ✅ **feature_1_1**: Document Ingestion & Storage - COMPLETE
2. ✅ **feature_1_3**: Context Injection into Prompts - COMPLETE
3. ✅ **task_1_4_2**: Demo Test Cases & Validation - COMPLETE
4. **User Demo** - Thursday 10am next week

**Demo Enhancements** (2025-11-28):
- ✅ Enhanced system prompt with structured response format
- ✅ Added markdown rendering for assistant messages (react-markdown)
- ✅ Created comprehensive demo test cases (`docs/DEMO_TEST_CASES.md`)
- ✅ Added sample dental business plan for testing
- ✅ VPS deployment complete

**UX & Theme Improvements** (2025-11-28 evening):
- ✅ Fixed OAuth callback hang (PWA service worker was intercepting `/auth/callback`)
- ✅ Added `navigateFallbackDenylist` for `/auth/*`, `/api/*`, `/health` routes
- ✅ Added elapsed time counter to loading indicator ("Pip is thinking... (Xs)")
- ✅ Fixed invoice tool: clarified AUTHORISED = unpaid, added `isOverdue` and `daysOverdue`
- ✅ Fixed P&L and Balance Sheet tools to parse Xero report data correctly
- ✅ **Applied Arc Forge dark theme** to entire PWA:
  - Dark backgrounds (#0a0e14, #0f1419, #1a1f29)
  - Sage green accent (#7eb88e)
  - Monospace font (JetBrains Mono)
  - Terminal-style input with `>` prefix
  - Updated header branding with "Pip by Arc Forge"

**User Authentication COMPLETE & DEPLOYED** (2025-11-28):
- ✅ User authentication implemented (`specs/PLAN-user-authentication.md`)
- ✅ Deployed to VPS (https://app.pip.arcforge.au)
- Email + Password with invite codes for beta access
- Per-user data isolation (sessions, documents, Xero connections)
- JWT tokens with bcrypt password hashing
- Admin CLI for invite code management (`pnpm admin`)
- 10 invite codes generated and ready for beta testers:
  ```
  7HWJX9QT  LRTE4BS6  F2NMC8KJ  9XPRW5HY  QBZE3NU7
  K6DJHS2V  YAMC4PWT  5TNVG8RZ  E9HWBJ3L
  ```
- Test signup/login verified working

**MCP Remote Server DEPLOYED** (2025-11-29):
- ✅ Created `packages/mcp-remote-server` for Claude.ai + ChatGPT distribution
- ✅ HTTP/SSE transport for remote MCP connections
- ✅ Pip personality via MCP prompts (pip_assistant)
- ✅ **Lazy-loading implemented**: 2 meta-tools instead of 10 direct tools (90% context reduction)
- ✅ Multi-tenant session management (session ID per SSE connection)
- ✅ **Deployed to VPS**: https://mcp.pip.arcforge.au
- ✅ DNS configured: app.pip.arcforge.au + mcp.pip.arcforge.au → 170.64.169.203
- ✅ Caddy reverse proxy with auto-HTTPS
- ✅ Docker container running with shared SQLite volume
- ✅ **OAuth 2.0 implemented**: Authorization Code flow for Claude.ai integration
- **Key insight**: Users bring their own LLM subscription = $0 inference costs
- **Endpoints**: `/sse` (SSE), `/messages` (POST), `/health`, `/oauth/authorize`, `/oauth/token`
- **OAuth Config**: Client ID `pip-mcp-client`, configurable via `MCP_OAUTH_CLIENT_SECRET` env var
- **Lazy-loading categories**: invoices, reports, banking, contacts, organisation
- Research: `docs/research-notes/SPIKE-pip-inside-claude-chatgpt.md`
- Pattern: `docs/research-notes/PATTERN-lazy-loading-mcp-tools.md`

---

## Deployment Status

### Production (VPS)
- **Status**: ✅ Live (2 services)
- **Main App**: https://app.pip.arcforge.au (PWA + Chat API)
- **MCP Server**: https://mcp.pip.arcforge.au (Claude.ai/ChatGPT integration)
- **VPS**: DigitalOcean Sydney (170.64.169.203)
- **Containers**:
  - `zero-agent` - Express server + PWA (384MB) - rename to `pip-app` planned
  - `pip-mcp` - MCP remote server (256MB)
- **Database**: SQLite with daily backups (shared volume)
- **Cost**: $0/month (shared droplet)

### Domain Naming Convention (2025-11-29)
Scalable structure for Arc Forge products:
```
{product}.arcforge.au          → Landing page (future)
app.{product}.arcforge.au      → Main application (PWA)
mcp.{product}.arcforge.au      → MCP server
api.{product}.arcforge.au      → API (if separate)
```

**Current Pip domains**:
- `app.pip.arcforge.au` → Main PWA
- `mcp.pip.arcforge.au` → MCP server for Claude.ai/ChatGPT

**Legacy redirects** (will be removed):
- `zero.rodda.xyz` → redirects to `app.pip.arcforge.au`
- `pip.arcforge.au` → redirects to `mcp.pip.arcforge.au`

### MCP Server (mcp.pip.arcforge.au)
- **SSE Endpoint**: https://mcp.pip.arcforge.au/sse
- **Health Check**: https://mcp.pip.arcforge.au/health
- **Login**: https://mcp.pip.arcforge.au/login (get personal token URL)
- **Architecture**: Lazy-loading (2 meta-tools → 10 underlying tools)
- **Connect from Claude.ai**: Get URL from /login, paste into Add Custom Integration

### Self-Hosted
- **Status**: ✅ Available
- **Requirements**: Docker + Docker Compose
- **Guide**: See `specs/DEPLOYMENT.md`

---

## Known Issues

See **ISSUES.md** for detailed issue tracking.

**Summary**: 0 Critical | 1 High | 2 Medium | 1 Low

Active improvements:
- `issue_000`: Business Context Layer (P1) ⚠️
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

**See `specs/BLUEPRINT.yaml` for full architectural plan and `PROGRESS.md` for task tracking.**

### Milestone 1: Core Differentiator Release (6-7 weeks)

**Epic 1: Business Context Layer** (3-4 weeks) ✅ DEMO CRITICAL - PHASE 1 COMPLETE
- ✅ feature_1_1: Document Ingestion & Storage - COMPLETE
- 🔵 feature_1_2: Context Chunking & Summarization (8 days) - basic chunking done, summarization pending
- ✅ feature_1_3: Context Injection into Prompts - COMPLETE
- 🔵 feature_1_4: Context-Aware Reasoning (5 days) - basic reasoning working

**Epic 2: Pip Personality System** (2-3 weeks)
- 🟢 feature_2_1: Dynamic System Prompt Generation (5 days) - basic prompt done
- ⚪ feature_2_2: Relationship Stage Tracking (4 days)
- ⚪ feature_2_3: Sub-Agent Architecture (7 days)

### Milestone 2: Voice Mode & Premium Features (4-5 weeks)

**Epic 3: Voice Mode Architecture**
- ⚪ feature_3_1: Speech-to-Text (Whisper) - Chatterbox validated
- ⚪ feature_3_2: Text-to-Speech (Chatterbox) - Chatterbox validated, $0 cost
- ⚪ feature_3_3: WebSocket Voice Conversation Flow
- ⚪ feature_3_4: Voice Mode PWA UI

### Immediate Next Steps (Pre-Demo)

| Task | Priority | Status |
|------|----------|--------|
| Demo test cases & validation | HIGH | 🔵 In Progress |
| Test with real business plan | HIGH | ⚪ Pending |
| PWA polish (loading states, error handling) | MEDIUM | ⚪ Pending |

### ✅ User Authentication (Complete)
- ✅ **Implemented**: `specs/PLAN-user-authentication.md`
- Method: Email + Password with invite codes
- Features: Per-user sessions, documents, Xero connections
- Admin CLI: `pnpm admin generate-codes 25`

### Future (Post-Milestone 2)
- MCP Distribution Research
- Premium Features (subscriptions)
- RAG with embeddings (Phase 2)

---

**Note**: Archive items older than 2 weeks to keep document focused.
