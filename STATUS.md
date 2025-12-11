# Pip - Project Status

> **Purpose**: Current state snapshot (lean, actionable)
> **Lifecycle**: Living (update as focus changes)

**Last Updated**: 2025-12-11
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
| P1 | issue_034 | Skills System - report templates |
| P2 | issue_050 | Tools Dropdown Z-Index Issue |

### Recently Completed (Dec 10-11)

- **✅ Critical Path Complete: Test User Onboarding** - 4/4 tasks done, Philip ready to test
  - issue_051: MCP Transport - Streamable HTTP with SSE fallback ✅
  - issue_052: Rate limiting system (100k tokens/day beta testers) ✅
  - issue_054: PWA model selector integration (access control filtering) ✅
  - issue_055: GPU model configuration (qwen2.5:0.5b + 3b) ✅
  - issue_056: Philip beta tester onboarding (docs + account setup) ✅
  - **Production Deployment**: All changes live on app.pip.arcforge.au
  - **Model Selector UX**: Cleaned up header "Local Models", descriptions "Fast and private"
  - **VPS Networking**: Fixed Docker bridge network configuration (droplet_frontend)
  - **Documentation Sync**: Resolved issues migrated to CHANGELOG.md
- **Authorization System** - Role + Tier + Feature Flags architecture
  - UserRole, SubscriptionTier, FeatureFlag types
  - Model access control with superadmin bypass
  - GET /api/chat/models endpoint for UI
- **Technical Fixes (Dec 10-11)**
  - Docker networking: Fixed 502 errors by switching pip-app from host network to droplet_frontend bridge
  - MCP URL docs: Updated from `/sse` to root path (Streamable HTTP)
  - Client secret optional: Confirmed PKCE support in OAuth
- **Earlier Work (Dec 1-10)**
  - Remove Global projectId Dependency (issue_044)
  - Memory Project Isolation (issue_043)
  - Google Sheets Integration (issue_039)
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
