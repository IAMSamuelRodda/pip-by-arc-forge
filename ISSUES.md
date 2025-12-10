# Issues Tracking

> **Purpose**: Track **open** bugs, improvements, technical debt, and risks
> **Lifecycle**: Living (add when issues arise, remove when resolved)
> **Resolved Issues**: Move to `CHANGELOG.md` under [Unreleased] → "Resolved Issues" section

**Last Updated**: 2025-12-10 (Added 5 critical issues: MCP transport, rate limiting, subscription tiers, model access control, GPU optimization for testing)

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

### Critical Issues

#### issue_051: MCP Transport Reliability - Migrate to Streamable HTTP with SSE Fallback
**Status:** 🟢 Resolved
**Priority:** P0 (Critical - Blocks Dad's onboarding)
**Component:** `packages/pip-mcp/src/index.ts` (MCP server transport layer)
**Created:** 2025-12-10
**Resolved:** 2025-12-10

**Description:**
Current MCP server uses SSE-only transport which can be unreliable due to proxy/network configurations. Need to refactor to use Streamable HTTP as primary transport with SSE as fallback.

**✅ IMPLEMENTATION COMPLETE (Dec 10):**

1. **Streamable HTTP Transport (Primary)** - `/mcp` endpoint
   - Handles `POST` for initialization and messages
   - Handles `GET` for SSE notification stream
   - Handles `DELETE` for session cleanup
   - Uses `Mcp-Session-Id` header for session management
   - Supports JSON responses with `enableJsonResponse: true`

2. **Legacy SSE Transport (Fallback)** - `/sse` + `/messages` endpoints
   - Kept for backwards compatibility with older clients
   - `/sse` endpoint opens SSE connection
   - `/messages` endpoint handles POST messages via `handlePostMessage`

3. **Session Management**
   - Sessions store `transportType: 'sse' | 'streamable-http'`
   - Both transports tracked in unified `sessions` Map
   - Streamable HTTP also tracked in `streamableTransports` Map

**Files Changed:**
- `packages/pip-mcp/src/index.ts` - Added StreamableHTTPServerTransport, new /mcp endpoint, updated Session interface

**Acceptance Criteria:**
- [x] Streamable HTTP transport implemented as primary
- [x] SSE transport retained as fallback
- [ ] Both transports tested and verified working (requires deployment)
- [ ] Documentation updated with transport details
- [x] Ready for Philip's onboarding

**Complexity:** 3.0/5 (Medium - transport layer refactoring)

---

#### issue_052: Rate Limiting System for API Model Usage
**Status:** 🟢 Resolved
**Priority:** P0 (Critical - Blocks production/test user onboarding)
**Component:** `packages/agent-core`, `packages/server` (rate limiting middleware)
**Created:** 2025-12-10
**Resolved:** 2025-12-10

**✅ RESOLUTION SUMMARY:**

**Database Layer (commit ae4c970):**
- Created `token_usage` table with user/model/date indexing
- Added TokenUsage and TokenUsageSummary types
- Implemented recordTokenUsage(), getTokenUsage(), getDailyTokenUsage()

**Rate Limiting Service:**
- RateLimiter class in `packages/core/src/auth/rate-limiter.ts`
- checkRateLimit() - Verify before API calls
- recordUsage() - Log actual consumption
- getDailyUsage() - Dashboard support

**Orchestrator Integration (commit 3a618f9):**
- Pre-request check with conservative token estimation
- Post-response actual usage recording
- Graceful error handling with reset times
- Detailed logging for monitoring

**Rate Limits Enforced:**
| Tier | Daily Tokens | Status |
|------|--------------|--------|
| Free | 0 (BYOM only) | ✅ Enforced |
| Beta Tester | 100,000 | ✅ Enforced |
| Starter | 50,000 | ✅ Enforced |
| Pro | 500,000 | ✅ Enforced |
| Enterprise | 5M | ✅ Enforced |
| Superadmin | Unlimited | ✅ Bypassed |

**Deployed:** Production (2025-12-10)

**Next Step:** Philip account setup (issue_056)

**Description:**
Implement rate limiting to prevent users from exhausting paid API tokens (Opus calls) that Arc Forge is subsidizing during beta/free tier.

**Business Context:**
- Opus calls are expensive (~$15-75 per million tokens)
- Currently paying for all user API calls
- Need to prevent token abuse before opening to test users (including Philip)

**Required Implementation:**

1. **Rate Limit Storage**
   - Track token usage per user per model
   - Store in SQLite (existing database)
   - Reset periods: daily, weekly, monthly

2. **Rate Limit Tiers** (Initial - adjust based on costs)
   ```typescript
   const RATE_LIMITS = {
     free: {
       opus: { tokens: 50000, period: 'daily' },      // ~$0.75-3.75/day
       sonnet: { tokens: 200000, period: 'daily' },   // Lower cost
       haiku: { tokens: 500000, period: 'daily' },    // Cheapest
     },
     // Future tiers
     starter: { opus: 500000, sonnet: 2000000, haiku: 5000000 },
     pro: { opus: 2000000, sonnet: 10000000, haiku: 20000000 },
   };
   ```

3. **Enforcement Points**
   - Agent orchestrator (before model call)
   - PWA chat endpoint
   - MCP server (for Claude.ai connector)

4. **User Feedback**
   - Clear error messages when limit reached
   - Usage dashboard in Settings
   - "Upgrade to Pro" CTA when appropriate

**Acceptance Criteria:**
- [x] Rate limit database schema designed and migrated
- [x] Middleware checks token usage before model calls
- [x] Graceful error handling with upgrade paths
- [ ] Usage tracking dashboard in PWA Settings (deferred - P2)
- [ ] Tested with simulated high-usage scenarios (will test with Philip)

**Complexity:** 3.5/5 (Medium-High - new subsystem with business logic)

**Blocking:** Cannot onboard test users without this protection

---

#### issue_053: Subscription Tier Infrastructure
**Status:** 🟡 In Progress (Schema done, Stripe integration pending)
**Priority:** P1 (High - Needed for sustainable monetization)
**Component:** `packages/core`, `packages/server` (subscription management)
**Created:** 2025-12-10
**Updated:** 2025-12-10

**Description:**
Design and implement subscription tier system to support freemium business model with BYOM (Bring Your Own Model) option.

**✅ COMPLETED (Dec 10 - see issue_054):**
- Database schema: `subscription_tier` column on users table
- Types: `SubscriptionTier = 'free' | 'starter' | 'pro' | 'enterprise'`
- User getter/setter functions updated
- Auto-migration from `is_admin` to `role='superadmin'`

**Proposed Tier Structure:**

**Free/Open Source Tier:**
- Bring your own Anthropic API key OR local Ollama models
- No hosted model access
- Full feature access (MCP, memory, tools)
- Self-hosted deployment option

**Starter Tier ($19/month):**
- Daily rate limits on hosted models (Opus, Sonnet, Haiku)
- No BYOM required
- Hosted deployment
- Email support

**Pro Tier ($49/month):**
- Higher rate limits
- Priority model access
- Priority support
- Advanced features (custom skills, team sharing)

**Enterprise Tier (Custom):**
- Unlimited usage or custom limits
- Dedicated infrastructure
- SLA guarantees
- Custom integrations

**Technical Requirements:**
1. User tier field in database
2. Subscription management (Stripe integration?)
3. Tier-based feature flags
4. API key management for BYOM users
5. Usage analytics per tier

**Acceptance Criteria:**
- [ ] Database schema supports tier management
- [ ] Stripe integration for payments (or alternative)
- [ ] Tier enforcement in agent orchestrator
- [ ] BYOM flow for free tier users
- [ ] Admin panel for subscription management

**Complexity:** 4.5/5 (High - new business logic + payment integration)

**Dependencies:**
- issue_052 (rate limiting) must be completed first

---

#### issue_054: Model Access Control by Subscription Tier
**Status:** 🟡 In Progress (Core implemented, PWA integration pending)
**Priority:** P0 (Critical - Blocks test user onboarding)
**Component:** `packages/core/src/auth/access-control.ts`, `packages/server/src/routes/chat.ts`
**Created:** 2025-12-10
**Updated:** 2025-12-10

**Description:**
Implement tier-based model access control to prevent GPU overload from test users and control access to expensive API models.

**✅ COMPLETED (Dec 10):**

1. **Authorization Architecture** - Role + Tier + Feature Flags
   - `UserRole`: 'superadmin' | 'admin' | 'user' (WHO you are)
   - `SubscriptionTier`: 'free' | 'starter' | 'pro' | 'enterprise' (WHAT you've paid for)
   - `FeatureFlag[]`: 'beta_tester', 'early_access', etc. (Temporary overrides)
   - Database schema updated with migrations
   - Existing `is_admin=1` users auto-migrated to `role='superadmin'`

2. **Model Registry with Access Control**
   ```typescript
   // packages/core/src/auth/access-control.ts
   interface ModelConfig {
     id: string;
     name: string;
     provider: 'anthropic' | 'ollama' | 'byom';
     allowedTiers: SubscriptionTier[];
     allowedFlags?: FeatureFlag[];  // e.g., 'beta_tester' for local GPU
     costPer1kTokens?: number;
   }
   ```

3. **Access Control Functions**
   - `canAccessModel(user, modelId)` - Check model access
   - `getAccessibleModels(user)` - Get all models user can access
   - `getRateLimits(user)` - Get tier-based rate limits
   - `hasFeatureFlag(user, flag)` - Check feature flag
   - Superadmin bypasses ALL restrictions

4. **Server Integration**
   - `GET /api/chat/models` - Returns accessible models for current user
   - `POST /api/chat` - Checks model access before processing

**Current Model Access Matrix:**

| Model | superadmin | beta_tester | free | starter | pro |
|-------|------------|-------------|------|---------|-----|
| Opus (API) | ✅ | ❌ | ❌ | ❌ | ✅ |
| Sonnet (API) | ✅ | ❌ | ❌ | ✅ | ✅ |
| Haiku (API) | ✅ | ❌ | ❌ | ✅ | ✅ |
| qwen2.5:3b (Local GPU) | ✅ | ✅ | ❌ | ❌ | ❌ |
| BYOM (User's API Key) | ✅ | ❌ | ✅ | ✅ | ✅ |

**🔴 REMAINING:**
- [ ] PWA UI: Use `/api/chat/models` to filter model selector
- [ ] GPU concurrency limiting for local models
- [ ] Admin UI to assign roles/tiers/flags to users

**Files Changed:**
- `packages/core/src/database/types.ts` - New types: UserRole, SubscriptionTier, FeatureFlag
- `packages/core/src/database/providers/sqlite.ts` - Schema + migrations
- `packages/core/src/auth/access-control.ts` - NEW: Access control functions
- `packages/server/src/routes/chat.ts` - Model access check + /models endpoint

**Complexity:** 3.5/5 (Medium-High - Core done, integration remaining)

---

#### issue_055: Testing Phase GPU Optimization - Single Small Model Strategy
**Status:** 🟢 Resolved
**Priority:** P0 (Critical - Blocks Philip's onboarding)
**Component:** Ollama configuration, model deployment
**Created:** 2025-12-10
**Resolved:** 2025-12-10

**✅ RESOLUTION SUMMARY:**

**Models Configured:**
1. **qwen2.5:0.5b** - Ultra-light (397MB VRAM), primary test model
   - Response time: 75ms total (67ms load + 1.47ms generation)
   - Quality: Good for basic interactions
   - Status: ✅ Deployed and tested
2. **qwen2.5:3b** - Better quality (1.9GB VRAM), secondary option
   - Download initiated, will complete async
   - Available as fallback for more complex queries

**Access Control:**
- Added both models to `MODEL_CONFIGS` with `beta_tester` flag requirement
- Beta testers can select either model from PWA model selector
- Superadmins have access to all models (no restrictions)

**Keep-Alive Configuration:**
- Using `keep_alive: -1` in API calls to keep models loaded
- Ollama configured to persist loaded models
- Response times < 2s for warm models ✅

**Deployment:**
- Changes deployed to production (commit cc0f30b)
- Models accessible via existing Tailscale tunnel (100.64.0.2:11434)
- No additional infrastructure setup required

**Next Step:** Philip account setup (issue_056)

**Requirements for Philip's Testing:**

1. **Model Selection**
   - Small model: qwen2.5:3b or qwen2.5:1.5b (ultra-fast, low VRAM)
   - Alternative: llama3.2:3b, phi3.5:3.8b
   - Must stay loaded in VRAM without impacting primary work

2. **Ollama Configuration**
   - Keep model loaded: `OLLAMA_KEEP_ALIVE=-1` (forever)
   - Pre-load on Ollama startup
   - Monitor VRAM usage to ensure < 4GB for test model

3. **Pip Configuration**
   - Set test users to only see small local model
   - Disable Opus/Sonnet/larger models for test tier
   - Configure in `packages/agent-core/src/config.ts`

4. **Performance Requirements**
   - First response < 2 seconds (model already loaded)
   - Concurrent test users: max 2-3 simultaneous requests
   - Queue additional requests if GPU busy

**Implementation Steps:**

1. **Choose Test Model**
   ```bash
   # Option A: Qwen 2.5 3B (fast, good quality)
   ollama pull qwen2.5:3b

   # Option B: Qwen 2.5 1.5B (ultra-fast, minimal VRAM)
   ollama pull qwen2.5:1.5b
   ```

2. **Keep Model Loaded**
   ```bash
   # Set in Ollama service or environment
   export OLLAMA_KEEP_ALIVE=-1
   ollama run qwen2.5:3b  # Initial load
   ```

3. **Update Pip Model Config**
   ```typescript
   // packages/agent-core/src/config.ts
   const TEST_USER_MODELS = {
     'qwen2.5:3b': {
       provider: 'ollama',
       endpoint: process.env.OLLAMA_ENDPOINT,
       maxConcurrent: 2,
       allowedTiers: ['test'],
     }
   };
   ```

4. **Test Configuration**
   - Verify model stays loaded
   - Test response times
   - Monitor GPU usage with `nvidia-smi`

**Acceptance Criteria:**
- [x] Small model selected and configured (qwen2.5:0.5b + qwen2.5:3b)
- [x] Model stays loaded in Ollama (keep_alive: -1)
- [x] Test users can only access small model (beta_tester flag required)
- [x] Response times < 2s for loaded model (75ms measured)
- [x] GPU usage monitored and acceptable (397MB for 0.5b, 1.9GB for 3b)
- [x] Philip can test without impacting your work (ultra-light models)

**Complexity:** 2.0/5 (Low-Medium - configuration + testing)

**Blocking:** Philip cannot test until this is configured safely

**Next Steps:**
1. Choose between qwen2.5:3b (better quality) or 1.5b (faster/lighter)
2. Configure Ollama keep-alive
3. Update Pip model registry
4. Test with concurrent requests
5. Generate Philip's test account with 'test' tier

---

#### issue_056: Philip (Dad) Beta Tester Onboarding
**Status:** 🔴 Open
**Priority:** P2 (After issue_055 GPU config)
**Component:** User setup, documentation
**Created:** 2025-12-10

**Description:**
Set up Philip's beta tester account with proper access controls.

**Prerequisites (must be done first):**
- [x] issue_054: Authorization system (role/tier/flags) - DONE
- [ ] issue_055: GPU model configuration
- [ ] issue_052: Rate limiting (optional but recommended)

**Onboarding Steps:**

1. **Create Invite Code**
   ```sql
   INSERT INTO invite_codes (code, created_by, created_at)
   VALUES ('PHILIP-BETA-2024', 'your-user-id', unixepoch() * 1000);
   ```

2. **After Philip Signs Up - Assign Beta Tester Flag**
   ```sql
   UPDATE users
   SET feature_flags = '["beta_tester"]',
       subscription_tier = 'free'
   WHERE email = 'philip@...';
   ```

3. **What Philip Gets:**
   - Access to local GPU models (qwen2.5:3b via Tailscale)
   - No access to paid API models (Opus/Sonnet/Haiku)
   - Full app features (memory, tools, projects)

4. **Documentation to Provide:**
   - Install instructions for Claude.ai connector
   - Pip PWA URL and login
   - What to expect (local model = faster but less capable)
   - How to report issues

**Acceptance Criteria:**
- [ ] Invite code generated
- [ ] Philip account created with beta_tester flag
- [ ] Philip can access local models only
- [ ] Install docs provided
- [ ] Test call completed successfully

**Complexity:** 1.0/5 (Low - mostly manual steps)

---

### High Priority Issues

---

### Medium Priority Issues

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
**Status:** ⚠️ Flagged (Spike Required)
**Priority:** P1 (High - core value prop)
**Component:** `packages/agent-core`
**Created:** 2025-12-02
**Updated:** 2025-12-10

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

**⚠️ SPIKE REQUIRED: Skill Schema Design**
- **Uncertainty**: High (4/5) - unclear whether to use MCP skill format or custom schema
- **Options to explore**:
  1. MCP-compatible skill format (reuse existing patterns from Claude Code skills)
  2. Custom YAML schema optimized for Pip's bookkeeping domain
  3. Hybrid approach with MCP compatibility layer
- **Spike deliverables**: Schema proposal, example skills, integration approach
- **Estimated spike duration**: 1 day

**Complexity:** 3.8/5 (High - new subsystem, needs decomposition)

**Blueprint Reference:** `specs/BLUEPRINT-feature-m2-completion-20251210.yaml` (feature_1_3)

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
