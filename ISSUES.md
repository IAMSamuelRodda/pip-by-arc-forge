# Issues Tracking

> **Purpose**: Track **open** bugs, improvements, technical debt, and risks
> **Lifecycle**: Living (add when issues arise, remove when resolved)
> **Resolved Issues**: Move to `CHANGELOG.md` under the appropriate version's "Fixed" section

**Last Updated**: 2025-12-02 (Response Styles complete)

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

#### issue_022: Enhanced "Thinking" Indicator (Claude Code Pattern)
- **Status**: 🔴 Open
- **Priority**: P2 (Medium - UX engagement)
- **Component**: `packages/pwa-app`, `packages/server`
- **Description**: Current "Checking your data... (Xs)" is too generic. Users want visibility into what Pip is actually doing.
- **Reference**: Claude Code shows dynamic status updates:
  - Tool being called: "Bash(git status && git diff)"
  - Action description: "Updating STATUS.md..."
  - Thinking indicator: "Thinking..." with duration
  - Progress steps: Shows sequence of operations
- **Current State**:
  - Static "Checking your data..." message
  - Only shows elapsed time
  - No visibility into tools being called
- **Target State**:
  - Show tool name when Xero API is called (e.g., "Fetching invoices...")
  - Show operation context (e.g., "Analyzing P&L report...")
  - Stream status updates from backend
  - Consider: SSE for real-time status updates
- **Implementation Options**:
  - Option A: Server-sent events (SSE) for streaming status
  - Option B: Polling endpoint for status updates
  - Option C: WebSocket connection for bidirectional updates
- **Acceptance Criteria**:
  - [ ] Design status message schema (tool, action, duration)
  - [ ] Backend emits status events during processing
  - [ ] Frontend displays dynamic status messages
  - [ ] Shows specific tool/operation being performed
  - [ ] Elapsed time per operation (not just total)
- **Complexity**: 2.5-3.0/5 (Medium - requires streaming infrastructure)
- **Notes**: Makes the tool feel more responsive and trustworthy. Users see Pip is "working" not "stuck".

#### issue_023: Edge Cases - Empty Chat + Memory Retrieval
- **Status**: 🔴 Open
- **Priority**: P1 (High - core functionality bugs)
- **Component**: `packages/server`, `packages/agent-core`
- **Discovered**: 2025-12-02
- **Description**: Multiple edge cases discovered during testing that need investigation.
- **Symptoms**:
  1. **Empty chat delete fails**: Created a chat, didn't use it. Tried to delete → got error. After adding a message, delete worked.
  2. **Memory not retrieved**: User has existing memory entry ("likes mushrooms") but Pip says "This is our first conversation". Memory lookup may be failing silently.
  3. **New chat inherits nothing**: Starting a fresh chat in same session doesn't carry over user memory context.
- **Investigation Areas**:
  - [ ] Check delete endpoint - does it require messages to exist?
  - [ ] Check memory retrieval in agent orchestrator - is it called on every chat?
  - [ ] Check if memory is scoped per-session vs per-user
  - [ ] Add logging to memory retrieval path
  - [ ] Test: Create user memory → new chat → ask "what do you know about me?"
- **Suspected Root Causes**:
  - Delete: May be checking for session existence incorrectly
  - Memory: Memory service may not be injected into chat context, OR memory search is returning empty
- **Acceptance Criteria**:
  - [ ] Empty chats can be deleted without error
  - [ ] Memory is retrieved and injected into every new chat
  - [ ] User can ask "what do you remember about me?" and get accurate response
- **Related**: Epic 2.1 (Memory Architecture), Epic 2.2 (Chat History)

#### issue_021: Verify Response Styles in Chat
- **Status**: 🔴 Open
- **Priority**: P2 (Medium - feature validation)
- **Component**: `packages/agent-core`, `packages/pwa-app`
- **Description**: Test that Response Styles actually modify Pip's chat responses as intended.
- **Test Plan**:
  - [ ] Set style to "Formal" → Ask a question → Verify professional tone, no contractions
  - [ ] Set style to "Concise" → Ask same question → Verify shorter, bullet-point response
  - [ ] Set style to "Explanatory" → Ask same question → Verify detailed reasoning
  - [ ] Set style to "Learning" → Ask same question → Verify educational tone, defines terms
  - [ ] Set style back to "Normal" → Verify default balanced response
- **Notes**: UI dropdown deployed and working (verified 2025-12-02). Need manual testing of actual response behavior.

#### issue_019: Safety Settings UI - Explanation Box Placement
- **Status**: 🔴 Open
- **Priority**: P2 (Medium - UX clarity)
- **Component**: `packages/pwa-app` (Settings page)
- **Description**: The "Why Safety Settings?" explanation box is visually disconnected from the safety settings it explains, and its styling makes it look like an interactive element (button/card).
- **Current State**:
  - Explanation box appears after Personality and Memory sections
  - Uses card-like styling that suggests clickability
  - Visually separated from the Safety Settings it references
- **Target State**:
  - Explanation should be visually paired with Safety Settings (adjacent or inline)
  - Should NOT look interactive - use muted/helper text styling
  - Consider: inline helper text, collapsible details, or subtle info block
- **Acceptance Criteria**:
  - [ ] Move explanation closer to Safety Settings section
  - [ ] Remove button/card-like appearance
  - [ ] Use helper text styling (smaller, muted color)
  - [ ] Ensure it doesn't look clickable
- **Screenshot**: Settings page showing disconnected explanation box

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
- **Status**: 🟢 Resolved
- **Priority**: - (Complete)
- **Resolved**: 2025-12-01
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
  - [x] Add `is_user_edit` column to observations
  - [x] Create `memory_summaries` table
  - [x] Implement Memory Management API
  - [x] Build Memory Management UI
  - [x] Integration testing on Claude.ai + ChatGPT
- **Complexity**: 2.0-2.8/5 (Medium)
- **Resolution**: All features deployed. Memory Management UI accessible via Settings → Manage memory. See commits `8394d02`, `2566a3d`.

#### issue_012: Chat History (Epic 2.2)
- **Status**: 🟢 Resolved
- **Priority**: - (Complete)
- **Resolved**: 2025-12-01
- **Component**: `packages/server`, `packages/pwa-app`, `packages/core`
- **Blueprint**: feature_2_2_1, feature_2_2_2
- **Description**: Persistent conversation history with vertical tabs sidebar (standard UX pattern like Claude.ai)
- **Acceptance Criteria**:
  - [x] Extend sessions table (title, preview_text columns)
  - [x] Chat title auto-generation from first user message (~50 chars)
  - [x] API endpoints: GET /api/sessions, GET/:id, PATCH/:id, DELETE/:id
  - [x] Collapsible left sidebar component (ChatSidebar.tsx)
  - [x] Chat list with metadata (title, preview, relative timestamp)
  - [x] New chat (+) and delete actions
  - [x] Chat switching with state persistence (Zustand store)
- **Complexity**: 2.5-3.0/5 (Medium-High)
- **Resolution**: Deployed with collapsible sidebar following Claude.ai Pattern 0. See commit `9699c96`.

#### issue_013: Projects Feature (Epic 2.3)
- **Status**: 🟡 In Progress
- **Priority**: P1 (High - differentiator)
- **Component**: `packages/server`, `packages/pwa-app`, `packages/core`
- **Blueprint**: feature_2_3_1 through feature_2_3_4
- **Description**: Isolated context per project/client. Global context still applies, but project-specific details don't bleed across projects. Like Claude.ai Projects with cross-project reference capability.
- **Use Cases**:
  - Different Xero organizations per project
  - Client isolation for accountants
  - Project-specific memory and documents
- **Acceptance Criteria**:
  - [x] Projects schema design and CRUD operations (SQLite)
  - [x] Projects REST API (`/api/projects/*`)
  - [x] Project switcher dropdown in header (ProjectSwitcher.tsx)
  - [x] Session filtering by projectId
  - [ ] Refactor memory service for project_id scoping (decomposed into 4 subtasks)
  - [ ] Multi-Xero org support (per-project OAuth tokens)
  - [ ] Cross-project reference capability (**SPIKE COMPLETE**: spike_m2_001)
  - [ ] Project settings page (full CRUD UI)
  - [ ] Project context indicator in chat UI
- **Complexity**: 2.2-3.2/5 (task_2_3_1_3 decomposed)
- **Flagged**: task_2_3_1_3 decomposed into 4 subtasks (all ≤2.5)
- **Spike**: spike_m2_001 for cross-project reference patterns
- **Commit**: `609c952` - Initial implementation (schema, API, UI)

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
- **Status**: 🔵 Deferred (replaced by issue_020)
- **Priority**: P3 (Future - not MVP critical)
- **Component**: `packages/mcp-remote-server` (system prompts), `packages/core/src/personalities/`
- **Blueprint**: feature_2_5_1 through feature_2_5_5
- **Description**: Switchable character personalities that can change mid-chat without losing context.
- **Spike Complete** (spike_m2_003): ✅
  - Literary analysis, Grok modes research, personality schema defined
  - Adelaide and Pippin profiles created in `packages/core/src/personalities/`
  - `buildPersonalityPrompt()` function implemented
- **Option A - Adelaide Bookkeeper**: Professional, approachable, no jargon
- **Option B - Pippin (LOTR-inspired)**: Playful, warm, surprisingly competent
- **Deferred Reason** (2025-12-02):
  - "Personality" terminology is assumptive - implies the tool has its own character
  - Could scare off business users who want a reliable assistant, not an employee to understand
  - Better approach: Start with neutral "Styles" (issue_020), personality can layer on top later
- **Preserved Assets**:
  - `packages/core/src/personalities/adelaide.ts` - Profile for future use
  - `packages/core/src/personalities/pippin.ts` - Profile for future use
  - `buildPersonalityPrompt()` infrastructure ready
- **Notes**: Not deleted - deferred to post-Styles implementation. Could become premium feature.

#### issue_020: Response Styles (Claude.ai Pattern)
- **Status**: 🟢 Complete
- **Priority**: - (Deployed)
- **Resolved**: 2025-12-02
- **Component**: `packages/pwa-app`, `packages/server`, `packages/core`, `packages/agent-core`
- **Description**: Implement response style selector modeled after Claude.ai's style system (Formal, Explanatory, Concise, Learning, Normal).
- **Rationale**:
  - "Styles" puts control in user's hands (vs "Personality" which implies AI character)
  - More neutral/professional for business tool
  - Could integrate with memory in future (remember style preferences)
  - Direct user request - standard UX pattern from Claude.ai
- **Reference**: Claude.ai Settings → Response Styles dropdown
- **Styles Implemented**:
  - **Normal** (default): Balanced, natural responses
  - **Formal**: Professional tone, complete sentences
  - **Concise**: Brief, to-the-point answers
  - **Explanatory**: Detailed with context and reasoning
  - **Learning**: Educational, explains concepts
- **Acceptance Criteria**:
  - [x] Add `response_style` column to user_settings table
  - [x] Create style definitions (system prompt modifiers)
  - [x] Style selector in Settings page (dropdown matching Claude.ai UI)
  - [x] Apply style to system prompt in agent orchestrator
  - [x] Persist style preference per user
  - [ ] Optional: Quick style toggle in chat header (deferred)
- **Complexity**: 2.0/5 (Low-Medium - simpler than full personality system)
- **Implementation**:
  - `packages/core/src/styles/index.ts` - Style definitions with prompt modifiers
  - `packages/core/src/database/types.ts` - ResponseStyleId type
  - `packages/core/src/database/providers/sqlite.ts` - Migration + CRUD
  - `packages/server/src/routes/settings.ts` - GET /api/settings/styles endpoint
  - `packages/pwa-app/src/pages/SettingsPage.tsx` - Dropdown selector
  - `packages/agent-core/src/orchestrator.ts` - Style injection into system prompt
- **Commit**: `e897c44`

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
- **Status**: ✅ Complete
- **Duration**: 2 days (completed in <1 day)
- **Completed**: 2025-12-01
- **Priority**: - (Done - unblocks feature_2_3_3)
- **Reduces Uncertainty For**: task_2_3_3_1, task_2_3_3_2
- **Blueprint**: `specs/BLUEPRINT-spike-cross-project-reference-20251201.yaml`
- **Description**: Research patterns for cross-project data access (like Claude Code referencing other repos)
- **Research Sources**: Claude Code (`--add-dir`), VS Code (multi-root workspaces), Notion (relations), Xero (multi-org), SaaS multi-tenant patterns
- **Deliverables**:
  - [x] Research report: `docs/research-notes/SPIKE-m2-001-cross-project-patterns.md`
  - [x] API design: `specs/spike-outputs/CROSS-PROJECT-API-DESIGN-20251201.md`
  - [x] POC: `search_nodes` tool extended with `projectIds` parameter
- **Key Decisions**:
  - **Pattern**: Query-time project parameter (like Claude Code's explicit paths)
  - **Access**: Read-only, owner-only (MVP)
  - **Validation**: Max 5 projects per query
  - **Ownership check**: TODO when Projects feature implemented
- **Uncertainty**: Reduced from 4 → 2 ✅

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

#### debt_004: ESLint v9 Flat Config Migration
- **Status**: 🔴 Open
- **Priority**: P3 (Low - lint works locally with IDE plugins)
- **Component**: All packages
- **Description**: ESLint upgraded to v9 which requires flat config (`eslint.config.js`) instead of `.eslintrc.*`
- **Current State**: `pnpm lint` fails across all packages with "ESLint couldn't find an eslint.config.(js|mjs|cjs) file"
- **Acceptance Criteria**:
  - [ ] Migrate each package to eslint.config.js format
  - [ ] Verify `pnpm lint` passes across monorepo
- **Reference**: https://eslint.org/docs/latest/use/configure/migration-guide
- **Notes**: TypeScript compilation (`pnpm build`) provides primary type safety. Lint is secondary quality gate.

#### debt_003: Legacy "zero-agent" Naming Convention
- **Status**: 🟢 Resolved
- **Priority**: - (Complete)
- **Resolved**: 2025-12-01
- **Component**: Multiple (Docker, database, documentation)
- **Description**: Project was rebranded from "Zero Agent" to "Pip" but legacy naming persisted
- **Resolution**:
  - [x] Created `deploy/migrate-naming.sh` for data migration
  - [x] Renamed Docker containers: `zero-agent` → `pip-app`, `pip-mcp`
  - [x] Updated database path: `zero-agent.db` → `pip.db`
  - [x] Updated volume: `zero-agent-data` → `pip-data`
  - [x] Removed unused `zero-agent-network`
  - [x] Updated `deploy/deploy.sh` with new naming
  - [x] Updated `CLAUDE.md` with correct paths
- **Commits**: `24e7419` - migration scripts, `33e3571` - deploy script

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
