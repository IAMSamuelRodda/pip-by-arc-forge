# Project Status

> **Purpose**: Current work, active bugs, and recent changes (2-week rolling window)
> **Lifecycle**: Living (update daily/weekly during active development)

**Last Updated**: 2025-11-12
**Current Phase**: Infrastructure Foundation Implementation
**Version**: 0.1.0 (Pre-release)

---

## Quick Overview

| Aspect | Status | Notes |
|--------|--------|-------|
| Development | 🔵 | Infrastructure setup in progress |
| Staging | ⚪ | Not yet deployed |
| Production | ⚪ | Not yet deployed |
| CI/CD Pipeline | 🔵 | Configuration in progress |
| Test Coverage | ⚪ | No tests yet |
| Known Bugs | 🟢 | None (pre-implementation) |

**Status Guide:** 🟢 Good | 🟡 Attention | 🔴 Critical | 🔵 In Progress | ⚪ Not Started

---

## Current Focus

**Completed Today/This Week:**
- ✅ Created project documentation structure (7 core documents)
- ✅ Migrated architecture from Firebase to AWS
- ✅ Defined DynamoDB single-table design (documentation)
- ✅ Added ADR-007: Memory persistence and relationship building
- ✅ Added ADR-008: Voice-to-voice integration (premium tier)
- ✅ Defined subscription model (Free, Pro, Enterprise tiers)
- ✅ Created monorepo directory structure (packages/, functions/, terraform/)
- ✅ Set up Terraform infrastructure foundation (9 files, 1,270 lines)
- ✅ Implemented DynamoDB single-table design in Terraform
- ✅ Created IAM roles with least-privilege policies (agent, MCP, auth)
- ✅ Configured Secrets Manager for Xero OAuth tokens
- ✅ Added terraform.tfvars.example and comprehensive README
- ✅ Moved Terraform to root level (standard project structure)
- ✅ Initialized mcp-xero-server package (MCP SDK, 14 tools defined)
- ✅ Initialized agent-core package (4 sub-agents, session/memory managers)
- ✅ Initialized pwa-app package (React 18, Vite 6, PWA configured)
- ✅ Configured pnpm workspaces and Turbo monorepo
- ✅ Documented Claude Agent SDK architecture and best practices
- ✅ Researched and documented Xero API integration (450+ lines)
- ✅ Implemented Xero client wrapper with token management
- ✅ Completed all 5 MCP invoice handlers with Xero API integration
- ✅ Created main branch with protection rules (PR from dev only)
- ✅ Configured dev branch protection (PR from feature branches only)
- ✅ Added enforce-dev-pr-source.yml workflow
- ✅ Created PR #149 (dev → main) following three-tier strategy
- ✅ Completed all 9 remaining MCP handlers (bank, reporting, expenses)
- ✅ Updated xero-node to v13.2.0 and fixed claude-agent-sdk package name
- ✅ All 14 MCP tools now fully implemented (Infrastructure Foundation 100%)

**In Progress:**
- 🔵 PR #149 awaiting review/merge (ready for main deployment)

**Next Up:**
- [ ] Deploy infrastructure with Terraform (terraform apply)
- [ ] Configure AWS account and Xero OAuth application
- [ ] Build Lambda function wrappers (MCP server, agent, auth)
- [ ] Implement agent orchestrator logic (Claude Agent SDK)
- [ ] Implement PWA authentication (Cognito integration)
- [ ] Connect PWA to backend API

---

## Deployment Status

### Development
- **Status**: Local setup in progress
- **URL**: localhost (various ports)
- **Last Activity**: 2025-11-12

### Staging
- **Status**: Not yet configured
- **URL**: TBD
- **Last Deployed**: N/A

### Production
- **Status**: Not yet configured
- **URL**: TBD
- **Last Deployed**: N/A

---

## Known Issues

### Critical
None currently.

### High Priority
None currently.

---

## Recent Achievements (Last 2 Weeks)

**Documentation Foundation** ✅
- Completed: 2025-11-12
- Established 7-document structure (CLAUDE.md, README.md, ARCHITECTURE.md, STATUS.md, CONTRIBUTING.md, DEVELOPMENT.md, CHANGELOG.md)
- Created BLUEPRINT.yaml for project roadmap
- Archived legacy documentation drafts

---

## Next Steps (Priority Order)

1. **Package Structure Setup**
   - Create monorepo with pnpm workspaces
   - Initialize packages: mcp-xero-server, agent-core, pwa-app
   - Create functions directory for Lambda handlers
   - Set up shared TypeScript configuration

2. **AWS Infrastructure (Terraform)**
   - Define DynamoDB single-table design
   - Configure Lambda functions (agent, MCP, auth)
   - Set up API Gateway (REST + Cognito authorizer)
   - Configure S3 + CloudFront for PWA hosting
   - Set up Secrets Manager for Xero tokens
   - Configure Cognito user pool
   - Set up IAM roles and policies

3. **Xero API Integration**
   - Register Xero developer application
   - Configure OAuth 2.0 flow (Cognito + Xero)
   - Implement token storage in Secrets Manager
   - Create Lambda function for OAuth callback

4. **MCP Server Implementation (Lambda)**
   - Define Xero tool schemas with Zod
   - Implement invoice management tools
   - Implement bank transaction tools
   - Implement reporting tools
   - Configure Lambda packaging and deployment

5. **Agent Core Development (Lambda)**
   - Set up Claude Agent SDK in Lambda
   - Create main orchestrator agent
   - Define specialized sub-agents
   - Implement DynamoDB session management
   - Configure Lambda cold start optimization

6. **Memory & Relationship System (Future Phase)**
   - Implement core memory persistence (always free)
   - Build extended memory with semantic search
   - Create relationship progression logic (colleague → partner → friend)
   - Vector embeddings integration (OpenSearch or Pinecone)
   - **Spike Required**: GDPR compliance, data export, retention policies

7. **Voice Integration (Premium Feature - Phase 2)**
   - Set up WebSocket infrastructure for streaming audio
   - Integrate AWS Transcribe for speech-to-text
   - Implement Amazon Polly or ElevenLabs for TTS
   - Build voice session tracking and billing
   - Optimize for < 2s latency

8. **Subscription & Billing (Phase 2)**
   - Integrate Stripe for payment processing
   - Implement subscription tier enforcement
   - Build usage tracking (voice minutes, agent requests)
   - Create graceful degradation for expired subscriptions
   - Implement 90-day extended memory retention for lapsed users

---

**Note**: Archive items older than 2 weeks to keep document focused.
