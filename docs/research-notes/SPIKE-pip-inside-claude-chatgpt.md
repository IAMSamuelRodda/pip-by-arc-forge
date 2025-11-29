# SPIKE: Pip Inside Claude.ai and ChatGPT

**Date**: 2025-11-29
**Status**: Research Complete - HIGH PRIORITY PIVOT OPTION
**Goal**: Evaluate distributing Pip as an MCP server/App rather than standalone PWA

---

## Executive Summary

**This could be the most capital-efficient distribution strategy.**

Instead of building a full app where we pay for LLM inference, we can distribute Pip as:
1. **Claude Integration** (Remote MCP Server) - For Claude Pro/Max/Team users
2. **ChatGPT App** (Apps SDK) - For ChatGPT Plus/Pro users

Users bring their own LLM subscription. We provide the Xero tools, personality, and business context layer.

---

## Part 1: RTX 4090 Local Model Options

### Currently Installed
```
ollama list
NAME                  SIZE
deepseek-coder:33b    18 GB
```

### Best Reasoning Model for RTX 4090 (24GB)

| Model | VRAM | Speed | Reasoning |
|-------|------|-------|-----------|
| **DeepSeek-R1:32B** | ~20 GB | 22-35 tok/s | Excellent |
| **QwQ-32B** | ~20 GB | 20-30 tok/s | Excellent |
| DeepSeek-R1:8B | ~6 GB | 68 tok/s | Good |
| Qwen2.5:32B | ~20 GB | 25 tok/s | Good |

**Recommendation**: Install `deepseek-r1:32b` via Ollama for local reasoning demos.

```bash
ollama pull deepseek-r1:32b
```

### Performance Expectations
- RTX 4090 achieves ~34 tokens/sec (75% of H100 speed at 21% of cost)
- Suitable for demos and development
- NOT suitable for production multi-user serving

---

## Part 2: Claude Integration (Remote MCP Server)

### How It Works

1. **We host** a Remote MCP Server with:
   - Xero API tools (invoices, reports, bank transactions)
   - Business context retrieval
   - Pip personality system prompt

2. **Users connect** via Claude.ai Settings → Connectors → Add Custom Connector
   - They provide the MCP server URL
   - OAuth flow connects their Xero account
   - Uses THEIR Claude subscription for LLM inference

3. **Claude handles** all the AI reasoning using their Opus/Sonnet quota

### Technical Requirements

**MCP Server Hosting**:
- Simple HTTP server with SSE endpoint
- OAuth provider for Xero authentication
- Can run on current VPS (minimal compute needed)
- Cloudflare Workers is also an option (free tier possible)

**Authentication Flow**:
1. User adds Pip connector in Claude.ai
2. OAuth redirect to our server
3. User authenticates with Xero
4. We store their Xero tokens
5. Claude can now call Xero tools via MCP

### Availability

| Plan | Remote MCP Support |
|------|-------------------|
| Free | ❌ No |
| Pro ($20/mo) | ✅ Yes |
| Max ($100-200/mo) | ✅ Yes |
| Team | ✅ Yes |
| Enterprise | ✅ Yes |

### What We Provide vs What Claude Provides

| Component | Provider | Our Cost |
|-----------|----------|----------|
| LLM Inference (Opus/Sonnet) | User's subscription | $0 |
| Xero API Tools | Us (MCP server) | VPS hosting (~$10/mo) |
| Business Context | Us (database) | Included in VPS |
| Personality Prompts | Us (MCP server) | $0 |
| OAuth/Auth | Us | $0 |

**Total Arc Forge cost per user**: ~$0.50/mo (amortized hosting)

### What We'd Miss

| Feature | Status |
|---------|--------|
| Custom UI | ❌ Lost (use Claude's chat UI) |
| Voice mode | ❌ Lost (Claude doesn't have voice) |
| Document upload | ⚠️ Partial (Claude has file uploads but we'd need to sync) |
| Relationship progression | ✅ Can inject via system prompts |
| Cross-session memory | ⚠️ Limited (Claude has Projects but we control MCP context) |

---

## Part 3: ChatGPT App (Apps SDK)

### How It Works

OpenAI's Apps SDK (preview, October 2025) lets us build apps that run inside ChatGPT.

1. **We build** an MCP server + optional UI components
2. **Users install** the Pip app from ChatGPT directory
3. **ChatGPT calls** our MCP server for Xero operations
4. Uses THEIR ChatGPT Plus/Pro subscription

### Technical Requirements

**Apps SDK Components**:
- MCP server (same as Claude, it's the same standard!)
- Optional web component (iframe for custom UI)
- HTTPS endpoint

**Key Insight**: Both Claude and ChatGPT now use MCP. We can build ONE MCP server that works with both.

### Availability

| Plan | Apps Support |
|------|-------------|
| Free | ❓ Unclear |
| Plus ($20/mo) | ✅ Yes |
| Pro ($200/mo) | ✅ Yes |
| Team | ✅ Yes |
| Enterprise | ✅ Yes |

### Publishing Status

- **Currently**: Preview/Beta, developer mode only
- **Coming**: App directory with monetization options
- **Timeline**: "Later this year" (2025)

### What We'd Miss

| Feature | Status |
|---------|--------|
| Custom UI | ✅ Supported (iframe components) |
| Voice mode | ⚠️ ChatGPT has voice, unclear if apps can use |
| Document upload | ✅ ChatGPT supports file uploads |
| Relationship progression | ✅ Via MCP resources/prompts |
| Cross-session memory | ⚠️ Limited |

---

## Part 4: Comparison Matrix

| Aspect | Standalone PWA | Claude MCP | ChatGPT App |
|--------|---------------|------------|-------------|
| **LLM Cost (us)** | $500-5000/mo | $0 | $0 |
| **Infrastructure** | VPS + API costs | VPS only | VPS only |
| **User Cost** | Free (we pay) | Their $20-200/mo | Their $20-200/mo |
| **Distribution** | Direct/organic | Claude directory | ChatGPT store |
| **Custom UI** | Full control | None | Partial (iframe) |
| **Voice Mode** | We build | ❌ | ⚠️ |
| **Time to Market** | 4-8 weeks | 1-2 weeks | 2-4 weeks |
| **Revenue Model** | Subscription | ❓ Tips/Premium | ❓ Revenue share |

---

## Part 5: Strategic Recommendations

### Option A: MCP-First Distribution (Recommended for MVP)

**Strategy**: Build Pip as a Remote MCP Server first, distribute via Claude and ChatGPT.

**Advantages**:
- $0 LLM costs (users bring their subscription)
- Minimal infrastructure (VPS for MCP server only)
- Faster time to market (1-2 weeks)
- Access to premium models (Opus, GPT-4o) without paying
- Built-in distribution (Claude/ChatGPT directories)

**Disadvantages**:
- Limited to paid users of Claude/ChatGPT
- No custom voice mode
- Less control over UX
- Revenue model unclear

**Demo Approach**:
- Demo person uses their ChatGPT Plus subscription
- We show them connecting Pip MCP server
- They ask questions in ChatGPT, get Xero-powered answers
- "Try it yourself" - immediate adoption

### Option B: Hybrid (MCP + PWA)

**Strategy**: MCP for distribution, PWA for premium features.

- **MCP version**: Free, basic Xero tools, uses their subscription
- **PWA version**: Premium features (voice, documents, memory), we provide LLM

### Option C: Local + Cloud Hybrid

**Strategy**: DeepSeek-R1 locally for development/demos, API for production.

- Demo on RTX 4090 with local model
- Production uses API or MCP distribution

---

## Part 6: Implementation Roadmap

### Phase 1: MCP Server (1-2 weeks)
1. Extract Xero tools into standalone MCP server
2. Add OAuth provider for Xero auth
3. Deploy to VPS (or Cloudflare Workers)
4. Test with Claude Desktop locally
5. Test with Claude.ai (need Pro account)

### Phase 2: ChatGPT App (1-2 weeks)
1. Adapt MCP server for Apps SDK
2. Build minimal UI component (optional)
3. Deploy and test in developer mode
4. Prepare for directory submission

### Phase 3: Enhanced Features (ongoing)
1. Business context as MCP resources
2. Personality injection via MCP prompts
3. Premium PWA for advanced features

---

## Part 7: For Thursday Demo

### Recommended Approach

Given your demo contact uses ChatGPT:

1. **Today**: Set up MCP server with Xero tools
2. **Test**: Connect via ChatGPT developer mode
3. **Demo**: Show them using Pip through their ChatGPT subscription

**Script**:
> "I've built an AI bookkeeping assistant that connects directly to your Xero.
> You can use it right inside ChatGPT - no new app to learn.
> Let me show you how to set it up... [1 minute setup]
> Now ask it anything about your finances."

This is:
- Realistic (uses their existing subscription)
- Immediate (no signup, no new account)
- Familiar (ChatGPT interface they already know)
- Sustainable (we don't pay for LLM)

---

## References

- [Claude Remote MCP Servers](https://support.claude.com/en/articles/11503834-building-custom-connectors-via-remote-mcp-servers)
- [Claude Integrations Announcement](https://www.anthropic.com/news/integrations)
- [OpenAI Apps SDK](https://developers.openai.com/apps-sdk/)
- [Apps SDK Quickstart](https://developers.openai.com/apps-sdk/quickstart/)
- [DeepSeek R1 on RTX 4090](https://www.databasemart.com/blog/deepseek-r1-32b-gpu-hosting)
- [Cloudflare Remote MCP Server](https://developers.cloudflare.com/agents/guides/remote-mcp-server/)

---

**Decision Required**: Pursue MCP-first distribution strategy?

**Last Updated**: 2025-11-29
