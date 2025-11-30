# Pip - Progress Tracking

> **Purpose**: Detailed project tracking with milestones, epics, features, and tasks
> **Lifecycle**: Living (update on task completion, status changes)

**Last Updated**: 2025-11-30 (EOD)
**Current Phase**: Memory Stack + Safety Hardening

---

## Progress Summary

| Metric | Value |
|--------|-------|
| Current Focus | Mem0 Memory Stack + Safety Guardrails |
| Phase | Memory Stack + Safety Hardening |
| Milestones Complete | 1/3 (Core Platform) |
| Overall | MCP validated, implementing Mem0 memory layer |

### Architecture Direction (2025-11-30)

Based on consolidated research (Joplin notes + project docs), Pip adopts:

```
Claude API (direct, with tool calling)
         |
    +----+----+
    |         |
   Mem0    Lazy-MCP
 (Memory)  (Tools)
```

**Key Decisions**:
- **USE Mem0** - Universal memory layer for personalization
- **USE Lazy-MCP** - Already implemented, working well
- **SKIP LangChain** - Obsolete for agentic systems
- **SKIP traditional RAG** - Mem0 handles memory; tools handle live data
- **DEFER LangGraph** - Only if complex approval workflows needed later

---

## Milestone 0: Core Platform (Complete)

**Status**: ✅ Complete
**Completed**: 2025-11-28

### Summary
- VPS deployment with Docker + Caddy
- Express server with API routes
- PWA frontend with chat interface
- Xero OAuth integration
- User authentication with invite codes
- Business context layer (document upload)
- Daily SQLite backups

---

## Milestone 1: MCP Distribution (Current)

**Status**: 🔵 In Progress
**Objective**: Distribute Pip via Claude.ai and ChatGPT instead of standalone PWA

### Why MCP Distribution?
- Users bring their own LLM subscription = $0 inference cost for us
- Built-in distribution via Claude.ai/ChatGPT ecosystems
- Users stay in familiar interface (no new app to learn)

---

### Epic 1.1: Claude.ai Integration

**Status**: ✅ Complete (validated working)
**Priority**: HIGH (do this first)

#### feature_1_1_1: MCP Remote Server
**Status**: ✅ Complete

| Task | Status | Notes |
|------|--------|-------|
| Create mcp-remote-server package | ✅ | packages/mcp-remote-server |
| SSE transport | ✅ | /sse endpoint |
| Lazy-loading (2 meta-tools) | ✅ | 85% context reduction |
| 10 Xero tools | ✅ | invoices, reports, banking, contacts, org |
| Multi-tenant sessions | ✅ | JWT auth per connection |
| Deploy to VPS | ✅ | mcp.pip.arcforge.au |

#### feature_1_1_2: Authentication
**Status**: ✅ Complete

| Task | Status | Notes |
|------|--------|-------|
| JWT token generation | ✅ | 30-day expiry |
| Login page (/login) | ✅ | Generates token URL |
| OAuth 2.0 flow | ✅ | For apps that support it |
| Bearer token in SSE | ✅ | Authorization header support |

#### feature_1_1_3: Validation & Testing
**Status**: ✅ Complete (basic) / 🔵 Comprehensive testing pending

| Task | Status | Notes |
|------|--------|-------|
| Test with Claude.ai | ✅ Done | OAuth flow working |
| Verify all 10 tools work | ✅ Done | Tools audited and fixed |
| Test Xero data retrieval | ✅ Done | $1,500 overdue invoice found |
| Document issues/fixes | ✅ Done | See ISSUES.md |
| **Comprehensive tool testing** | ⚪ Future | Test all tools with edge cases |

**Comprehensive Testing Checklist** (deferred):
- [ ] `get_invoices`: Test all status filters (DRAFT, AUTHORISED, PAID, VOIDED)
- [ ] `get_aged_receivables`: Test with 0, 1, many invoices
- [ ] `get_aged_payables`: Test with 0, 1, many bills
- [ ] `get_profit_and_loss`: Test date ranges, empty periods
- [ ] `get_balance_sheet`: Test different dates
- [ ] `get_bank_accounts`: Test with 0, 1, many accounts
- [ ] `get_bank_transactions`: Test limits, empty results
- [ ] `get_contacts`: Test limits, pagination
- [ ] `search_contacts`: Test partial matches, no matches, special chars
- [ ] `get_organisation`: Basic validation

#### feature_1_1_4: User Documentation
**Status**: ✅ Complete

| Task | Status | Notes |
|------|--------|-------|
| Connection guide | ✅ Done | README.md - Claude.ai + ChatGPT |
| Troubleshooting guide | ✅ Done | README.md - common issues |
| Example queries | ✅ Done | README.md - what to ask Pip |

---

### Epic 1.2: ChatGPT Integration

**Status**: ✅ Complete (validated working)
**Priority**: HIGH

**Subscription Requirements**:
- **Minimum**: ChatGPT Plus ($20/month) - has Developer Mode with MCP support
- ChatGPT Pro ($200/month) - also has MCP support
- ChatGPT Team/Business (2+ users) - Admin can publish connectors to workspace
- ChatGPT Enterprise - Admin controls + RBAC

**How it works**: Users enable Developer Mode (Settings → Apps & Connectors → Advanced → Developer mode), then add our MCP server URL as a custom connector.

| Task | Status | Notes |
|------|--------|-------|
| Research subscription requirements | ✅ | Plus ($20/mo) minimum |
| Research MCP in ChatGPT | ✅ | Developer Mode required |
| Test with ChatGPT Plus | ✅ | Working! Same MCP server, no changes needed |
| Adapt server if needed | ✅ | No changes required |
| Document ChatGPT setup | ✅ | README.md updated |

**Key Finding**: Zero code changes required - same MCP server works for both Claude.ai and ChatGPT!

**References**:
- [OpenAI MCP Docs](https://platform.openai.com/docs/mcp)
- [ChatGPT MCP Support Guide](https://apidog.com/blog/chatgpt-mcp-support/)

---

### Epic 1.3: Safety Guardrails

**Status**: ✅ Complete
**Priority**: HIGH (before adding any write operations)
**Spec**: `specs/SAFETY-ARCHITECTURE.md`

**Why This Matters**: Xero has NO user-accessible restore. Deleted/voided data is permanently lost. An unrestricted AI could cause catastrophic business damage.

| Task | Status | Notes |
|------|--------|-------|
| Design safety architecture | ✅ Done | specs/SAFETY-ARCHITECTURE.md |
| Add `user_settings` table | ✅ Done | permission_level, vacation_mode, etc. |
| Add `operation_snapshots` table | ✅ Done | Pre-operation state capture |
| Implement permission checks | ✅ Done | Safety service in MCP server |
| Dynamic tool visibility | ✅ Done | Tools filtered by permission level |
| Add settings UI to PWA | ✅ Done | /settings route with level selector |

**Permission Levels** (enforced at tool execution):
- **Level 0 (Default)**: Read-only - current 10 tools, zero risk
- **Level 1**: Create drafts - new invoices/contacts as DRAFT only
- **Level 2**: Approve/update - requires confirmation dialog
- **Level 3**: Delete/void - requires per-operation confirmation + delay

**Implementation Complete**:
- `packages/core/src/database/types.ts`: UserSettings, OperationSnapshot types
- `packages/core/src/database/providers/sqlite.ts`: New tables + CRUD methods
- `packages/mcp-remote-server/src/services/safety.ts`: Permission check service
- `packages/mcp-remote-server/src/index.ts`: Tool execution guards + visibility filtering
- `packages/server/src/routes/settings.ts`: API endpoints for settings
- `packages/pwa-app/src/pages/SettingsPage.tsx`: Settings UI with permission level selector

---

### Epic 1.4: Mem0 Memory Stack

**Status**: 🔵 In Progress (Ready for Implementation)
**Priority**: HIGH (enables "Pip knows me" experience)

**Problem**: ChatGPT Plus users have memory disabled in Developer Mode. Need Pip-native memory layer.

**Solution**: Use official `mem0ai` npm package with in-memory vector store + SQLite history.

**Spike Complete**: spike_mem0 found official TypeScript SDK - no Python needed!
**Decision Document**: `docs/research-notes/SPIKE-mem0-integration.md`

---

#### spike_mem0: Mem0 Integration Feasibility

**Status**: ✅ COMPLETE
**Duration**: 1 day (estimated 2-3 days)
**Completed**: 2025-11-30
**Decision**: Use official `mem0ai` npm package (Option H)

**Key Discovery**: Mem0 released official Node.js SDK with full TypeScript support!
- `npm install mem0ai`
- Full API parity with Python SDK
- Eliminates need for Python, subprocess, or refactoring

##### Options Evaluated

| Option | Description | Verdict |
|--------|-------------|---------|
| A | OpenMemory MCP (Python) | ❌ Not feasible - Qdrant needs 1.2GB RAM |
| B | Mem0 Cloud API (REST) | ⚠️ Alternative for scale ($19-249/mo) |
| C | Self-hosted Mem0 (Python) | ❌ Not feasible - exceeds VPS RAM |
| D | Python subprocess | ❌ Not feasible - same RAM issues |
| E | Refactor Pip to Python | ❌ Overkill - SDK exists |
| F | Port Mem0 to TypeScript | ❌ Unnecessary - SDK exists |
| G | Community TS (mem0-ts) | ❌ Not recommended - OpenAI only, unmaintained |
| **H** | **Official mem0ai npm** | ✅ **RECOMMENDED** |

##### Selected Approach: Option H

**Configuration**:
```typescript
import { Memory } from "mem0ai/oss";

const memory = new Memory({
  vectorStore: { provider: "memory" },  // In-memory, no Qdrant
  historyDbPath: "memory.db"            // SQLite file
});
```

**Why Option H wins**:
- Native TypeScript - no Python dependencies
- Full feature parity with Python SDK
- Supports: OpenAI, Anthropic, Ollama, 10+ LLM providers
- Minimal resource usage (~100-200MB RAM)
- Fits 384MB VPS constraint

##### Deliverables

- [x] Test OpenMemory MCP locally - NOT FEASIBLE (1.2GB RAM)
- [x] Test Mem0 Cloud API latency - ALTERNATIVE ($19-249/mo)
- [x] Research community TypeScript alternatives - FOUND OFFICIAL SDK
- [x] Assess VPS resource impact - ~100-200MB for Option H
- [x] Decision document: `docs/research-notes/SPIKE-mem0-integration.md`

---

#### feature_1_4_1: Mem0 Integration

**Status**: 🟡 Blocked (Architecture Decision Required)

| Task | Status | Notes |
|------|--------|-------|
| Install mem0ai package | ✅ Done | v2.1.38 installed |
| Configure Memory instance | ✅ Done | In-memory vector + SQLite history |
| Add memory tools to MCP | ✅ Done | 5 tools: add, search, list, delete, clear_all |
| User isolation (multi-tenant) | ✅ Done | userId param per memory operation |
| **Architecture decision** | ⚠️ DECISION NEEDED | See issue_008 in ISSUES.md |

**Memory Tools Implemented**:
- `add_memory`: Store user preferences, goals, business context
- `search_memory`: Semantic search across memories
- `list_memories`: View all stored memories
- `delete_memory`: Remove specific memory by ID
- `clear_all_memories`: Reset all memories (with confirmation)

**Current Configuration** (may change based on decision):
- Vector store: in-memory (no external DB needed)
- History: SQLite at `/app/data/pip-memory.db`
- Embeddings: OpenAI text-embedding-3-small
- LLM: OpenAI gpt-4o-mini for memory extraction
- Requires: `OPENAI_API_KEY` environment variable

#### Architecture Research (2025-11-30) - COMPLETE

Deep research into alternative memory architectures. Key findings:

**Option A**: Keep mem0, switch to Claude LLM + Ollama embeddings
- mem0 TypeScript SDK supports: Anthropic, Ollama, Groq, Google, Mistral
- Embeddings: OpenAI, Ollama, Google (NOT Anthropic)
- API cost: ~$0.001/request

**Option B**: MCP-native (Memento-style architecture)
- Calling LLM (Claude/ChatGPT) does fact extraction
- MCP server just stores/retrieves structured data
- Local embeddings via BGE-M3 (@xenova/transformers)
- API cost: $0
- ChatGPT memory: WORKS (bypasses Dev Mode limitation)

**Research documented in**: Joplin "Pip Memory Architecture Deep Research (2025-11-30)"

---

#### feature_1_4_2: Memory Injection

**Status**: ⚪ Blocked

| Task | Status | Depends On |
|------|--------|------------|
| Inject memories into MCP tool context | ⚪ Pending | feature_1_4_1 |
| Memory retrieval per request | ⚪ Pending | task above |
| Context formatting for Claude | ⚪ Pending | task above |

---

#### feature_1_4_3: ChatGPT Memory Import

**Status**: ⚪ Blocked

| Task | Status | Depends On |
|------|--------|------------|
| Parse ChatGPT data export | ⚪ Pending | feature_1_4_1 |
| Extract user facts from conversations.json | ⚪ Pending | task above |
| Import endpoint in MCP server | ⚪ Pending | task above |
| User guide for export/import | ✅ Done | docs/CHATGPT-MEMORY-GUIDE.md |

---

#### feature_1_4_4: Memory Management UI

**Status**: ⚪ Blocked

| Task | Status | Depends On |
|------|--------|------------|
| View memories in PWA | ⚪ Pending | feature_1_4_2 |
| Edit/delete memories | ⚪ Pending | task above |
| Manual memory add | ⚪ Pending | task above |

---

#### feature_1_4_5: Automatic Memory Extraction

**Status**: ⚪ Future (post-MVP)

| Task | Status | Depends On |
|------|--------|------------|
| Extract facts from conversations | ⚪ Future | feature_1_4_2 |
| Conflict resolution | ⚪ Future | task above |
| Memory consolidation | ⚪ Future | task above |

---

### Epic 1.5: Landing Page

**Status**: ⚪ Not Started
**Priority**: MEDIUM (after safety + memory import)

| Task | Status | Notes |
|------|--------|-------|
| Create pip.arcforge.au | ⚪ Pending | |
| What is Pip section | ⚪ Pending | One-liner + value prop |
| How to use section | ⚪ Pending | Claude.ai / ChatGPT / PWA options |
| Arc Forge branding | ⚪ Pending | Dark theme |

---

## Milestone 2: Voice Mode & Premium (Future)

**Status**: ⚪ Not Started
**Timeline**: After MCP distribution validated

### Epic 2.1: Voice Mode
- Speech-to-Text (Whisper)
- Text-to-Speech (Chatterbox)
- WebSocket conversation flow
- Voice UI in PWA

### Epic 2.2: Enhanced Features
- Relationship progression (colleague → partner → friend)
- Extended memory with semantic search
- Premium subscription tiers

---

## Archived Milestones

### Demo (2025-11-28)
**Status**: ✅ Complete

The Thursday demo with dental practice owner has been completed. Demo materials archived to `docs/archive/`.

---

## Progress Changelog

### 2025-11-30 (EOD) - Memory Architecture Deep Research

**Research Complete**:
- Investigated alternative LLM/embedder providers for mem0
- Discovered mem0 supports Claude (LLM) but NOT for embeddings
- Researched MCP-native memory architecture (Memento-style)
- Documented findings in Joplin + ISSUES.md

**Key Finding**: MCP-native approach (Option B) would:
- Eliminate ALL external API costs
- Enable ChatGPT memory (bypasses Dev Mode limitation)
- Align with "users bring their own LLM" philosophy

**Decision Required**: issue_008 in ISSUES.md
- Option A: Keep mem0 + Claude LLM + Ollama embeddings
- Option B: Implement MCP-native (Memento-style) architecture

**Blocked**: feature_1_4_2 (Memory Injection), feature_1_4_3 (ChatGPT Import), feature_1_4_4 (Memory UI)

---

### 2025-11-30 - Mem0 Memory Architecture Decision

**Architecture Shift**:
- Consolidated research from Joplin notes + project docs
- Adopted Mem0 as universal memory layer (replaces simple "Memory Import" workaround)
- Created comprehensive spike_mem0 to evaluate 7 integration approaches
- Sunset plans for traditional RAG (Mem0 + tools approach instead)

**Epic 1.4 Restructured**:
- Old: "Memory Import" - simple ChatGPT export/import
- New: "Mem0 Memory Stack" - full memory layer with:
  - spike_mem0: Integration feasibility (A-G options)
  - feature_1_4_1: Mem0 integration
  - feature_1_4_2: Memory injection into MCP
  - feature_1_4_3: ChatGPT memory import
  - feature_1_4_4: Memory management UI
  - feature_1_4_5: Automatic extraction (future)

**Key Research References**:
- Joplin: "Mem0 - Universal Memory Layer Analysis"
- Joplin: "Future Architecture Recommendation"
- Joplin: "RAG Obsolescence in Agentic AI Systems"
- Project: docs/research-notes/03-mem0-memory-layer.md

---

### 2025-11-29 - Safety Architecture + Memory Import Priority

**New Priorities**:
1. **Safety Guardrails** (Epic 1.3) - Critical before adding any write operations
   - Designed tiered permission model (read-only → create drafts → full access)
   - Created `specs/SAFETY-ARCHITECTURE.md` with full design
   - Xero has NO user restore - we must protect users from AI mistakes

2. **Memory Import** (Epic 1.4) - ChatGPT workaround for demo
   - ChatGPT disables memory when MCP connectors used
   - Solution: export ChatGPT memories → upload to Pip context layer
   - Preserves personalized experience across all platforms

**Key Research Findings**:
- Xero deleted/voided data is permanently lost
- Third-party backup services have significant limitations
- Users must explicitly opt-in to write operations

---

### 2025-11-29 - Claude.ai Validated, ChatGPT Next

**Achievements**:
- Claude.ai MCP integration fully validated and working
- Full Xero tools audit completed (10 tools fixed/hardened)
- $1,500 overdue invoice successfully retrieved via Claude.ai

**Next Priority**: ChatGPT integration
- Minimum subscription: ChatGPT Plus ($20/month)
- Requires Developer Mode enabled
- Same MCP server should work (may need minor tweaks)

**Deferred**: Comprehensive tool testing checklist added to feature_1_1_3

### 2025-11-29 - Documentation Cleanup

**Changes**:
- Fixed CONTRIBUTING.md with proper workflow guide
- Organized docs/ folder (archived outdated files to docs/archive/)
- Updated STATUS.md with correct priorities (Claude.ai → ChatGPT → Landing page)
- Simplified PROGRESS.md to focus on MCP integration

**Priority Clarification**:
1. Claude.ai integration validation (FIRST)
2. ChatGPT integration (after Claude works)
3. Landing page (after both work)

### 2025-11-29 - Full Pip Rebrand

- Renamed repo from zero-agent to pip
- Updated all @pip/* package names
- Updated VPS deployment
- Version 0.2.0

### 2025-11-29 - MCP Remote Server Deployed

- Created packages/mcp-remote-server
- Deployed to mcp.pip.arcforge.au
- Lazy-loading implemented (85% context reduction)
- OAuth 2.0 + token URL authentication

### 2025-11-28 - User Authentication

- Email/password with invite codes
- Per-user data isolation
- Admin CLI for code management

### 2025-11-28 - Business Context Layer

- Document upload API
- PDF/TXT/MD/DOCX parsing
- Context injection into prompts
- Deployed to VPS

---

## References

- `STATUS.md` - Current state (2-week window)
- `ISSUES.md` - Bugs, improvements, risks
- `ARCHITECTURE.md` - System design and ADRs
- `docs/research-notes/SPIKE-pip-inside-claude-chatgpt.md` - MCP strategy
