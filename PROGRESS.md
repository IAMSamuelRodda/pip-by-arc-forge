# Pip - Progress Tracking

> **Purpose**: Milestone and epic tracking for implementation work
> **Lifecycle**: Living (update on epic/feature completion)

**Last Updated**: 2025-12-10
**Current Phase**: Milestone 2 - UX & Features (v0.4.0-dev)

---

## Overview

| Metric | Value |
|--------|-------|
| Milestones Complete | 2/4 (M0 Core Platform, M1 MCP Distribution) |
| Current Milestone | M2 - UX & Features |
| M2 Progress | 4/6 epics complete |
| Next Milestone | M3 - Intelligent Features (future) |

---

## Milestone Summary

| Milestone | Status | Completed | Key Deliverables |
|-----------|--------|-----------|------------------|
| M0: Core Platform | ✅ | 2025-11-28 | VPS, Express, PWA, Xero OAuth, Auth |
| M1: MCP Distribution | ✅ | 2025-11-30 | Claude.ai, ChatGPT, Safety, Memory, Landing |
| M2: UX & Features | 🔵 | - | Memory UI, Chat History, Projects, Response Styles |
| M3: Intelligent Features | ⚪ | - | Expense Separation, Skills System |

---

## Milestone 2: UX & Features (Current)

**Objective**: Polish user experience with memory management, chat history, projects, and response customization.

### Epic Status

| Epic | Status | Summary |
|------|--------|---------|
| 2.1 Memory Management | ✅ | ManageMemoryModal, knowledge graph, user edits |
| 2.2 Chat History | ✅ | Sidebar, title generation, CRUD |
| 2.3 Projects | ✅ | Schema, API, UX rework (Claude.ai pattern) |
| 2.4 Document Upload | 🔵 | Backend wired, needs project association |
| 2.5 Personality | ⏸️ | Deferred - replaced by Response Styles |
| 2.6 Testing | 🔵 | Continuous |
| **Critical Path** | 🔵 | Test User Onboarding (P0) |

---

### Critical Path: Test User Onboarding 🔵

**Status**: In Progress
**Priority**: P0 (Blocks Philip's testing)
**Blueprint**: `specs/archive/BLUEPRINT-feature-m2-completion-20251210.yaml` (feature_1_1)
**Estimated**: 4 days | **Complexity**: 2.3/5

**Objective**: Enable Philip (Dad) to test Pip safely without impacting GPU resources or API costs.

**Tasks**:
| Task | Issue | Est | Complexity | Status |
|------|-------|-----|------------|--------|
| GPU model configuration | issue_055 | 1d | 2.0/5 | ✅ Complete |
| Rate limiting system | issue_052 | 2d | 3.5/5 | ✅ Complete |
| PWA model selector integration | issue_054 | 0.5d | 1.8/5 | 🔴 Not Started |
| Philip account setup | issue_056 | 0.5d | 1.0/5 | 🔴 Not Started |

**Acceptance Criteria**:
- [ ] Philip can sign up and access beta tester features
- [x] Local GPU model (qwen2.5:0.5b/3b) stays loaded and responds <2s
- [x] Rate limiting prevents token abuse on all API endpoints
- [x] Model selector in PWA shows only accessible models (via access control)
- [x] Philip cannot access paid API models (beta_tester flag limits access)

**Dependencies**:
- ✅ issue_054 core authorization (completed)
- Ollama GPU availability via Tailscale

### Additional Features (Not in Original Blueprint)

| Feature | Status | Added |
|---------|--------|-------|
| Response Styles | ✅ | 2025-12-02 |
| Gmail Integration | ✅ | 2025-12-03 |
| Google Sheets Integration | ✅ | 2025-12-09 |
| Per-Connector Permissions | ✅ | 2025-12-09 |
| Ollama Local Models | ✅ | 2025-12-03 |
| Projects UX Rework | ✅ | 2025-12-10 |

---

### Epic 2.1: Memory Management ✅

**Status**: Complete (2025-12-01)
**Architecture**: Native knowledge graph (entities, observations, relations) with text-based search.

**Delivered**:
- `ManageMemoryModal` component in Settings
- User edit tracking (`is_user_edit` column)
- Memory summary generation and caching
- REST API: GET/POST/DELETE `/api/memory/*`
- MCP tools: `read_graph`, `search_nodes`, `add_observations`, etc.

**Files**: `packages/agent-core/src/memory/`, `packages/pwa-app/src/components/ManageMemoryModal.tsx`

---

### Epic 2.2: Chat History ✅

**Status**: Complete (2025-12-01)
**Pattern**: Claude.ai sidebar with collapsible chat list

**Delivered**:
- Session schema extension (title, preview_text)
- Title auto-generation from first message
- `ChatSidebar` component with relative timestamps
- Zustand state management for chat list
- REST API: GET/PATCH/DELETE `/api/sessions/:id`

**Files**: `packages/pwa-app/src/components/ChatSidebar.tsx`, `packages/pwa-app/src/store/chatStore.ts`

---

### Epic 2.3: Projects ✅

**Status**: Complete (2025-12-10)
**Pattern**: Claude.ai Projects - isolated context containers

**Delivered**:
- SQLite `projects` table with CRUD
- REST API: `/api/projects/*` endpoints
- `ProjectSwitcher` dropdown (header)
- `ProjectDetailPage` with sidebar (Memory, Instructions, Files)
- Session filtering by `projectId`
- Projects truly optional (no default project)

**Files**: `packages/pwa-app/src/pages/ProjectDetailPage.tsx`, `packages/pwa-app/src/store/projectStore.ts`

---

### Epic 2.4: Document Upload 🔵

**Status**: Partial (backend wired, UI connected)
**Priority**: P1
**Blueprint**: `specs/archive/BLUEPRINT-feature-m2-completion-20251210.yaml` (feature_1_2)
**Estimated**: 3 days | **Complexity**: 2.8/5

**Completed**:
- [x] File upload API (`POST /documents/upload`)
- [x] Upload button in ProjectDetailSidebar
- [x] File picker with PDF/TXT/MD/DOCX support

**Remaining**:
| Task | Est | Complexity | Status |
|------|-----|------------|--------|
| Project association for uploads | 1d | 2.0/5 | 🔴 Not Started |
| File list display in sidebar | 1d | 2.5/5 | 🔴 Not Started |
| File deletion | 0.5d | 1.8/5 | 🔴 Not Started |
| Context injection | 1.5d | 3.2/5 | 🔴 Not Started |

**Files**: `packages/pwa-app/src/components/ProjectDetailSidebar.tsx`

---

### Epic 2.5: Personality ⏸️

**Status**: Deferred
**Reason**: Replaced by simpler "Response Styles" feature (2025-12-02)

**What Was Preserved**:
- Personality types in `packages/core/src/database/types.ts`
- Adelaide/Pippin profiles in `packages/core/src/personalities/`
- May become premium feature layered on Response Styles

**What Shipped Instead**: Response Styles (Normal, Formal, Concise, Explanatory, Learning)

---

### Epic 2.6: Testing 🔵

**Status**: Ongoing
**Priority**: P2
**Blueprint**: `specs/archive/BLUEPRINT-feature-m2-completion-20251210.yaml` (feature_1_4)
**Estimated**: 3 days | **Complexity**: 2.5/5

**Completed**:
- [x] Manual testing of Projects UX (12 issues found and fixed)
- [x] Claude.ai MCP full test suite (27/32 tools, 100% pass)
- [x] ChatGPT integration validation

**Remaining**:
| Task | Est | Complexity | Status |
|------|-----|------------|--------|
| Playwright configuration | 0.5d | 1.8/5 | 🔴 Not Started |
| Critical path E2E tests | 2d | 3.0/5 | 🔴 Not Started |
| CI/CD integration | 0.5d | 2.0/5 | 🔴 Not Started |

---

## Milestone 1: MCP Distribution ✅

**Completed**: 2025-11-30
**Objective**: Distribute Pip via Claude.ai and ChatGPT

### Epics Delivered

| Epic | Summary |
|------|---------|
| 1.1 Claude.ai Integration | MCP server, SSE transport, JWT auth |
| 1.2 ChatGPT Integration | Same server works, Developer Mode required |
| 1.3 Safety Guardrails | Tiered permissions (L0-L3), operation snapshots |
| 1.4 Native Memory | Knowledge graph, text search, multi-tenant |
| 1.5 Landing Page | pip.arcforge.au deployed |

**Key Files**: `packages/pip-mcp/`, `specs/SAFETY-ARCHITECTURE.md`

---

## Milestone 0: Core Platform ✅

**Completed**: 2025-11-28
**Objective**: Foundation for AI bookkeeping assistant

### Delivered

- VPS deployment (DigitalOcean Sydney, Docker + Caddy)
- Express server with API routes
- React PWA with chat interface
- Xero OAuth integration (10 tools)
- User authentication with invite codes
- SQLite database with daily backups

---

## Milestone 3+: Future

**Status**: Planning
**See**: `VISION.md` for product direction

### Planned Epics

| Epic | Priority | Description |
|------|----------|-------------|
| 3.1 Skills System | P1 | Report templates, agent capabilities (issue_034) |
| 3.2 Expense Separation | P2 | Business vs personal categorization (issue_037) |
| 3.3 Voice Mode | P3 | Speech-to-text, text-to-speech |
| 3.4 Premium Features | P3 | Subscription tiers, analytics |

**Blueprint**: `specs/BLUEPRINT-feature-expense-separation-20251209.yaml`

---

## Spikes Index

| Spike | Status | Output |
|-------|--------|--------|
| spike_mem0 | ✅ | Decision: Native memory (not Mem0) |
| spike_m2_001 | ✅ | Cross-project API design |
| spike_m2_002 | ✅ | React assessment (keep current stack) |
| spike_m2_003 | ✅ | Character voice methodology |
| spike_m2_004 | ✅ | Multi-model architecture (LiteLLM + Ollama) |
| spike_automation | ✅ | n8n/Make.com integration design |
| spike_nextcloud | ✅ | Nextcloud/Collabora challenges |
| spike_stripe | ✅ | Stripe Connect OAuth pattern |

**Location**: `specs/` and `docs/research-notes/`

---

## Architecture Notes

**Memory Stack**: Native knowledge graph with text-based search
- Entities, observations, relations stored in SQLite
- No external dependencies (Mem0/Qdrant removed)
- Semantic search deferred for Alpine compatibility

**Multi-Model**: LiteLLM proxy + Ollama via Tailscale
- Cloud: Claude Sonnet/Haiku, GPT-4o
- Local: DeepSeek, Qwen, LLaMA via Tailscale (100.64.0.2)

**MCP Server**: Model-agnostic, same server for Claude.ai + ChatGPT

---

## References

| Document | Purpose |
|----------|---------|
| `STATUS.md` | Current state snapshot |
| `ISSUES.md` | Open bugs and improvements |
| `CHANGELOG.md` | Release history, resolved issues |
| `VISION.md` | Product direction, target persona |
| `ARCHITECTURE.md` | System design, database schema |
