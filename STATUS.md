# Pip - Project Status

> **Purpose**: Current state snapshot (2-week rolling window)
> **Lifecycle**: Living (update daily/weekly during active development)

**Last Updated**: 2025-11-30
**Current Phase**: Memory Stack + Safety Hardening
**Version**: 0.2.0

---

## Quick Overview

| Aspect | Status | Notes |
|--------|--------|-------|
| **MCP Server** | 🟢 | Live at mcp.pip.arcforge.au |
| **Claude.ai** | 🟢 | Fully validated |
| **ChatGPT** | 🟡 | Working, memory disabled for Plus |
| **Memory Stack** | 🟡 | Core tools done, architecture decision pending |
| **Safety Guardrails** | 🟢 | Complete (all tasks done) |
| **PWA Frontend** | 🟢 | Live at app.pip.arcforge.au |
| **Xero Integration** | 🟢 | 10 READ-ONLY tools |

**Legend**: 🟢 Good | 🟡 Attention | 🔴 Critical | 🔵 In Progress

---

## Current Focus

**Objective**: Implement Mem0 memory layer, then harden for write operations.

### This Week

1. **Memory Architecture Decision** (issue_008) - BLOCKING
   - Option A: Keep mem0 + Claude LLM + Ollama embeddings (~$0.001/req)
   - Option B: MCP-native Memento-style ($0, ChatGPT memory works)
   - See ISSUES.md for decision criteria

2. **Safety Guardrails** - ✅ COMPLETE (core implementation)
   - Tiered permission model implemented
   - Database tables: `user_settings`, `operation_snapshots`
   - Permission checks enforced at tool execution
   - Dynamic tool visibility based on permission level
   - Settings UI pending for future phase

### Blocked Items

- Memory injection, ChatGPT import, Memory UI → waiting on architecture decision

---

## Deployment Status

| Service | URL | Health |
|---------|-----|--------|
| PWA | https://app.pip.arcforge.au | 🟢 |
| MCP Server | https://mcp.pip.arcforge.au | 🟢 |
| Landing Page | https://pip.arcforge.au | ⚪ Pending |

**VPS**: DigitalOcean Sydney (170.64.169.203)
**Containers**: pip-app (384MB), pip-mcp (256MB)

---

## Known Issues

See **ISSUES.md** for full details.

| ID | Priority | Summary |
|----|----------|---------|
| issue_008 | P1 | Memory architecture decision (BLOCKING) |
| issue_004 | P2 | Safety guardrails - settings UI pending |
| issue_005 | P1 | ChatGPT memory disabled in Dev Mode |
| issue_000 | P1 | Business context layer completion |

**Counts**: 0 Critical | 1 High (blocking) | 3 Medium | 3 Low

---

## Recent Achievements (Last 2 Weeks)

### 2025-11-30
- Mem0 memory tools implemented (5 tools: add, search, list, delete, clear_all)
- spike_mem0 COMPLETE - discovered official `mem0ai` npm package
- Memory architecture research complete (Options A vs B documented)

### 2025-11-29
- Safety architecture designed (`specs/SAFETY-ARCHITECTURE.md`)
- ChatGPT integration validated (zero code changes needed)
- Xero tools audit complete (10 tools hardened)
- Full rebrand: zero-agent → pip
- OAuth security hardening + sign-up flow

### 2025-11-28
- User authentication with invite codes
- Business context layer (document upload)
- Demo completed with dental practice owner

---

## Next Steps

1. **Decide memory architecture** (issue_008) - this week
2. **Complete memory stack** based on decision
3. **Implement safety guardrails** before any write ops
4. **Create landing page** (pip.arcforge.au)

---

## References

- `PROGRESS.md` - Detailed task tracking (milestones, epics, features)
- `ISSUES.md` - Bug and improvement tracking
- `ARCHITECTURE.md` - System design and ADRs
- `CHANGELOG.md` - Release history

---

**Archive Policy**: Items older than 2 weeks move to CHANGELOG.md [Unreleased] section.
