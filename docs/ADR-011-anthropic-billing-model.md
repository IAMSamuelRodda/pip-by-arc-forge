# ADR-011: Anthropic API Billing Model Selection

**Status**: Proposed
**Date**: 2025-11-17
**Deciders**: Architecture team
**Related**: ADR-003 (Subscription tiers), SPIKE-anthropic-cost-control.md

---

## Context

Zero Agent needs to integrate with Anthropic's Claude API for conversational AI. We must decide how to handle Anthropic API costs and billing in a multi-tenant SaaS context.

**Key Constraint**: Anthropic does NOT provide:
- Public OAuth API for third-party apps
- Multi-tenant cost attribution
- Pooled subscription models for resellers

**Two Primary Options**:
1. **BYOK (Bring Your Own Key)** - Users provide their own Anthropic API keys
2. **Shared Key with Usage Tracking** - Zero Agent uses a single API key and tracks usage

---

## Decision Drivers

1. **User Experience**: Simplicity of onboarding and billing
2. **Cost Control**: Ability to prevent runaway costs
3. **Margins**: Revenue model sustainability
4. **Technical Complexity**: Implementation and maintenance effort
5. **Compliance**: Data privacy and security requirements

---

## Option 1: BYOK (Bring Your Own API Key)

### How It Works

**Similar to**: Claude Code, Cursor IDE, JetBrains AI

**User Flow**:
1. User creates Anthropic Console account (https://console.anthropic.com)
2. User generates API key in Console
3. User pastes API key into Zero Agent settings
4. Zero Agent makes API calls using user's key
5. Anthropic bills user directly based on their usage

**Architecture**:
```
User → Zero Agent (stores encrypted API key) → Claude API
                                                    ↓
                                            User's Anthropic Account
                                                    ↓
                                            Anthropic bills user directly
```

**Zero Agent Subscription Model**:
- Free: Xero integration only (no agent features)
- Pro: $10/month - Access to agent features, unlimited conversations
- Enterprise: $50/month - Multi-user, custom integrations

### Pros ✅

1. **Zero API Cost Risk**: Users pay Anthropic directly, no cost surprises for us
2. **Simple Implementation**: No usage tracking/rate limiting needed
3. **Transparent Pricing**: Users see exact API costs from Anthropic
4. **Scalable**: No volume discount negotiations needed
5. **Developer Friendly**: Power users already have API keys
6. **Privacy**: User's API key = their data isolation

### Cons ❌

1. **Higher Friction Onboarding**: Users must:
   - Create Anthropic account
   - Add payment method to Anthropic
   - Generate API key
   - Paste into Zero Agent
   - Manage two billing relationships

2. **Support Burden**: Users may blame Zero Agent for Anthropic billing issues
3. **Feature Limitations**: Can't offer "free tier" with agent features
4. **Key Management**: Users may lose/leak API keys
5. **Churn Risk**: Extra billing complexity may reduce conversions

### Cost Analysis

**For User**:
- Anthropic Pro subscription: $20/month (for Haiku, Sonnet, Opus access)
  - OR pay-per-use: ~$1-10/month depending on usage
- Zero Agent subscription: $10/month
- **Total: $11-30/month**

**For Us**:
- Revenue: $10/month per user
- Costs: AWS infrastructure (~$0.80/month shared across users)
- **Margin: ~99% after scale**

---

## Option 2: Shared Key with Usage Tracking

### How It Works

**Similar to**: ChatGPT, Midjourney, most consumer AI SaaS

**User Flow**:
1. User signs up for Zero Agent
2. User selects subscription tier (Free/Pro/Enterprise)
3. Zero Agent uses its own Anthropic API key
4. Usage is tracked and enforced per tier limits
5. Zero Agent bills user for subscription

**Architecture**:
```
User → Zero Agent (shared API key, usage tracking) → Claude API
          ↓                                             ↓
    DynamoDB tracks                          Zero Agent's Anthropic Account
    user token usage                                    ↓
          ↓                                   Zero Agent pays Anthropic
    Enforce tier limits
          ↓
    Bill user monthly
```

**Zero Agent Subscription Model** (from SPIKE doc):
- Free: 5 conversations/month (Haiku model) - $0, cost: $0.12
- Pro: 100 conversations/month (Sonnet 4.5) - $20/month, cost: $9
- Enterprise: 500 conversations/month (Sonnet 4.5) - $100/month, cost: $45

### Pros ✅

1. **Simple User Experience**: One signup, one billing relationship
2. **True Free Tier**: Can offer limited free access to attract users
3. **Predictable User Costs**: Fixed monthly price, no surprise bills
4. **Brand Control**: Users see Zero Agent as single service
5. **Upsell Opportunities**: Easy tier upgrades within app

### Cons ❌

1. **Cost Risk**: Must implement robust usage tracking and rate limiting
2. **Complex Implementation**: Requires:
   - DynamoDB usage tracking schema
   - Rate limiting middleware
   - CloudWatch cost alarms
   - Abuse detection
   - Billing integration (Stripe)

3. **Capital Required**: Must front Anthropic costs before collecting from users
4. **Volume Risk**: Unexpected viral growth could cause huge bills
5. **Margin Pressure**: Must maintain 50%+ margins while staying competitive

### Cost Analysis

**For User**:
- Zero Agent Pro: $20/month (includes 100 conversations)
- **Total: $20/month**

**For Us** (Pro tier):
- Revenue: $20/month per user
- Anthropic API cost: ~$9/month per user
- AWS infrastructure: ~$0.80/month shared
- Stripe fees: ~$0.88/month (2.9% + $0.30)
- **Net margin: ~$10/month per user (50%)**

**Break-even** at ~8 users (covers fixed infrastructure costs)

---

## Hybrid Option 3: BYOK with Managed Option

### How It Works

**Best of both worlds**: Let users choose

**Two Paths**:
1. **BYOK Path**: User provides API key → Pay $10/month for Zero Agent
2. **Managed Path**: Zero Agent provides API access → Pay $20/month all-in

**User Segments**:
- **Developers/Power Users**: Choose BYOK (lower cost, more control)
- **Business Users**: Choose managed (simplicity, one bill)

### Pros ✅

1. **Flexibility**: Serves both technical and non-technical users
2. **Lower Entry Price**: $10/month attracts developers
3. **Higher Margins on Managed**: 50% margin on managed tier
4. **Risk Mitigation**: BYOK users = zero API cost risk

### Cons ❌

1. **Complexity**: Must support both architectures
2. **Support Burden**: Two different user experiences to support
3. **Testing Overhead**: Must test both paths
4. **UI Confusion**: Users may not understand the difference

---

## Comparison Matrix

| Criteria | BYOK | Shared Key | Hybrid |
|----------|------|------------|--------|
| **Onboarding Friction** | High (2 accounts) | Low (1 account) | Medium |
| **Implementation Complexity** | Low | High | Very High |
| **Cost Risk** | Zero | High | Medium |
| **Profit Margin** | 99% | 50% | 50-99% |
| **Free Tier Possible** | No | Yes | Yes (managed only) |
| **User Monthly Cost** | $11-30 | $20 | $10-20 |
| **Support Burden** | Medium | Low | High |
| **Time to MVP** | 1 week | 3-4 weeks | 4-5 weeks |

---

## Decision

### Recommendation: **Start with BYOK, Add Managed Later**

**Phase 1 (MVP)**: BYOK Only
- Fastest time to market (1 week vs 3-4 weeks)
- Zero cost risk during early testing/validation
- Attracts developer/power user early adopters
- Validates Xero integration value proposition

**Phase 2 (Growth)**: Add Managed Tier
- After validating product-market fit
- After achieving 50+ BYOK users (proves value)
- Requires: Usage tracking, rate limiting, billing integration
- Targets non-technical business users

### Why Not Start with Shared Key?

1. **We haven't validated the market yet** - Don't take on cost risk before PMF
2. **Free tier is a liability** - Attracts tire-kickers, not paying customers
3. **Complex before necessary** - 3-4 weeks extra dev time for unproven model
4. **Capital inefficient** - Must front Anthropic costs with uncertain revenue

### Why Not Start with Hybrid?

1. **Over-engineered for MVP** - Supporting two architectures delays launch
2. **Premature optimization** - We don't know which users prefer which model yet
3. **Testing burden** - Doubles QA effort before we have users

---

## Implementation: BYOK (Phase 1)

### Required Changes

**1. Update DynamoDB Schema**
```typescript
interface User {
  // Existing fields...
  anthropic_api_key_encrypted: string;  // KMS encrypted
  anthropic_api_key_valid: boolean;     // Validated on save
  anthropic_key_last_validated: string; // Timestamp
}
```

**2. Add API Key Settings Page (PWA)**
- Input field for API key (password type)
- "Validate" button → Test API call
- Save encrypted to Secrets Manager (per-user secret)

**3. Update Lambda Agent Function**
- Fetch user's API key from Secrets Manager
- Use user's key for Claude API calls (not shared key)
- Return helpful error if key invalid

**4. Remove Complexity**
- ❌ No usage tracking needed (Anthropic handles it)
- ❌ No rate limiting needed (Anthropic handles it)
- ❌ No cost alarms needed (user's problem)

### Security

**API Key Storage**:
- Encrypt with KMS before storing in Secrets Manager
- Separate secret per user: `zero-agent/users/{userId}/anthropic-key`
- IAM policy: Lambda can only read user's own secret

**Validation**:
- Test API key on save with minimal API call
- Periodically re-validate (daily background job)
- Clear invalid keys, notify user

### Pricing

**Revised Subscription Tiers**:
- **Free**: Xero API integration only, no agent features
- **Pro**: $10/month + user's Anthropic costs
  - Agent features unlocked
  - Unlimited conversations (limited by user's Anthropic plan)
  - Email support
- **Enterprise**: $50/month + user's Anthropic costs
  - Multi-user workspace
  - Custom integrations
  - Priority support

### User Communication

**Settings Page Copy**:
> **Connect Your Anthropic Account**
>
> Zero Agent uses Claude AI to power conversational features. You'll need an Anthropic API key to use agent features.
>
> 1. Create account at https://console.anthropic.com
> 2. Generate an API key
> 3. Paste it below
>
> You'll be billed by Anthropic for AI usage (~$1-10/month for typical use). See [Anthropic pricing](https://www.anthropic.com/pricing).

---

## Migration Path (BYOK → Managed)

When adding managed tier in Phase 2:

1. **Keep BYOK tier** as "Pro Developer" plan
2. **Add new "Pro Business" plan** with managed API access
3. **Implement usage tracking** (from SPIKE doc Phase 1-2)
4. **Let users choose** on signup or in settings

---

## Risks & Mitigations

### Risk 1: Users Don't Understand BYOK
**Mitigation**:
- Clear onboarding flow with screenshots
- Help documentation
- Optional setup call for Enterprise customers
- Track where users drop off in funnel

### Risk 2: Support Burden for Anthropic Billing Issues
**Mitigation**:
- Clear documentation: "We don't handle Anthropic billing"
- Link to Anthropic support in error messages
- Monitor common issues, create FAQ

### Risk 3: Competitive Disadvantage vs. All-In-One Pricing
**Mitigation**:
- Target developer/power user segment first (they prefer BYOK)
- Emphasize total cost savings: $10 (us) + $5 (Anthropic) = $15 vs. competitor's $30
- Add managed tier in Phase 2 for non-technical users

---

## Success Metrics

**Phase 1 (BYOK) Success = 50 paying users in 3 months**

If achieved → Proceed to Phase 2 (add managed tier)
If not achieved → Pivot product strategy before investing in managed billing

**Phase 2 (Managed) Success = 30% of new users choose managed over BYOK**

If achieved → Managed tier is valuable, keep both
If not achieved → Focus on BYOK, consider removing managed

---

## References

- Claude Code BYOK: https://code.claude.com/docs/en/iam
- Cursor BYOK: https://forum.cursor.com/t/byok-bring-your-own-key/25578
- JetBrains BYOK announcement: https://blog.jetbrains.com/ai/2025/11/bring-your-own-key-byok-is-coming-soon-to-jetbrains-ai/
- Warp BYOK: https://docs.warp.dev/support-and-billing/plans-and-pricing/bring-your-own-api-key
- Anthropic Pricing: https://www.anthropic.com/pricing
- Related: docs/SPIKE-anthropic-cost-control.md

---

## Decision

**APPROVED**: Start with BYOK (Phase 1)
- Simplest, fastest, lowest risk
- Validates market before complex billing implementation
- Clear migration path to managed tier if needed

**NEXT STEPS**:
1. Update DynamoDB schema with API key fields
2. Build API key settings page in PWA
3. Update Lambda to use per-user API keys
4. Update pricing page to reflect BYOK model
5. Launch MVP, gather user feedback
6. Re-evaluate managed tier after 50 users
