# Pip - Project Status

> **Purpose**: Current work, active bugs, and recent changes (2-week rolling window)
> **Lifecycle**: Living (update daily/weekly during active development)

**Last Updated**: 2025-11-29
**Current Phase**: MCP Integration Validation
**Version**: 0.2.0
**Infrastructure**: DigitalOcean VPS (shared with do-vps-prod services)

---

## Current Focus

### Phase: MCP Remote Server Integration

**Objective**: Validate Pip works seamlessly inside Claude.ai, then ChatGPT.

**Priority Order**:
1. **Claude.ai Integration** - Validate MCP server works with Claude Pro/Max/Team
2. **ChatGPT App Integration** - Once Claude works, adapt for ChatGPT Apps SDK
3. **Landing Page** - Create pip.arcforge.au to explain both options

**Why this order**: Claude.ai has mature MCP support. ChatGPT Apps SDK is newer and in preview.

### Integration Checklist

#### Claude.ai Integration (Priority 1)
| Task | Status | Notes |
|------|--------|-------|
| MCP server deployed | ✅ Done | https://mcp.pip.arcforge.au |
| SSE endpoint working | ✅ Done | /sse with lazy-loading |
| OAuth 2.0 flow | ✅ Done | Authorization Code flow with PKCE |
| OAuth discovery endpoint | ✅ Done | /.well-known/oauth-authorization-server |
| Sign In + Sign Up page | ✅ Done | Tabbed UI with invite code validation |
| Password verification | ✅ Done | bcrypt against database |
| Unified Xero OAuth | ✅ Done | Redirects to Xero if not connected |
| Test with Claude.ai | ✅ Done | Full OAuth flow verified working |
| Xero tools via Claude | ✅ Done | All 10 tools audited and working |
| Document connection flow | ⚪ Pending | User guide for Claude.ai setup |

#### ChatGPT Integration (Priority 2)
| Task | Status | Notes |
|------|--------|-------|
| Research Apps SDK | ✅ Done | Uses same MCP standard |
| Adapt MCP server | ⚪ Pending | May need minor changes |
| Test in developer mode | ⚪ Pending | After Claude.ai validated |
| Directory submission | ⚪ Future | When SDK is stable |

---

## Quick Overview

| Aspect | Status | Notes |
|--------|--------|-------|
| **MCP Server** | 🟢 | Deployed at mcp.pip.arcforge.au |
| **Claude.ai Integration** | 🟢 | Fully validated and working |
| **ChatGPT Integration** | ⚪ | Pending (next priority) |
| PWA Frontend | 🟢 | Live at app.pip.arcforge.au |
| Xero Integration | 🟢 | OAuth + 10 tools audited and working |
| User Auth | 🟢 | Email/password + invite codes |
| Business Context | 🟢 | Document upload + context injection |

**Status Guide:** 🟢 Good | 🟡 Attention | 🔴 Critical | 🔵 In Progress | ⚪ Not Started

---

## Deployment Status

### Production Services

| Service | URL | Status |
|---------|-----|--------|
| Main App (PWA) | https://app.pip.arcforge.au | 🟢 Live |
| MCP Server | https://mcp.pip.arcforge.au | 🟢 Live |
| Landing Page | https://pip.arcforge.au | ⚪ Pending |

### MCP Server Details

- **SSE Endpoint**: https://mcp.pip.arcforge.au/sse (requires Bearer token)
- **Health Check**: https://mcp.pip.arcforge.au/health
- **OAuth Discovery**: https://mcp.pip.arcforge.au/.well-known/oauth-authorization-server
- **OAuth Authorize**: https://mcp.pip.arcforge.au/oauth/authorize (Sign In + Sign Up)
- **OAuth Token**: https://mcp.pip.arcforge.au/oauth/token

**OAuth Configuration** (for Claude.ai custom connector):
- URL: `https://mcp.pip.arcforge.au/sse`
- Client ID: `pip-mcp-client`
- Client Secret: `pip-mcp-secret-change-in-production`

**Architecture**: Lazy-loading with 2 meta-tools (85% context reduction)

**Tool Categories**:
- invoices (3): get_invoices, get_aged_receivables, get_aged_payables
- reports (2): get_profit_and_loss, get_balance_sheet
- banking (2): get_bank_accounts, get_bank_transactions
- contacts (2): get_contacts, search_contacts
- organisation (1): get_organisation

### VPS Configuration

- **Provider**: DigitalOcean (production-syd1)
- **IP**: 170.64.169.203
- **Containers**: pip-app (384MB), pip-mcp (256MB)
- **Database**: SQLite with daily backups
- **Cost**: $0/month (shared droplet)

---

## Known Issues

See **ISSUES.md** for detailed tracking.

**Summary**: 0 Critical | 0 High | 2 Medium | 1 Low

---

## Next Steps (Priority Order)

### Immediate

1. **Validate Claude.ai Integration**
   - Connect MCP server to Claude.ai (Pro account required)
   - Test all 10 Xero tools via Claude
   - Document any issues or required changes

2. **Create User Guide**
   - How to get token URL from /login
   - How to add custom integration in Claude.ai
   - Troubleshooting common issues

### After Claude.ai Validated

3. **ChatGPT Integration**
   - Test with ChatGPT Apps SDK
   - Adapt server if needed
   - Document ChatGPT-specific setup

4. **Landing Page** (pip.arcforge.au)
   - What is Pip? (one-liner)
   - Two options: PWA or Claude.ai/ChatGPT integration
   - Arc Forge branding, dark theme

### Future

5. Voice Mode (Milestone 2)
6. Enhanced personality/memory features
7. Additional accounting platform support

---

## Recent Achievements

### 2025-11-29: Xero Tools Audit & Bug Fixes
- **BUG FIX**: Aged receivables/payables tools now correctly find unpaid invoices
  - Root cause: Xero API `where` clause unreliable with combined filters
  - Fix: Use `statuses` array parameter + fallback code filtering
- **AUDIT**: All 10 Xero tools reviewed and hardened
  - `getInvoices`: Fixed status filtering (was using broken where clause)
  - `getBankAccounts`: Added fallback filter for Type=="BANK"
  - `searchContacts`: Added fallback filter for name search
  - All tools: Improved error message extraction from Xero API
- **VALIDATED**: Claude.ai integration fully working end-to-end
  - Successfully shows $1,500 overdue invoice from Embark Earthworks

### 2025-11-29: OAuth Security Hardening & Sign-Up Flow
- **SECURITY**: Removed insecure /login endpoint (P0 vulnerability)
- Added OAuth discovery endpoint (/.well-known/oauth-authorization-server)
- Implemented bcrypt password verification
- Created unified OAuth flow with Xero connection
- Added Sign In + Sign Up tabbed interface
- Sign Up requires one-time invite code (beta access control)
- SSE endpoint now requires authentication (returns 401 to trigger OAuth)
- Added VPS SSH details to CLAUDE.md
- Created docs/INVITE-CODES.md for beta code tracking

### 2025-11-29: Repo Cleanup & Documentation
- Fixed CONTRIBUTING.md with proper workflow guide
- Organized docs/ folder (archived outdated files)
- Updated priorities: Claude.ai first, ChatGPT second

### 2025-11-29: Full Pip Rebrand
- Renamed repo from zero-agent to pip
- Updated all package names (@pip/*)
- Updated VPS deployment (/opt/pip)
- Version bumped to 0.2.0

### 2025-11-29: MCP Remote Server
- Deployed mcp.pip.arcforge.au
- Implemented lazy-loading (85% context reduction)
- Added OAuth 2.0 for Claude.ai integration

### 2025-11-28: User Authentication
- Email/password auth with invite codes
- Per-user data isolation
- Admin CLI for code management

---

## Business Context

### Target Avatar
**Primary**: Small business owner managing own books
- Owner-operator, 0-5 employees
- $100k-$500k/year revenue
- Using Xero, stressed about BAS/GST
- Core pain: "I didn't start this business to do bookkeeping"

### Distribution Strategy

| Platform | Priority | Status | Cost to Us |
|----------|----------|--------|------------|
| **Claude.ai MCP** | HIGH | 🔵 Validating | $0 LLM |
| **ChatGPT App** | HIGH | ⚪ After Claude | $0 LLM |
| PWA (standalone) | MEDIUM | 🟢 Live | API costs |
| Self-hosted | LOW | 🟢 Ready | $0 |

**Key Insight**: MCP distribution = users bring their own LLM subscription = $0 inference costs for Arc Forge.

### Secured Domains
- askpip.au (secured)
- app.pip.arcforge.au (live - PWA)
- mcp.pip.arcforge.au (live - MCP server)
- pip.arcforge.au (reserved for landing page)

---

## References

- `PROGRESS.md` - Detailed task tracking
- `ISSUES.md` - Bug and improvement tracking
- `ARCHITECTURE.md` - System design and ADRs
- `docs/research-notes/SPIKE-pip-inside-claude-chatgpt.md` - MCP strategy research
- `docs/research-notes/PATTERN-lazy-loading-mcp-tools.md` - Context optimization pattern

---

**Note**: Archive items older than 2 weeks to keep document focused.
