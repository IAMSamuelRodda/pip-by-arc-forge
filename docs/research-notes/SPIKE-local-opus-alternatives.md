# SPIKE: Local Opus-Class Model Alternatives

**Date**: 2025-11-29
**Status**: Research Complete
**Goal**: Determine GPU requirements for running Opus-class models locally, compare open source alternatives

---

## Executive Summary

Running a model comparable to Claude Opus 4 (~400B parameters) locally is **not practical for consumer hardware**. However, excellent open source "thinking" models exist at smaller scales that achieve competitive reasoning performance with reasonable hardware requirements.

**Recommendation**: For local deployment, use **QwQ-32B** (24GB VRAM, ~$4,300 AUD for RTX 5090) or **DeepSeek R1 Distilled 70B** (48GB VRAM, ~$8,600 AUD for 2x RTX 5090).

---

## Part 1: Claude Opus 4 - Estimated Requirements

### Parameter Estimates (Third-Party)

| Model | Estimated Parameters | Source |
|-------|---------------------|--------|
| Claude Opus 4.1 | ~400 billion | [Medium - Cogni Down Under](https://medium.com/@cognidownunder/claude-opus-4-1-vs-grok-4-vs-openai-o3-pro-vs-gemini-2-5-pro-which-is-right-for-you-95b3c02db632) |
| Claude 3.5 Sonnet | ~175 billion | Industry estimates |

*Note: Anthropic has not officially disclosed parameter counts.*

### Hypothetical VRAM Requirements (If Open Source)

| Precision | VRAM Required | Hardware Needed |
|-----------|---------------|-----------------|
| FP16 (full) | ~800 GB | 10x H100 80GB (~$300,000 USD) |
| FP8 | ~400 GB | 5x H100 80GB (~$150,000 USD) |
| INT4 (quantized) | ~200 GB | 3x H100 80GB (~$90,000 USD) |

**Conclusion**: A 400B parameter model cannot run on consumer hardware at any practical speed.

---

## Part 2: Open Source "Thinking" Model Alternatives

### Model Comparison

| Model | Parameters | VRAM Required | Thinking/Reasoning | Notes |
|-------|------------|---------------|-------------------|-------|
| **QwQ-32B** | 32B | 24 GB | Yes (chain-of-thought) | 20x smaller than R1, similar performance |
| **DeepSeek R1 Distilled 70B** | 70B | 48 GB | Yes | Best distilled reasoning model |
| **DeepSeek R1 Distilled 32B** | 32B | 24 GB | Yes | Good balance of size/capability |
| **DeepSeek R1 Full** | 671B (37B active) | 480 GB | Yes | MoE architecture, datacenter-only |
| **Llama 3.1 405B** | 405B | 810 GB | Limited | General purpose, not specialized for reasoning |
| **Llama 3.1 70B** | 70B | 48 GB | Limited | Good general model |

### Top Recommendations for Local Deployment

#### Tier 1: Best Value - QwQ-32B
- **VRAM**: 24 GB (fits on single RTX 5090/4090)
- **Performance**: Matches DeepSeek R1 on many benchmarks despite being 20x smaller
- **Strengths**: Math, code, logical reasoning
- **Source**: [VentureBeat](https://venturebeat.com/ai/alibabas-new-open-source-model-qwq-32b-matches-deepseek-r1-with-way-smaller-compute-requirements)

#### Tier 2: Maximum Open Source Capability - DeepSeek R1 70B
- **VRAM**: 48 GB (requires 2x RTX 5090 or 1x A100)
- **Performance**: Best-in-class open source reasoning
- **Strengths**: Extended thinking, complex multi-step problems
- **Source**: [DeepSeek GitHub](https://github.com/deepseek-ai/DeepSeek-R1)

---

## Part 3: Hardware Cost Analysis (AUD)

### Option A: Purchase Hardware

#### Single GPU Setup (for QwQ-32B / R1-32B)

| Component | Price (AUD) | Notes |
|-----------|-------------|-------|
| NVIDIA RTX 5090 32GB | $4,300 | [Scorptec](https://www.scorptec.com.au/product/graphics-cards/geforcertx5090) |
| CPU (Ryzen 9 / i9) | $800 | Sufficient for inference |
| Motherboard | $400 | PCIe 5.0 x16 |
| RAM (64GB DDR5) | $400 | For model loading |
| PSU (1000W+) | $300 | 575W GPU TDP |
| Case + Cooling | $300 | Good airflow essential |
| NVMe SSD 2TB | $300 | Fast model loading |
| **Total** | **~$6,800 AUD** | |

#### Dual GPU Setup (for R1-70B)

| Component | Price (AUD) | Notes |
|-----------|-------------|-------|
| 2x NVIDIA RTX 5090 32GB | $8,600 | 64GB total VRAM |
| CPU (Threadripper / Xeon) | $1,500 | Multi-GPU support |
| Motherboard (HEDT) | $800 | 2x PCIe x16 slots |
| RAM (128GB DDR5) | $800 | For model offloading |
| PSU (1600W) | $500 | 2x 575W GPUs |
| Case + Cooling | $500 | Server-grade cooling |
| NVMe SSD 4TB | $500 | Model storage |
| **Total** | **~$13,200 AUD** | |

### Option B: Rent GPU (DigitalOcean)

#### DigitalOcean GPU Droplet Pricing

| Configuration | On-Demand ($/hr) | Reserved ($/hr) | Monthly (730 hrs) |
|---------------|-----------------|-----------------|-------------------|
| 1x H100 80GB | $2.99 | $1.99 | $2,183 - $1,453 |
| 8x H100 640GB | $6.74/node | - | ~$4,920 |

*Source: [DigitalOcean GPU Pricing](https://www.digitalocean.com/pricing/gpu-droplets)*

#### Alternative Cloud GPU Providers (Reference)

| Provider | 1x H100 ($/hr) | Notes |
|----------|---------------|-------|
| RunPod | $1.99 - $2.49 | Spot instances available |
| Lambda Labs | $2.49 | Good availability |
| AWS (p5) | $32.77 | Enterprise, expensive |

---

## Part 4: Cost Comparison - Buy vs Rent

### Scenario: Running QwQ-32B (24GB VRAM)

| Approach | Upfront | Monthly | Break-even |
|----------|---------|---------|------------|
| **Buy RTX 5090** | $6,800 | ~$50 (electricity) | - |
| **Rent 1x H100** (DO) | $0 | $1,453 (reserved) | 4.7 months |

**Verdict**: If running >5 months, **buy hardware**.

### Scenario: Running DeepSeek R1-70B (48GB VRAM)

| Approach | Upfront | Monthly | Break-even |
|----------|---------|---------|------------|
| **Buy 2x RTX 5090** | $13,200 | ~$100 (electricity) | - |
| **Rent 1x H100 80GB** | $0 | $1,453 (reserved) | 9 months |

**Verdict**: If running >9 months, **buy hardware**. Cloud better for experimentation.

### Scenario: Running Full R1-671B or Opus-equivalent

| Approach | Upfront | Monthly | Notes |
|----------|---------|---------|-------|
| **Buy** | $90,000+ | ~$1,000 | Not practical |
| **Rent 8x H100** (DO) | $0 | $4,920+ | Datacenter only |
| **Use Claude API** | $0 | $500-5,000 | Depends on usage |

**Verdict**: Use **Claude API** for Opus-class capability. Not economical to self-host.

---

## Part 5: Recommendations for Arc Forge

### Short-term (Demo / MVP)
- **Use Claude Opus 4 via API** ($15/$75 per MTok)
- Demo cost: ~$5-10 per session
- No hardware investment

### Medium-term (Cost Optimization)
- **Hybrid approach**:
  - Simple queries → QwQ-32B on RTX 5090 ($0)
  - Complex reasoning → Claude Opus API
- Estimated 70-80% queries can be handled locally

### Long-term (Self-Hosted Enterprise)
- **Dual RTX 5090 setup** (~$13,200 AUD)
- Run DeepSeek R1-70B locally
- Reserved H100 cloud for peak demand

### Hardware Purchase Recommendation

If purchasing hardware in Australia:

| Use Case | Hardware | Price (AUD) | Model |
|----------|----------|-------------|-------|
| Development/Testing | RTX 5090 32GB | $4,300 | QwQ-32B, R1-32B |
| Production (self-hosted) | 2x RTX 5090 | $8,600 | R1-70B |
| Maximum local capability | 4x RTX 5090 | $17,200 | R1-70B with headroom |

---

## References

### GPU Requirements
- [DeepSeek R1 Hardware Requirements](https://dev.to/ai4b/comprehensive-hardware-requirements-report-for-deepseek-r1-5269)
- [Llama 3.1 405B GPU Requirements](https://www.substratus.ai/blog/llama-3-1-405b-gpu-requirements)
- [QwQ-32B vs DeepSeek R1](https://venturebeat.com/ai/alibabas-new-open-source-model-qwq-32b-matches-deepseek-r1-with-way-smaller-compute-requirements)

### Pricing
- [DigitalOcean GPU Droplets](https://www.digitalocean.com/pricing/gpu-droplets)
- [RTX 5090 Australia Pricing](https://www.glukhov.org/post/2025/10/nvidia-rtx-5080-rtx-5090-prices-october-2025/)
- [Scorptec RTX 5090](https://www.scorptec.com.au/product/graphics-cards/geforcertx5090)

### Model Information
- [DeepSeek R1 GitHub](https://github.com/deepseek-ai/DeepSeek-R1)
- [Claude Opus 4 Analysis](https://simonwillison.net/2025/Nov/24/claude-opus/)

---

**Last Updated**: 2025-11-29
