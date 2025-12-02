# Changelog

All notable changes to Pip are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Added
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
- **Naming cleanup (debt_003)**: `zero-agent` → `pip` naming convention
  - Docker volume: `zero-agent-data` → `pip-data`
  - Database: `zero-agent.db` → `pip.db`
  - Removed unused `zero-agent-network`
- **Git workflow simplified**: Moved to Simple tier (main only, direct commits)
  - Removed dev branch (merged to main)
  - Removed enforce-main-pr-source.yml workflow (not needed for Simple tier)
  - Updated all documentation for Simple tier

### Fixed
- **issue_032: Memory Context Injection** (2025-12-02)
  - Agent now auto-injects stored memory into system prompt at conversation start
  - Added `read_memory` and `search_memory` tools for explicit user queries
  - "What do you know about me?" now returns actual stored facts
  - `packages/agent-core/src/orchestrator.ts` - getMemoryContext() queries knowledge graph
  - `packages/agent-core/src/tools/memory-tools.ts` - New memory tools
- **Memory modal loading forever**: Added memory API routes to main server (was only in MCP server)
- **"no such column: project_id" error**: Added schema migration for memory tables on startup
- **"no such column: content" error**: SQL queries used `content` but schema has `observation`
- **"NOT NULL constraint: updated_at" error**: Added `updated_at` to entity and observation INSERT statements
- **"no such column: is_user_edit" error**: Added migration for `is_user_edit` column in observations
- **Database path not using pip.db**: Dockerfiles had hardcoded `zero-agent.db`, now uses `pip.db`
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
- **Full rebrand**: Renamed from "Zero Agent" to "Pip"
- All packages renamed: `@zero-agent/*` → `@pip/*`
- Repository renamed: `zero-agent` → `pip`
- VPS deployment: `/opt/zero-agent` → `/opt/pip`
- Docker container: `zero-agent` → `pip-app`, `pip-mcp`

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
- Project renamed: "Xero Agent" → "Zero Agent" (brand collision with Xero)

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
