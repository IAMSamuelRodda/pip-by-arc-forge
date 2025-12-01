# Pip - Progress Tracking

> **Purpose**: Detailed project tracking with milestones, epics, features, and tasks
> **Lifecycle**: Living (update on task completion, status changes)

**Last Updated**: 2025-12-01
**Current Phase**: Milestone 2 Planning Complete

---

## Progress Summary

| Metric | Value |
|--------|-------|
| Current Focus | Beta user onboarding |
| Phase | MVP Complete - Ready for Beta |
| Milestones Complete | 2/3 (Core Platform + MCP Distribution) |
| Overall | All core features working on Claude.ai + ChatGPT |

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

## Milestone 1: MCP Distribution (Complete)

**Status**: ✅ Complete
**Completed**: 2025-11-30
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

### Epic 1.4: Native Memory Stack

**Status**: ✅ Complete
**Completed**: 2025-11-30
**Priority**: HIGH (enables "Pip knows me" experience)

**Problem**: ChatGPT Plus users have memory disabled in Developer Mode. Need Pip-native memory layer.

**Solution**: Native memory implementation with text-based search (Option B).

**Why Not Mem0 (Option A)**:
- mem0ai crashes with `SQLITE_CANTOPEN` in Docker/Alpine
- @xenova/transformers requires glibc (Alpine uses musl)
- Decided to use text-based search for MVP

**Test Results**:
- Claude.ai: add_memory + search_memory working (80% relevance)
- ChatGPT: add_memory + search_memory working (80% relevance)

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

#### feature_1_4_1: Native Memory Integration

**Status**: ✅ Complete (Verified Working)

| Task | Status | Notes |
|------|--------|-------|
| Implement native memory | ✅ Done | memory-native.ts with better-sqlite3 |
| Add memory tools to MCP | ✅ Done | 5 tools: add, search, list, delete, delete_all |
| User isolation (multi-tenant) | ✅ Done | userId param per memory operation |
| Deploy to production | ✅ Done | Option B (native) deployed |
| **Test via Claude.ai** | ✅ Done | 80% relevance, working |
| **Test via ChatGPT** | ✅ Done | 80% relevance, working |

**Memory Tools Deployed**:
- `add_memory`: Store user preferences, goals, business context
- `search_memory`: Text-based search across memories
- `list_memories`: View all stored memories
- `delete_memory`: Remove specific memory by ID
- `delete_all_memories`: Clear all user memories

**Production Configuration** (Option B - native):
- Database: SQLite via better-sqlite3
- Search: Text-based (semantic search deferred for Alpine compatibility)
- Tables: memory_entities, memory_observations, memory_relations

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

**Status**: ✅ Complete
**Completed**: 2025-11-30

| Task | Status | Notes |
|------|--------|-------|
| Create pip.arcforge.au | ✅ Done | Deployed to VPS |
| What is Pip section | ✅ Done | "The Books in Plain English" |
| Demo chat section | ✅ Done | Interactive demo UI |
| Features section | ✅ Done | Invoices, Reports, Contacts |
| Pricing section | ✅ Done | Free (Beta) + subscription requirements |
| Arc Forge branding | ✅ Done | Dark theme with JetBrains Mono |

**URL**: https://pip.arcforge.au

---

## Milestone 2: User Experience & Personality (v0.4.0)

**Status**: 🔵 Planning Complete
**Blueprint**: `specs/BLUEPRINT-project-milestone2-ux-personality-20251201.yaml`
**Estimated**: 8-10 weeks
**Tracking**: Document-based (PROGRESS.md + ISSUES.md)

### Overview

| Epic | Priority | Description |
|------|----------|-------------|
| 2.1 Memory Refactor | High | Align with Anthropic's MCP Memory Server approach |
| 2.2 Chat History | High | Persistent conversations with sidebar navigation |
| 2.3 Projects | High | Isolated context per project/client |
| 2.4 Document Upload | Medium | Per-chat attachments with + icon |
| 2.5 Pip's Voice | Critical | Switchable personalities (Adelaide / Pippin) |
| 2.6 Testing & Docs | Medium | Integration testing and documentation |

**Language Rules**: No "AI" (overused hype), no "query" (too technical)

---

### Epic 2.1: Memory Architecture Modernization

**Status**: ⚪ Not Started
**Priority**: HIGH (foundation for all features)

#### feature_2_1_1: Memory Architecture Analysis & Design
**Complexity**: 2.3/5 | **Est**: 3 days

| Task | Status | Complexity | Notes |
|------|--------|------------|-------|
| task_2_1_1_1: Review Anthropic's MCP Memory Server | ⚪ | 1.5 | Study ~350 line reference implementation |
| task_2_1_1_2: Audit current memory-native.ts | ⚪ | 1.7 | Identify bloat and deviations |
| task_2_1_1_3: Design refactored schema and API | ⚪ | 2.2 | Define migration path |

#### feature_2_1_2: Memory System Refactor Implementation
**Complexity**: 2.8/5 | **Est**: 5 days

| Task | Status | Complexity | Notes |
|------|--------|------------|-------|
| task_2_1_2_1: Implement lean memory service | ⚪ | 2.5 | Target ~350 lines, remove bloat |
| task_2_1_2_2: Create database migration | ⚪ | 2.3 | Schema updates, backward compatibility |
| task_2_1_2_3: Update MCP tools | ⚪ | 2.0 | add_memory, search_memory, etc. |
| task_2_1_2_4: Integration testing | ⚪ | 2.2 | Claude.ai + ChatGPT verification |

---

### Epic 2.2: Persistent Chat History

**Status**: ⚪ Not Started
**Priority**: HIGH (standard user expectation)

#### feature_2_2_1: Chat History Backend Infrastructure
**Complexity**: 2.5/5 | **Est**: 4 days

| Task | Status | Complexity | Notes |
|------|--------|------------|-------|
| task_2_2_1_1: Extend sessions table schema | ⚪ | 1.8 | title, preview_text, last_message_at |
| task_2_2_1_2: Implement chat title auto-generation | ⚪ | 2.5 | LLM generates from first messages |
| task_2_2_1_3: Create API endpoints | ⚪ | 2.0 | GET /api/chats, GET/:id, DELETE/:id |

#### feature_2_2_2: Chat History UI - Vertical Tabs Sidebar
**Complexity**: 3.0/5 | **Est**: 5 days

| Task | Status | Complexity | Notes |
|------|--------|------------|-------|
| task_2_2_2_1: Collapsible sidebar component | ⚪ | 2.8 | Left sidebar, responsive |
| task_2_2_2_2: Chat list with metadata | ⚪ | 2.2 | Title, preview, timestamp |
| task_2_2_2_3: New/delete chat actions | ⚪ | 2.0 | Plus icon, delete confirmation |
| task_2_2_2_4: Chat switching with state | ⚪ | 2.5 | Load chat, restore scroll |

---

### Epic 2.3: Projects Feature - Isolated Context

**Status**: ⚪ Not Started
**Priority**: HIGH (differentiator)

#### feature_2_3_1: Projects Data Model & Backend
**Complexity**: 2.8/5 | **Est**: 5 days

| Task | Status | Complexity | Notes |
|------|--------|------------|-------|
| task_2_3_1_1: Design projects schema | ⚪ | 2.5 | Tables, relationships |
| task_2_3_1_2: Implement project CRUD | ⚪ | 2.2 | Create, read, update, delete |
| task_2_3_1_3: Refactor services for isolation | ⚪ | 3.2 | **DECOMPOSED** → 4 subtasks |

**Decomposed: task_2_3_1_3** (was 3.2 → all subtasks ≤2.5):

| Subtask | Status | Complexity | Notes |
|---------|--------|------------|-------|
| subtask_2_3_1_3_1: Audit service coupling | ⚪ | 1.8 | Document touchpoints |
| subtask_2_3_1_3_2: Refactor memory service | ⚪ | 2.5 | Add project_id scoping |
| subtask_2_3_1_3_3: Refactor session service | ⚪ | 2.3 | Prevent cross-project access |
| subtask_2_3_1_3_4: Integration testing | ⚪ | 2.0 | Verify isolation |

#### feature_2_3_2: Multi-Xero Organization Support
**Complexity**: 2.7/5 | **Est**: 4 days

| Task | Status | Complexity | Notes |
|------|--------|------------|-------|
| task_2_3_2_1: Update oauth_tokens schema | ⚪ | 2.0 | Add project_id FK |
| task_2_3_2_2: Per-project OAuth flow | ⚪ | 2.8 | Associate tokens with project |
| task_2_3_2_3: Update XeroClient | ⚪ | 2.5 | Get tokens by project_id |

#### feature_2_3_3: Cross-Project Reference Capability
**Status**: ⚠️ SPIKE REQUIRED
**Complexity**: 2.5/5 | **Est**: 3 days

| Task | Status | Complexity | Notes |
|------|--------|------------|-------|
| task_2_3_3_1: Design cross-project API | ⚪ | 2.8 | **needs_spike** (uncertainty: 4) |
| task_2_3_3_2: Implement access controls | ⚪ | 2.5 | Read-only cross-project access |

**Spike**: spike_m2_001 (Cross-Project Reference Research) - 2 days

#### feature_2_3_4: Projects UI - Switcher & Management
**Complexity**: 2.3/5 | **Est**: 4 days

| Task | Status | Complexity | Notes |
|------|--------|------------|-------|
| task_2_3_4_1: Project switcher dropdown | ⚪ | 2.2 | Header component |
| task_2_3_4_2: Project settings page | ⚪ | 2.0 | Edit name, Xero status |
| task_2_3_4_3: Project context indicator | ⚪ | 1.5 | Visual in chat UI |

---

### Epic 2.4: Per-Chat Document Upload

**Status**: ⚪ Not Started (spike complete, ready to implement)
**Priority**: MEDIUM

#### feature_2_4_1: React.js Refactor Assessment (SPIKE)
**Status**: ✅ COMPLETE
**Complexity**: 2.0/5 | **Est**: 2 days | **Completed**: 2025-12-01

| Task | Status | Complexity | Notes |
|------|--------|------------|-------|
| task_2_4_1_1: Research PWA file upload patterns | ✅ | 2.0 | Use react-dropzone for + icon UX |
| task_2_4_1_2: Evaluate refactor cost vs benefits | ✅ | 2.0 | **Decision: Keep React** - aligns with ChatGPT/Claude stacks |

**Spike**: spike_m2_002 (React.js Refactor Assessment) - ✅ COMPLETE
**Output**: `docs/research-notes/SPIKE-m2-002-react-refactor-assessment.md`
**Decision**: Keep React. Both ChatGPT (Next.js) and Claude (React+Ink) use React. Migration cost (3-5 weeks) not justified.

#### feature_2_4_2: Document Upload Backend
**Complexity**: 2.5/5 | **Est**: 4 days | **Depends on**: feature_2_4_1

| Task | Status | Complexity | Notes |
|------|--------|------------|-------|
| task_2_4_2_1: Design session_documents schema | ⚪ | 2.2 | Metadata, storage strategy |
| task_2_4_2_2: Implement file upload API | ⚪ | 2.8 | Validation, size limits |
| task_2_4_2_3: Add retrieval/deletion endpoints | ⚪ | 1.8 | GET, DELETE |

#### feature_2_4_3: Document Upload UI Component
**Complexity**: 2.7/5 | **Est**: 4 days | **Depends on**: feature_2_4_1

| Task | Status | Complexity | Notes |
|------|--------|------------|-------|
| task_2_4_3_1: Plus (+) icon attachment button | ⚪ | 2.5 | File picker, drag-and-drop |
| task_2_4_3_2: Document preview component | ⚪ | 2.3 | Below chat input, upload progress |
| task_2_4_3_3: Documents list in sidebar | ⚪ | 2.0 | Download/delete actions |

---

### Epic 2.5: Pip's Voice & Personality System

**Status**: 🔵 In Progress (spike complete, implementation ready)
**Priority**: CRITICAL (retention impact)

#### feature_2_5_1: Character Voice Methodology Research (SPIKE)
**Status**: ✅ Complete
**Complexity**: 2.5/5 | **Actual**: 1 day
**Branch**: `spike/m2-003-character-voice`

| Task | Status | Complexity | Notes |
|------|--------|------------|-------|
| task_2_5_1_1: Analyze literary voice techniques | ✅ | 2.3 | Word choice, sentence structure, verbal tics |
| task_2_5_1_2: Research Grok speech modes | ✅ | 2.0 | 13 modes analyzed (Unhinged, Storyteller, etc.) |
| task_2_5_1_3: Define personality profile schema | ✅ | 2.8 | TypeScript types + 2 draft profiles |

**Deliverables**:
- `docs/research-notes/SPIKE-character-voice-methodology.md` - Full research
- `packages/core/src/database/types.ts` - Personality types
- `packages/core/src/personalities/` - Adelaide + Pippin profiles
- `buildPersonalityPrompt()` function for system prompt injection

#### feature_2_5_2: Adelaide Bookkeeper Personality Profile
**Complexity**: 2.3/5 | **Est**: 3 days | **Depends on**: feature_2_5_1 ✅
**Status**: 🟡 Draft Complete (from spike)

| Task | Status | Complexity | Notes |
|------|--------|------------|-------|
| task_2_5_2_1: Define Adelaide character profile | ✅ | 2.2 | `personalities/adelaide.ts` created |
| task_2_5_2_2: Create system prompt + test | ⚪ | 2.5 | Invoice, report, troubleshooting scenarios |
| task_2_5_2_3: Refine based on user testing | ⚪ | 2.0 | Iterate on tone |

#### feature_2_5_3: LOTR Pippin Personality Profile
**Complexity**: 2.5/5 | **Est**: 3 days | **Depends on**: feature_2_5_1 ✅
**Status**: 🟡 Draft Complete (from spike)

| Task | Status | Complexity | Notes |
|------|--------|------------|-------|
| task_2_5_3_1: Define Pippin character profile | ✅ | 2.3 | `personalities/pippin.ts` created |
| task_2_5_3_2: Create system prompt + test | ⚪ | 2.8 | Balance playfulness with professionalism |
| task_2_5_3_3: Refine based on user testing | ⚪ | 2.2 | Ensure not undermining trust |

#### feature_2_5_4: Personality Switching Infrastructure
**Complexity**: 2.2/5 | **Est**: 3 days

| Task | Status | Complexity | Notes |
|------|--------|------------|-------|
| task_2_5_4_1: Extend user_settings schema | ✅ | 1.5 | `personality: PersonalityId` added (from spike) |
| task_2_5_4_2: Personality loading in AgentOrchestrator | ⚪ | 2.5 | Inject via `buildPersonalityPrompt()` |
| task_2_5_4_3: Mid-chat personality switching | ⚪ | 2.8 | Maintain conversation context |

#### feature_2_5_5: Personality Selector UI
**Complexity**: 1.8/5 | **Est**: 2 days

| Task | Status | Complexity | Notes |
|------|--------|------------|-------|
| task_2_5_5_1: Personality selector in settings | ⚪ | 1.8 | Radio buttons/cards |
| task_2_5_5_2: Quick personality toggle in chat | ⚪ | 2.0 | Icon/dropdown, visual confirm |

---

### Epic 2.6: Testing & Documentation

**Status**: ⚪ Not Started
**Priority**: MEDIUM (continuous)

#### feature_2_6_1: Integration Testing Suite
**Complexity**: 2.3/5 | **Est**: 3 days

| Task | Status | Complexity | Notes |
|------|--------|------------|-------|
| task_2_6_1_1: Test chat history + project switching | ⚪ | 2.2 | Persistence, isolation |
| task_2_6_1_2: Test voice profiles + switching | ⚪ | 2.5 | Consistency, prompt injection |

#### feature_2_6_2: User Documentation Updates
**Complexity**: 1.5/5 | **Est**: 2 days

| Task | Status | Complexity | Notes |
|------|--------|------------|-------|
| task_2_6_2_1: Update ARCHITECTURE.md | ⚪ | 1.5 | New schemas, voice system |
| task_2_6_2_2: Create user guide | ⚪ | 1.5 | Projects, voice features |

---

### Milestone 2 Risks

| ID | Area | Severity | Mitigation |
|----|------|----------|------------|
| risk_m2_1 | Memory Refactor | Medium | Integration testing before deploy |
| risk_m2_2 | Project Isolation | High | Audit all queries for project_id |
| risk_m2_3 | Voice Consistency | Medium | Regular prompt reinforcement |
| risk_m2_4 | React Refactor Scope | Low | Time-box spike to 2 days |

---

## Milestone 3: Voice Mode & Premium (Future)

**Status**: ⚪ Not Started
**Timeline**: After Milestone 2

### Epic 3.1: Voice Mode
- Speech-to-Text (Whisper)
- Text-to-Speech (Chatterbox)
- WebSocket conversation flow
- Voice UI in PWA

### Epic 3.2: Premium Features
- Semantic search (if needed)
- Premium subscription tiers
- Advanced analytics

---

## Archived Milestones

### Demo (2025-11-28)
**Status**: ✅ Complete

The Thursday demo with dental practice owner has been completed. Demo materials archived to `docs/archive/`.

---

## Spike: Multi-Model LLM Architecture (spike_m2_004)

**Status**: ✅ COMPLETE
**Blueprint**: `specs/archive/BLUEPRINT-spike-multi-model-architecture-20251201.yaml`
**Time-box**: 3-5 days (completed in 1 day)
**Reduces Uncertainty For**: Future multi-model support implementation

### Context

Current state:
- PWA + MCP hardcoded to Anthropic Claude
- User has local GPU with Ollama capability
- Headscale (self-hosted Tailscale) running on VPS

Goal: Research optimal architecture for:
1. Multi-model PWA (dropdown selector like ChatGPT/Claude)
2. LiteLLM proxy for unified API
3. Tailscale networking for secure Ollama access
4. Model-agnostic MCP design (called from multiple platforms)

### Deliverables

| Deliverable | Est | Status | Output |
|-------------|-----|--------|--------|
| Architecture Decision Document | 1.5d | ✅ | `specs/spike-outputs/ADR-MULTI-MODEL-ARCHITECTURE-20251201.md` |
| LiteLLM Configuration POC | 1.5d | ✅ | `/opt/litellm/` on VPS - 5 models configured |
| Tailscale + Ollama Connectivity Test | 1.0d | ✅ | Cold: 14s, Warm: 238ms via Tailscale |
| PWA Model Selector Mockup | 0.5d | ✅ | `specs/spike-outputs/PWA-MODEL-SELECTOR-DESIGN-20251201.md` |
| Cost/Performance Comparison Matrix | 0.5d | ✅ | `specs/spike-outputs/COST-PERFORMANCE-MATRIX-20251201.md` |

### Research Questions

**LiteLLM Integration**:
- [x] Routing and fallback patterns → Config-based model mapping, drop_params for normalization
- [x] Streaming response handling → Full streaming support all providers
- [x] Cost tracking/observability → Native callbacks (file, PostgreSQL)
- [x] Provider-specific features → Function calling validated for Anthropic, OpenAI

**Tailscale + Ollama**:
- [x] Direct Ollama vs LiteLLM proxy exposure → Via LiteLLM (unified API)
- [x] Latency implications of tunneling → Negligible (~10ms overhead)
- [x] Server discovery/registration → Static Tailscale IP (100.64.0.2)
- [x] Offline graceful degradation → Clear error messages, manual model switching

**PWA Model Selector**:
- [x] Static vs dynamic model discovery → Hybrid (static config, dynamic availability)
- [x] Model-specific capabilities display → Badges: best/fast/cheap/local
- [x] Mid-conversation switching UX → Allowed, no context loss
- [x] User preference persistence → Zustand + localStorage

**MCP Model Source**:
- [x] Model-agnostic tool design → No changes needed, already model-agnostic
- [x] Platform differences → Calling platform handles model selection
- [x] Prompt engineering considerations → Not needed for tools

### Acceptance Criteria

- [x] All research questions answered with evidence
- [x] LiteLLM routing to 3+ models working (5 models: claude-sonnet, claude-haiku, gpt-4o, gpt-4o-mini, deepseek-coder)
- [x] Ollama accessible via Tailscale with latency <5s (238ms warm, 14s cold)
- [x] Architecture decision document covers all 5 areas
- [x] Uncertainty reduced to UA ≤2 for implementation

### Key Findings

1. **LiteLLM Standalone**: Deploy as separate container with host networking (for Tailscale access)
2. **Ollama Cold Start**: 14s model loading - needs warm-up strategy (issue_017)
3. **MCP Model-Agnostic**: No changes needed - calling platform chooses model
4. **Recommendations**: Claude Sonnet 4 (primary), Haiku (fast), GPT-4o (fallback), Local Ollama (offline)

### Future Investigation

- **issue_017**: Ollama Model Warm-Up Strategy - silent background warm-up while user types

---

## Progress Changelog

### 2025-12-01 - spike_m2_004: Multi-Model Architecture Spike COMPLETE

**Spike Completed** (1 day, time-boxed 3-5 days):
- All 5 deliverables completed with documented outputs
- LiteLLM proxy deployed on VPS with 5 models configured
- Ollama accessible via Tailscale (238ms warm latency)
- Comprehensive architecture decision document written
- PWA model selector mockup with React component code
- Cost/performance matrix comparing 8+ cloud models and 6+ local models

**Key Technical Accomplishments**:
- LiteLLM running on VPS port 4000 with host networking
- Models: claude-sonnet, claude-haiku, gpt-4o, gpt-4o-mini, deepseek-coder
- Tailscale connectivity verified (VPS 100.64.0.1 → Local 100.64.0.2)
- Ollama listening on all interfaces (OLLAMA_HOST=0.0.0.0)

**Outputs Created**:
- `specs/spike-outputs/ADR-MULTI-MODEL-ARCHITECTURE-20251201.md`
- `specs/spike-outputs/COST-PERFORMANCE-MATRIX-20251201.md`
- `specs/spike-outputs/PWA-MODEL-SELECTOR-DESIGN-20251201.md`

**Follow-up Issue**: issue_017 - Ollama Model Warm-Up Strategy (14s cold start)

**Next Steps** (from ADR):
- Phase 1: Connect Pip backend to LiteLLM, add model selector UI
- Phase 2: Validate local models with MCP tools, implement warm-up
- Phase 3: Cost tracking, alerts, advanced features

---

### 2025-12-01 - spike_m2_004: Multi-Model Architecture Spike Created

**Spike Created**:
- Blueprint generated for multi-model LLM architecture research
- Time-boxed to 3-5 days
- Focus: LiteLLM, Tailscale+Ollama, PWA model selector, MCP model-agnostic design
- 5 deliverables defined with clear acceptance criteria

**Key Research Areas**:
- LiteLLM proxy configuration and routing
- Secure Ollama access via Tailscale
- Dynamic model switching in PWA
- Model-agnostic MCP server design

### 2025-12-01 - spike_m2_002: React Refactor Assessment Complete

**Spike Complete**:
- Researched ChatGPT and Claude.ai frontend stacks
- ChatGPT uses React + Next.js (SSR, React Server Components)
- Claude Code uses TypeScript + React (Ink) + Bun
- Anthropic hiring explicitly requires "React development expertise"

**Decision**: Keep React - no framework migration needed
- Current stack (React 18, Vite, Zustand, TanStack Query) is modern best-practice
- Migration cost (3-5 weeks) not justified
- Industry alignment validated (both major LLM chat apps use React)

**File upload recommendation**: react-dropzone for + icon attachment UX

**Output**: `docs/research-notes/SPIKE-m2-002-react-refactor-assessment.md`

---

### 2025-11-30 (Evening) - Full Deployment & Claude.ai Verification

**Deployment Complete**:
- Memory-enabled MCP container deployed with `MEMORY_VARIANT=mem0`
- Ollama accessible from container via `host.docker.internal`
- Landing page live at pip.arcforge.au
- All three services healthy: pip.arcforge.au, app.pip.arcforge.au, mcp.pip.arcforge.au

**Claude.ai Integration Fixes**:
- OAuth debounce prevents double-submit race condition
- Session persistence (60s keep-alive after SSE close)
- Login button UX: loading state + disabled on click
- user_settings table migration added
- **Xero tools verified working** (get_invoices tested successfully)

**Bug Fixes**:
- OAuth double-code generation fixed (caused "Invalid authorization" error)
- MCP session expiring before tool calls fixed
- Missing database table created (user_settings)

**Next Steps**:
1. Test memory tools via Claude.ai
2. Test memory tools via ChatGPT Dev Mode
3. If Option A fails: Switch to Option B (`MEMORY_VARIANT=native`)
4. Document A/B comparison results

---

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
