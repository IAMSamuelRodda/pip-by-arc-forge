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

## Critical Constraints

1. **ALWAYS use `pnpm`** for package management (NOT npm or yarn)
2. **OAuth tokens in SQLite** - stored in `oauth_tokens` table
3. **Xero OAuth**: 30-min access token expiry, 60-day refresh token validity, requires `offline_access` scope
4. **HTTPS mandatory** - enforced by Caddy auto-HTTPS
5. **SQLite database** - at `/app/data/pip.db` in Docker

---

## Workflow Quick Reference

**Branch from dev, PR to dev** (NOT main). See `CONTRIBUTING.md` for details.

```bash
# Development
pnpm install
pnpm dev

# Testing
pnpm test

# VPS SSH Access
ssh root@170.64.169.203
# or via doctl: doctl compute ssh production-syd1

# VPS Deployment (run from /opt/pip on VPS)
cd /opt/pip && git pull
docker build -t pip-mcp:latest -f packages/mcp-remote-server/Dockerfile .
docker stop pip-mcp && docker rm pip-mcp
docker run -d --name pip-mcp --restart unless-stopped \
  --network droplet_frontend \
  -v zero-agent-data:/app/data \
  -e NODE_ENV=production \
  -e MCP_PORT=3001 \
  -e DATABASE_PATH=/app/data/zero-agent.db \
  -e XERO_CLIENT_ID=$XERO_CLIENT_ID \
  -e XERO_CLIENT_SECRET=$XERO_CLIENT_SECRET \
  -e JWT_SECRET=$JWT_SECRET \
  -e BASE_URL=https://mcp.pip.arcforge.au \
  pip-mcp:latest

# Check health
curl https://app.pip.arcforge.au/health
curl https://mcp.pip.arcforge.au/health
```

---

**Last Updated**: 2025-11-30
