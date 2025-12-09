# Plan: Rename mcp-remote-server → pip-mcp

## Goal

Establish `pip-mcp` as THE portable MCP server for Pip, proving the "plug pip anywhere MCP works" thesis. This server should work seamlessly with:
- **Claude.ai** (current - SSE transport with OAuth)
- **ChatGPT** (current - SSE transport with OAuth)
- **Claude Code** (new - stdio transport for local use)

## Current State Analysis

### Two MCP Packages Exist

| Package | Tools | Transport | Auth | Status |
|---------|-------|-----------|------|--------|
| `mcp-remote-server` | Xero, Gmail, Memory | SSE | OAuth/JWT | **Active, deployed** |
| `mcp-xero-server` | Xero only | stdio | AWS Secrets Manager | **Incomplete, unused** |

### Key Observations

1. `mcp-remote-server` is MORE complete (Gmail, Memory tools)
2. `mcp-remote-server` already calls itself `pip-mcp-server` internally (line 319)
3. `mcp-xero-server` was designed for AWS Lambda but never deployed
4. Docker images already use `pip-mcp` naming: `ghcr.io/iamsamuelrodda/pip-mcp:latest`

## Proposed Approach

**Rename `mcp-remote-server` → `pip-mcp`** and add stdio transport support.

Archive `mcp-xero-server` (don't delete - keep for reference but remove from active packages).

### Why This Approach?

1. **Single source of truth** - One MCP server with all tools
2. **No code duplication** - Tool implementations in one place
3. **Validates portability** - Same server, multiple transports
4. **Less migration work** - remote-server is already more complete

## Implementation Steps

### Phase 1: Package Rename

1. **Rename package directory**
   ```bash
   mv packages/mcp-remote-server packages/pip-mcp
   ```

2. **Update package.json**
   - Change `@pip/mcp-remote-server` → `@pip/pip-mcp`
   - Update description to reflect multi-transport capability

3. **Update pnpm-workspace.yaml** (if needed)

4. **Update all imports** - grep for `mcp-remote-server` references:
   - `pnpm-lock.yaml` (auto-regenerates)
   - `PROGRESS.md`, `ISSUES.md` documentation references
   - Docker compose files
   - Dockerfile paths

5. **Update docker-compose.vps-integration.yml**
   - Change Dockerfile path reference

### Phase 2: Add stdio Transport Support

1. **Create transport abstraction** (`src/transports/index.ts`)
   - Factory function: `createTransport(type: 'stdio' | 'sse')`
   - Share MCP server creation logic

2. **Add CLI argument parsing**
   ```typescript
   // Support: node pip-mcp --transport=stdio
   // Default: SSE (for backward compatibility)
   ```

3. **Local auth mode** for stdio transport
   - When running locally, can read tokens from SQLite directly
   - No OAuth dance needed for local Claude Code use

### Phase 3: Archive mcp-xero-server

1. **Move to archive**
   ```bash
   mkdir -p packages/_archived
   mv packages/mcp-xero-server packages/_archived/
   ```

2. **Update .gitignore** to exclude from pnpm workspace (optional)

3. **Document rationale** in `packages/_archived/README.md`

### Phase 4: Build & Deploy

1. **Test local build**
   ```bash
   pnpm build
   ```

2. **Test stdio transport locally**
   ```bash
   node packages/pip-mcp/dist/index.js --transport=stdio
   ```

3. **Update Docker images**
   - Rebuild `ghcr.io/iamsamuelrodda/pip-mcp:latest`

4. **Deploy to VPS**
   ```bash
   ./deploy/deploy.sh
   ```

### Phase 5: Claude Code Integration

1. **Add to Claude Code MCP config** (`~/.claude.json`)
   ```json
   "pip-mcp": {
     "type": "stdio",
     "command": "node",
     "args": ["/path/to/pip-mcp/dist/index.js", "--transport=stdio"]
   }
   ```

2. **Test with Claude Code**
   - Verify tools appear in Claude Code
   - Test Xero, Gmail, Memory tools work

## Files to Modify

### Core Changes
- `packages/mcp-remote-server/` → `packages/pip-mcp/`
- `packages/pip-mcp/package.json` (rename)
- `packages/pip-mcp/src/index.ts` (add stdio support)

### Documentation Updates
- `PROGRESS.md` - update references
- `ISSUES.md` - update component references
- `README.md` - add Claude Code section
- `ARCHITECTURE.md` - update package list

### Build/Deploy Updates
- `packages/pip-mcp/Dockerfile` (rename internally)
- `deploy/docker-compose.vps-integration.yml`
- `pnpm-lock.yaml` (regenerated)

## Success Criteria

1. ✅ Package renamed to `@pip/pip-mcp`
2. ✅ stdio transport works for Claude Code
3. ✅ SSE transport continues working for claude.ai/ChatGPT
4. ✅ All existing tests pass
5. ✅ Docker deployment successful
6. ✅ Claude Code can call pip tools locally

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Breaking claude.ai integration | Test SSE transport before deploying |
| Import path breaks | Grep all references, update systematically |
| Docker build fails | Test locally before pushing images |

## Estimated Complexity

Medium - mostly file renaming and adding transport abstraction. No fundamental architecture changes.

---

**Author**: Claude Code planning session
**Date**: 2025-12-04
