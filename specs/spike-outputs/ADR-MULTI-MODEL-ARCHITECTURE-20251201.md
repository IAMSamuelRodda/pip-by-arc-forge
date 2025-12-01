# Architecture Decision Record: Multi-Model LLM Support

> **ADR Number**: ADR-2024-002
> **Spike**: Multi-Model LLM Architecture Research (spike_m2_004)
> **Status**: Proposed
> **Created**: 2025-12-01
> **Decision Makers**: Arc Forge Team

## Context

Pip currently uses a hardcoded Anthropic Claude integration. Users want:
1. Model selection like ChatGPT/Claude.ai interfaces
2. Local model support via Ollama for privacy/cost
3. Provider redundancy for reliability

## Decision Summary

| Area | Decision |
|------|----------|
| **Proxy** | LiteLLM standalone (not sidecar) |
| **Network** | Tailscale mesh for Ollama access |
| **Frontend** | Footer dropdown, Zustand + localStorage |
| **MCP** | Model-agnostic (no changes needed) |
| **Cost** | Per-request logging, not real-time display |
| **Fallback** | Manual switching (no auto-fallback) |

---

## Decision 1: LiteLLM Deployment Strategy

### Options Considered

| Option | Description | Pros | Cons |
|--------|-------------|------|------|
| **Sidecar** | LiteLLM in same container as Pip | Single deployment | Couples concerns, harder scaling |
| **Standalone** | LiteLLM as separate container | Independent scaling, provider isolation | Extra container, network hop |
| **Direct API** | Call providers directly from Pip | Simpler, no proxy | Provider-specific code, no unified API |

### Decision: Standalone Container

**Rationale**:
- **Separation of concerns** - LiteLLM handles provider routing; Pip handles business logic
- **Independent updates** - Can upgrade LiteLLM without touching Pip
- **Reusability** - Other Arc Forge apps can use same LiteLLM instance
- **Observability** - LiteLLM's built-in logging/metrics
- **Validated** - POC proved this works with ~1s latency overhead

### Implementation

```yaml
# /opt/litellm/docker-compose.yml
services:
  litellm:
    image: ghcr.io/berriai/litellm:main-latest
    container_name: litellm
    restart: unless-stopped
    network_mode: host  # Required for Tailscale access
    volumes:
      - ./config.yaml:/app/config.yaml
    env_file:
      - /opt/pip/.env
    environment:
      - LITELLM_MASTER_KEY=${LITELLM_MASTER_KEY}
    command: ["--config", "/app/config.yaml", "--port", "4000"]
```

**Network Mode**: `host` is required because:
- LiteLLM needs to reach Ollama via Tailscale IP (100.64.0.2)
- Docker's default bridge network can't route to Tailscale
- Alternative (macvlan) is more complex for same result

---

## Decision 2: Tailscale + Ollama Connectivity

### Options Considered

| Option | Description | Pros | Cons |
|--------|-------------|------|------|
| **Direct VPN** | Expose Ollama via WireGuard | Standard VPN | Manual key management |
| **Tailscale** | Mesh VPN with identity | Zero-config, identity-based | Requires Tailscale account |
| **Cloud Relay** | Route through cloud service | No direct connection | Latency, cost, privacy |
| **Public Exposure** | Ollama on public internet | Simple | Security nightmare |

### Decision: Tailscale (Headscale Self-Hosted)

**Rationale**:
- **Already deployed** - User has Headscale on VPS
- **Zero-config** - No firewall rules, NAT traversal automatic
- **Identity-based** - Only authenticated devices can connect
- **Validated** - POC showed 238ms warm latency (excellent)

### Configuration

**Local Machine (Ollama host)**:
```bash
# /etc/systemd/system/ollama.service
[Service]
Environment="OLLAMA_HOST=0.0.0.0"  # Listen on all interfaces

# Tailscale IP: 100.64.0.2
```

**VPS (LiteLLM host)**:
```yaml
# LiteLLM config
- model_name: deepseek-coder
  litellm_params:
    model: ollama/deepseek-coder:33b
    api_base: http://100.64.0.2:11434  # Tailscale IP
```

### Latency Measurements

| Scenario | Latency | Notes |
|----------|---------|-------|
| Cold start (model loading) | ~14s | GPU loads model into VRAM |
| Warm response | ~238-356ms | Competitive with cloud |
| Cloud (Claude Haiku) | ~968ms | For comparison |

**Conclusion**: Tailscale adds negligible latency. Cold start needs warm-up strategy (see issue_017).

---

## Decision 3: PWA Model Selector Implementation

### Options Considered

| Option | Pros | Cons |
|--------|------|------|
| **Header dropdown** | Visible, common pattern | Clutters header |
| **Footer dropdown** | Near input, ChatGPT-like | Less visible |
| **Settings only** | Simple, clean chat UI | Requires navigation to switch |
| **Per-message** | Maximum flexibility | Complex UX, confusing |

### Decision: Footer Dropdown

**Rationale**:
- **Familiar** - Matches ChatGPT/Claude.ai patterns
- **Contextual** - Near where user types, natural flow
- **Quick access** - One click, no navigation
- **Non-blocking** - Doesn't interrupt conversation

### State Management: Zustand + localStorage

**Rationale**:
- **Consistent** - Same pattern as existing chatStore
- **Persistent** - Preference survives page reload
- **Simple** - No backend storage needed for preferences
- **Fast** - No API call to load preference

### Implementation Summary

See `PWA-MODEL-SELECTOR-DESIGN-20251201.md` for full component mockup.

Key points:
- Model selector in footer, left of Send button
- Dropdown shows cloud models and local models (grouped)
- Visual badges: "best", "fast", "cheap", "local"
- Offline indicators for unavailable local models
- Mobile: bottom sheet instead of dropdown

---

## Decision 4: MCP Model-Agnostic Design

### Question: Does MCP Server Need Model Awareness?

**Answer: No.**

When MCP is called from:
- **Claude.ai** - Claude handles the model selection
- **ChatGPT** - GPT handles the model selection
- **Pip PWA** - Pip's LiteLLM proxy handles model selection

The MCP server is purely a **tool provider**. It exposes Xero operations. The calling platform/application chooses which model interprets the results.

### Implications

1. **No changes to MCP server** - Current implementation is already model-agnostic
2. **Tool descriptions stay generic** - No model-specific prompting needed
3. **Response format unchanged** - JSON tools work with all modern LLMs
4. **Function calling requirement** - Models must support function/tool calling

### Models with Function Calling Support

| Model | Support Level | MCP Compatible |
|-------|---------------|----------------|
| Claude Sonnet 4 | Excellent | Yes |
| Claude Haiku | Excellent | Yes |
| GPT-4o | Excellent | Yes |
| GPT-4o-mini | Good | Yes |
| DeepSeek-Coder 33B | Limited | Needs testing |
| Llama 3.1 | Good | Likely yes |

**Recommendation**: Validate local models with MCP tools before enabling in production.

---

## Decision 5: Cost Tracking Strategy

### Options Considered

| Option | Pros | Cons |
|--------|------|------|
| **Real-time display** | User sees cost immediately | Complex, may cause anxiety |
| **Per-request logging** | Accurate tracking, async | Not visible to user |
| **Daily/monthly summary** | Simple aggregation | Less granular |
| **No tracking** | Simplest | No cost visibility |

### Decision: Per-Request Logging (Backend)

**Rationale**:
- **LiteLLM native** - Built-in cost tracking via callbacks
- **Non-intrusive** - Doesn't clutter chat UI
- **Accurate** - Logs actual tokens, not estimates
- **Flexible** - Can build reports/alerts later

### Implementation

```yaml
# LiteLLM config
litellm_settings:
  success_callback: ["log_to_file"]
  log_file: "/var/log/litellm/requests.log"

# Alternative: PostgreSQL callback for production
litellm_settings:
  database_url: "postgresql://..."
```

### Future Enhancements (Post-MVP)

1. **Settings page cost summary** - Show monthly spend
2. **Budget alerts** - Email when threshold reached
3. **Per-conversation cost** - Show in conversation metadata
4. **Cost-based model suggestions** - "This response cost $0.05"

---

## Decision 6: Fallback/Error Handling

### Options Considered

| Option | Pros | Cons |
|--------|------|------|
| **Auto-fallback** | Seamless UX | Unexpected model switch, cost confusion |
| **Manual retry** | User control | Extra clicks on failure |
| **Graceful error** | Clear communication | No automatic recovery |

### Decision: Manual Switching with Clear Errors

**Rationale**:
- **Predictability** - User knows which model responded
- **Cost control** - No surprise switches to expensive models
- **Transparency** - Errors explain what failed and suggest alternatives
- **Simplicity** - Easier to implement and debug

### Error UX

```tsx
// Example error message when model fails
<div className="bg-red-900/30 border border-red-800 rounded-lg px-4 py-3">
  <p className="text-sm text-red-400">
    DeepSeek model unavailable (local machine offline).
  </p>
  <button onClick={() => switchModel('claude-haiku')}>
    Switch to Claude Haiku →
  </button>
</div>
```

### Future Enhancement: Smart Fallback (Optional)

If users request auto-fallback:
1. Define fallback chains: `deepseek → haiku → sonnet`
2. Respect tier boundaries: local → fast cloud → premium cloud
3. Notify user: "Switched to Claude Haiku (DeepSeek offline)"

---

## Implementation Phases

### Phase 1: LiteLLM Integration (Foundation)
1. Connect Pip backend to LiteLLM proxy
2. Add model parameter to chat API
3. Update PWA to pass model selection
4. Test with Claude Sonnet (existing behavior)

### Phase 2: Model Selector UI
1. Create ModelSelector component
2. Add modelStore with Zustand
3. Integrate into ChatPage footer
4. Test cloud model switching

### Phase 3: Local Model Support
1. Validate Ollama models with MCP tools
2. Implement warm-up strategy (issue_017)
3. Add availability detection
4. Test offline scenarios

### Phase 4: Observability
1. Enable LiteLLM cost logging
2. Create cost summary endpoint
3. Add to Settings page
4. Set up alerts (optional)

---

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Ollama offline during use | Medium | Medium | Clear error message, suggest cloud models |
| LiteLLM proxy failure | Low | High | Health checks, restart policy, alerts |
| Cost overrun | Medium | Medium | Budget alerts, model tier visibility |
| Local model poor quality | Medium | Low | Test before enabling, quality badges |
| Cold start delays | High | Medium | Warm-up strategy (issue_017) |

---

## Security Considerations

1. **API Keys** - Stored in env vars, never in config files or client
2. **LiteLLM Master Key** - Separate from provider keys, rotatable
3. **Tailscale** - Only authenticated devices can reach Ollama
4. **No public Ollama exposure** - Ollama bound to 0.0.0.0 but only Tailscale routable
5. **Model selection** - Server validates model is in allowed list

---

## Appendix: Research Questions Answered

### LiteLLM Integration
- **How does LiteLLM handle model routing?** - Config-based, name mapping
- **Streaming support?** - Yes, all providers
- **Cost tracking?** - Native callbacks, flexible backends
- **Provider-specific features?** - `drop_params: true` normalizes

### Tailscale + Ollama
- **Best exposure method?** - OLLAMA_HOST=0.0.0.0, Tailscale-only routing
- **Latency implications?** - Negligible (~10ms overhead)
- **Offline handling?** - Health check endpoint, clear errors
- **Security?** - Identity-based access, no public exposure

### PWA Model Selector
- **Static vs dynamic model list?** - Hybrid: static config, dynamic availability
- **Model metadata display?** - Badges (best/fast/cheap/local)
- **Mid-conversation switching?** - Allowed, no context loss
- **Preference persistence?** - localStorage via Zustand

### MCP Model Source
- **MCP server model awareness?** - Not needed, model-agnostic
- **Prompt engineering by model?** - Not needed for tools
- **Function calling support?** - Required, validated for cloud models

---

## References

- [LiteLLM Documentation](https://docs.litellm.ai/)
- [Tailscale Documentation](https://tailscale.com/kb/)
- [Ollama API Reference](https://github.com/ollama/ollama/blob/main/docs/api.md)
- Cost/Performance Matrix: `COST-PERFORMANCE-MATRIX-20251201.md`
- UI Design: `PWA-MODEL-SELECTOR-DESIGN-20251201.md`
