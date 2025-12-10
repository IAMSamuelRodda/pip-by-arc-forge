# Changelog

All notable changes to Pip are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

> **Last Updated**: 2025-12-10 (Manual testing bug fixes + resolved issues migration from ISSUES.md)

### Added
- **Google Sheets Integration (issue_039)** - Full OAuth + MCP tools (2025-12-09)
  - OAuth flow: `/connectors/sheets`, `/connectors/sheets/callback`, `/connectors/sheets/disconnect`
  - Service: `getSheetsClient()` with auto-refresh, all API helpers
  - 15 MCP tools: 5 read-only (L0), 6 write/create (L1), 4 delete (L2)
  - Per-connector permissions in safety.ts
  - Connectors page shows Google Sheets with Connect/Disconnect
  - `packages/pip-mcp/src/services/sheets.ts` - Sheets service
  - `packages/pip-mcp/src/handlers/sheets-tools.ts` - MCP tool definitions
  - `packages/pip-mcp/src/index.ts:1576-1707` - OAuth routes
- **Response Styles (Claude.ai Pattern)** - issue_020 (2025-12-02)
  - Five styles: Normal, Formal, Concise, Explanatory, Learning
  - Style selector dropdown in Settings page
  - Style prompt injection into agent orchestrator
  - Replaces Personality feature (Epic 2.5) with simpler, user-controlled approach
  - `packages/core/src/styles/index.ts` - Style definitions with prompt modifiers
- **Deployment script**: `deploy/deploy.sh` for systematic deployment of all containers
- **Migration checklist**: DEVELOPMENT.md now includes database migration procedures and lessons learned
- **Epic 2.1: Memory Management UI** (2025-12-01)
  - ManageMemoryModal component (Settings → Manage memory)
  - User edit tracking (is_user_edit column in observations)
  - Memory summaries table for cached LLM-generated summaries
  - REST API: GET /api/memory, POST /api/memory/edit, GET/DELETE /api/memory/edits
  - Inline input: "Tell Pip what to remember or forget..."
- **Epic 2.2: Chat History** (2025-12-01)
  - ChatSidebar component (collapsible, Claude.ai Pattern 0)
  - Sessions schema extended (title, preview_text columns)
  - Chat title auto-generation from first user message (~50 chars)
  - API endpoints: GET/PATCH/DELETE /api/sessions/:id
  - Zustand state management for chat list
  - Relative timestamps ("2m ago", "1h ago", etc.)
- **Landing page**: pip.arcforge.au with demo chat UI, features, and pricing sections
- **Personality system**: Adelaide and Pippin character profiles with switchable voices
- **Character voice infrastructure**: `buildPersonalityPrompt()` for system prompt injection
- **Native memory implementation**: Option B with text-based search (replaced mem0)
- **Memory tools**: 5 MCP tools (add_memory, search_memory, list_memories, delete_memory, delete_all_memories)
- **ChatGPT support**: Full connector integration with meta-tool pattern
- **ChatGPT memory guide**: docs/CHATGPT-MEMORY-GUIDE.md (export/import instructions)
- **Repository renamed**: `pip` → `pip-by-arc-forge` (GitHub + local)

### Changed
- **Naming cleanup (debt_003)**: `pip` → `pip` naming convention
  - Docker volume: `pip-data` → `pip-data`
  - Database: `pip.db` → `pip.db`
  - Removed unused `pip-network`
- **Git workflow simplified**: Moved to Simple tier (main only, direct commits)
  - Removed dev branch (merged to main)
  - Removed enforce-main-pr-source.yml workflow (not needed for Simple tier)
  - Updated all documentation for Simple tier

### Fixed
- **Manual Testing Bug Fixes (12 issues)** (2025-12-10)

  **P0 Critical Fixes:**
  - **issue_041: Project Instructions Not Injecting into AI System Prompt**
    - System prompt now includes custom instructions when chatting within a project
    - Added project data fetch in orchestrator when projectId present
    - Injected instructions into buildSystemPrompt with "MUST follow" emphasis
    - `packages/agent-core/src/orchestrator.ts:164-169, 410-413` - Fetch and inject logic
    - Commit: `6a35aad`

  - **issue_043: Upload File Button Non-Functional**
    - File picker dialog now opens when clicking "Upload File" button
    - Implemented file upload to `/api/documents/upload` endpoint
    - Added progress states (uploading indicator) and error handling
    - `packages/pwa-app/src/components/ProjectDetailSidebar.tsx:96-143, 231-247` - File upload implementation
    - Commit: `f17b089`

  **P1 High Priority Fixes:**
  - **issue_046: Project Picker Missing Search Functionality**
    - Added search input (appears when >3 projects) with live filtering
    - Client-side filtering using useMemo for performance
    - Auto-focus search for quick keyboard access
    - `packages/pwa-app/src/components/ProjectPicker.tsx:39-44, 69, 72-87, 127-143` - Search implementation
    - Commit: `0c35fae`

  - **issue_047: Project Picker Design Too Spacious**
    - Removed project descriptions for cleaner, more scannable list
    - Reduced vertical padding from py-2.5 to py-2
    - Simplified to icon + name + checkmark pattern
    - `packages/pwa-app/src/components/ProjectPicker.tsx:174-188` - Condensed design
    - Commit: `0c35fae`

  - **issue_044: Sidebar Flashing on Navigation**
    - Loading state now only shows if chatList is empty (first load)
    - Uses cached data during background refresh to prevent flash
    - `packages/pwa-app/src/store/chatStore.ts:134-152` - Conditional loading logic
    - Commit: `979d280`

  - **issue_048: Tools Dropdown Opens Off-Screen**
    - Added viewport detection to open upward when near bottom of page
    - Increased width from w-48 to w-64 for longer tool names
    - Added scroll support with max-h-[400px]
    - Removed Xero connector status from tools menu
    - `packages/pwa-app/src/components/ChatInputArea.tsx:169-190` - Viewport detection
    - Commit: `70b1272`

  **P2 Polish Fixes:**
  - **issue_045: Breadcrumb Not Interactive**
    - Project name in breadcrumb now clickable (links to project detail)
    - Added chevron separator icon between project and chat title
    - Proper hover states for link
    - `packages/pwa-app/src/components/ChatHeader.tsx:13-34, 58-92` - Breadcrumb implementation
    - `packages/pwa-app/src/pages/ChatPage.tsx:96-100, 186-197` - Pass projectId to header
    - Commits: `69e6d0e`, `aa5cd41`

  - **issue_049: Sidebar Icons Too Dark**
    - Changed from text-arc-text-secondary (grey) to text-arc-accent/70 (green tint)
    - Applied to Chats, Projects, Bookmarked, Recents icons
    - `packages/pwa-app/src/components/ChatSidebar.tsx:236-280` - Icon color updates
    - Commit: `52d2208`

  - **Sidebar Hover Effect Wrong Direction**
    - Changed from bg-arc-bg-tertiary (lighter) to bg-arc-bg-secondary (darker)
    - Provides proper visual feedback on hover
    - `packages/pwa-app/src/components/ChatSidebar.tsx` - Hover state correction
    - Commit: `7853301`

  - **Xero Removed from Tools Dropdown**
    - Removed Xero connector status section (lines 207-216 deleted)
    - Cleaner tools menu focused on response styles
    - Commit: `70b1272`

  **Additional Fixes:**
  - **File Upload Backend TypeScript Interface**
    - Added business context methods to DatabaseProvider interface
    - Removed `(db as any)` type casts throughout documents.ts
    - Proper typing for createBusinessContext, getBusinessContext, deleteBusinessContext, listBusinessDocuments
    - `packages/core/src/database/types.ts:491-518` - Interface declarations
    - `packages/server/src/routes/documents.ts:159-254` - Proper typed calls
    - Commit: `6b0df2a`

  - **Right Sidebar Icons All Black**
    - Applied text-arc-accent/70 to Memory, Instructions, Files icons
    - Matches left sidebar visual language
    - `packages/pwa-app/src/components/ProjectDetailSidebar.tsx:154-218` - Icon brightening
    - Commit: `36b1e8f`

  **Known Issue Documented:**
  - **issue_050: Tools Dropdown Z-Index Issue** (P3 - Low Priority)
    - Dropdown appears under sticky header when opening upward
    - Attempted z-index fix (z-20 → z-50) didn't resolve
    - Same issue exists in Claude.ai - likely requires React portal
    - Documented in ISSUES.md as low priority known issue
    - `packages/pwa-app/src/components/ChatInputArea.tsx:185-190` - Z-index attempt
    - Commits: `4a30788`, `b6bba1e`
- **issue_032: Memory Context Injection** (2025-12-02)
  - Agent now auto-injects stored memory into system prompt at conversation start
  - Added `read_memory` and `search_memory` tools for explicit user queries
  - "What do you know about me?" now returns actual stored facts
  - `packages/agent-core/src/orchestrator.ts` - getMemoryContext() queries knowledge graph
  - `packages/agent-core/src/tools/memory-tools.ts` - New memory tools
- **issue_019: Safety Settings explanation placement** (2025-12-02)
  - Moved explanation from bottom of page to directly under Safety Settings
  - Changed from card styling to inline helper text (smaller, muted)
  - No longer looks clickable
- **Memory modal loading forever**: Added memory API routes to main server (was only in MCP server)
- **"no such column: project_id" error**: Added schema migration for memory tables on startup
- **"no such column: content" error**: SQL queries used `content` but schema has `observation`
- **"NOT NULL constraint: updated_at" error**: Added `updated_at` to entity and observation INSERT statements
- **"no such column: is_user_edit" error**: Added migration for `is_user_edit` column in observations
- **Database path not using pip.db**: Dockerfiles had hardcoded `pip.db`, now uses `pip.db`
- **Deploy script not loading secrets**: Added `.env` sourcing to `deploy/deploy.sh`
- **Backup script using old naming**: Updated to `pip` naming with 14-day retention
- **Login/signup icons inconsistent**: Changed from rounded square to circular design matching favicon
- **issue_010: Mem0 SQLite crash**: Switched to native memory (mem0ai has internal SQLite bug in Docker/Alpine)
- **issue_010: Alpine glibc crash**: Removed @xenova/transformers (onnxruntime requires glibc, Alpine uses musl)
- **OAuth double-submit bug**: Added debounce protection to prevent race conditions
- **MCP session expiring**: Sessions now kept alive for 60 seconds after SSE close
- **Missing user_settings table**: Added migration to sqlite.ts
- **Login button UX**: Added loading state ("Sign In" → "Signing In...") with disabled state
- **Login page UI**: Centered text, removed amateur emoji
- **getAllMemories bug**: Fixed method calling wrong function

### Resolved Issues (Migrated from ISSUES.md)

**Key Architectural Decisions & Pivots:**

- **issue_008: Memory Architecture Decision** (2025-11-30)
  - **Decision**: Chose Option B (native memory) over Option A (mem0)
  - **Why**: mem0ai has unfixable SQLite bug in Docker/Alpine, requires glibc (Alpine uses musl)
  - **Trade-off**: Text-based search instead of semantic search for MVP
  - **Pattern**: Always validate third-party libraries work in target deployment environment
  - Implementation: `packages/pip-mcp/src/services/memory-native.ts`

- **issue_042: Cross-Project Chat Leakage** (2025-12-10)
  - **Root Cause**: Global `currentProjectId` state with localStorage persistence caused stale context
  - **Learning**: Persisted state can create subtle bugs across page refreshes
  - **Fix**: Added useEffect to sync URL param → global state on page entry
  - **Pattern**: Avoid global state for context that should derive from URL routing
  - Files: `ProjectDetailPage.tsx`, `projectStore.ts`

**UX Pattern Implementations (Claude.ai Reference):**

- **issue_025: Header Cleanup + Claude.ai Layout Pattern** (2025-12-02)
  - Removed redundant project switcher from header (belongs in sidebar)
  - Cleaner single-focus header following Claude.ai minimalism
  - Pattern: One primary action per UI region

- **issue_033: Chat Input Area Redesign** (2025-12-02)
  - Implemented `+` attachment button, `≡` tools menu, model selector
  - Tools menu with style selector, memory toggle, settings link
  - Attachment preview area with file cards and dismiss buttons
  - Pattern: Progressive disclosure - advanced features in dropdown menus
  - Component: `ChatInputArea.tsx` (~450 lines)

**Data Integrity & Safety:**

- **issue_031: Memory Query Schema Mismatch** (2025-12-03)
  - SQLite schema used `observation` column but queries used `content`
  - Added missing `is_user_edit`, `updated_at` columns
  - **Learning**: Schema migrations must be tested against actual queries
  - **Pattern**: Always add database migrations when schema evolves

- **issue_004: Safety Guardrails for Write Operations** (2025-11-29)
  - Implemented tiered permission system (Level 0-3)
  - Level 0: Read-only (default), Level 1: Create drafts, Level 2: Approve/update, Level 3: Delete/void
  - All write operations require explicit user permission level
  - Pattern: Default to most restrictive permissions, require opt-in for privileged operations

**Edge Cases & Bug Fixes:**

- **issue_023: Edge Cases - Empty Chat + Memory Retrieval** (2025-12-02)
  - Empty chat delete failed (worked after message added)
  - Memory not retrieved in new chats
  - Fix: Added proper state handling for empty sessions

- **issue_029: MCP Auth Flow - Missing OAuth Env Vars** (2025-12-03)
  - Server failed to start when `XERO_CLIENT_ID` missing (lazy-loading MCP broke gracefully)
  - Fix: Added validation and helpful error messages for missing OAuth credentials
  - Pattern: Fail fast with actionable error messages during startup

**Technical Debt Cleanup:**

- **debt_003: Legacy "pip" Naming Convention** (2025-12-01)
  - Migrated: `pip-data` → `pip-data`, `pip.db` → `pip.db`
  - Updated all Dockerfiles, deploy scripts, backup scripts
  - Pattern: Complete renames in single session to avoid mixed naming

- **debt_002: Legacy GitHub Issues Cleanup** (2025-11-29)
  - Removed 47 stale issues from GitHub created during initial planning
  - Pattern: Clean up speculative work artifacts after pivots

### Verified
- **Claude.ai Memory tools**: add_memory + search_memory working (80% relevance)
- **ChatGPT Memory tools**: add_memory + search_memory working (80% relevance)
- **Claude.ai Xero tools**: All 10 tools working (get_invoices tested successfully)
- **ChatGPT Xero tools**: All 10 tools working via execute_tool
- **Full deployment**: All three services healthy (pip.arcforge.au, app.pip.arcforge.au, mcp.pip.arcforge.au)

### Technical Decisions
- **Memory architecture**: Option B (native) selected over Option A (mem0)
  - mem0ai has unfixable SQLite bug in Docker/Alpine environments
  - @xenova/transformers requires glibc (Alpine uses musl)
  - Text-based search acceptable for MVP (semantic search deferred)
- **Architecture direction adopted**:
  - USE: Native memory (SQLite) + Lazy-MCP (tools)
  - SKIP: mem0 (Docker incompatible), LangChain (obsolete)
  - DEFER: Semantic search (requires Debian Docker image)

### Planned
- Google Docs integration (issue_006)
- Nextcloud integration (issue_007)
- Semantic search (if needed, switch to Debian-based Docker)

---

## [0.2.0] - 2025-11-29

### Added
- **MCP Remote Server**: New `packages/mcp-remote-server` for Claude.ai and ChatGPT distribution
- **Lazy-loading pattern**: 2 meta-tools reduce context by 85% (2000 → 300 tokens)
- **OAuth 2.0 authentication**: Authorization Code flow for MCP clients
- **Token URL login**: /login generates personal connection URLs for Claude.ai
- **JWT authentication**: 30-day tokens for MCP sessions
- **Domain structure**: app.pip.arcforge.au (PWA), mcp.pip.arcforge.au (MCP)

### Fixed
- **issue_bug_001**: [P0 SECURITY] Removed insecure /login endpoint that allowed user impersonation
- **issue_bug_002**: Claude.ai OAuth integration now working with proper discovery endpoint
- **issue_fixed_003**: Aged receivables/payables tools now correctly find unpaid invoices (Xero API `where` clause was unreliable)
- **issue_fixed_004**: Full Xero tools audit - all 10 tools reviewed, added fallback filters for reliability

### Changed
- **Full rebrand**: Renamed from "Pip" to "Pip"
- All packages renamed: `@pip/*` → `@pip/*`
- Repository renamed: `pip` → `pip`
- VPS deployment: `/opt/pip` → `/opt/pip`
- Docker container: `pip` → `pip-app`, `pip-mcp`

### Documented
- MCP Authentication Flow in ARCHITECTURE.md
- CONTRIBUTING.md workflow guide
- Organized docs/ folder (archived outdated files)
- Prioritized Claude.ai integration over ChatGPT

---

## [0.1.0] - 2025-11-28

### Added
- **User authentication**: Email/password with invite codes for beta
- **Per-user data isolation**: Sessions, documents, Xero scoped to users
- **Admin CLI**: `pnpm admin` for invite code management
- **Business Context Layer**: Document upload, parsing, context injection
- **Document parsing**: PDF, TXT, MD, DOCX support (pdf-parse, mammoth)
- **Arc Forge dark theme**: Applied to PWA

### Fixed
- OAuth callback hang (service worker intercepting /auth/callback)
- Invoice tool: clarified AUTHORISED = unpaid, added isOverdue
- P&L and Balance Sheet tools: correct Xero report parsing

### Changed
- Loading indicator shows elapsed time ("Pip is thinking... (Xs)")
- Enhanced system prompt with structured response format
- Markdown rendering for assistant messages (react-markdown)

---

## [0.0.2] - 2025-11-27

### Added
- **VPS deployment**: DigitalOcean Sydney (production-syd1)
- **Express server**: `packages/server` with API routes
- **PWA frontend**: React chat interface with Vite
- **Xero OAuth**: Token storage in SQLite, automatic refresh
- **SQLite database**: Daily backups at 3am UTC
- **Docker**: Multi-stage build with Caddy reverse proxy

### Fixed
- **issue_fixed_001**: Connect to Xero button now navigates properly (changed from `<a href>` to `window.location.href`)
- **issue_fixed_002**: [P0] Docker network connectivity resolved (added `droplet_frontend` external network)

### Changed
- **Architecture pivot**: AWS Lambda → VPS monolith
- Cost reduced: ~$120/month → $0/month (shared droplet)
- Simplified: 40+ AWS resources → 1 Docker container

### Removed
- AWS infrastructure (Lambda, API Gateway, DynamoDB, Cognito)
- Terraform configuration
- Lambda function wrappers

---

## [0.0.1] - 2025-11-17

### Added
- **LLM abstraction**: Provider-agnostic (Anthropic + Ollama)
- **Database abstraction**: SQLite (default), DynamoDB (available)
- **Agent orchestrator**: Native Claude tool calling
- **Xero tools**: Organization, invoices, contacts, reports (10 tools)
- **CLI chat**: `pnpm chat` for local testing
- **Open source pivot**: MIT license

### Changed
- Project renamed: "Xero Agent" → "Pip" (brand collision with Xero)

---

## [0.0.0] - 2025-11-12

### Added
- Documentation foundation (7 core documents)
- Architecture planning (AWS serverless design)
- Technology stack selection
- Database schema (DynamoDB single-table)
- Security model planning
- ADRs for major decisions

---

## Version Summary

| Version | Date | Highlights |
|---------|------|------------|
| 0.2.0 | 2025-11-29 | Pip rebrand, MCP server, Claude.ai support |
| 0.1.0 | 2025-11-28 | User auth, business context, dark theme |
| 0.0.2 | 2025-11-27 | VPS deployment, AWS → monolith migration |
| 0.0.1 | 2025-11-17 | LLM/DB abstraction, agent foundation |
| 0.0.0 | 2025-11-12 | Project initialization, documentation |

---

## Versioning Policy

- **MAJOR** (X.0.0): Breaking changes, API incompatibility
- **MINOR** (0.X.0): New features (backwards compatible)
- **PATCH** (0.0.X): Bug fixes, documentation

**Current stage**: Pre-1.0 (rapid iteration)

**1.0.0 criteria**:
- Claude.ai and ChatGPT integrations validated
- 25 beta users active
- Core features stable

---

[Unreleased]: https://github.com/IAMSamuelRodda/pip-by-arc-forge/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/IAMSamuelRodda/pip-by-arc-forge/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/IAMSamuelRodda/pip-by-arc-forge/compare/v0.0.2...v0.1.0
[0.0.2]: https://github.com/IAMSamuelRodda/pip-by-arc-forge/compare/v0.0.1...v0.0.2
[0.0.1]: https://github.com/IAMSamuelRodda/pip-by-arc-forge/compare/v0.0.0...v0.0.1
[0.0.0]: https://github.com/IAMSamuelRodda/pip-by-arc-forge/releases/tag/v0.0.0
