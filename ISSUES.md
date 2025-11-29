# Issues Tracking

> **Purpose**: Track **open** bugs, improvements, technical debt, and risks
> **Lifecycle**: Living (add when issues arise, remove when resolved)
> **Resolved Issues**: Move to `CHANGELOG.md` under the appropriate version's "Fixed" section

**Last Updated**: 2025-11-30

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

## Open Issues

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

#### issue_004: Safety Guardrails for Write Operations
- **Status**: 🔵 In Progress (Design complete)
- **Priority**: P1 (HIGH - before any write operations)
- **Component**: `packages/mcp-remote-server`, `packages/server`, `packages/pwa-app`
- **Spec**: `specs/SAFETY-ARCHITECTURE.md`
- **Description**: Implement tiered permission model to prevent AI from accidentally destroying Xero data
- **Why Critical**: Xero has NO user-accessible restore. Deleted/voided data is permanently lost.
- **Acceptance Criteria**:
  - [ ] Database tables: user_settings, operation_snapshots
  - [ ] Permission levels: Read-only (default), Create drafts, Approve/Update, Delete/Void
  - [ ] Pre-operation snapshots before any write
  - [ ] Dynamic tool visibility based on permission level
  - [ ] Settings UI in PWA
- **Notes**: All current tools are read-only (zero risk). This must be implemented BEFORE adding any write operations.

#### issue_005: ChatGPT Memory Disabled in Developer Mode
- **Status**: 🟡 In Progress (Memory Stack planned)
- **Priority**: P2 (Medium - affects Plus users)
- **Component**: External (ChatGPT limitation) + `packages/mcp-remote-server`
- **Description**: ChatGPT disables memory when MCP connectors are used in Developer Mode
- **Solution**: Implement Pip Memory Stack (Priority 2 in STATUS.md)
- **ChatGPT Business Option**: Published connectors MAY retain memory (UNVERIFIED)
- **Acceptance Criteria**:
  - [ ] Research memory approaches (mem0, SQLite, vector DB)
  - [ ] Implement user_memories table
  - [ ] Add memory extraction + injection to MCP
  - [ ] Create memory import endpoint
  - [ ] Add memory management UI to PWA
- **Notes**: Memory stack enables "Pip knows me" for Plus users and cross-platform memory portability.
- **Reference**: docs/CHATGPT-MEMORY-GUIDE.md

#### issue_006: Google Docs Integration
- **Status**: 🔴 Open
- **Priority**: P3 (Low - future enhancement)
- **Component**: `packages/mcp-remote-server`
- **Description**: Allow users to connect Google Docs to Pip for business context
- **Use Case**: Users store business plans, KPIs, meeting notes in Google Docs. Connecting these would enrich Pip's context without manual file uploads.
- **Acceptance Criteria**:
  - [ ] Google OAuth integration
  - [ ] Google Docs API read access
  - [ ] Document sync/indexing
  - [ ] Context injection from connected docs
- **Notes**: Common request - many SMBs use Google Workspace. Consider Google Drive broader integration.

#### issue_007: Nextcloud Integration
- **Status**: 🔴 Open
- **Priority**: P3 (Low - future enhancement)
- **Component**: `packages/mcp-remote-server`
- **Description**: Allow users to connect Nextcloud for business context (open source alternative)
- **Use Case**: Support open source community who prefer self-hosted solutions. Nextcloud is popular for privacy-conscious businesses.
- **Acceptance Criteria**:
  - [ ] Nextcloud OAuth/API integration
  - [ ] Document sync from Nextcloud Files
  - [ ] Support for Nextcloud Notes
  - [ ] Context injection from connected docs
- **Notes**: Aligns with Pip's self-hostable philosophy. Good for privacy-focused users and FOSS community.

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

## References

- `CONTRIBUTING.md` - Documentation workflow guide
- `CHANGELOG.md` - Where resolved issues go
- `STATUS.md` - Current work snapshot
