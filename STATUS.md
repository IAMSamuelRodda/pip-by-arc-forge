# Pip - Project Status

> **Purpose**: Current state snapshot (2-week rolling window)
> **Lifecycle**: Living (update daily/weekly during active development)

**Last Updated**: 2025-12-01
**Current Phase**: Milestone 2 Implementation Started
**Version**: 0.3.4

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
| **Milestone 2** | 🔵 | Implementation started, 2/3 spikes complete |

**Legend**: 🟢 Good | 🟡 Attention | 🔴 Critical | 🔵 In Progress

---

## Current Focus

**Objective**: Implement Milestone 2 - User Experience & Personality (v0.4.0)

### Just Completed (2025-12-01)

1. **spike_m2_004: Multi-Model LLM Architecture** ✅ (completed in 1 day)
   - LiteLLM proxy deployed on VPS (port 4000, 5 models)
   - Tailscale + Ollama connectivity verified (238ms warm latency)
   - Architecture Decision Document written
   - PWA model selector mockup designed
   - Cost/performance matrix for 8+ models
   - Outputs: `specs/spike-outputs/ADR-MULTI-MODEL-ARCHITECTURE-20251201.md`

2. **Claude.ai UX Patterns Documented** ✅
   - 8 patterns captured for PWA redesign reference
   - Collapsible sidebar, contextual settings, quick toggles
   - Memory management UI with user edit tracking
   - Full settings page structure
   - Output: `specs/spike-outputs/UX-PATTERNS-CLAUDE-AI-REFERENCE-20251201.md`

3. **Spikes Completed**:
   - ✅ spike_m2_002: React.js Refactor Assessment - **Keep React + react-dropzone**
   - ✅ spike_m2_003: Character Voice Methodology - Adelaide/Pippin profiles
   - ✅ spike_m2_004: Multi-Model Architecture - LiteLLM + Tailscale + Ollama

4. **Spikes Remaining**:
   - 🔴 spike_m2_001: Cross-Project Reference Research (2 days)

5. **New Issues Created**:
   - issue_017: Ollama Model Warm-Up Strategy (14s cold start)
   - issue_018: Memory Management UI + User Edit Tracking

### Recommended Sequence

1. **Epic 2.1** (Memory Refactor) - Foundation for all features
2. **Epic 2.2** (Chat History) - High user value, low risk
3. **Epic 2.3** (Projects) - Complex, needs careful implementation
4. **Epic 2.5** (Voice) - CRITICAL for retention, run spikes early
5. **Epic 2.4** (Document Upload) - Medium priority, spike dependent
6. **Epic 2.6** (Testing) - Continuous throughout milestone

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
| issue_010 | - | Mem0 SQLite crash in Docker | ✅ Resolved (switched to native) |
| issue_008 | - | Memory architecture decision | ✅ Resolved (Option B deployed) |
| issue_005 | - | ChatGPT memory in Dev Mode | ✅ Resolved (native memory works) |
| issue_004 | - | Safety guardrails | ✅ Complete |

---

## Recent Achievements (Last 2 Weeks)

### 2025-12-01
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

1. **Complete spike_m2_001** - Cross-project reference research (unblocks Epic 2.3)
2. **Implement Epic 2.2** - Chat History (high user value, no blockers)
3. **Implement Epic 2.5** - Voice profiles (Adelaide/Pippin) - spike complete
4. **Onboard beta users** - Share with trusted users for feedback
5. **Deploy memory refactor to production** - Test on VPS

---

## Feature Backlog (2025-11-30 Night)

*Captured for tomorrow's planning session.*

### 1. Automatic Memory Management
- Memory should "just work" like Anthropic's MCP Memory Server
- Seamless - no explicit management needed by user
- LLM extracts facts automatically, server stores them
- Currently requires explicit `add_memory` calls - should be automatic

### 2. Chat History (like Claude.ai)
- Persistent conversation history across sessions
- Sidebar showing past chats
- Ability to continue previous conversations
- Currently: No chat history in MCP mode

### 3. Projects Feature (Isolated Context)
- Like Claude.ai's Projects
- Separate knowledge bases per project/client
- Isolated memory and context per project
- Use case: Different Xero orgs, different business contexts

### 4. Per-Chat Document Upload
- Plus icon (+) in chat to add documents to THIS conversation
- Replace current global context upload
- More intuitive UX - documents relevant to current chat
- Global preferences/context: defer and test later

### 5. Pip's Voice/Personality
Two character options (switchable in settings):

**Option A: Adelaide Bookkeeper**
- Smart young woman from Adelaide
- Knows the books, keeps it simple
- Professional but approachable
- Target avatar: Sam (our customer persona)

**Option B: Pip from LOTR**
- Fun, endearing character inspired by Pippin
- Somehow great at bookkeeping (unexplained)
- Playful but competent
- More personality-driven

**UX**: Toggle in settings or via chat command

### 6. Deferred Investigations
- Global preferences vs specific options (test both)
- Claude.ai-style custom instructions
- Whether generic or domain-specific settings work better

---

## References

- `PROGRESS.md` - Detailed task tracking
- `ISSUES.md` - Bug and improvement tracking
- `ARCHITECTURE.md` - System design and ADRs
- `CHANGELOG.md` - Release history
- `specs/BLUEPRINT-feature-memory-ab-testing-20251130.yaml` - A/B test spec

---

**Archive Policy**: Items older than 2 weeks move to CHANGELOG.md [Unreleased] section.
