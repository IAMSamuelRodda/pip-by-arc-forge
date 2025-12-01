# Issues Tracking

> **Purpose**: Track **open** bugs, improvements, technical debt, and risks
> **Lifecycle**: Living (add when issues arise, remove when resolved)
> **Resolved Issues**: Move to `CHANGELOG.md` under the appropriate version's "Fixed" section

**Last Updated**: 2025-12-01 (Milestone 2 Planning)

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

#### issue_018: Memory Management UI + User Edit Tracking
- **Status**: 🟢 Merged into Epic 2.1
- **Priority**: - (Absorbed)
- **Component**: `packages/mcp-remote-server`, `packages/pwa-app`
- **Description**: Add "Manage memory" UI and track user explicit edit requests separately from auto-extracted memory.
- **Resolution**: Merged into Epic 2.1 (feature_2_1_2 through feature_2_1_5) on 2025-12-01
- **See**: PROGRESS.md → Epic 2.1 for detailed tasks
- **UX Reference**: `specs/spike-outputs/UX-PATTERNS-CLAUDE-AI-REFERENCE-20251201.md` Pattern 0.7

#### issue_017: Ollama Model Warm-Up Strategy
- **Status**: 🔴 Open
- **Priority**: P2 (Medium - UX improvement)
- **Component**: `packages/pwa-app`, LiteLLM proxy
- **Description**: Ollama models have ~14s cold start (loading into GPU). Need to investigate pre-warming strategies.
- **Context**:
  - Cold start: ~14s (model loading into VRAM)
  - Warm latency: ~238ms (excellent)
- **Investigation Areas**:
  - [ ] Trigger model warm-up when user selects Ollama model in dropdown
  - [ ] Background warm-up while user is typing (if message is long)
  - [ ] Keep model loaded with periodic ping (prevent unload)
  - [ ] Display "warming up..." indicator in UI
- **Acceptance Criteria**:
  - [ ] Measure actual cold/warm latency with integrated PWA
  - [ ] Determine if 14s cold start is acceptable or needs mitigation
  - [ ] If needed, implement pre-warming strategy
- **Notes**: Defer implementation until Ollama is integrated into PWA. Test real-world UX first.

#### issue_016: Light/Dark Mode Theme Support
- **Status**: 🔴 Open
- **Priority**: P3 (Low - future enhancement)
- **Component**: All frontend packages (`packages/pwa-app`, `packages/mcp-remote-server`, `landing-page.html`)
- **Description**: Add light/dark mode toggle with CSS variables for easy theme switching
- **Current State**: All pages use hardcoded dark theme colors
- **Target State**: CSS variables with theme toggle, respects system preference
- **Acceptance Criteria**:
  - [ ] Extract colors to CSS variables (already partially done in landing page)
  - [ ] Add theme toggle in settings
  - [ ] Persist theme preference in localStorage
  - [ ] Respect `prefers-color-scheme` media query
  - [ ] Consistent theming across all pages (PWA, MCP login, landing)
- **Notes**: Low priority - current dark theme is consistent with brand. Implement when user feedback requests it.

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

### Milestone 2 Features (Planned 2025-12-01)

*Blueprint: `specs/BLUEPRINT-project-milestone2-ux-personality-20251201.yaml`*

#### issue_011: Memory Architecture Refactor (Epic 2.1)
- **Status**: 🟡 Partially Complete (analysis done, patterns documented)
- **Priority**: P1 (High - foundation for all M2 features)
- **Component**: `packages/mcp-remote-server` (memory.ts, memory-tools.ts)
- **Blueprint**: feature_2_1_1 through feature_2_1_5
- **UX Reference**: `specs/spike-outputs/UX-PATTERNS-CLAUDE-AI-REFERENCE-20251201.md` (Pattern 0.7)
- **Description**: Align memory implementation with Anthropic + Claude.ai patterns.
- **Analysis Complete** (2025-12-01):
  - Current `memory.ts` (~394 lines) already aligns with Anthropic approach ✅
  - Knowledge graph structure (entities, relations, observations) ✅
  - Text-based search working ✅
  - User/project isolation built in ✅
- **Gap Identified**: Missing Claude.ai UI/UX patterns:
  - `is_user_edit` flag on observations
  - `memory_summaries` table for prose summaries
  - Summary generation (on-demand/nightly)
  - Memory management API + UI
  - Detection of explicit user requests ("remember that...")
- **Acceptance Criteria**:
  - [x] Review Anthropic MCP Memory Server reference implementation
  - [x] Audit current memory-native.ts (renamed to memory.ts)
  - [x] Document Claude.ai Pattern 0.7 (single memory with tracked edits)
  - [ ] Add `is_user_edit` column to observations
  - [ ] Create `memory_summaries` table
  - [ ] Implement Memory Management API
  - [ ] Build Memory Management UI
  - [ ] Integration testing on Claude.ai + ChatGPT
- **Complexity**: 2.0-2.8/5 (Medium)
- **Notes**: Architecture validated. Implementation focuses on Claude.ai patterns. See Epic 2.1 in PROGRESS.md for detailed tasks.

#### issue_012: Chat History (Epic 2.2)
- **Status**: 🔴 Open
- **Priority**: P1 (High - expected feature)
- **Component**: `packages/mcp-remote-server`, `packages/pwa-app`
- **Blueprint**: feature_2_2_1, feature_2_2_2
- **Description**: Persistent conversation history with vertical tabs sidebar (standard UX pattern like Claude.ai)
- **Acceptance Criteria**:
  - [ ] Extend sessions table (title, preview_text, last_message_at)
  - [ ] Chat title auto-generation from LLM
  - [ ] API endpoints: GET /api/chats, GET/:id, DELETE/:id
  - [ ] Collapsible left sidebar component (responsive)
  - [ ] Chat list with metadata (title, preview, timestamp)
  - [ ] New chat (+) and delete actions
  - [ ] Chat switching with state persistence
- **Complexity**: 2.5-3.0/5 (Medium-High)
- **Notes**: Standard feature users expect. Familiar UI pattern.

#### issue_013: Projects Feature (Epic 2.3)
- **Status**: 🔴 Open
- **Priority**: P1 (High - differentiator)
- **Component**: `packages/mcp-remote-server`, `packages/pwa-app`
- **Blueprint**: feature_2_3_1 through feature_2_3_4
- **Description**: Isolated context per project/client. Global context still applies, but project-specific details don't bleed across projects. Like Claude.ai Projects with cross-project reference capability.
- **Use Cases**:
  - Different Xero organizations per project
  - Client isolation for accountants
  - Project-specific memory and documents
- **Acceptance Criteria**:
  - [ ] Projects schema design and CRUD operations
  - [ ] Refactor memory service for project_id scoping (decomposed into 4 subtasks)
  - [ ] Refactor session service for project isolation
  - [ ] Multi-Xero org support (per-project OAuth tokens)
  - [ ] Cross-project reference capability (**SPIKE REQUIRED**)
  - [ ] Project switcher dropdown in header
  - [ ] Project settings page
  - [ ] Project context indicator in chat UI
- **Complexity**: 2.2-3.2/5 (task_2_3_1_3 decomposed)
- **Flagged**: task_2_3_1_3 decomposed into 4 subtasks (all ≤2.5)
- **Spike**: spike_m2_001 for cross-project reference patterns

#### issue_014: Per-Chat Document Upload (Epic 2.4)
- **Status**: 🔴 Open (spike complete - ready to implement)
- **Priority**: P2 (Medium - UX improvement)
- **Component**: `packages/pwa-app`, `packages/mcp-remote-server`
- **Blueprint**: feature_2_4_1 through feature_2_4_3
- **Description**: Plus (+) icon in chat for attachments (standard UX pattern). Document preview below chat input field.
- **Spike**: spike_m2_002 ✅ COMPLETE - Decision: Keep React, use react-dropzone
- **Acceptance Criteria**:
  - [x] Complete React refactor assessment spike first
  - [ ] Design session_documents schema and storage strategy
  - [ ] File upload API with validation and size limits
  - [ ] Plus (+) icon attachment button with drag-and-drop (use react-dropzone)
  - [ ] Document preview component below chat input
  - [ ] Documents list in sidebar with download/delete
- **Complexity**: 2.0-2.8/5 (Medium)
- **Unblocked By**: spike_m2_002 (2025-12-01)

#### issue_015: Pip's Voice/Personality (Epic 2.5)
- **Status**: 🟡 In Progress (spike complete, implementation ready)
- **Priority**: P1 (CRITICAL - retention impact)
- **Component**: `packages/mcp-remote-server` (system prompts), `packages/core/src/personalities/`
- **Blueprint**: feature_2_5_1 through feature_2_5_5
- **Description**: Switchable character personalities that can change mid-chat without losing context.
- **Spike Complete** (spike_m2_003): ✅
  - Literary analysis, Grok modes research, personality schema defined
  - Adelaide and Pippin profiles created in `packages/core/src/personalities/`
  - `buildPersonalityPrompt()` function implemented
- **Option A - Adelaide Bookkeeper**: Professional, approachable, no jargon
- **Option B - Pippin (LOTR-inspired)**: Playful, warm, surprisingly competent
- **Acceptance Criteria**:
  - [x] Complete character voice methodology spike (spike_m2_003)
  - [x] Define Adelaide character profile and system prompt
  - [x] Define Pippin character profile and system prompt
  - [ ] Test both voices across invoicing, reports, troubleshooting
  - [x] Extend user_settings schema for voice_profile
  - [ ] Voice loading in AgentOrchestrator
  - [ ] Mid-chat voice switching without context loss
  - [ ] Voice selector in settings page
  - [ ] Quick voice toggle in chat interface
  - [ ] Refine based on user testing
- **Complexity**: 1.5-2.8/5 (Medium)
- **Notes**: CRITICAL for user retention. Profiles drafted, need integration testing.

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

### Milestone 2 Spikes

#### spike_m2_001: Cross-Project Reference Capability Research
- **Status**: 🔴 Open (blueprint created)
- **Duration**: 2 days
- **Priority**: P1 (blocks feature_2_3_3)
- **Reduces Uncertainty For**: task_2_3_3_1, task_2_3_3_2
- **Blueprint**: `specs/BLUEPRINT-spike-cross-project-reference-20251201.yaml`
- **Description**: Research patterns for cross-project data access (like Claude Code referencing other repos)
- **Research Questions**:
  - How do Claude Code, VS Code, Notion handle cross-project references?
  - API design: read-only vs read-write, explicit vs implicit?
  - Permission model: owner-only vs shared, granular vs simple?
  - UX: How to indicate cross-project context in chat?
- **Deliverables**:
  - [ ] Research report: `docs/research-notes/SPIKE-m2-001-cross-project-patterns.md`
  - [ ] API design: `specs/spike-outputs/CROSS-PROJECT-API-DESIGN-20251201.md`
  - [ ] Proof of concept: Cross-project memory query with permission check
- **Acceptance Criteria**:
  - All research questions answered with evidence
  - API design covers read-only cross-project access
  - Permission model clearly documented
  - POC demonstrates basic cross-project memory query
  - Uncertainty reduced from 4 → 2 for task_2_3_3_1

#### spike_m2_002: React.js Refactor Assessment for File Uploads
- **Status**: ✅ Complete
- **Duration**: 2 days (completed in 1)
- **Completed**: 2025-12-01
- **Priority**: - (Done - unblocks feature_2_4_2, feature_2_4_3)
- **Reduces Uncertainty For**: feature_2_4_2, feature_2_4_3
- **Blueprint**: feature_4_1 spike
- **Description**: Evaluate current Vite PWA architecture's file upload capabilities vs React refactor
- **Deliverables**:
  - [x] Analysis of current Vite PWA file upload capabilities
  - [x] Cost-benefit analysis: React refactor vs incremental enhancement
  - [x] Recommendation with implementation approach
- **Decision**: **KEEP REACT** - No framework migration needed
- **Key Findings**:
  - ChatGPT uses React + Next.js
  - Claude Code uses TypeScript + React (Ink) + Bun
  - Anthropic hiring requires "React development expertise"
  - Migration cost (3-5 weeks) not justified
- **File Upload Recommendation**: react-dropzone for + icon UX
- **Output**: `docs/research-notes/SPIKE-m2-002-react-refactor-assessment.md`

#### spike_m2_004: Multi-Model LLM Architecture Research
- **Status**: ✅ Complete
- **Duration**: 1 day (time-boxed 3-5 days)
- **Completed**: 2025-12-01
- **Priority**: - (Done - foundation for multi-model support)
- **Reduces Uncertainty For**: Future multi-model support implementation
- **Blueprint**: `specs/archive/BLUEPRINT-spike-multi-model-architecture-20251201.yaml`
- **Description**: Research optimal architecture for LiteLLM proxy, Tailscale+Ollama connectivity, PWA model selector, and model-agnostic MCP design.
- **Deliverables**:
  - [x] Architecture Decision Document (LiteLLM strategy, Tailscale pattern, PWA integration)
  - [x] LiteLLM Configuration POC (Anthropic + OpenAI + Ollama routing)
  - [x] Tailscale + Ollama Connectivity Test (latency measurements, offline handling)
  - [x] PWA Model Selector Mockup (UI/UX design, state management)
  - [x] Cost/Performance Comparison Matrix (5+ models, function calling support)
- **Outputs**:
  - `specs/spike-outputs/ADR-MULTI-MODEL-ARCHITECTURE-20251201.md`
  - `specs/spike-outputs/COST-PERFORMANCE-MATRIX-20251201.md`
  - `specs/spike-outputs/PWA-MODEL-SELECTOR-DESIGN-20251201.md`
  - `/opt/litellm/` on VPS - LiteLLM proxy with 5 models
- **Key Findings**:
  - LiteLLM standalone with host networking (for Tailscale access)
  - Ollama warm latency: 238ms (excellent), cold: 14s (needs warm-up strategy)
  - MCP server is already model-agnostic, no changes needed
  - Recommendations: Claude Sonnet 4 (primary), Haiku (fast), GPT-4o (fallback), Ollama (offline)
- **Follow-up**: issue_017 - Ollama Model Warm-Up Strategy

#### spike_m2_003: Character Voice Methodology Research
- **Status**: ✅ Complete
- **Duration**: 1 day (estimated 3 days)
- **Completed**: 2025-12-01
- **Priority**: - (Done - unblocks feature_2_5_2, feature_2_5_3)
- **Reduces Uncertainty For**: feature_2_5_2, feature_2_5_3, feature_2_5_4
- **Blueprint**: feature_5_1 spike
- **Description**: Research how to objectively define character personalities for LLM system prompts
- **Deliverables**:
  - [x] Literary analysis of character voice techniques from novels
  - [x] Grok speech modes comparison and pattern identification
  - [x] Voice profile schema and prompt structure template
  - [x] Test implementation with Adelaide and Pippin profiles
- **Output**: `docs/research-notes/SPIKE-character-voice-methodology.md`
- **Implementation**:
  - `packages/core/src/database/types.ts` - Personality types
  - `packages/core/src/personalities/adelaide.ts` - Adelaide profile
  - `packages/core/src/personalities/pippin.ts` - Pippin profile
  - `packages/core/src/personalities/index.ts` - buildPersonalityPrompt()

---

### Legacy Spikes

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
