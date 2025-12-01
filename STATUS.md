# Pip - Project Status

> **Purpose**: Current state snapshot (2-week rolling window)
> **Lifecycle**: Living (update daily/weekly during active development)

**Last Updated**: 2025-12-02
**Current Phase**: Milestone 2 Implementation (Epic 2.1 + 2.2 Complete, Response Styles next)
**Version**: 0.4.0-dev

---

## Quick Overview

| Aspect | Status | Notes |
|--------|--------|-------|
| **MCP Server** | 🟢 | Live at mcp.pip.arcforge.au |
| **Claude.ai** | 🟢 | Fully validated (Xero + Memory tools) |
| **ChatGPT** | 🟢 | Fully validated (Xero + Memory tools) |
| **Memory Stack** | 🟢 | Option B (native, text-based search) |
| **Safety Guardrails** | 🟢 | Complete (tiered permissions) |
| **PWA Frontend** | 🟢 | Live at app.pip.arcforge.au |
| **Landing Page** | 🟢 | Live at pip.arcforge.au |
| **Xero Integration** | 🟢 | 10 READ-ONLY tools verified |
| **Git Workflow** | 🟢 | Simple tier (main only, direct commits) |
| **Milestone 2** | 🟢 | Epic 2.1 (Memory UI) + 2.2 (Chat History) deployed |

**Legend**: 🟢 Good | 🟡 Attention | 🔴 Critical | 🔵 In Progress

---

## Current Focus

**Objective**: Implement Milestone 2 - User Experience & Personality (v0.4.0)

### Just Completed (2025-12-01)

1. **Epic 2.1: Memory Management** ✅ DEPLOYED
   - User edit tracking schema (is_user_edit column, memory_summaries table)
   - Memory summary generation tools (get/save_memory_summary)
   - REST API for PWA (GET /api/memory, POST /api/memory/edit, etc.)
   - ManageMemoryModal component (Settings → Manage memory)
   - Commits: `8394d02`, `2566a3d`

2. **Epic 2.2: Chat History** ✅ DEPLOYED
   - Extended sessions schema (title, preview_text columns)
   - Chat title auto-generation from first user message (~50 chars)
   - API endpoints (GET/PATCH/DELETE /api/sessions/:id)
   - ChatSidebar component (collapsible, Claude.ai Pattern 0)
   - Zustand state management for chat list
   - Commit: `9699c96`

3. **All Milestone 2 Spikes COMPLETE**:
   - ✅ spike_m2_001: Cross-Project Reference - Query-time project parameter pattern
   - ✅ spike_m2_002: React.js Refactor Assessment - Keep React + react-dropzone
   - ✅ spike_m2_003: Character Voice Methodology - Adelaide/Pippin profiles
   - ✅ spike_m2_004: Multi-Model Architecture - LiteLLM + Tailscale + Ollama

4. **Tech Debt**:
   - ~~debt_003: Legacy "zero-agent" naming~~ ✅ Resolved (migrated to pip-data/pip.db)
   - debt_004: ESLint v9 flat config migration (P3 - deferred)

5. **Infrastructure**:
   - Added `deploy/deploy.sh` for systematic deployment
   - Both containers rebuilt consistently on each deploy

### Remaining Work (Milestone 2)

1. ~~**Epic 2.1** (Memory Refactor)~~ ✅ Complete
2. ~~**Epic 2.2** (Chat History)~~ ✅ Complete
3. ~~**Response Styles** (issue_020)~~ ✅ Complete (2025-12-02)
4. **Epic 2.3** (Projects) - Complex, needs careful implementation
5. **Epic 2.4** (Document Upload) - Medium priority, spike complete
6. ~~**Epic 2.5** (Personality)~~ 🔵 Deferred - replaced by Response Styles
7. **Epic 2.6** (Testing) - Continuous throughout milestone

### Language Rules (User-Facing Content)
- ❌ NEVER use "AI" (overused marketing hype)
- ❌ NEVER use "query" (too technical)
- ✅ Focus on what the tool actually does

---

## Deployment Status

| Service | URL | Health |
|---------|-----|--------|
| Landing Page | https://pip.arcforge.au | 🟢 |
| PWA | https://app.pip.arcforge.au | 🟢 |
| MCP Server | https://mcp.pip.arcforge.au | 🟢 |

**VPS**: DigitalOcean Sydney (170.64.169.203)
**Containers**: pip-app, pip-mcp (memory-enabled)
**Ollama**: Running as systemd service with nomic-embed-text

---

## Test Results (2025-11-30)

### All Tests Passed ✅

| Platform | Memory Add | Memory Search | Xero Tools |
|----------|------------|---------------|------------|
| **Claude.ai** | ✅ Working | ✅ 80% relevance | ✅ All 10 tools |
| **ChatGPT** | ✅ Working | ✅ 80% relevance | ✅ All 10 tools |

**Notes**:
- Claude.ai: Direct tool calls (native MCP support)
- ChatGPT: Requires meta-tool pattern (`get_tools_in_category` → `execute_tool`)
- Memory uses text-based search (semantic search disabled for Alpine compatibility)

---

## Known Issues

| ID | Priority | Summary | Status |
|----|----------|---------|--------|
| issue_019 | P2 | Safety Settings UI - explanation box placement | 🔴 Open |
| issue_010 | - | Mem0 SQLite crash in Docker | ✅ Resolved (switched to native) |
| issue_008 | - | Memory architecture decision | ✅ Resolved (Option B deployed) |
| issue_005 | - | ChatGPT memory in Dev Mode | ✅ Resolved (native memory works) |
| issue_004 | - | Safety guardrails | ✅ Complete |

---

## Recent Achievements (Last 2 Weeks)

### 2025-12-01 (Evening Session)
- **Memory API Fixes**: Fixed SQL schema mismatches preventing memory saves
  - Column `observation` not `content`
  - Added `is_user_edit` and `updated_at` migrations
  - Memory UI now fully functional
- **Naming Migration Complete**: zero-agent → pip fully resolved
  - Updated all Dockerfiles, code defaults, and READMEs
  - Deploy script now sources `.env` for secrets
  - Backup script updated to use `pip` naming (14-day retention)
- **Login/Signup Icons**: Changed from rounded square to circular design
- **Migration Checklist Added**: DEVELOPMENT.md now includes lessons learned
- **New Issue**: issue_019 - Safety Settings UI placement

### 2025-12-01 (Morning Session)
- **Git Workflow Simplified**: Moved to Simple tier (main only)
  - Merged dev to main, deleted dev branch
  - Removed 5 stale branches, 3 worktrees
  - Fixed VPS remote URL pointing to correct repo
  - Updated all documentation for Simple tier
- **Epic 2.1 Complete**: Memory architecture aligned with Anthropic patterns
- **Spike M2-002 Complete**: React assessment - keep current stack
- **Spike M2-003 Complete**: Character voice methodology + profiles
- **Documentation Updated**: CLAUDE.md, CONTRIBUTING.md, DEVELOPMENT.md aligned

### 2025-11-30 (Evening Session)
- Landing page deployed at pip.arcforge.au
- OAuth debounce fix for double-submit prevention
- Login button UX: "Sign In" → "Signing In..." with disabled state
- MCP session persistence fix (60s keep-alive)
- user_settings table migration added
- **Claude.ai Xero tools verified working**

### 2025-11-30 (Morning)
- Memory A/B architecture implemented (mem0 + native options)
- VPS Ollama installed and configured
- Fixed mem0ai TypeScript error (`url` vs `ollamaBaseUrl`)

### 2025-11-29
- Safety architecture implemented (tiered permissions)
- ChatGPT integration validated
- Xero tools audit complete (10 tools hardened)
- Full rebrand: zero-agent → pip

### 2025-11-28
- User authentication with invite codes
- Business context layer (document upload)
- Demo completed with dental practice owner

---

## Design Decisions (2025-11-30)

### Removed: Relationship Progression System

**Decision**: Remove the planned "colleague → partner → friend" progression model.

**Rationale**:
- Vague and overcomplicated for a bookkeeping tool
- Not relevant to core user needs (preferences, key details, business context)
- Anthropic's official MCP Memory Server validates simpler approach (~350 lines, no progression)
- Current text-based memory is sufficient for MVP

**What we kept**: Simple memory that stores preferences, remembers key details, works across chats, and persists between Docker restarts.

---

## Next Steps

1. **Deploy Response Styles** - Build and deploy to production
2. **Implement Epic 2.3** - Projects feature (isolated context per project/client)
3. **Implement Epic 2.4** - Per-chat document upload (spike complete)
4. **Fix issue_019** - Safety Settings UI placement
5. **Onboard beta users** - Share with trusted users for feedback

---

## Feature Backlog (Updated 2025-12-02)

### Completed ✅

1. ~~**Automatic Memory Management**~~ → Epic 2.1 deployed
   - ManageMemoryModal in Settings → Manage memory
   - User edit tracking, summary generation

2. ~~**Chat History**~~ → Epic 2.2 deployed
   - Collapsible sidebar with chat list
   - Title auto-generation, relative timestamps

3. ~~**Response Styles**~~ → issue_020 deployed (2025-12-02)
   - Claude.ai pattern: Normal, Formal, Concise, Explanatory, Learning
   - Settings dropdown for style selection
   - Simpler than Personality - user-controlled, not AI character

### Remaining

4. **Projects Feature (Isolated Context)** → Epic 2.3
   - Separate knowledge bases per project/client
   - Multi-Xero org support
   - Cross-project reference capability (spike complete)

5. **Per-Chat Document Upload** → Epic 2.4
   - Plus icon (+) in chat (spike complete: use react-dropzone)
   - Document preview below chat input

6. **Pip's Personality** → Epic 2.5 (DEFERRED)
   - Adelaide/Pippin profiles preserved for future use
   - Decision: "Personality" too assumptive for business tool
   - May become premium feature layered on top of Styles

---

## References

- `PROGRESS.md` - Detailed task tracking
- `ISSUES.md` - Bug and improvement tracking
- `ARCHITECTURE.md` - System design and ADRs
- `CHANGELOG.md` - Release history
- `specs/BLUEPRINT-feature-memory-ab-testing-20251130.yaml` - A/B test spec

---

**Archive Policy**: Items older than 2 weeks move to CHANGELOG.md [Unreleased] section.
