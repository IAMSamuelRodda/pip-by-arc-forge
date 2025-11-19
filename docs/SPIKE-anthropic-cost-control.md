# SPIKE: Anthropic API Cost Control for Multi-Tenant SaaS

**Created**: 2025-11-17
**Status**: Critical - Blocks production deployment
**Owner**: Architecture team

---

## Problem Statement

Zero Agent is a multi-tenant SaaS application built on Anthropic's Claude API. However, Anthropic's API:
- Uses pay-per-token billing (no flat-rate subscriptions)
- Provides no native cost attribution per tenant/customer
- Offers no built-in rate limiting or budget controls per API key

**Risk**: Without proper cost controls, a single user could generate thousands of dollars in API costs.

---

## Research Findings

### Anthropic Billing Models (2025)

**API Pricing (Pay-per-token only)**:
- Claude Sonnet 4.5: $3 input / $15 output per MTok
- Claude Haiku 3.5: $0.80 input / $4 output per MTok

**Volume Discounts**:
- Available for high-volume users
- Requires direct sales contact: [email protected]
- No published pricing tiers

**Enterprise Plans**:
- ~$50,000/year minimum ($60/seat × 70 seats × 12 months)
- Designed for direct Claude.ai usage (NOT API reselling)
- Features: SSO, SCIM, audit logs

**Key Limitation**:
> Anthropic does not provide programmatic cost tracking per customer/tenant. Developers must implement their own usage tracking and rate limiting.

Source: [GitHub Issue #276](https://github.com/anthropics/claude-quickstarts/issues/276)

---

## Cost Modeling

### Assumptions
- Average conversation: 20 messages
- Average message: 500 input tokens, 200 output tokens
- User behavior: 10 conversations/month

### Cost per User (Claude Sonnet 4.5)

**Single Conversation**:
- Input: 20 msgs × 500 tokens = 10,000 tokens = $0.03
- Output: 20 msgs × 200 tokens = 4,000 tokens = $0.06
- **Total: $0.09 per conversation**

**Monthly per User**:
- 10 conversations × $0.09 = **$0.90/month**

### Subscription Tier Economics

Based on current FREE/PRO/ENTERPRISE model (from ARCHITECTURE.md):

| Tier | User Price | Conv/Month | API Cost | Margin |
|------|-----------|------------|----------|--------|
| Free | $0 | 5 | $0.45 | -$0.45 |
| Pro | $20 | 100 | $9.00 | +$11.00 |
| Enterprise | $100 | Unlimited | ??? | ⚠️ Risk |

**Issues**:
1. **Free tier loses money** on every active user
2. **Pro tier has healthy margins** if usage stays under ~220 conversations
3. **Enterprise "unlimited" is unsustainable** - need hard caps

---

## Architecture Requirements

### Must-Have Controls (MVP)

1. **Token Usage Tracking**
   - DynamoDB schema: Store `tokens_input`, `tokens_output` per session
   - Real-time accumulation per user/month
   - GSI: `userId-monthKey` for efficient lookups

2. **Rate Limiting Middleware**
   - Free: 5 conversations/month OR 50k tokens/month
   - Pro: 100 conversations/month OR 1M tokens/month
   - Enterprise: 500 conversations/month OR 10M tokens/month
   - Enforce BEFORE calling Claude API

3. **Budget Alerts**
   - CloudWatch alarm: Total monthly spend > $100
   - CloudWatch alarm: Single user > $50/day
   - Email notifications to admin

4. **Graceful Degradation**
   - Soft limit (90%): Warning message to user
   - Hard limit (100%): Block requests, upgrade prompt
   - Grace period: 24 hours before hard block

### Nice-to-Have (Post-MVP)

5. **Model Selection by Tier**
   - Free: Haiku only ($0.80/$4 per MTok - 73% cheaper)
   - Pro: Sonnet 4.5
   - Enterprise: Opus option

6. **Conversation Caching**
   - Store common responses (invoice templates, help text)
   - Reduce redundant API calls

7. **Cost Dashboard**
   - Real-time cost tracking per user
   - Monthly burn rate projections
   - Top spenders list

---

## Implementation Plan

### Phase 1: Token Tracking (CRITICAL - Do First)

**DynamoDB Schema Addition**:
```typescript
interface Session {
  // Existing fields...
  tokens_input_total: number;
  tokens_output_total: number;
  cost_usd: number;  // Calculated field
  last_updated: string;
}

interface UserMonthlyUsage {
  PK: string;  // USER#userId
  SK: string;  // USAGE#2025-11
  tokens_input: number;
  tokens_output: number;
  cost_usd: number;
  conversations_count: number;
  last_updated: string;
}
```

**Lambda Middleware**:
```typescript
// In agent Lambda - AFTER Claude API call
const usage = response.usage;  // Anthropic returns token counts
await updateUsage({
  userId,
  month: '2025-11',
  tokensInput: usage.input_tokens,
  tokensOutput: usage.output_tokens
});
```

### Phase 2: Rate Limiting (CRITICAL - Do Second)

**Before Claude API Call**:
```typescript
const usage = await getUserMonthlyUsage(userId, currentMonth);
const tier = await getUserTier(userId);
const limit = TIER_LIMITS[tier];

if (usage.tokens_input + usage.tokens_output >= limit.monthlyTokens) {
  throw new Error('Monthly limit reached. Upgrade to continue.');
}
```

### Phase 3: Monitoring (Important)

**CloudWatch Alarms**:
- Metric: Custom `TotalMonthlyCost` (from DynamoDB)
- Threshold: $100/month
- Action: SNS → Email to admin

### Phase 4: Model Selection (Optimization)

**Free Tier → Haiku**:
- Reduces free tier cost from $0.45 to $0.12 per user (73% savings)
- Acceptable quality for basic queries

---

## Testing Strategy

### Development Testing (Current Blocker)

**Problem**: How do we test without burning through personal Anthropic credits?

**Solutions**:
1. **Strict Local Rate Limiting**
   - Dev environment: 100 requests/day max
   - Automated tests: Use mocked responses (no real API calls)
   - Manual testing: Track usage in DynamoDB from day one

2. **Anthropic API Key Isolation**
   - Separate API keys: Production vs. Dev/Testing
   - Dev key: Set up billing alerts at $10/month threshold
   - Use Haiku for all dev testing (cheaper)

3. **Mock Mode Toggle**
   - Environment variable: `MOCK_ANTHROPIC=true`
   - Returns canned responses for common scenarios
   - Only use real API for critical integration tests

### Load Testing

**Challenge**: Can't load test without huge costs.

**Approach**:
1. Build cost estimator based on conversation patterns
2. Test with 10 real conversations, extrapolate to 1000
3. Use Anthropic's rate limit tiers to estimate scale

---

## Subscription Model Revision

### Recommended Changes

**Current Model** (ARCHITECTURE.md):
- Free: Full features, unlimited
- Pro: $20/month, unlimited
- Enterprise: $100/month, unlimited

**Revised Model** (Sustainable):
- **Free**: 5 conversations/month (Haiku model)
  - API cost: ~$0.12/user/month
  - Purpose: Lead generation, trial experience

- **Pro**: $20/month, 100 conversations/month (Sonnet 4.5)
  - API cost: ~$9/user/month
  - Margin: $11/user/month (55%)
  - Overages: $0.15 per additional conversation

- **Enterprise**: $100/month, 500 conversations/month (Sonnet 4.5 + Opus option)
  - API cost: ~$45/user/month
  - Margin: $55/user/month (55%)
  - Includes: Priority support, custom integrations

**Key Changes**:
1. ❌ Remove "unlimited" claims (unsustainable)
2. ✅ Add hard caps with overage pricing
3. ✅ Use cheaper Haiku for free tier
4. ✅ Maintain 50%+ margins on paid tiers

---

## Open Questions

1. **Volume Discounts**: At what usage level should we contact Anthropic sales for custom pricing?
   - Recommendation: $1000/month in API costs (~110 Pro users)

2. **Overage Handling**: Should we auto-upgrade users who hit limits?
   - Recommendation: Soft block + upgrade prompt (no auto-billing)

3. **Refunds**: What if users don't use their allocation?
   - Recommendation: No refunds (standard SaaS practice)

4. **Rollover**: Do unused conversations roll over month-to-month?
   - Recommendation: No rollover (simplifies accounting)

---

## Decision

**BLOCKED**: Cannot proceed to production without implementing Phase 1 (Token Tracking) and Phase 2 (Rate Limiting).

**Next Steps**:
1. ✅ Update DynamoDB schema with usage tracking
2. ✅ Implement rate limiting middleware in Lambda
3. ✅ Set up CloudWatch cost alarms
4. ✅ Update ARCHITECTURE.md with revised subscription model
5. ✅ Add usage dashboard to PWA
6. 🔄 Re-validate business model with revised economics

**Estimated Effort**: 3-5 days for Phase 1-2 implementation

---

## References

- [Anthropic API Pricing](https://docs.claude.com/en/docs/about-claude/pricing)
- [Feature Request: Cost Tracking Per Tenant](https://github.com/anthropics/claude-quickstarts/issues/276)
- Project: ARCHITECTURE.md (subscription model)
- Skill: `aws-cost-optimizer` (cost control patterns)
