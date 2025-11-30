# Issues Tracking

> **Purpose**: Track **open** bugs, improvements, technical debt, and risks
> **Lifecycle**: Living (add when issues arise, remove when resolved)
> **Resolved Issues**: Move to `CHANGELOG.md` under the appropriate version's "Fixed" section

**Last Updated**: 2025-11-30 (Night - MVP Complete)

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

### Priority Decisions

#### issue_008: Memory Architecture Decision
- **Status**: ✅ Resolved (Option B deployed - native memory)
- **Priority**: - (Complete)
- **Component**: `packages/mcp-remote-server`
- **Resolved**: 2025-11-30
- **Description**: Choose between two memory architectures for Pip
- **Resolution**:
  - **Option A (mem0)**: REJECTED - SQLite crashes in Docker/Alpine
  - **Option B (native)**: SELECTED - Text-based search, works in Alpine
  - Memory tools verified working on both Claude.ai and ChatGPT
- **Technical Details**:
  - Uses `memory-native.ts` with better-sqlite3
  - Text-based search (semantic search deferred)
  - 5 tools: add_memory, search_memory, list_memories, delete_memory, delete_all_memories

---

### Bugs

#### issue_010: Mem0 SQLite CANTOPEN in Docker (RESOLVED)
- **Status**: 🟢 Resolved (Switched to Option B native memory)
- **Priority**: - (Complete)
- **Component**: `packages/mcp-remote-server` (memory-native.ts)
- **Discovered**: 2025-11-30
- **Resolved**: 2025-11-30
- **Description**: Mem0's internal SQLite throws `SQLITE_CANTOPEN` regardless of configuration, crashing the MCP server.
- **Root Cause**: mem0ai library has internal SQLite that fails in Docker/Alpine
- **Additional Issue**: @xenova/transformers requires glibc (onnxruntime), but Alpine uses musl
- **Resolution**:
  - Switched to Option B (native memory implementation)
  - Removed @xenova/transformers import (crashes Alpine at import time)
  - Implemented text-based search instead of semantic/embedding search
  - Memory tools now functional with better-sqlite3
- **Trade-offs**:
  - Text search instead of semantic search (less intelligent matching)
  - Embeddings available if we switch to Debian-based Docker image
- **Commits**:
  - `d508336` - Initial Option B implementation with table creation
  - `3c839bd` - Remove @xenova/transformers import to fix Alpine crash
- **Notes**: Report to https://github.com/mem0ai/mem0/issues when time permits.

---

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
- **Status**: ✅ Resolved
- **Priority**: P2 (Complete)
- **Component**: `packages/mcp-remote-server`, `packages/core`, `packages/server`, `packages/pwa-app`
- **Spec**: `specs/SAFETY-ARCHITECTURE.md`
- **Description**: Implement tiered permission model to prevent AI from accidentally destroying Xero data
- **Why Critical**: Xero has NO user-accessible restore. Deleted/voided data is permanently lost.
- **Implementation Complete** (2025-11-30):
  - `packages/core/src/database/types.ts`: UserSettings, OperationSnapshot types
  - `packages/core/src/database/providers/sqlite.ts`: Tables + CRUD methods
  - `packages/mcp-remote-server/src/services/safety.ts`: Permission check service
  - `packages/mcp-remote-server/src/index.ts`: Tool execution guards + visibility filtering
  - `packages/server/src/routes/settings.ts`: API endpoints for settings
  - `packages/pwa-app/src/pages/SettingsPage.tsx`: Settings UI with permission level selector
- **Acceptance Criteria**:
  - [x] Database tables: user_settings, operation_snapshots
  - [x] Permission levels: Read-only (default), Create drafts, Approve/Update, Delete/Void
  - [x] Pre-operation snapshots (data model ready)
  - [x] Dynamic tool visibility based on permission level
  - [x] Settings UI in PWA
- **Resolution**: All safety guardrails implemented. Users can configure permission levels via PWA settings page.

#### issue_005: ChatGPT Memory Disabled in Developer Mode
- **Status**: ✅ Resolved (Native memory works)
- **Priority**: - (Complete)
- **Component**: `packages/mcp-remote-server` (memory-native.ts)
- **Resolved**: 2025-11-30
- **Description**: ChatGPT disables memory when MCP connectors are used in Developer Mode
- **Solution**: Implemented native memory with text-based search (bypasses ChatGPT memory limitation)
- **Acceptance Criteria**:
  - [x] Research memory approaches (mem0, SQLite, vector DB) - spike_mem0 COMPLETE
  - [x] Add memory tools to MCP - DEPLOYED (add, search, list, delete, delete_all)
  - [x] **Test memory tools via Claude.ai** - WORKING (80% relevance)
  - [x] **Test memory tools via ChatGPT Dev Mode** - WORKING (80% relevance)
  - [ ] Add memory management UI to PWA (deferred)
- **Notes**: Memory stack enables "Pip knows me" for Plus users. ChatGPT requires meta-tool pattern.

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

#### issue_009: Interactive Demo Mode with Xero Demo Organisation
- **Status**: 🔴 Open
- **Priority**: P2 (Medium - improves landing page conversion)
- **Component**: `packages/mcp-remote-server`, `landing-page.html`
- **Description**: Add interactive demo using Xero's demo organisation data so visitors can try Pip without connecting their own Xero
- **Use Case**: Landing page "See Demo" button could let users ask real questions against sample data, reducing friction to understand value
- **Research Required**:
  - [ ] How to access Xero Demo Company API (read-only)
  - [ ] Can we use a shared demo org or need per-session?
  - [ ] Rate limits on demo org queries
- **Acceptance Criteria**:
  - [ ] "Try Demo" button on landing page
  - [ ] Pre-authenticated demo session with sample Xero data
  - [ ] Users can ask questions without sign-up
  - [ ] Clear indication this is demo data, not their real books
- **Notes**: Xero provides demo companies for testing. This could dramatically improve landing page conversion by showing real value before sign-up.

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

### Future Features (Captured 2025-11-30)

*To be refined in planning session.*

#### issue_011: Automatic Memory Management
- **Status**: 🔴 Open
- **Priority**: P1 (High - core UX improvement)
- **Component**: `packages/mcp-remote-server`
- **Description**: Memory should "just work" without explicit tool calls. LLM extracts facts automatically, server stores them seamlessly.
- **Current State**: Requires explicit `add_memory` calls
- **Target State**: Like Anthropic's MCP Memory Server - seamless extraction
- **Acceptance Criteria**:
  - [ ] Research Anthropic's automatic extraction pattern
  - [ ] Implement system prompt for fact extraction
  - [ ] Background memory storage without user awareness
  - [ ] Memory recalled automatically in relevant contexts
- **Notes**: Key UX improvement. See Joplin note "Pip Memory Architecture" for research.

#### issue_012: Chat History
- **Status**: 🔴 Open
- **Priority**: P1 (High - expected feature)
- **Component**: `packages/mcp-remote-server`, `packages/pwa-app`
- **Description**: Persistent conversation history like Claude.ai
- **Acceptance Criteria**:
  - [ ] Store chat sessions in SQLite
  - [ ] Sidebar showing past conversations
  - [ ] Continue previous conversations
  - [ ] Per-user isolation
- **Notes**: Standard feature in AI chat interfaces. Users expect this.

#### issue_013: Projects Feature (Isolated Context)
- **Status**: 🔴 Open
- **Priority**: P2 (Medium - power user feature)
- **Component**: `packages/mcp-remote-server`, `packages/pwa-app`
- **Description**: Like Claude.ai Projects - separate knowledge bases per project/client
- **Use Cases**:
  - Different Xero organizations
  - Different business contexts
  - Client isolation for accountants
- **Acceptance Criteria**:
  - [ ] Project CRUD operations
  - [ ] Project-specific memory isolation
  - [ ] Project-specific document context
  - [ ] Project selector in UI
- **Notes**: Power user feature. May be premium tier.

#### issue_014: Per-Chat Document Upload
- **Status**: 🔴 Open
- **Priority**: P2 (Medium - UX improvement)
- **Component**: `packages/pwa-app`
- **Description**: Plus icon (+) to add documents to current conversation, replacing global context upload
- **Current State**: Documents uploaded globally
- **Target State**: Documents attached per-chat (like Claude.ai)
- **Acceptance Criteria**:
  - [ ] Plus icon in chat input
  - [ ] Document picker/upload
  - [ ] Document context for current conversation only
  - [ ] Visual indicator of attached documents
- **Notes**: More intuitive UX. Global preferences deferred for later testing.

#### issue_015: Pip's Voice/Personality
- **Status**: 🔴 Open
- **Priority**: P2 (Medium - brand differentiation)
- **Component**: `packages/mcp-remote-server` (system prompt)
- **Description**: Define Pip's character voice. Two options to test:
- **Option A - Adelaide Bookkeeper**:
  - Smart young woman from Adelaide
  - Professional but approachable
  - Keeps it simple for Sam (target customer)
- **Option B - Pippin (LOTR-inspired)**:
  - Fun, endearing character
  - Somehow great at bookkeeping
  - Playful but competent
- **Acceptance Criteria**:
  - [ ] Define system prompts for both voices
  - [ ] Settings toggle to switch voices
  - [ ] A/B test with users
- **Notes**: Current "G'day! I'm Pip" is too casual. Need defined personality.

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

### spike_001: Chunking Strategy Spike (DEPRIORITIZED)
- **Status**: 🟡 Deprioritized (Mem0 may replace need)
- **Task ID**: task_1_2_0
- **Duration**: 2 days
- **Priority**: P3 (was P1 - Mem0 adoption may eliminate need)
- **Reduces Uncertainty For**: task_1_2_1 (Chunking Strategy Implementation)
- **Deliverables**:
  - [ ] Test semantic chunking with real business documents
  - [ ] Compare fixed-size vs paragraph-based vs heading-based
  - [ ] Determine optimal chunk size (target: 2000 chars with overlap)
  - [ ] Decision document with recommendation
- **Acceptance Criteria**:
  - Uncertainty reduced from 4 → 2 for subsequent tasks
  - Clear chunking algorithm selected with rationale
- **Note**: May be unnecessary if Mem0 handles document context. Evaluate after spike_mem0.

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
