# Pip - CLAUDE.md

> **Purpose**: Minimal navigation hub for AI agents (pointers to detailed documentation)
> **Lifecycle**: Living (target: ~100 lines max)

## Critical Documents

**Before starting work:**
1. `STATUS.md` - Current issues, active work, blockers
2. `ARCHITECTURE.md` - System design, database schema, tech stack
3. `CONTRIBUTING.md` - Progress tracking workflow

**Before finishing work:**
1. Update `STATUS.md` - Document investigation notes
2. Resolve issues - Remove from `ISSUES.md`, add to `CHANGELOG.md`
3. Check `DEVELOPMENT.md` - Run pre-commit checklist

---

## Architecture Quick Facts

**Style**: Monolithic VPS architecture (Express + SQLite + PWA)

**Structure**: Monorepo with packages (`@pip/*`)

**Live**:
- Main App: https://app.pip.arcforge.au
- MCP Server: https://mcp.pip.arcforge.au

See `ARCHITECTURE.md` for complete details.

---

## Naming Conventions

- **Packages**: kebab-case with `@pip/` prefix (`@pip/core`, `@pip/server`)
- **Files**: kebab-case for modules, PascalCase for React components
- **Functions**: camelCase for functions, PascalCase for React components
- **MCP Tools**: snake_case (`create_invoice`, `get_bank_transactions`)

---

## UI/UX Philosophy

**One word by default, two words reluctantly, never three.** Rely on context and placement for meaning; avoid verbose labels and explanatory empty states. See `UI-UX-DESIGN-PHILOSOPHY.md` for detailed guidelines.

---

## Critical Constraints

1. **ALWAYS use `pnpm`** for package management (NOT npm or yarn)
2. **OAuth tokens in SQLite** - stored in `oauth_tokens` table
3. **Xero OAuth**: 30-min access token expiry, 60-day refresh token validity, requires `offline_access` scope
4. **HTTPS mandatory** - enforced by Caddy auto-HTTPS
5. **SQLite database** - at `/app/data/pip.db` in Docker (volume: `pip-data`)

---

## Workflow Quick Reference

**Work on `main`. Commit directly.** Simple tier for fast prototyping.

```bash
# Development
pnpm install
pnpm dev

# Build (pre-commit check)
pnpm build

# Deploy to VPS (with pre-flight checks)
./deploy/deploy-local.sh

# Quick health check
curl https://app.pip.arcforge.au/health
curl https://mcp.pip.arcforge.au/health
```

**Containers**: `pip-app` (main server + PWA), `pip-mcp` (MCP server)

---

**Last Updated**: 2025-12-02
