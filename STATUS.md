# Pip - Project Status

> **Purpose**: Current state snapshot (2-week rolling window)
> **Lifecycle**: Living (update daily/weekly during active development)

**Last Updated**: 2025-12-09
**Current Phase**: Milestone 2 Implementation (Epic 2.1-2.3 complete)
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
| **Xero API Pricing** | 🟢 | Free until 5+ users, then $35 AUD/mo (Mar 2026) |
| **Gmail Integration** | 🟢 | 4 read-only tools (Testing mode: 100 users) |
| **Google Sheets** | 🟢 | 4 tools (read/write, Testing mode: 100 users) |
| **Ollama Local** | 🟢 | 5 models via Tailscale (+ deepseek-r1:1.5b fast reasoning) |
| **Git Workflow** | 🟢 | Simple tier (main only, direct commits) |
| **Milestone 2** | 🔵 | Epic 2.1-2.3 complete, Epic 2.4-2.6 remaining |
| **Projects Feature** | ✅ | Complete (schema, API, switcher, settings page) |

**Legend**: 🟢 Good | 🟡 Attention | 🔴 Critical | 🔵 In Progress

---

## Current Focus

**Objective**: Implement Milestone 2 - User Experience & Personality (v0.4.0)

### Just Completed (2025-12-09)

1. **Settings Page Rework for Per-Connector Permissions** ✅ COMPLETE
   - Centralized OAuth: Moved Google Sheets OAuth from MCP to main server
   - New unified `/api/connectors/status` endpoint for all connector statuses
   - Created `ConnectorCard` component for reusable connector UI
   - Refactored SettingsPage with per-connector permission controls
   - Each connector (Xero, Gmail, Google Sheets) has independent permission levels
   - Connectors section now inline in Settings (no external redirect)
   - Commits: `fe9f2ee`, `0c5ea78`

2. **Proactive Token Refresh & Reconnect UI** ✅ COMPLETE
   - Backend auto-refreshes expired tokens when loading connector status
   - Returns `refreshFailed` flag when refresh fails (60+ day inactive)
   - ConnectorCard shows "Reconnect" button with yellow warning for expired tokens
   - Disconnect option still available in expired state
   - Commit: `0c5ea78`

3. **Namespaced Multi-Provider Tool Architecture** ✅ COMPLETE
   - Implemented namespaced tools: `xero.*`, `gmail.*`, `sheets.*`, `memory.*`
   - Tools organized by provider with consistent naming pattern
   - `get_pip_guide` tool for on-demand documentation
   - Commit: `561bd3b`

4. **Spike: Nextcloud/Collabora Integration** ✅ CREATED
   - OAuth 2.0 flow investigation for self-hosted Nextcloud
   - WebDAV + xlsx library approach for spreadsheet editing
   - Challenges: variable URLs per instance, admin access for OAuth client
   - Blueprint: `specs/BLUEPRINT-spike-nextcloud-collabora-20251209.yaml`

5. **Spike: Stripe Integration** ✅ CREATED
   - Stripe Connect OAuth for multi-user (tokens don't expire!)
   - Reuse patterns from personal-mcp-remote prototype
   - Tools: list_customers, list_invoices, list_subscriptions
   - Blueprint: `specs/BLUEPRINT-spike-stripe-integration-20251209.yaml`

6. **Previous (Vision & Planning)**
   - Vision: "Multi-Hat Business Owner" persona, "What can I actually spend?" question
   - list_accounts MCP tool for Xero chart of accounts
   - pip-mcp package rename for consistency

### Previously Completed (2025-12-04)

1. **Xero API Pricing Research** ✅ COMPLETE
   - New tiered pricing effective March 2, 2026 (replaces revenue share model)
   - Free tier: 5 connections (down from 25), Core tier: $35 AUD/mo for 50 connections
   - AI/ML policy: Does NOT affect Pip (inference allowed, training prohibited)
   - Official Xero MCP server compared - Pip offers unique value (multi-tenant, memory, safety)
   - See `docs/research-notes/XERO-API-PRICING-CHANGES-20251204.md`
   - See `docs/research-notes/XERO-MCP-SERVER-COMPARISON-20251204.md`

### Previously Completed (2025-12-03)

1. **Native Ollama Tool Calling** ✅ COMPLETE
   - Implemented native function calling for tool-capable models (qwq, llama3.x, mistral, qwen2.5)
   - Added `isToolCapableModel()` detection in ollama.ts
   - Updated orchestrator to use capability check instead of blanket disable
   - Verified qwq:32b successfully calling Xero tools (get_profit_and_loss)
   - Commit: `7328329`

2. **Title Generation Fix** ✅ COMPLETE
   - Fixed chat titles showing `<think>` blocks from reasoning models
   - Added regex to strip `<think>...</think>` from generated titles
   - Deployed to production

3. **Fast Reasoning Model** ✅ COMPLETE
   - Pulled `deepseek-r1:1.5b` (1.1GB) - fastest thinking model
   - Downloads in progress: `llama3.1:8b`, `qwen2.5:7b` (tool-capable)

4. **UX Issue Created** (issue_036)
   - Collapsible `<think>` blocks (Claude Code pattern)
   - Tool call data visibility for debugging

5. **Font Loading Fix** ✅ COMPLETE
   - Root cause: All page layouts (`LoginPage`, `SignupPage`, `SettingsPage`, `MainLayout`) had `font-mono` class
   - This applied JetBrains Mono to all text, so Plus Jakarta Sans was never loaded
   - Fix: Changed `font-mono` → `font-sans` on root layout divs
   - Added WOFF2 format (27KB vs 63KB TTF) for better browser support
   - Commit: `f886156`

2. **Gmail Integration** ✅ COMPLETE
   - OAuth 2.0 flow with gmail.readonly scope (Testing mode: 100 users, 7-day token expiry)
   - 4 MCP tools: `search_gmail`, `get_email_content`, `download_attachment`, `list_email_attachments`
   - Attachments fetched on-demand (not stored on VPS) - streamed to Claude for analysis
   - Connected: `samuelrodda@gmail.com`

2. **Ollama Local Models** ✅ COMPLETE
   - 4 models available via Tailscale (100.64.0.2:11434):
     - `deepseek-r1:32b` (19GB) - reasoning model
     - `qwq:32b` (19GB) - reasoning model
     - `deepseek-r1:14b` (9GB) - smaller reasoning model
     - `deepseek-coder:33b` (18GB) - code generation
   - Dynamic model detection in PWA model selector

3. **VPS Infrastructure** ✅ FIXED
   - Added 4GB swap (prevents OOM during Docker builds)
   - Fixed DNS resolution (configured systemd-resolved with DNSStubListener=no)
   - Stopped unused containers (n8n, vaultwarden) to free 1.3GB RAM

4. **Local Model Identity** ✅ FIXED
   - Added model name to system prompt for local LLMs
   - DeepSeek/Qwen models now correctly identify themselves
   - Added debug logging for model selection verification

### Previously Completed (2025-12-02)

1. **issue_033: Chat Input Area Redesign** ✅ COMPLETE
   - Created `ChatInputArea.tsx` component (~450 lines)
   - Claude.ai pattern: `+` attachment button, `≡` tools menu, model selector
   - Tools menu with: style selector, memory toggle, Xero connector status, settings link
   - Attachment preview area with file cards and dismiss buttons
   - Integrated into ChatPage.tsx (replaces both empty state and footer inputs)
   - Build passes, ready for visual testing

2. **issue_032: Memory Context Injection** ✅ COMPLETE
   - Agent now auto-injects knowledge graph into system prompt
   - Added `read_memory` and `search_memory` tools for explicit queries
   - "What do you know about me?" now returns stored facts
   - Commits: `97dd50e`, `a5b606e`

3. **Epic 2.3: Projects Feature** ✅ COMPLETE
   - SQLite schema: `projects` table with CRUD operations
   - REST API: `/api/projects/*` endpoints (create, read, update, delete, set-default)
   - Session filtering by `projectId` added to `/api/sessions`
   - ProjectSwitcher component in header (dropdown with create form)
   - Zustand store with localStorage persistence for current project
   - **Chat ↔ Project Integration** ✅ COMPLETE
     - Chat API accepts `projectId` parameter
     - Sessions created with project scope
     - Chat list filters by current project
     - Project switch refreshes chat list and starts new chat
   - **Project Settings Page** ✅ COMPLETE
     - Collapsible panel in Settings page
     - Inline editing (name, description)
     - Color picker (8 preset colors)
     - Set default project action
     - Delete with confirmation
   - Commits: `609c952`, `dba5499`

2. **UI/UX Design Philosophy** ✅ DOCUMENTED
   - Created `docs/UI-UX-DESIGN-PHILOSOPHY.md` with detailed guidelines
   - Added CLAUDE.md reference: "One word default, two reluctantly, never three"
   - Simplified ProjectSwitcher empty state (removed verbose copy)
   - Commits: `99353b5`

3. **Edge Cases Discovered** (issue_023)
   - Empty chat delete fails → works after message added
   - Memory not retrieved in new chats (needs investigation)
   - Documented in ISSUES.md for P1 investigation

### Previously Completed (2025-12-01)

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
   - ~~debt_003: Legacy "pip" naming~~ ✅ Resolved (migrated to pip-data/pip.db)
   - debt_004: ESLint v9 flat config migration (P3 - deferred)

5. **Infrastructure**:
   - Added `deploy/deploy.sh` for systematic deployment
   - Both containers rebuilt consistently on each deploy

### Remaining Work (Milestone 2)

1. ~~**Epic 2.1** (Memory Refactor)~~ ✅ Complete
2. ~~**Epic 2.2** (Chat History)~~ ✅ Complete
3. ~~**Response Styles** (issue_020)~~ ✅ Complete (2025-12-02)
4. ~~**Epic 2.3** (Projects)~~ ✅ Complete (2025-12-02)
5. **Epic 2.4** (Document Upload) - Medium priority, spike complete
6. ~~**Epic 2.5** (Personality)~~ 🔵 Deferred - replaced by Response Styles
7. **Epic 2.6** (Testing) - Continuous throughout milestone
8. **issue_023** (P1) - Empty chat delete + memory retrieval bugs

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
| issue_033 | - | Chat Input Area Redesign (Claude.ai Pattern) | ✅ Resolved |
| issue_023 | P1 | Empty chat delete + memory retrieval bugs | 🔴 Open |
| issue_021 | P2 | Verify Response Styles in chat | 🔴 Open |
| issue_019 | - | Safety Settings UI - explanation box placement | ✅ Resolved |
| issue_024 | P3 | DESIGN.md visual reference workflow | 🔴 Open (future) |
| issue_032 | - | Memory context injection | ✅ Resolved (deployed) |
| issue_010 | - | Mem0 SQLite crash in Docker | ✅ Resolved (switched to native) |
| issue_008 | - | Memory architecture decision | ✅ Resolved (Option B deployed) |

---

## Recent Achievements (Last 2 Weeks)

### 2025-12-01 (Evening Session)
- **Memory API Fixes**: Fixed SQL schema mismatches preventing memory saves
  - Column `observation` not `content`
  - Added `is_user_edit` and `updated_at` migrations
  - Memory UI now fully functional
- **Naming Migration Complete**: pip → pip fully resolved
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
- Full rebrand: pip → pip

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

### Immediate (Milestone 2)

1. **Fix issue_023** - P1: Empty chat delete + memory retrieval edge cases
2. **Verify issue_021** - P2: Test Response Styles in actual chat
3. **issue_034: Skills System** - P1: Report templates & agent capabilities
4. **Deploy & Test** - Visual testing of new ChatInputArea component
5. **Onboard beta users** - Share with trusted users for feedback

### Future Vision (Milestone 3+)

6. **issue_037: Intelligent Expense Separation** - Vision-stage planning complete
   - Target: Users operating from mixed personal/business accounts
   - Core question: "What can I actually spend?"
   - Requires spikes before implementation (see blueprint)
   - See: `VISION.md` "Future Direction" section

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

### Future (Milestone 3+)

7. **Intelligent Expense Separation** → issue_037 (VISION STAGE)
   - Target: Sole traders operating from mixed personal/business accounts
   - Core capability: "What can I actually spend?" answer
   - Features: Transaction categorization, tax reserving, available balance
   - Spikes required before implementation
   - Blueprint: `specs/BLUEPRINT-feature-expense-separation-20251209.yaml`

---

## References

- `PROGRESS.md` - Detailed task tracking
- `ISSUES.md` - Bug and improvement tracking
- `ARCHITECTURE.md` - System design and ADRs
- `CHANGELOG.md` - Release history
- `specs/BLUEPRINT-feature-memory-ab-testing-20251130.yaml` - A/B test spec

---

**Archive Policy**: Items older than 2 weeks move to CHANGELOG.md [Unreleased] section.
