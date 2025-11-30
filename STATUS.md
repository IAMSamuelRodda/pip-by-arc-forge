# Pip - Project Status

> **Purpose**: Current state snapshot (2-week rolling window)
> **Lifecycle**: Living (update daily/weekly during active development)

**Last Updated**: 2025-11-30 (Evening)
**Current Phase**: Memory Testing & ChatGPT Verification
**Version**: 0.3.1

---

## Quick Overview

| Aspect | Status | Notes |
|--------|--------|-------|
| **MCP Server** | 🟢 | Live at mcp.pip.arcforge.au |
| **Claude.ai** | 🟢 | Fully validated (Xero tools working) |
| **ChatGPT** | 🟡 | Needs verification with memory tools |
| **Memory Stack** | 🟡 | Deployed (Option A - mem0), needs testing |
| **Safety Guardrails** | 🟢 | Complete (tiered permissions) |
| **PWA Frontend** | 🟢 | Live at app.pip.arcforge.au |
| **Landing Page** | 🟢 | Live at pip.arcforge.au |
| **Xero Integration** | 🟢 | 10 READ-ONLY tools verified |
| **VPS Ollama** | 🟢 | Running, nomic-embed-text ready |

**Legend**: 🟢 Good | 🟡 Attention | 🔴 Critical | 🔵 In Progress

---

## Current Focus

**Objective**: Test memory tools and verify ChatGPT integration.

### Just Completed (2025-11-30 Evening)

1. **Full Deployment** ✅
   - Memory-enabled container deployed with `MEMORY_VARIANT=mem0`
   - Ollama accessible from container via `host.docker.internal`
   - Landing page live at pip.arcforge.au

2. **Claude.ai Integration Fixed** ✅
   - OAuth debounce prevents double-submit race condition
   - Session persistence (60s keep-alive after SSE close)
   - Login button UX: loading state + disabled on click
   - `user_settings` table migration added
   - **Xero tools verified working** (get_invoices tested successfully)

3. **Bug Fixes** ✅
   - OAuth double-code generation fixed
   - MCP session expiring before tool calls fixed
   - Missing database table created

### Pending Tests

- [ ] Memory tools via Claude.ai (`add_memory`, `search_memory`, etc.)
- [ ] Memory tools via ChatGPT Dev Mode
- [ ] If Option A fails: Switch to Option B (`MEMORY_VARIANT=native`)

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

## Test Plan

### Memory Tool Tests (Claude.ai) - NEXT

1. **Connect to MCP**: Settings → Connectors → mcp.pip.arcforge.au
2. **OAuth**: `pip-mcp-client` / `pip-mcp-secret-change-in-production`

| Test | Prompt | Expected |
|------|--------|----------|
| **Add memory** | "Use add_memory to remember I prefer invoices on Mondays" | Confirmation |
| **Search memory** | "Use search_memory to find my invoice preferences" | Returns Monday preference |
| **List memories** | "Use list_memories to show everything you know about me" | Shows all memories |
| **Delete memory** | "Use delete_memory to remove [memory_id]" | Confirmation |

### Memory Tool Tests (ChatGPT Dev Mode)

1. **Disconnect and reconnect** the Pip connector
2. **Explicitly request tool usage**: "Use the add_memory tool to..."

| Test | Expected (Option A - mem0) | Expected (Option B - native) |
|------|----------------------------|------------------------------|
| Tool visibility | May be limited | Full visibility |
| Memory add | May timeout | Should work |
| Memory search | May timeout | Should work |

---

## Known Issues

| ID | Priority | Summary | Status |
|----|----------|---------|--------|
| issue_008 | - | Memory architecture decision | ✅ Resolved (A/B implemented, Option A deployed) |
| issue_005 | P1 | ChatGPT memory in Dev Mode | 🟡 Testing needed |
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

## Next Steps

1. **Test memory tools** via Claude.ai
2. **Test memory tools** via ChatGPT Dev Mode
3. **If Option A fails with ChatGPT**: Deploy Option B (`MEMORY_VARIANT=native`)
4. **Document A/B comparison results**

---

## References

- `PROGRESS.md` - Detailed task tracking
- `ISSUES.md` - Bug and improvement tracking
- `ARCHITECTURE.md` - System design and ADRs
- `CHANGELOG.md` - Release history
- `specs/BLUEPRINT-feature-memory-ab-testing-20251130.yaml` - A/B test spec

---

**Archive Policy**: Items older than 2 weeks move to CHANGELOG.md [Unreleased] section.
