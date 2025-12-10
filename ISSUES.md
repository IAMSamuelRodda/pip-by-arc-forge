# Issues Tracking

> **Purpose**: Track **open** bugs, improvements, technical debt, and risks
> **Lifecycle**: Living (add when issues arise, remove when resolved)
> **Resolved Issues**: Move to `CHANGELOG.md` under [Unreleased] → "Resolved Issues" section

**Last Updated**: 2025-12-10 (Migrated resolved issues to CHANGELOG.md - reduced from 1788 lines to ~400 lines)

---

## Status Guide

| Status | Meaning |
|--------|---------|
| 🔴 Open | Issue identified, not yet started |
| 🟡 In Progress | Actively being worked on |
| 🟢 Resolved | Fixed and verified (move to CHANGELOG.md) |
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

### Known Issues (Low Priority)

#### issue_050: Tools Dropdown Z-Index Issue
**Status:** 🔴 Open
**Priority:** P3 (Low - Known issue in Claude.ai too)
**Component:** ChatInputArea - Tools dropdown
**Created:** 2025-12-10

**Description:**
Tools dropdown appears underneath sticky header when opening upward (near bottom of viewport), making top portion unusable. Z-index adjustment from 20 to 50 didn't resolve.

**Impact:**
Minor UX annoyance - users need to scroll up slightly before opening tools menu.

**Workaround:**
Scroll up before opening tools dropdown.

**Notes:**
- Same issue exists in Claude.ai's interface
- Likely requires DOM restructuring or React portal implementation
- Not worth fixing immediately given low impact

---

### High Priority Issues

#### issue_043: Memory System Not Fully Project-Isolated
**Status:** 🟡 Partial
**Priority:** P1 (High - data isolation)
**Component:** \`packages/agent-core/src/orchestrator.ts\`, \`packages/agent-core/src/tools/memory-tools.ts\`
**Created:** 2025-12-10

**Description:** Memory system has project isolation in database queries but requires explicit projectId passing which isn't happening consistently.

**Current State:**
- Database queries correctly filter by \`project_id\` (see \`getMemoryContext\` and memory tools)
- BUT: \`processMessage\` passes \`request.projectId\` but this might be undefined/wrong
- Memory tools accept \`projectId\` as optional parameter - LLM must decide to pass it

**Issues:**
- Chat route receives \`projectId\` from request body, passed to orchestrator ✓
- Orchestrator passes \`projectId\` to \`getMemoryContext\` ✓
- BUT: Memory tools (\`read_memory\`, \`search_memory\`) rely on LLM to pass projectId
- If LLM doesn't pass projectId, queries default to \`project_id IS NULL\` (global scope)

**Risk:** Memory from Project A could leak to Project B if projectId not consistently passed

**Fix Strategy:** Auto-inject projectId into tool execution context, don't rely on LLM parameter

**Complexity:** 2.0/5 (Low-Medium)

---

### Medium Priority Issues

#### issue_044: Remove Global currentProjectId Dependency
**Status:** 🔴 Open
**Priority:** P2 (Medium - architectural improvement)
**Component:** \`packages/pwa-app/src/store/projectStore.ts\`, \`packages/pwa-app/src/store/chatStore.ts\`
**Created:** 2025-12-10

**Description:** Global \`currentProjectId\` state causes subtle bugs and race conditions. Should be refactored to explicit parameter passing.

**Current Problems:**
- Multiple places set \`currentProjectId\` (newChat, loadProjects, setCurrentProject)
- Timing of these operations can cause unexpected state
- Persisted state survives page refreshes inappropriately
- \`sendMessage\` reads global state instead of receiving explicit parameter

**Proposed Architecture:**
- Remove \`currentProjectId\` from persisted state (or scope persistence to UI preference only)
- \`sendMessage(content, options: { sessionId?, projectId?, model? })\`
- Project context derived from URL (\`/projects/:projectId\`) not global store
- Chat component receives projectId as prop, not from global state

**Benefits:** Eliminates race conditions, clearer data flow, easier to debug

**Complexity:** 3.0/5 (Medium-High - significant refactoring)

---

#### issue_036: Collapsible Thinking + Tool Call Visibility
**Status:** 🔴 Open
**Priority:** P2 (Medium - UX improvement)
**Component:** \`packages/pwa-app/src/components/ChatMessage.tsx\`
**Created:** 2025-12-03

**Description:** Add collapsible \`<think>...</think>\` blocks and tool call data visibility following Claude Code pattern

**Requirements:**
- Detect and render \`<think>\` blocks as collapsible sections (default: collapsed)
- Show tool calls with input/output data (for debugging)
- Preserve markdown rendering for non-thinking content

**Complexity:** 2.0/5 (Low-Medium - UI enhancement)

---

#### issue_021: Verify Response Styles in Chat
**Status:** 🔴 Open
**Priority:** P2 (Medium - validation)
**Component:** \`packages/pwa-app\`, \`packages/agent-core\`
**Created:** 2025-12-02

**Description:** Verify that Response Styles (Normal, Formal, Concise, Explanatory, Learning) actually affect AI behavior in chat

**Test Plan:**
1. Set style to "Concise" in Settings
2. Start new chat and ask a question
3. Verify response is shorter/more direct than Normal style
4. Repeat for all 5 styles

**Acceptance Criteria:**
- [ ] Style changes persist across page refresh
- [ ] Different styles produce noticeably different responses
- [ ] Current style displays correctly in Tools menu

**Complexity:** 1.0/5 (Low - testing only)

---

### Feature Requests / Improvements

#### issue_037: Intelligent Business vs Personal Expense Separation
**Status:** ⚠️ Flagged (VISION STAGE)
**Priority:** P3 (Future - Milestone 3+)
**Component:** New feature
**Created:** 2025-12-09

**Description:** Enable sole traders to answer "What can I actually spend?" by separating business/personal transactions and reserving tax money.

**Target Users:** Sole traders operating from mixed personal/business accounts

**Core Capabilities:**
- Transaction categorization (business vs personal)
- Tax reservation tracking
- Available balance calculation
- Smart expense detection (patterns, learning)

**Status:** Vision-stage planning complete. Requires spikes before implementation.

**Blueprint:** \`specs/BLUEPRINT-feature-expense-separation-20251209.yaml\`

**Complexity:** TBD (requires spike - likely 4.0+/5)

---

#### issue_034: Skills System - Report Templates & Agent Capabilities
**Status:** 🔴 Open
**Priority:** P1 (High - core value prop)
**Component:** \`packages/agent-core\`
**Created:** 2025-12-02

**Description:** Implement agent skills/capabilities system for report templates and specialized workflows

**Examples:**
- "Generate monthly financial summary" → Load reporting skill
- "Tax time prep" → Load tax preparation skill
- "Overdue invoice follow-up" → Load collections skill

**Requirements:**
- Skill definition schema (YAML or JSON)
- Skill loading system
- Prompt injection for skill context
- UI for skill selection/activation

**Complexity:** 3.5/5 (Medium-High - new subsystem)

---

#### issue_016: Light/Dark Mode Theme Support
**Status:** 🔴 Open
**Priority:** P3 (Low - nice to have)
**Component:** \`packages/pwa-app\`
**Created:** 2025-12-01

**Description:** Add theme toggle for light/dark mode (currently dark mode only)

**Requirements:**
- Theme toggle in Settings
- Light theme CSS variables
- Persist theme preference in localStorage
- Respect system preference (prefers-color-scheme)

**Complexity:** 2.0/5 (Low-Medium - CSS/state management)

---

#### issue_017: Ollama Model Warm-Up Strategy
**Status:** 🔴 Open
**Priority:** P3 (Low - optimization)
**Component:** \`packages/agent-core\`
**Created:** 2025-12-01

**Description:** First request to Ollama model has ~10s delay while model loads. Implement warm-up strategy.

**Options:**
1. Background ping on server start (simple but wastes resources)
2. Warm up on first user login (better UX)
3. LRU cache with auto-unload (complex but optimal)

**Complexity:** 2.5/5 (Medium - depends on approach)

---

### Technical Debt

#### debt_004: ESLint v9 Flat Config Migration
**Status:** 🔴 Open
**Priority:** P3 (Low - deferred)
**Component:** Build tooling
**Created:** 2025-12-01

**Description:** Migrate from eslintrc to flat config (ESLint v9)

**Rationale for Deferral:** Current config works, migration provides no immediate value

**Complexity:** 1.5/5 (Low - mechanical change)

---

#### issue_024: DESIGN.md Visual Reference Workflow
**Status:** 🔴 Open
**Priority:** P3 (Low - future)
**Component:** Documentation
**Created:** 2025-12-02

**Description:** Establish workflow for visual design references (screenshots, mockups)

**Problem:** DESIGN.md becomes stale as UI evolves
**Proposed:** Move to wiki or use screenshot-based system with version tags

**Complexity:** 1.0/5 (Low - process change)

---

## Archive Policy

**Resolved issues** should be moved to \`CHANGELOG.md\` under [Unreleased] → "Resolved Issues (Migrated from ISSUES.md)" section with:
- Root cause analysis
- Key learnings and patterns
- File references and commit hashes

This keeps ISSUES.md focused on current work while preserving historical context in CHANGELOG.

---

**See Also:**
- \`CHANGELOG.md\` - Resolved issues with learnings and patterns
- \`STATUS.md\` - Current sprint focus and recently completed work
- \`PROGRESS.md\` - Detailed task tracking
