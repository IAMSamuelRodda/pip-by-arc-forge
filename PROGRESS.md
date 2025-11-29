# Zero Agent (Pip) - Progress Tracking

> **Purpose**: Detailed project tracking with epics, features, and tasks from BLUEPRINT.yaml
> **Lifecycle**: Living (update on task completion, status changes, or blocking issues)
> **Alternative to**: GitHub Issues (streamlined approach for solo/small team development)

**Last Updated**: 2025-11-29
**Blueprint**: `specs/BLUEPRINT.yaml` (942 lines)

---

## Project Overview

### Summary
Zero Agent (rebranding to "Pip") is an AI bookkeeping assistant that combines financial data from Xero with business context to provide intelligent, personalized guidance for small business owners.

**One-liner**: "Pip is your AI bookkeeping assistant—ask questions about your business finances and get plain-English answers instantly."

### Current Phase
**Phase 2: Core Differentiator** - Building Business Context Layer and Pip Personality

### Progress Metrics
| Metric | Value |
|--------|-------|
| Milestones | 0/2 |
| Epics Complete | 1/4 (Epic 0: Core Platform) |
| Features Complete | 4/15 |
| Overall Progress | ~30% |

### Key Targets
- [ ] **Thursday Demo** - Basic Business Context Layer working
- [ ] **Milestone 1** - Core Differentiator Release (6-7 weeks)
- [ ] **Milestone 2** - Voice Mode & Premium Features (4-5 weeks)

---

## Milestone 0: Core Platform (Complete)

**Status**: 🟢 Complete
**Completed**: 2025-11-27

### Epic 0: Foundation Infrastructure

#### feature_0_1: VPS Infrastructure ✅
- [x] Docker multi-stage build
- [x] Caddy reverse proxy with auto-HTTPS
- [x] SQLite database with persistence
- [x] Daily backup automation

#### feature_0_2: Express Server ✅
- [x] API routes (chat, sessions, auth, health)
- [x] Helmet security headers
- [x] Rate limiting
- [x] CORS configuration

#### feature_0_3: Agent Orchestrator ✅
- [x] LLM abstraction layer (Anthropic + Ollama)
- [x] Native tool calling
- [x] Session persistence
- [x] Lazy initialization

#### feature_0_4: Xero Integration ✅
- [x] OAuth 2.0 flow
- [x] Token storage and refresh
- [x] XeroClient wrapper
- [x] 11 Xero tools implemented

---

## Milestone 1: Core Differentiator Release

**Status**: 🟡 In Progress
**Timeline**: 6-7 weeks
**Success Criteria**:
- User can upload business plan/KPIs and ask "Can I afford to hire?" with context-aware answer
- Agent personality adapts based on relationship stage
- Demo successfully validates product-market fit

---

### Epic 1: Business Context Layer

**Status**: 🟡 In Progress
**Timeline**: 3-4 weeks
**Completion Criteria**: Users can upload documents, ask context-aware questions, receive answers combining financial data + business knowledge

#### feature_1_1: Document Ingestion & Storage
**Status**: 🔴 Not Started
**Complexity**: 2.8/5 (Medium)
**Estimated Days**: 7
**Priority**: DEMO CRITICAL

**Deliverables**:
- [ ] Upload endpoint accepting PDF, TXT, MD, DOCX files
- [ ] Document parser extracting text from multiple formats
- [ ] SQLite schema: business_context table
- [ ] PWA upload UI with drag-and-drop

**Tasks**:

| ID | Task | Days | Complexity | Status |
|----|------|------|------------|--------|
| task_1_1_1 | Backend Upload API & File Processing | 3 | 2.5 | 🔴 |
| task_1_1_2 | Document Parsing & Text Extraction | 3 | 2.8 | 🔴 |
| task_1_1_3 | SQLite Storage Schema & API | 2 | 2.2 | 🔴 |
| task_1_1_4 | PWA Upload UI Component | 2 | 2.0 | 🔴 |

---

#### feature_1_2: Context Chunking & Summarization
**Status**: 🔴 Not Started
**Complexity**: 3.2/5 (High) ⚠️ NEEDS DECOMPOSITION
**Estimated Days**: 8
**Flag**: `needs_decomposition: true`

**Deliverables**:
- [ ] Document chunking algorithm (max 2000 chars/chunk with overlap)
- [ ] LLM-powered summarization (Claude Haiku for cost efficiency)
- [ ] Chunk storage with semantic boundaries
- [ ] Summary storage for quick context retrieval

**Tasks**:

| ID | Task | Days | Complexity | Status | Notes |
|----|------|------|------------|--------|-------|
| task_1_2_0 | Chunking Strategy Spike | 2 | 2.0 | 🔴 | RESEARCH - reduces uncertainty |
| task_1_2_1 | Chunking Strategy Implementation | 5 | 3.5 | 🔴 | FLAGGED - depends on spike |
| task_1_2_2 | LLM Summarization Pipeline | 3 | 2.8 | 🔴 | |

---

#### feature_1_3: Context Injection into Agent Prompts
**Status**: 🔴 Not Started
**Complexity**: 2.5/5 (Medium)
**Estimated Days**: 6
**Priority**: DEMO CRITICAL

**Deliverables**:
- [ ] Context retrieval based on user query relevance
- [ ] Dynamic system prompt injection with business context
- [ ] Token limit management (max 20k tokens for context)

**Tasks**:

| ID | Task | Days | Complexity | Status |
|----|------|------|------------|--------|
| task_1_3_1 | Context Retrieval & Relevance Ranking | 3 | 2.8 | 🔴 |
| task_1_3_2 | System Prompt Context Injection | 3 | 2.2 | 🔴 |

---

#### feature_1_4: Context-Aware Reasoning
**Status**: 🔴 Not Started
**Complexity**: 2.3/5 (Medium)
**Estimated Days**: 5
**Priority**: DEMO CRITICAL

**Deliverables**:
- [ ] Answer "Can I afford to hire?" using Xero P&L + business plan targets
- [ ] Answer "Am I on track for goals?" using actuals + KPIs
- [ ] Demo-ready test cases for Thursday presentation

**Tasks**:

| ID | Task | Days | Complexity | Status |
|----|------|------|------------|--------|
| task_1_4_1 | Combined Reasoning Prompt Engineering | 3 | 2.5 | 🔴 |
| task_1_4_2 | Demo Test Cases & Validation | 2 | 2.0 | 🔴 |

---

### Epic 2: Pip Personality System

**Status**: 🔴 Not Started
**Timeline**: 2-3 weeks
**Completion Criteria**: Agent adapts personality based on relationship stage, communication preferences, and business context

#### feature_2_1: Dynamic System Prompt Generation
**Status**: 🔴 Not Started
**Complexity**: 2.3/5 (Medium)
**Estimated Days**: 5

**Deliverables**:
- [ ] Prompt template system with variables: {relationship_stage}, {user_preferences}, {business_context}
- [ ] Three personality modes: Colleague (professional), Partner (proactive), Friend (trusted advisor)
- [ ] Pip personality traits: approachable, curious, learns over time (Pippin from LOTR)

**Tasks**:

| ID | Task | Days | Complexity | Status |
|----|------|------|------------|--------|
| task_2_1_1 | Prompt Template Engine | 3 | 2.2 | 🔴 |
| task_2_1_2 | Integration with Memory Manager | 2 | 2.3 | 🔴 |

---

#### feature_2_2: Relationship Stage Tracking
**Status**: 🔴 Not Started
**Complexity**: 2.0/5 (Low)
**Estimated Days**: 4

**Deliverables**:
- [ ] Automatic progression: Colleague (0-3 months) → Partner (3-12 months) → Friend (12+ months)
- [ ] Milestone tracking in core_memory table
- [ ] Display current relationship stage in PWA settings

**Tasks**:

| ID | Task | Days | Complexity | Status |
|----|------|------|------------|--------|
| task_2_2_1 | Relationship Progression Logic | 2 | 2.0 | 🔴 |
| task_2_2_2 | Milestone & Conversation Tracking | 2 | 2.0 | 🔴 |

---

#### feature_2_3: Sub-Agent Architecture
**Status**: 🔴 Not Started
**Complexity**: 2.7/5 (Medium)
**Estimated Days**: 7

**Deliverables**:
- [ ] 4 sub-agents: InvoiceAgent, ReconciliationAgent, ReportingAgent, ExpenseAgent
- [ ] Main orchestrator routes to sub-agents based on intent detection
- [ ] Sub-agents have limited tool access (permission scoping)

**Tasks**:

| ID | Task | Days | Complexity | Status |
|----|------|------|------------|--------|
| task_2_3_1 | Sub-Agent Base Class & Routing | 4 | 2.8 | 🔴 |
| task_2_3_2 | Implement 4 Specialized Sub-Agents | 3 | 2.5 | 🔴 |

---

## Milestone 2: Voice Mode & Premium Features

**Status**: 🔴 Not Started
**Timeline**: 4-5 weeks
**Success Criteria**:
- Voice-to-voice conversation with <200ms latency
- Whisper STT + Chatterbox TTS fully integrated
- WebSocket streaming stable on VPS

---

### Epic 3: Voice Mode Architecture

**Status**: 🔴 Not Started
**Timeline**: 4-5 weeks
**Completion Criteria**: Voice-to-voice conversation working with <2s end-to-end latency

#### feature_3_1: Speech-to-Text (Whisper)
**Status**: 🔴 Not Started
**Complexity**: 2.8/5 (Medium) ⚠️ HIGH UNCERTAINTY
**Estimated Days**: 8
**Flag**: `needs_decomposition: true`

**Deliverables**:
- [ ] Whisper integration (API initially, self-hosted spike)
- [ ] Audio streaming from browser (WebSocket)
- [ ] Real-time transcription endpoint
- [ ] Latency target: <500ms for STT

**Tasks**:

| ID | Task | Days | Complexity | Status | Notes |
|----|------|------|------------|--------|-------|
| task_3_1_0 | Whisper Deployment Strategy Spike | 2 | 2.0 | 🔴 | RESEARCH |
| task_3_1_1 | Audio Streaming from Browser | 3 | 2.5 | 🔴 | |
| task_3_1_2 | Whisper STT Endpoint | 4 | 3.0 | 🔴 | Depends on spike |

---

#### feature_3_2: Text-to-Speech (Chatterbox)
**Status**: 🔴 Not Started
**Complexity**: 3.0/5 (High) ⚠️ HIGH RISK
**Estimated Days**: 10
**Flag**: `needs_decomposition: true`

**Risk**: VPS 384MB memory constraint may limit self-hosted Chatterbox

**Deliverables**:
- [ ] Chatterbox TTS self-hosted on VPS or separate instance
- [ ] Custom "Pip" voice persona (optional zero-shot cloning)
- [ ] TTS endpoint: POST /api/voice/tts
- [ ] Latency target: <200ms for TTS generation

**Tasks**:

| ID | Task | Days | Complexity | Status | Notes |
|----|------|------|------------|--------|-------|
| task_3_2_0 | Chatterbox Deployment Feasibility Spike | 3 | 2.5 | 🔴 | RESEARCH - critical |
| task_3_2_1 | Chatterbox Self-Hosting Setup | 5 | 3.5 | 🔴 | FLAGGED - depends on spike |
| task_3_2_2 | TTS API Endpoint & Audio Streaming | 3 | 2.8 | 🔴 | |

---

#### feature_3_3: WebSocket Voice Conversation Flow
**Status**: 🔴 Not Started
**Complexity**: 2.8/5 (Medium)
**Estimated Days**: 8

**Deliverables**:
- [ ] WebSocket /api/voice/conversation endpoint
- [ ] Flow: browser audio → STT → orchestrator → LLM → TTS → browser audio
- [ ] Latency monitoring (<2s end-to-end target)

**Tasks**:

| ID | Task | Days | Complexity | Status |
|----|------|------|------------|--------|
| task_3_3_1 | WebSocket Conversation State Machine | 4 | 2.8 | 🔴 |
| task_3_3_2 | End-to-End Voice Pipeline Integration | 4 | 2.8 | 🔴 |

---

#### feature_3_4: Voice Mode PWA UI
**Status**: 🔴 Not Started
**Complexity**: 2.0/5 (Low)
**Estimated Days**: 4

**Deliverables**:
- [ ] Voice chat interface (push-to-talk)
- [ ] Visual feedback: listening indicator, speaking animation
- [ ] Voice settings: persona selection, speech rate
- [ ] Fallback to text chat if voice fails

**Tasks**:

| ID | Task | Days | Complexity | Status |
|----|------|------|------------|--------|
| task_3_4_1 | Voice UI Components | 3 | 2.0 | 🔴 |
| task_3_4_2 | Voice Settings & Configuration | 1 | 2.0 | 🔴 |

---

## Complexity Assessment Summary

### Tasks Flagged for Decomposition

| Task | Complexity | Reason |
|------|------------|--------|
| task_1_2_1 | 3.5/5 | Uncertainty=4 around optimal chunking strategy |
| task_3_2_1 | 3.5/5 | Risk=4 due to VPS memory constraints |

### Spike Tasks Required

| Spike | Duration | Reduces Uncertainty For |
|-------|----------|------------------------|
| task_1_2_0 | 2 days | task_1_2_1 (Chunking Strategy) |
| task_3_1_0 | 2 days | task_3_1_2 (Whisper Endpoint) |
| task_3_2_0 | 3 days | task_3_2_1 (Chatterbox Setup) |

### Demo Critical Path

**Must complete by Wednesday for Thursday demo:**
1. feature_1_1 (Document Ingestion) - basic upload working
2. feature_1_3 (Context Injection) - inject into prompts
3. task_1_4_2 (Demo Test Cases) - prepared scenarios

---

## Research Spikes

### 2025-11-28 - Multi-Model & Multimodal Architecture Research

**Sources Investigated:**
- `/repos/codeforge` - Production multi-provider model orchestration system
- `/repos/arcforge-business-planning/ai-model-providers.md` - Comprehensive provider analysis (950 lines)

#### Key Findings: Model Orchestration (from codeforge)

**Three-Layer Provider Abstraction:**
1. **Configuration Layer** - Pre-configured profiles for 8+ models across 4 providers
2. **Adapter Layer** - Abstract base class with provider-specific implementations (Ollama, OpenAI, Anthropic, xAI)
3. **Routing Layer** - Intelligent model selection based on task requirements

**Capability-Based Routing:**
```typescript
interface TaskContext {
  complexity?: number;       // 0-1 scale triggers model upgrade
  requiresVision?: boolean;  // Routes to GPT-4o/Claude
  requiresThinking?: boolean;// Routes to DeepSeek-R1
  specialization?: string;   // frontend/backend/database
  maxCost?: number;
}
```

**Four Orchestration Patterns:**
| Pattern | Use Case | Cost Impact |
|---------|----------|-------------|
| Speed Ladder | Try fast→slow, escalate on failure | 98% savings vs all-cloud |
| Planner-Executor | Thinking model plans, fast model executes | Reduces complex task tokens |
| Specialist Routing | Route to model with best capability | Maximizes quality |
| Hybrid Local/Cloud | Local for privacy, cloud for vision | 90% code never leaves machine |

#### Key Findings: Provider Analysis

**Voice/TTS Rankings (Quality):**
| Rank | Model | Note |
|------|-------|------|
| 1 | ElevenLabs v3 | Industry standard, $5-330/mo |
| 2 | Fish Audio / Open Audio S1 | #1 TTS-Arena, 1/30th ElevenLabs cost |
| 3 | **Chatterbox** | FREE (MIT), 63.8% preferred over ElevenLabs in blind tests |

**Vision Models for Document Analysis:**
| Model | Provider | Strength |
|-------|----------|----------|
| GPT-4o | OpenAI | Best instruction following, 128K context |
| Gemini 2.5 Pro | Google | 2M context, multimodal native |
| Claude Sonnet 4.5 | Anthropic | Extended thinking + vision |

**Embeddings for RAG:**
| Rank | Model | Note |
|------|-------|------|
| 1 | Qwen3-Embedding 8B | #1 MTEB multilingual + code, FREE |
| 2 | BGE-Large | Production-proven, FREE |
| 3 | NV-Embed-v2 | Best quality, requires GPU |

**Cost Optimization (General LLM):**
| Model | Price/1M tokens | Note |
|-------|-----------------|------|
| DeepSeek-V3 | $0.07-0.28 in | 20-50x cheaper than competitors |
| Gemini 2.0 Flash | $0.10 in | Google's budget option |
| Ollama (local) | $0 | Privacy + speed, limited capabilities |

#### Applicability to Pip

**Immediate Impact (Demo Critical Path):**

| Feature | Research Finding | Action |
|---------|-----------------|--------|
| feature_1_1 (Document Ingestion) | Vision models can OCR PDFs directly | Consider GPT-4o for PDF screenshots |
| feature_1_2 (Chunking) | Qwen3-Embedding FREE + excellent | Use for semantic similarity chunking |
| feature_1_3 (Context Injection) | Gemini 2.5 Pro has 2M context | Consider for large document sets |

**Voice Mode (Epic 3):**

| Feature | Research Finding | Decision |
|---------|-----------------|----------|
| feature_3_1 (STT) | Whisper remains best, OpenAI API or self-hosted | Keep current plan |
| feature_3_2 (TTS) | Chatterbox beats ElevenLabs at $0 cost | **Validated** - proceed with Chatterbox |

**Future Optimization:**

| Opportunity | Implementation | Expected Impact |
|-------------|----------------|-----------------|
| Speed Ladder | Local DeepSeek → Cloud Claude fallback | 90%+ cost reduction |
| Capability Routing | Add vision flag to TaskContext | Better PDF handling |
| Hybrid Privacy | Route Xero data through local only | Compliance ready |

#### Decision: Architecture Enhancement

**Current state**: Zero Agent has LLM abstraction (Anthropic + Ollama) but no capability routing.

**Recommended enhancement** (post-demo):
1. Add `capabilities` field to model configs (vision, thinking, maxContext)
2. Add `TaskContext` to request pipeline
3. Implement simple capability routing (vision → GPT-4o, default → local)
4. Defer full Speed Ladder pattern until after Milestone 1

**Priority**: MEDIUM (not blocking demo, but enables better document handling)

---

### 2025-11-28 - Cost-First MVP Strategy (Consolidated)

**Sources Consolidated:**
- Context Management Research (`docs/CONTEXT_MANAGEMENT_RESEARCH.md` - 757 lines)
- Multi-Model Research (above)
- codeforge provider analysis

#### $0 MVP Stack (Demo Critical Path)

| Layer | Component | Solution | Cost | Notes |
|-------|-----------|----------|------|-------|
| **LLM (reasoning)** | Complex queries | Claude Haiku | ~$0.25/1M | Only for "Can I afford to hire?" type |
| **LLM (simple)** | Basic Xero lookups | Ollama (llama3.2/mistral) | **$0** | Route 80% of queries locally |
| **Embeddings** | Semantic search | Ollama `nomic-embed-text` | **$0** | 768-dim, 50-100ms latency |
| **Vector DB** | Similarity search | SQLite + client-side cosine | **$0** | <100ms for 1-100 users |
| **Document parsing** | PDF/TXT/MD/DOCX | `pdf-parse` + `mammoth` | **$0** | Text extraction only |
| **TTS** | Voice output | Chatterbox (self-hosted) | **$0** | Beats ElevenLabs in blind tests |
| **STT** | Voice input | Whisper.cpp via Ollama | **$0** | Self-hosted transcription |
| **Storage** | All data | SQLite | **$0** | RAG-ready schema |
| **Compute** | Server | Existing VPS | **$0** | Shared with do-vps-prod |

**Total MVP Infrastructure Cost: $0/month**
**Per-Query Cost: ~$0.00003** (Claude Haiku for complex queries only)

#### Cost Comparison: Original vs Optimized

| Scenario | Original Estimate | Optimized | Savings |
|----------|------------------|-----------|---------|
| 25 users × 10 queries/day × 30 days | $1.88/mo (all Claude) | **$0.38/mo** (80% local) | 80% |
| Vision-based PDF processing | $2.50/1M tokens | **$0** (text extraction) | 100% |
| Embeddings (OpenAI) | $0.10/1M tokens | **$0** (Ollama) | 100% |
| TTS (ElevenLabs) | $5-330/mo | **$0** (Chatterbox) | 100% |

#### Implementation Priority (Cost-First)

**Phase 1: Demo MVP ($0 infrastructure)**

| Task | Solution | Why |
|------|----------|-----|
| Document upload | Express endpoint + `pdf-parse` | Simple, no external APIs |
| Text extraction | `pdf-parse` (PDF), `mammoth` (DOCX), raw (TXT/MD) | All $0 libraries |
| Storage | SQLite `business_context` table | Already have SQLite |
| Context injection | Simple recency-based retrieval | No embeddings needed yet |
| LLM reasoning | Claude Haiku (sparingly) | Cheapest quality option |

**Phase 2: RAG Spike ($0 infrastructure)**

| Task | Solution | Why |
|------|----------|-----|
| Embeddings | Ollama `nomic-embed-text` | $0, runs on VPS |
| Vector search | Client-side cosine similarity | $0, <100ms latency |
| Chunking | 2000 char chunks with overlap | Simple, proven approach |

**Phase 3: Voice Mode ($0 infrastructure)**

| Task | Solution | Why |
|------|----------|-----|
| TTS | Chatterbox (self-hosted) | $0, validated quality |
| STT | Whisper.cpp via Ollama | $0, self-hosted |
| Streaming | WebSocket | Already have Express |

#### What We're NOT Using (Too Expensive for MVP)

| Feature | Expensive Option | Why Skipped |
|---------|------------------|-------------|
| Vision/OCR | GPT-4o ($2.50/1M+) | Use text extraction instead |
| Cloud embeddings | OpenAI ada-002 ($0.10/1M) | Use Ollama instead |
| Cloud TTS | ElevenLabs ($5-330/mo) | Use Chatterbox instead |
| Cloud STT | OpenAI Whisper API ($0.006/min) | Use Whisper.cpp instead |
| Capability routing | Multi-model orchestration | Over-engineering for 25 users |
| Agent SDK | Anthropic SDK | Direct API is cheaper/simpler |

#### Decision: Cost-First MVP

**Rationale**: 25 beta users = negligible scale. Optimize for $0 infrastructure, prove business value first, then optimize for quality/features.

**Target monthly cost**: **< $1/month** (achieved with 80% local routing)

**When to add paid services**:
1. After product-market fit validated
2. When local quality becomes a bottleneck
3. When scale exceeds 100+ users

#### Updated Feature Dependencies

```
feature_1_1 (Document Ingestion)
├── pdf-parse ($0)
├── mammoth ($0)
└── SQLite storage ($0)

feature_1_2 (Chunking & Summarization)
├── Simple 2000-char chunking ($0)
└── Claude Haiku summaries (~$0.01/doc)

feature_1_3 (Context Injection)
├── Phase 1: Recency-based retrieval ($0)
└── Phase 2: nomic-embed-text + cosine ($0)

feature_3_1 (STT)
└── Whisper.cpp via Ollama ($0)

feature_3_2 (TTS)
└── Chatterbox self-hosted ($0)
```

---

## Progress Changelog

### 2025-11-29 - Domain Migration + MCP OAuth

**Domain Migration to arcforge.au** ✅
- Consolidated all Pip services under arcforge.au domain
- New domains:
  - `app.pip.arcforge.au` → Main PWA application
  - `mcp.pip.arcforge.au` → MCP server for Claude.ai/ChatGPT
- Legacy redirects (temporary):
  - `zero.rodda.xyz` → `app.pip.arcforge.au`
  - `pip.arcforge.au` → `mcp.pip.arcforge.au`
- Naming convention established: `{service}.{product}.arcforge.au`

**MCP Remote Server DEPLOYED** ✅
- Created `packages/mcp-remote-server` for Claude.ai + ChatGPT distribution
- HTTP/SSE transport using `@modelcontextprotocol/sdk`
- Pip personality via MCP prompts (pip_assistant)
- Multi-tenant session management (JWT auth + session ID per SSE connection)
- Deployed to VPS at https://mcp.pip.arcforge.au
- Simple login page at `/login` generates personal token URL for Claude.ai
- Caddy reverse proxy with auto-HTTPS
- Docker container sharing SQLite volume with main server

**Lazy-Loading Implementation** ✅
- Refactored from 10 direct tools to 2 meta-tools:
  - `get_tools_in_category` - Discover tools by category
  - `execute_tool` - Execute a discovered tool by name
- Tool categories: invoices (3), reports (2), banking (2), contacts (2), organisation (1)
- **Context reduction**: ~2000 tokens → ~300 tokens (85% reduction)
- Pattern documented: `docs/research-notes/PATTERN-lazy-loading-mcp-tools.md`
- Joplin note created: "Lazy-Loading MCP Tools - Context Efficiency Pattern"

**OAuth 2.0 Implementation** ✅ (2025-11-29 evening)
- Added OAuth 2.0 Authorization Code flow for Claude.ai integration
- Endpoints:
  - `GET /oauth/authorize` - Shows login page with Arc Forge dark theme
  - `POST /oauth/authorize/submit` - Handles login, generates authorization code
  - `POST /oauth/token` - Exchanges auth code for JWT access token
- SSE endpoint accepts Bearer tokens from Authorization header
- Configurable via environment variables:
  - `MCP_OAUTH_CLIENT_ID` (default: `pip-mcp-client`)
  - `MCP_OAUTH_CLIENT_SECRET` (default: `pip-mcp-secret-change-in-production`)
  - `JWT_SECRET` (shared with main server)
- 7-day token expiry for long-lived MCP sessions

**Key Files Created/Modified**:
- `packages/mcp-remote-server/src/index.ts` - Main MCP server with lazy-loading + OAuth
- `packages/mcp-remote-server/src/services/xero.ts` - Xero client service
- `packages/mcp-remote-server/src/handlers/xero-tools.ts` - 10 Xero tool handlers
- `packages/mcp-remote-server/Dockerfile` - Production Docker image
- `deploy/docker-compose.vps-integration.yml` - Updated with pip-mcp service
- `deploy/Caddyfile.pip-mcp` - Caddy config for pip.arcforge.au

**Business Impact**:
- Users bring their own LLM subscription = **$0 inference costs** for Arc Forge
- Same MCP server works with Claude.ai AND ChatGPT
- Lazy-loading pattern applicable to Claude Desktop integration
- OAuth enables secure per-user Xero access from Claude.ai

---

### 2025-11-28 - User Authentication Implementation
- **User Authentication COMPLETE**: Full auth system for 25 beta testers
  - Added `users` and `invite_codes` tables to SQLite database
  - Implemented auth service with bcrypt password hashing and JWT tokens
  - Created signup endpoint with invite code validation
  - Created login endpoint with email/password authentication
  - Added `requireAuth` middleware to protect all API routes
  - Updated chat, sessions, documents routes for per-user data isolation
  - Updated Xero OAuth to link tokens to authenticated users
  - Created Zustand auth store with persistence for frontend
  - Added LoginPage and SignupPage with Arc Forge dark theme
  - Added ProtectedRoute component for route protection
  - Created admin CLI (`pnpm admin`) for managing invite codes
- **Deployment** ✅ COMPLETE
  - Committed and pushed to GitHub (24 files, 1969 lines added)
  - Deployed to VPS (https://zero.rodda.xyz)
  - JWT_SECRET generated and configured
  - 10 invite codes generated for beta testers
  - Signup/login flow tested and verified working

### 2025-11-28 - Demo Preparation & UX Enhancements
- **task_1_4_2 COMPLETE**: Demo Test Cases & Validation
  - Created `docs/DEMO_TEST_CASES.md` with 7 demo scenarios
  - Created `docs/samples/dental-business-plan.txt` for demo
  - Added pre-demo checklist, post-demo questions, success metrics
- **System Prompt Enhancement**
  - Added structured response format for financial questions
  - Added explicit instructions to combine Xero data + business context
  - Added tool documentation in prompt
- **PWA UX Improvements**
  - Added react-markdown for assistant message rendering
  - Custom markdown styling for lists, headings, bold text
  - Assistant messages now render structured responses beautifully
- **TypeScript Fixes**
  - Fixed oauth-server type errors (XeroTokenResponse interface)

### 2025-11-28 - Business Context Layer Implementation & Deployment
- **feature_1_1 COMPLETE**: Document Ingestion & Storage
  - Added `business_context` table to SQLite schema (RAG-ready with embedding BLOB)
  - Created document upload API (`POST /api/documents/upload`)
  - Implemented pdf-parse (v2) for PDF extraction
  - Implemented mammoth for DOCX extraction
  - Added text extraction for TXT/MD files
  - Auto-detect document types (business_plan, kpi, strategy, budget, goals, notes)
  - Chunking: 2000-char segments with paragraph preservation
- **feature_1_3 COMPLETE**: Context Injection into Prompts
  - Added `getBusinessContext()` method to orchestrator
  - Modified `buildSystemPrompt()` to inject business context
  - Updated Pip personality in system prompt
- **PWA UI Updates**
  - Rebranded from "Zero Agent" to "Pip"
  - Added document panel toggle in header
  - Created upload/list/delete UI for documents
  - Updated welcome message and suggestions
- **Deployment**
  - Deployed to VPS (https://zero.rodda.xyz)
  - Fixed docker-compose caching issue (used `docker compose build --no-cache`)
  - Configured .env with API keys
- **Tested End-to-End**
  - Uploaded sample business plan (1021 chars, 1 chunk)
  - Query: "Can I afford to hire someone?"
  - Result: Agent correctly extracted hiring criteria ($40k/month, $55k budget)
  - Cost: ~$0.0015 per query (Claude Haiku)

### 2025-11-28 - Cost-First MVP Strategy Consolidation
- Consolidated multimodal research with context management research
- Defined $0 MVP stack: Ollama (LLM + embeddings), pdf-parse, Chatterbox, Whisper.cpp
- Target: <$1/month with 80% local query routing
- Documented what we're NOT using (GPT-4o vision, cloud embeddings, ElevenLabs)
- Created phased implementation plan with cost justification

### 2025-11-28 - Multimodal Research Spike
- Researched codeforge multi-provider orchestration patterns
- Analyzed AI model provider landscape (40+ providers)
- Validated Chatterbox for TTS (FREE, high quality)
- Identified capability routing as future enhancement
- Updated PROGRESS.md with research findings

### 2025-11-27 - Blueprint Created
- Created comprehensive blueprint at `specs/BLUEPRINT.yaml`
- Defined 2 milestones, 3 epics, 11 features, 32+ tasks
- Identified 3 spike tasks for high-uncertainty areas
- Flagged 2 tasks for decomposition (>3.0 complexity)

### 2025-11-27 - Previous Updates
- VPS deployment complete
- PWA chat interface working
- Xero OAuth integration live
- 11 Xero tools implemented

---

## References

- **specs/BLUEPRINT.yaml**: Full architectural blueprint (942 lines)
- **ISSUES.md**: Bug/improvement tracking with flagged items
- **STATUS.md**: 2-week rolling snapshot
- **ARCHITECTURE.md**: Technical design and ADRs
