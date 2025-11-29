# Issues Tracking

> **Purpose**: Dynamic issue tracking for bugs, improvements, technical debt, and flagged complexity items
> **Lifecycle**: Living (update when issues are discovered, resolved, or status changes)
> **Alternative to**: GitHub Issues (streamlined approach for solo/small team development)

**Last Updated**: 2025-11-29

---

## Status Guide

| Status | Meaning |
|--------|---------|
| 🔴 Open | Issue identified, not yet started |
| 🟡 In Progress | Actively being worked on |
| 🟢 Resolved | Fixed and verified |
| 🔵 Blocked | Cannot proceed due to external factors |
| ⚠️ Flagged | Needs decomposition or spike before implementation |

## Priority Guide

| Priority | Meaning |
|----------|---------|
| P0 | Critical - System broken, must fix immediately |
| P1 | High - Significant impact, fix this week |
| P2 | Medium - Should fix, can wait for next sprint |
| P3 | Low - Nice to have, backlog |

---

## Active Issues

### Bugs

#### issue_bug_001: [P0 SECURITY] Token URL Allows User Impersonation
- **Status**: 🟢 Resolved & Deployed
- **Priority**: P0 (CRITICAL)
- **Component**: `packages/mcp-remote-server` (/login endpoint)
- **Description**: The /login page generated JWT tokens for ANY email without verification.
- **Resolution** (2025-11-29):
  - [x] Removed insecure /login endpoint entirely
  - [x] OAuth 2.0 flow now verifies password against database (bcrypt)
  - [x] Added OAuth discovery endpoint (/.well-known/oauth-authorization-server)
  - [x] User lookup via getUserByEmail() before allowing auth
  - [x] SSE endpoint returns 401 without Bearer token (triggers OAuth)
  - [x] Deployed to production
- **Notes**: Fix deployed and verified

#### issue_bug_002: Claude.ai OAuth Integration Not Working
- **Status**: 🟢 Resolved
- **Priority**: P1
- **Component**: `packages/mcp-remote-server` (OAuth flow)
- **Description**: Claude.ai custom connector with OAuth credentials doesn't connect properly
- **Resolution** (2025-11-29):
  - [x] Added OAuth discovery endpoint (/.well-known/oauth-authorization-server)
  - [x] SSE returns 401 to trigger OAuth flow
  - [x] Added tabbed Sign In / Sign Up interface
  - [x] Sign Up requires one-time invite code (beta access)
  - [x] Unified OAuth flow with Xero connection
  - [x] Password verification via bcrypt
  - [x] Fixed bcrypt ESM import issue
  - [x] Added MCP callback to Xero app redirect URIs
  - [x] Complete end-to-end test with Claude.ai ✅
  - [x] Verify Xero tools work via Claude ✅
- **Configuration**:
  - URL: `https://mcp.pip.arcforge.au/sse`
  - Client ID: `pip-mcp-client`
  - Client Secret: `pip-mcp-secret-change-in-production`
- **Notes**: Full OAuth flow working! User can sign up/in → connect Xero → use tools in Claude.ai

### Improvements

#### issue_003: Email Verification for Sign-Up
- **Status**: 🔴 Open
- **Priority**: P3 (Low - deferred)
- **Component**: `packages/mcp-remote-server` (OAuth sign-up)
- **Description**: Add email verification before account activation
- **Options**:
  - Resend (3000/month free)
  - SendGrid (100/day free)
  - Postmark (100/month free)
- **Acceptance Criteria**:
  - [ ] User signs up → receives verification email
  - [ ] User clicks link → account activated
  - [ ] Cannot use Pip until verified
- **Notes**: Deferred - invite codes provide sufficient access control for beta. Implement before public launch.

#### issue_000: Business Context Layer
- **Status**: 🟡 In Progress (Blueprint created)
- **Priority**: P1
- **Component**: `packages/agent-core`
- **Blueprint Reference**: Epic 1 (features 1.1-1.4)
- **Description**: Add business context ingestion so agent can answer questions requiring both financial data AND business knowledge
- **Acceptance Criteria**:
  - [ ] Document upload/ingestion mechanism (feature_1_1)
  - [ ] Context chunking & summarization (feature_1_2)
  - [ ] Context injection into prompts (feature_1_3)
  - [ ] Can answer: "Can I afford to hire?", "Am I on track for goals?" (feature_1_4)
- **Notes**: Core differentiator vs JAX (Xero AI). Full blueprint at `specs/BLUEPRINT.yaml`

#### issue_001: PWA Connect Button Loading State
- **Status**: 🔴 Open
- **Priority**: P2
- **Component**: `packages/pwa-app`
- **Description**: Connect to Xero button needs better visual feedback during OAuth flow
- **Acceptance Criteria**:
  - [ ] Loading spinner during redirect
  - [ ] Disable button while connecting
  - [ ] Clear error state display
- **Notes**: Basic implementation exists, needs polish before demo

#### issue_002: Chat Message Timestamps
- **Status**: 🔴 Open
- **Priority**: P3
- **Component**: `packages/pwa-app`
- **Description**: Add timestamps to chat messages for better UX
- **Acceptance Criteria**:
  - [ ] Display relative time (e.g., "2 min ago")
  - [ ] Show full timestamp on hover
  - [ ] Consistent formatting
- **Notes**: Low priority, nice-to-have for demo

---

## Flagged Items (From Blueprint Assessment)

Items flagged by `improving-plans` skill as requiring decomposition or spike tasks before implementation.

### ⚠️ flag_001: Chunking Strategy Implementation
- **Status**: ⚠️ Flagged for decomposition
- **Task ID**: task_1_2_1
- **Complexity**: 3.5/5 (High)
- **Component**: `packages/agent-core/src/context`
- **Reason**: Uncertainty=4 around optimal chunking strategy
- **Decomposition Pattern**: Spike/Investigation First (Pattern 4)
- **Required Spike**: task_1_2_0 (Chunking Strategy Spike)
- **Acceptance Criteria**:
  - [ ] Complete task_1_2_0 spike first
  - [ ] Test chunking strategies with real documents
  - [ ] Reduce uncertainty from 4 → 2 before implementation
- **Notes**: Do NOT implement until spike completes and approach is validated

### ⚠️ flag_002: Chatterbox Self-Hosting Setup
- **Status**: ⚠️ Flagged for decomposition
- **Task ID**: task_3_2_1
- **Complexity**: 3.5/5 (High)
- **Component**: `packages/server/src/voice`
- **Reason**: Risk=4 due to VPS 384MB memory constraint
- **Decomposition Pattern**: Spike/Investigation First (Pattern 4)
- **Required Spike**: task_3_2_0 (Chatterbox Deployment Feasibility Spike)
- **Acceptance Criteria**:
  - [ ] Complete task_3_2_0 spike first
  - [ ] Test Chatterbox on VPS (CPU-only, 384MB constraint)
  - [ ] Decision: shared VPS vs dedicated instance vs cloud GPU
- **Notes**: High risk - may need fallback to cloud TTS API if VPS insufficient

---

## Spike Tasks Required

Research/investigation tasks that must complete before dependent implementation tasks.

### spike_001: Chunking Strategy Spike
- **Status**: 🔴 Open
- **Task ID**: task_1_2_0
- **Duration**: 2 days
- **Priority**: P1 (blocks feature_1_2)
- **Reduces Uncertainty For**: task_1_2_1 (Chunking Strategy Implementation)
- **Deliverables**:
  - [ ] Test semantic chunking with real business documents
  - [ ] Compare fixed-size vs paragraph-based vs heading-based
  - [ ] Determine optimal chunk size (target: 2000 chars with overlap)
  - [ ] Decision document with recommendation
- **Acceptance Criteria**:
  - Uncertainty reduced from 4 → 2 for subsequent tasks
  - Clear chunking algorithm selected with rationale

### spike_002: Whisper Deployment Strategy Spike
- **Status**: 🔴 Open
- **Task ID**: task_3_1_0
- **Duration**: 2 days
- **Priority**: P2 (blocks feature_3_1)
- **Reduces Uncertainty For**: task_3_1_2 (Whisper STT Endpoint)
- **Deliverables**:
  - [ ] Test Whisper API latency and cost ($0.006/min)
  - [ ] Test self-hosted Whisper on VPS (memory usage, latency)
  - [ ] Decision matrix: API vs self-hosted
  - [ ] Recommendation document
- **Acceptance Criteria**:
  - Clear decision on Whisper deployment approach
  - Performance benchmarks documented

### spike_003: Chatterbox Deployment Feasibility Spike
- **Status**: 🔴 Open
- **Task ID**: task_3_2_0
- **Duration**: 3 days
- **Priority**: P2 (blocks feature_3_2)
- **Reduces Uncertainty For**: task_3_2_1 (Chatterbox Self-Hosting Setup)
- **Deliverables**:
  - [ ] Test Chatterbox on VPS (CPU-only, 384MB constraint)
  - [ ] Measure latency and memory usage
  - [ ] Evaluate: shared VPS vs dedicated ($5-20/mo) vs cloud GPU ($0.10/hr)
  - [ ] Cost comparison document
  - [ ] Decision document with recommendation
- **Acceptance Criteria**:
  - Clear deployment approach selected
  - Fallback plan if VPS insufficient (e.g., ElevenLabs API)

---

## Technical Debt

#### debt_001: No Formal Test Coverage
- **Status**: 🔴 Open
- **Priority**: P2
- **Component**: All packages
- **Description**: Project relies on manual testing only
- **Acceptance Criteria**:
  - [ ] Unit tests for agent-core
  - [ ] Integration tests for Xero client
  - [ ] E2E tests for PWA
- **Notes**: Defer until after user demo validation

#### debt_002: Legacy GitHub Issues Cleanup
- **Status**: 🟢 Resolved
- **Priority**: P3
- **Description**: 157 legacy GitHub issues from deprecated AWS blueprint
- **Resolution**: All closed 2025-11-27, now using PROGRESS.md + ISSUES.md

---

## Risk Registry

Risks identified during blueprint complexity assessment.

### risk_000: Xero 25-User Limit for Unapproved Apps
- **Severity**: High
- **Probability**: Certain (hard limit)
- **Impact**: Cannot onboard more than 25 users until Xero app approval
- **Constraint**: Xero requires app approval for >25 connected organizations
- **Mitigation**:
  - Track connected Xero orgs in database
  - Enforce limit in code (reject new Xero connections after 25)
  - Apply for Xero app approval before hitting limit
- **Acceptance Criteria**:
  - [ ] Add user count check before Xero OAuth
  - [ ] Display "beta full" message when limit reached
  - [ ] Track connected org count in admin dashboard
- **Timeline**: Must implement before public beta launch
- **Reference**: https://developer.xero.com/documentation/guides/oauth2/app-partnership/

### risk_001: VPS Memory Constraint
- **Severity**: High
- **Probability**: Medium
- **Impact**: Cannot self-host Chatterbox TTS
- **Mitigation**: spike_003 (Chatterbox Feasibility Spike)
- **Contingency**: Use cloud TTS API (ElevenLabs $0.18/1000 chars)

### risk_002: Demo Incomplete
- **Severity**: Medium
- **Probability**: Low
- **Impact**: Thursday demo fails to show Business Context Layer
- **Mitigation**: Prioritize features 1.1, 1.3, task 1.4.2 (demo critical path)
- **Contingency**: Demo existing Xero features + explain context vision

### risk_003: Voice Latency Too High
- **Severity**: Medium
- **Probability**: Medium
- **Impact**: Voice conversations feel sluggish (>2s latency)
- **Mitigation**: Performance testing at each pipeline stage
- **Contingency**: Accept higher latency for MVP; optimize post-launch

---

## Resolved Issues (Last 2 Weeks)

### 2025-11-29

#### issue_fixed_003: Aged Receivables/Payables API Error
- **Status**: 🟢 Resolved
- **Priority**: P1
- **Component**: `packages/mcp-remote-server` (xero-tools.ts)
- **Description**: get_aged_receivables and get_aged_payables tools returned "undefined" error
- **Root Cause**: Xero SDK methods `getReportAgedReceivablesByContact` and `getReportAgedPayablesByContact` were called with date parameter in contactId position, causing "contactId was not in the correct format" API error
- **Resolution**: Rewrote both functions to use `getInvoices` endpoint with Type filters (ACCREC/ACCPAY) instead of reports API. More reliable and provides better error messages.

### 2025-11-27

#### issue_fixed_001: Connect to Xero Button Not Navigating
- **Status**: 🟢 Resolved
- **Priority**: P1
- **Resolution**: Changed from `<a href>` to `window.location.href` for proper navigation

#### issue_fixed_002: Docker Network Connectivity
- **Status**: 🟢 Resolved
- **Priority**: P0
- **Resolution**: Added `droplet_frontend` external network to docker-compose.yml

---

## Archived Issues

Move resolved issues here after 2 weeks.

---

## Using PROGRESS.md + ISSUES.md vs GitHub Issues

This project uses a **streamlined markdown-based tracking approach** instead of GitHub Issues.

### When to Use This Approach
- Solo developer or small team (1-3 people)
- Fast iteration cycles
- Don't need external stakeholder visibility
- Want to keep all project context in repository
- AI-assisted development (context stays in codebase)

### When to Use GitHub Issues Instead
- Team > 3 people needing assignment/ownership
- External stakeholders need visibility
- Need automated workflows (GitHub Actions triggered by issues)
- Complex dependency tracking with sub-issues
- Roadmap views and project boards

### Relationship to Blueprint
- **BLUEPRINT.yaml**: Architectural plan with complexity scores
- **PROGRESS.md**: Execution tracking (task status, completion)
- **ISSUES.md**: Problems, improvements, flagged items, risks
- **STATUS.md**: 2-week rolling snapshot for quick reference

---

## References

- **PROGRESS.md**: Project tracking (epics, features, tasks)
- **specs/BLUEPRINT.yaml**: Full architectural blueprint
- **STATUS.md**: Current work snapshot (2-week rolling window)
