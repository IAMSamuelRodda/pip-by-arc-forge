# Pip - Project Status

> **Purpose**: Current state snapshot (2-week rolling window)
> **Lifecycle**: Living (update daily/weekly during active development)

**Last Updated**: 2025-11-30 (Night)
**Current Phase**: MVP Complete - Ready for Beta Users
**Version**: 0.3.3

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

**Legend**: 🟢 Good | 🟡 Attention | 🔴 Critical | 🔵 In Progress

---

## Current Focus

**Objective**: Onboard beta users and gather feedback.

### Just Completed (2025-11-30 Late Evening)

1. **Memory System Fixed (issue_010)** ✅
   - Option A (mem0) crashed with `SQLITE_CANTOPEN` - mem0ai bug in Docker/Alpine
   - Option B (native) crashed with `ld-linux-x86-64.so.2` - onnxruntime needs glibc
   - **Solution**: Removed @xenova/transformers, use text-based search
   - Memory tools now working with better-sqlite3
   - Trade-off: Text search vs semantic search (acceptable for MVP)

2. **Technical Fixes** ✅
   - memory-native.ts creates its own tables on init
   - Embedding code commented out (Alpine/musl incompatible)
   - Fixed getAllMemories bug (was calling wrong method)
   - Server starts cleanly without crashes

3. **Previous Session** ✅
   - Claude.ai OAuth and Xero tools fully working
   - Login page UI fixed (centered, no emoji)
   - Landing page live

### Test Results

- [x] Memory tools via Claude.ai (`add_memory`, `search_memory`) - **WORKING**
  - `add_memory`: Stored "I like invoices on Monday" (category: preference)
  - `search_memory`: Found with 80% relevance for query "invoices Monday"
- [x] Memory tools via ChatGPT - **WORKING**
  - Requires meta-tool pattern: `get_tools_in_category` → `execute_tool`
  - `add_memory`: Stored "I like financial reports on the weekend"
  - `search_memory`: Found with 80% relevance

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

### 2025-11-30 (Evening Session)
- Landing page deployed at pip.arcforge.au
- OAuth debounce fix for double-submit prevention
- Login button UX: "Sign In" → "Signing In..." with disabled state
- MCP session persistence fix (60s keep-alive)
- user_settings table migration added
- **Claude.ai Xero tools verified working**

### 2025-11-30 (Morning)
- Branch cleanup: consolidated 3 feature branches into main
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

1. **Onboard beta users** - Share with trusted users for feedback
2. **Monitor production** - Watch for errors, memory usage
3. **Full planning session** - Interactive Q&A with agent, new blueprint, refresh PROGRESS.md

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
