# SPIKE: Claude OAuth for Third-Party Applications

**Date**: 2025-11-29
**Status**: Blocked - More Research Needed
**Goal**: Use Claude Max subscription (via OAuth) in Pip instead of API credits

---

## Executive Summary

**Claude Code's OAuth tokens cannot be directly used with the Anthropic SDK.** The tokens use a different format and auth mechanism. Further research is needed to determine if there's a supported path for third-party apps to leverage user subscriptions.

---

## Research Findings

### Claude Code OAuth Token Structure

Location: `~/.claude/.credentials.json`

```json
{
  "claudeAiOauth": {
    "accessToken": "sk-ant-oat01-*",   // OAuth Access Token
    "refreshToken": "sk-ant-ort01-*",  // OAuth Refresh Token
    "expiresAt": 1764391319176,        // ~6 hour expiry
    "scopes": ["user:inference", "user:profile", "user:sessions:claude_code"],
    "subscriptionType": "max",
    "rateLimitTier": "default_claude_max_20x"
  }
}
```

### Token Format Comparison

| Token Type | Format | Works with SDK |
|------------|--------|----------------|
| API Key | `sk-ant-api03-*` | Yes |
| OAuth Access | `sk-ant-oat01-*` | **No** |
| OAuth Refresh | `sk-ant-ort01-*` | N/A |

### Test Result

```typescript
const client = new Anthropic({
  apiKey: credentials.claudeAiOauth.accessToken,  // OAuth token
});

// Result: 401 {"type":"error","error":{"type":"authentication_error",
//              "message":"invalid x-api-key"}}
```

The SDK sends the token as `x-api-key` header, but OAuth tokens require a different authentication mechanism (likely `Authorization: Bearer` or a different endpoint).

---

## Potential Paths Forward

### Path 1: Different Auth Header (Research Needed)

Claude Code may use a different HTTP header for OAuth tokens:
- `Authorization: Bearer sk-ant-oat01-*`
- Or a completely different API endpoint

**Action**: Intercept Claude Code's API calls to see the actual auth mechanism.

```bash
# Potential approaches:
# 1. mitmproxy to intercept Claude Code traffic
# 2. Check Claude Code source if available
# 3. Anthropic documentation on OAuth
```

### Path 2: Anthropic OAuth for Third Parties (Research Needed)

Anthropic may offer OAuth for third-party apps to access user subscriptions:
- Similar to "Login with Google" but for Claude accounts
- Would require Anthropic approval as an OAuth client

**Action**: Check Anthropic developer docs for third-party OAuth support.

### Path 3: API Key Fallback (Current Approach)

For the demo, use API credits directly:
- Add Opus 4 to supported models
- Accept the API cost (~$5-10 for a demo session)
- Revisit subscription integration post-demo

---

## Cost Comparison (Demo Context)

| Approach | Demo Cost | Complexity |
|----------|-----------|------------|
| API Key (Opus 4) | ~$5-10 | Low (15 min) |
| OAuth (if works) | $0 (subscription) | High (unknown) |

---

## Open Questions

1. **Does Anthropic support OAuth for third-party apps?**
   - No public documentation found
   - Claude Code may be a special case (first-party app)

2. **What auth mechanism does Claude Code actually use?**
   - Could intercept traffic to find out
   - May use different API endpoints

3. **Is there a token exchange mechanism?**
   - OAuth tokens → API tokens?
   - Similar to Firebase auth → custom tokens

---

## Recommendation

**For Thursday demo**: Use API key with Opus 4 (Path 3). The cost is minimal and the implementation is trivial.

**Post-demo**: Deeper research into Anthropic's OAuth architecture if subscription-based access for third-party apps is a priority.

---

## References

- Claude Code credentials: `~/.claude/.credentials.json`
- Joplin: "Claude Subscription vs API - Cost Analysis & OAuth Setup"
- Anthropic SDK: https://github.com/anthropics/anthropic-sdk-python

---

## Terms of Service Analysis

**Reviewed**: 2025-11-29
**Source**: https://www.anthropic.com/legal/consumer-terms

### Explicitly Prohibited

| Clause | Text | Impact |
|--------|------|--------|
| **Automated Access** | "access services through automated or non-human means, whether through a bot, script, or otherwise" | Third-party apps = automated access |
| **Exception** | "**except when using an Anthropic API Key** or with explicit permission" | Only API keys are authorized for programmatic access |
| **Credential Sharing** | "may not share your Account login information, Anthropic API key, or **Account credentials** with anyone else" | OAuth tokens = account credentials |

### Termination Rights

| Clause | Risk Level |
|--------|------------|
| "modify, suspend, or discontinue...at any time **without notice**" | **High** |
| "terminate accounts at any time without notice if we believe you have breached" | **High** |

### Conclusion

**Using subscription OAuth tokens in third-party apps appears to violate ToS:**
1. It's "automated access" not using an "Anthropic API Key"
2. OAuth tokens are likely "Account credentials" which cannot be shared/used externally
3. Anthropic can terminate **without notice** if they detect this

The technical block (401 error) may be intentional enforcement of this policy.

---

## Monitoring: Future OAuth for Third-Party Apps

**Watch for**: Anthropic may eventually offer OAuth for third-party apps (similar to Google OAuth).

### Indicators to Monitor

1. **Anthropic Developer Portal** - Check for "Create OAuth App" or similar
2. **Claude Code GitHub Issues** - Search for "OAuth" or "third-party" discussions
3. **Anthropic Blog/Announcements** - Developer API updates
4. **Claude Agent SDK Updates** - May add subscription-based auth options

### Relevant GitHub Issues/Discussions

- Claude Code repo: Not currently public (internal tool)
- Anthropic SDK: https://github.com/anthropics/anthropic-sdk-python/issues
- Search terms: "OAuth", "subscription API", "Max plan API"

### Arc Forge Use Case for Third-Party OAuth

If/when available, this would enable:
- **Pip users** bring their own Claude subscription (no API costs for Arc Forge)
- **Heavy users** (Max 20x subscribers) get unlimited Opus usage
- **Enterprise** self-hosted with user-owned auth

**Priority**: MEDIUM - Not blocking for demo, but valuable for scaling.

---

**Completed**:
- [x] Add Opus 4 support to Anthropic provider
- [x] Document ToS restrictions on OAuth usage
- [x] Add monitoring items for future OAuth support

**Next Steps**:
- [ ] Research Anthropic developer docs for third-party OAuth
- [ ] Consider mitmproxy to analyze Claude Code auth flow (deprioritized due to ToS concerns)
