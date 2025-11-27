# MCP Distribution Research

**Created**: 2025-11-27
**Priority**: HIGH
**Status**: Research Required

---

## Objective

Make Zero Agent available as an MCP (Model Context Protocol) server so it can be used by:
- Claude Code users (direct integration)
- Other MCP-compatible AI assistants
- Any application implementing the MCP client standard

This is a **distribution play**—instead of only offering a web UI, users can access Zero Agent's Xero capabilities through their preferred AI interface.

---

## Research Questions

### 1. Architecture
- [ ] How does current zero-agent architecture map to MCP server model?
- [ ] Can we expose existing Xero tools directly as MCP tools?
- [ ] What's the authentication flow for Xero OAuth through MCP?
- [ ] How do we handle multi-tenant (multiple Xero orgs) in MCP context?

### 2. Existing Work
- [ ] Review `packages/mcp-xero-server` (if exists) - what's already built?
- [ ] What MCP tools are already defined?
- [ ] Gap analysis: what's missing for full functionality?

### 3. Distribution
- [ ] How do users install/configure an MCP server?
- [ ] Can we publish to an MCP registry/marketplace?
- [ ] What's the onboarding flow for a new user?

### 4. OAuth Challenge
- [ ] MCP servers typically run locally—how does Xero OAuth callback work?
- [ ] Options: local server with ngrok, hosted auth proxy, or device flow?
- [ ] Security implications of each approach

### 5. Token Costs
- [ ] If MCP server runs locally, who pays for LLM tokens?
- [ ] BYOK (Bring Your Own Key) model vs hosted inference?
- [ ] Can we offer both? (self-hosted = free, managed = paid)

---

## Prior Art to Research

- [ ] Existing Xero MCP servers (are there any?)
- [ ] Financial/accounting MCP servers (patterns to learn from)
- [ ] OAuth-based MCP servers (how do they handle auth?)
- [ ] MCP servers with external API dependencies

---

## Success Criteria

A user should be able to:
1. Install zero-agent MCP server (`npm install -g zero-agent-mcp` or similar)
2. Configure with their Xero credentials
3. Use from Claude Code: "What invoices are overdue?" → gets real data

---

## Next Actions

1. Deep research spike on MCP server architecture
2. Review existing mcp-xero-server package
3. Prototype minimal MCP server with 1-2 Xero tools
4. Test OAuth flow in MCP context
5. Document findings and recommend path forward

---

## Related Documents

- `VISION.md` - Open source philosophy (supports MCP distribution)
- `ARCHITECTURE.md` - Current system design
- `STATUS.md` - Distribution strategy table
