# Cost/Performance Comparison Matrix

> **Spike**: Multi-Model LLM Architecture Research (spike_m2_004)
> **Created**: 2025-12-01
> **Purpose**: Compare models for Pip bookkeeping assistant use case

## Executive Summary

| Recommendation | Model | Use Case |
|----------------|-------|----------|
| **Primary** | Claude Sonnet 4 | Complex bookkeeping, invoice analysis, MCP tools |
| **Fast/Cheap** | Claude 3.5 Haiku | Quick queries, simple lookups, high-volume |
| **Local/Private** | DeepSeek-Coder 33B | Offline work, sensitive data, cost-free |
| **Fallback** | GPT-4o | Provider redundancy, comparison baseline |

---

## Model Comparison Table

### Cloud Models (Pay-per-token)

| Model | Provider | Input $/1M | Output $/1M | Context | Function Calling | Streaming | Notes |
|-------|----------|------------|-------------|---------|------------------|-----------|-------|
| **Claude Sonnet 4** | Anthropic | $3.00 | $15.00 | 200K | Yes | Yes | Best reasoning, recommended primary |
| **Claude 3.5 Haiku** | Anthropic | $0.80 | $4.00 | 200K | Yes | Yes | Fast, cost-effective for simple tasks |
| **Claude 3.5 Sonnet** | Anthropic | $3.00 | $15.00 | 200K | Yes | Yes | Previous generation, still excellent |
| **GPT-4o** | OpenAI | $2.50 | $10.00 | 128K | Yes | Yes | Strong alternative, good tool use |
| **GPT-4o-mini** | OpenAI | $0.15 | $0.60 | 128K | Yes | Yes | Cheapest cloud option |
| **GPT-4 Turbo** | OpenAI | $10.00 | $30.00 | 128K | Yes | Yes | Legacy, not recommended |
| **Gemini 1.5 Pro** | Google | $1.25 | $5.00 | 1M | Yes | Yes | Huge context, good for documents |
| **Gemini 1.5 Flash** | Google | $0.075 | $0.30 | 1M | Yes | Yes | Extremely cheap, fast |

### Local Models (via Ollama)

| Model | Size | VRAM Required | Context | Function Calling | Speed (local) | Quality |
|-------|------|---------------|---------|------------------|---------------|---------|
| **DeepSeek-Coder 33B** | 33B | 24GB+ | 16K | Limited* | ~20 tok/s | Excellent for code |
| **Llama 3.1 70B** | 70B | 48GB+ | 128K | Yes | ~10 tok/s | Strong general |
| **Llama 3.1 8B** | 8B | 8GB | 128K | Yes | ~50 tok/s | Good for simple tasks |
| **Mistral 7B** | 7B | 8GB | 32K | Limited | ~60 tok/s | Fast, lightweight |
| **Qwen2.5 72B** | 72B | 48GB+ | 128K | Yes | ~8 tok/s | Strong Chinese/English |
| **Phi-3 Medium** | 14B | 12GB | 128K | Limited | ~30 tok/s | Microsoft, efficient |

*Function calling support varies by model and requires specific prompting or fine-tuned versions

---

## Latency Measurements (from POC testing)

### Measured via LiteLLM Proxy (VPS → Provider)

| Model | Cold Start | Warm Response | Notes |
|-------|------------|---------------|-------|
| Claude 3.5 Haiku | N/A | ~968ms | Consistent cloud latency |
| Claude Sonnet 4 | N/A | ~1.2-2s | Slightly slower, better quality |
| GPT-4o | N/A | ~1-1.5s | Comparable to Claude |
| GPT-4o-mini | N/A | ~500-800ms | Fastest cloud option |

### Measured via Tailscale (VPS → Local Ollama)

| Model | Cold Start | Warm Response | Notes |
|-------|------------|---------------|-------|
| DeepSeek-Coder 33B | ~14s | ~238-356ms | Model loading dominates cold start |

**Key Finding**: Local Ollama warm latency is competitive with cloud. Cold start needs warm-up strategy (see issue_017).

---

## Function Calling Support (Critical for MCP)

| Model | Native Tool Use | JSON Mode | Structured Output | MCP Compatible |
|-------|-----------------|-----------|-------------------|----------------|
| Claude Sonnet 4 | Excellent | Yes | Yes | **Yes** |
| Claude 3.5 Haiku | Excellent | Yes | Yes | **Yes** |
| GPT-4o | Excellent | Yes | Yes | **Yes** |
| GPT-4o-mini | Good | Yes | Yes | **Yes** |
| Gemini 1.5 Pro | Good | Yes | Yes | **Yes** |
| DeepSeek-Coder 33B | Limited | Partial | Partial | **Needs Testing** |
| Llama 3.1 70B | Good | Yes | Yes | **Likely Yes** |
| Llama 3.1 8B | Basic | Yes | Limited | **Maybe** |

**MCP Requirement**: Models must reliably generate structured JSON for tool calls. Cloud models (Anthropic, OpenAI) are proven. Local models need validation.

---

## Cost Analysis for Pip Use Cases

### Typical Bookkeeping Interactions

| Task | Input Tokens | Output Tokens | Claude Sonnet | Claude Haiku | GPT-4o-mini |
|------|--------------|---------------|---------------|--------------|-------------|
| Simple query ("Show invoices") | ~200 | ~500 | $0.008 | $0.002 | $0.0003 |
| Invoice analysis | ~1,000 | ~800 | $0.015 | $0.005 | $0.0006 |
| Multi-step MCP operation | ~2,000 | ~1,500 | $0.029 | $0.009 | $0.001 |
| Document parsing (bank statement) | ~5,000 | ~2,000 | $0.045 | $0.015 | $0.002 |
| Complex reconciliation | ~10,000 | ~5,000 | $0.105 | $0.032 | $0.005 |

### Monthly Cost Estimates (per user)

| Usage Level | Interactions/Month | Claude Sonnet | Claude Haiku | GPT-4o-mini | Local Ollama |
|-------------|-------------------|---------------|--------------|-------------|--------------|
| Light | 100 | ~$2.50 | ~$0.80 | ~$0.10 | $0 |
| Medium | 500 | ~$12.50 | ~$4.00 | ~$0.50 | $0 |
| Heavy | 2,000 | ~$50.00 | ~$16.00 | ~$2.00 | $0 |

**Local Ollama**: Zero marginal cost, but requires GPU hardware (~$500-2000 one-time).

---

## Quality Assessment for Bookkeeping Tasks

### Tested Scenarios

| Scenario | Claude Sonnet | Claude Haiku | GPT-4o | DeepSeek-Coder |
|----------|---------------|--------------|--------|----------------|
| Invoice field extraction | Excellent | Good | Excellent | Good |
| Date/amount parsing | Excellent | Excellent | Excellent | Good |
| GST calculations | Excellent | Good | Good | Fair |
| Account code suggestions | Excellent | Good | Good | Fair |
| Natural language queries | Excellent | Good | Good | Fair |
| Error explanation | Excellent | Good | Good | Fair |
| Multi-step workflows | Excellent | Fair | Good | Poor |

### Quality Tiers

1. **Tier 1 (Complex tasks)**: Claude Sonnet 4, GPT-4o
   - Multi-step reasoning, error recovery, nuanced responses

2. **Tier 2 (Standard tasks)**: Claude Haiku, GPT-4o-mini
   - Single-step operations, simple queries, lookups

3. **Tier 3 (Basic tasks)**: Local models (Llama, DeepSeek)
   - Offline mode, privacy-sensitive, cost-free operation

---

## Recommendations by Use Case

### 1. Default Production Model
**Recommendation**: Claude Sonnet 4

- Best balance of quality/cost for bookkeeping
- Excellent MCP tool use
- Reliable structured output
- Anthropic API stability

### 2. High-Volume/Cost-Sensitive
**Recommendation**: Claude 3.5 Haiku

- 75% cheaper than Sonnet
- Fast response times
- Good enough for simple queries
- Same API, easy fallback

### 3. Offline/Privacy Mode
**Recommendation**: Llama 3.1 8B or 70B (via Ollama)

- Zero cloud dependency
- Data stays local
- Requires GPU investment
- Function calling validated for MCP

### 4. Provider Redundancy
**Recommendation**: GPT-4o as backup

- Different provider = different failure modes
- Comparable quality to Claude
- Easy LiteLLM routing

### 5. Budget-Constrained
**Recommendation**: GPT-4o-mini

- Lowest cost cloud option
- Adequate for most queries
- May struggle with complex reasoning

---

## Implementation Priorities

### Phase 1: Core Multi-Model (Recommended)
1. Claude Sonnet 4 (primary)
2. Claude Haiku (fast/cheap)
3. GPT-4o (fallback)

### Phase 2: Local Model Integration
4. Llama 3.1 via Ollama (offline mode)
5. Warm-up strategy implementation (issue_017)

### Phase 3: Advanced Features
6. Cost tracking per conversation
7. Automatic model selection based on task complexity
8. User-configurable model preferences

---

## Data Sources

- Anthropic Pricing: https://www.anthropic.com/pricing
- OpenAI Pricing: https://openai.com/pricing
- Google AI Pricing: https://ai.google.dev/pricing
- Ollama Models: https://ollama.ai/library
- POC Testing: LiteLLM proxy measurements (2025-12-01)

---

## Appendix: LiteLLM Model Names

For integration reference, the LiteLLM model identifiers:

```yaml
# Anthropic
anthropic/claude-sonnet-4-20250514
anthropic/claude-3-5-haiku-20241022
anthropic/claude-3-5-sonnet-20241022

# OpenAI
openai/gpt-4o
openai/gpt-4o-mini
openai/gpt-4-turbo

# Google
gemini/gemini-1.5-pro
gemini/gemini-1.5-flash

# Ollama (via api_base)
ollama/llama3.1:70b
ollama/llama3.1:8b
ollama/deepseek-coder:33b
ollama/mistral:7b
```
