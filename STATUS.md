# Pip - Project Status

> **Purpose**: Current state snapshot (lean, actionable)
> **Lifecycle**: Living (update as focus changes)

**Last Updated**: 2025-12-10
**Current Phase**: Milestone 2 - UX & Features (v0.4.0-dev)

---

## Quick Overview

| Aspect | Status |
|--------|--------|
| **Production** | 🟢 Live (app.pip.arcforge.au, mcp.pip.arcforge.au) |
| **Xero** | 🟢 10 tools verified |
| **Gmail** | 🟢 4 tools (Testing mode) |
| **Google Sheets** | 🟢 5 tools (Testing mode) |
| **Memory** | 🟢 Native text-based |
| **Ollama** | 🟢 5 models via Tailscale |

**Legend**: 🟢 Good | 🟡 Attention | 🔴 Critical | 🔵 In Progress

---

## Current Focus

**Milestone 2**: Epic 2.1-2.3 complete, Epic 2.4-2.6 remaining

### This Week's Priorities (from ISSUES.md)

| Priority | Issue | Summary |
|----------|-------|---------|
| P1 | issue_043 | Memory system project isolation (auto-inject projectId) |
| P1 | issue_034 | Skills System - report templates & agent capabilities |
| P2 | issue_044 | Remove global currentProjectId dependency |
| P2 | issue_036 | Collapsible thinking blocks + tool call visibility |

### Recently Completed

- **Google Sheets Integration (issue_039)** - Full OAuth + 15 MCP tools (Dec 10)
- 12 manual testing bug fixes (Dec 10) - see CHANGELOG.md
- Gmail image attachment viewing
- Projects UX rework (Claude.ai pattern)
- Per-connector permissions in Settings

---

## Deployment

| Service | URL | Container |
|---------|-----|-----------|
| Landing | https://pip.arcforge.au | - |
| PWA | https://app.pip.arcforge.au | pip-app |
| MCP | https://mcp.pip.arcforge.au | pip-mcp |

**VPS**: DigitalOcean Sydney (170.64.169.203)
**Database**: SQLite at `/app/data/pip.db`

```bash
# Quick deploy
./deploy/deploy-local.sh

# Health check
curl https://app.pip.arcforge.au/health
curl https://mcp.pip.arcforge.au/health
```

---

## Architecture Quick Facts

- **Style**: Monolithic VPS (Express + SQLite + PWA)
- **Monorepo**: `@pip/*` packages
- **Git**: Simple tier (main only, direct commits)
- **OAuth**: Tokens in `oauth_tokens` table, auto-refresh on load

See `ARCHITECTURE.md` for complete details.

---

## Milestone Progress

| Milestone | Status | Key Deliverables |
|-----------|--------|------------------|
| M0: Core Platform | ✅ Complete | Xero OAuth, MCP Server, SQLite |
| M1: MCP Distribution | ✅ Complete | Claude.ai + ChatGPT verified |
| M2: UX & Features | 🔵 In Progress | Memory, Chat History, Projects, Response Styles |
| M3+: Future | ⚪ Planned | Intelligent Expense Separation |

### M2 Epic Status

| Epic | Status | Notes |
|------|--------|-------|
| 2.1 Memory Management | ✅ | ManageMemoryModal, knowledge graph |
| 2.2 Chat History | ✅ | Sidebar, title generation |
| 2.3 Projects | ✅ | Schema, API, UX rework complete |
| 2.4 Document Upload | 🔵 | Backend wired, needs project association |
| 2.5 Personality | ⏸️ | Deferred - replaced by Response Styles |
| 2.6 Testing | 🔵 | Continuous |

---

## References

| Document | Purpose |
|----------|---------|
| `ISSUES.md` | Open bugs and improvements |
| `CHANGELOG.md` | Release history, resolved issues |
| `PROGRESS.md` | Detailed milestone/epic/task tracking |
| `ARCHITECTURE.md` | System design, database schema |
| `VISION.md` | Product direction, target persona |

---

**Archive Policy**: Historical details move to CHANGELOG.md
