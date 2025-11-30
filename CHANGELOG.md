# Changelog

All notable changes to Pip are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Planned
- Mem0 Memory Stack implementation (using official `mem0ai` npm package)
- Safety Guardrails (tiered permissions for write operations)
- Landing page at pip.arcforge.au

### Added
- ChatGPT memory research and documentation (docs/CHATGPT-MEMORY-GUIDE.md)
- Google Docs integration planned (issue_006)
- Nextcloud integration planned (issue_007)

### Researched
- **spike_mem0**: Mem0 Integration Feasibility spike COMPLETE
  - Evaluated 8 integration approaches (A-H)
  - Key discovery: Official `mem0ai` npm package provides native TypeScript support
  - Decision: Use `mem0ai` with in-memory vector store + SQLite history
  - Resource impact: ~100-200MB RAM, fits 384MB VPS constraint
  - Decision document: `docs/research-notes/SPIKE-mem0-integration.md`

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
