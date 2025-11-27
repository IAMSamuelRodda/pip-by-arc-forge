# Context Management & Agent Architecture Research

> **Purpose**: Document research findings on context management, RAG architecture, and Claude Agent SDK for Pip development
> **Date**: 2025-11-27
> **Status**: Research complete, awaiting implementation decisions

---

## Executive Summary

This document consolidates research from:
1. **Star Atlas Agent** - Four-tier memory architecture with RAG
2. **Claude Agent SDK** - Anthropic's production agent framework
3. **Current Zero Agent** - Baseline for comparison

**Key Recommendation**: Design RAG-ready architecture from the start, but implement in phases (simple context for demo, full RAG post-demo).

---

## Table of Contents

1. [Current State Analysis](#1-current-state-analysis)
2. [Star Atlas Agent Architecture](#2-star-atlas-agent-architecture)
3. [Claude Agent SDK Deep Dive](#3-claude-agent-sdk-deep-dive)
4. [Recommended Architecture for Pip](#4-recommended-architecture-for-pip)
5. [RAG Implementation Strategy](#5-rag-implementation-strategy)
6. [Implementation Phases](#6-implementation-phases)
7. [Decision: MVP vs RAG-First](#7-decision-mvp-vs-rag-first)

---

## 1. Current State Analysis

### Current Zero Agent Architecture (`orchestrator.ts`)

```
User Message → Load Session → Load Core Memory → Build Static Prompt → LLM → Store Session
```

**Current Capabilities**:
- Session management (conversation history per session)
- Core memory (relationship stage, basic preferences)
- Static system prompt with minimal personalization
- Tool calling (11 Xero tools)

**Current Limitations**:
| Issue | Impact |
|-------|--------|
| No document context | Can't answer "Can I afford to hire?" with business plan context |
| Static system prompt | Doesn't adapt to user context or personality phase |
| No semantic retrieval | Can't find relevant context automatically |
| Full history loading | Will hit token limits as conversations grow |
| No context compression | Old conversations stored verbatim forever |

### Code Reference

```typescript
// Current buildSystemPrompt (orchestrator.ts:196-216)
private buildSystemPrompt(memory: any): string {
  const relationshipContext = memory?.relationshipStage
    ? `Your relationship with this user is at the "${memory.relationshipStage}" stage.`
    : 'This is your first conversation with this user.';

  return `You are a helpful AI assistant for Xero accounting software.
${relationshipContext}
// ... static capabilities list ...
Communication style: Be helpful, professional, and concise.`;
}
```

**Problems**:
- No business context injection
- No semantic retrieval of relevant memories
- No token budget management
- No progressive compression

---

## 2. Star Atlas Agent Architecture

### Four-Tier Memory System

The star-atlas-agent implements a sophisticated multi-tier memory architecture:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    FOUR-TIER MEMORY ARCHITECTURE                        │
├─────────────────────────────────────────────────────────────────────────┤
│ Tier 1: SESSION MEMORY (Ephemeral)                                      │
│   Storage: In-memory (Lambda execution)                                 │
│   Lifetime: ~30 minutes (current conversation)                          │
│   Size: Last 10-20 messages (~5-10KB)                                   │
│   Cost: $0 (included in compute)                                        │
│   Fidelity: Verbatim transcript                                         │
├─────────────────────────────────────────────────────────────────────────┤
│ Tier 2: SHORT-TERM MEMORY (Hot Cache)                                   │
│   Storage: DynamoDB with 48-hour TTL                                    │
│   Lifetime: 48 hours                                                    │
│   Size: ~100 conversations per user (~50KB)                             │
│   Cost: ~$0.50/month per 100 users                                      │
│   Fidelity: Full conversation threads                                   │
├─────────────────────────────────────────────────────────────────────────┤
│ Tier 3: LONG-TERM MEMORY (Vector Store)                                 │
│   Storage: DynamoDB with vector embeddings                              │
│   Lifetime: Permanent                                                   │
│   Size: ~200KB per user (50 key memories)                               │
│   Cost: ~$5/month per 100 users                                         │
│   Fidelity: Semantic embeddings (1024-dim Titan v2)                     │
│   Search: Cosine similarity, threshold 0.7-0.8                          │
├─────────────────────────────────────────────────────────────────────────┤
│ Tier 4: RELATIONSHIP IMPRESSION (Structured Profile)                    │
│   Storage: DynamoDB (structured JSON)                                   │
│   Lifetime: Permanent                                                   │
│   Size: ~1-2KB per user                                                 │
│   Cost: ~$0.05/month per 100 users                                      │
│   Content: personality_phase, trust_score, preferences                  │
└─────────────────────────────────────────────────────────────────────────┘
```

### RAG Pipeline Design

```
User Query → Embed Query → Vector Search → Retrieve Top-K → Augment Prompt → LLM → Response
     │                          │                │
     │                          ▼                ▼
     │                    DynamoDB          Inject into
     │                    Memories          System Prompt
     │                          │                │
     └──────────────────────────┴────────────────┘
                          Feedback Loop
                    (Store new interaction embedding)
```

### Progressive Compression Strategy

| Timeline | Storage | Fidelity | Token Cost |
|----------|---------|----------|------------|
| 0-48h | Full conversation | Verbatim | Full |
| 2-7 days | Summarized | LLM summary | Reduced |
| 7-30 days | Key memories only | Embeddings | Minimal |
| 30+ days | Relationship profile | Structured | ~0 |

**Token Savings**: 95% reduction after 30 days

### Key Architectural Decisions (ADRs)

1. **DynamoDB Vector Store over OpenSearch**: Cost ($25/mo vs $60/mo), scales to 50K embeddings
2. **Client-side cosine similarity**: No vector DB dependency, 100-200ms latency for <30K vectors
3. **Bedrock Titan v2 embeddings**: 1024-dim, $0.0001/1K tokens
4. **Personality progression**: colleague → partner → friend (based on trust_score)

---

## 3. Claude Agent SDK Deep Dive

### What Is It?

The Claude Agent SDK is Anthropic's **production-ready agent harness** extracted from Claude Code. It transforms Claude from a single-turn API into a persistent autonomous agent.

### Core Value Proposition

| Direct API | Claude Agent SDK |
|------------|------------------|
| Single request/response | Persistent agent sessions |
| Manual tool integration | Built-in tools (File, Bash, Web, MCP) |
| Manual context management | **Automatic context compaction** |
| No session continuity | Session resumption |
| Custom auth per tool | Standardized MCP integration |

### Key Features

#### 1. Automatic Context Management

The SDK's killer feature is **automatic context compaction**:

```
Performance Impact:
- Context editing alone: 29% improvement
- Context editing + memory: 39% improvement
- 100-turn evaluation: 84% token reduction
```

When approaching token limits, the SDK:
- Clears stale tool calls and results
- Preserves conversation flow
- Maintains relevant context
- Enables agents to complete workflows that would otherwise fail

#### 2. Built-in Tools

| Tool | Purpose |
|------|---------|
| Read | Read file contents |
| Write | Create/append files |
| Edit | Modify file sections with diffs |
| Bash | Execute shell commands |
| Web Search | Search the internet |
| Memory | Persistent storage outside context |

#### 3. Agent Loop

```
1. User provides prompt/context
2. Claude reasons (with extended thinking support)
3. Claude calls tools (Read, Bash, custom tools)
4. Tools execute and return results
5. Results feed back into context
6. Claude reasons about results
7. Loop repeats until goal achieved
```

#### 4. Hooks for Permission Control

```python
# Example: Block dangerous bash commands
async def check_bash_command(input_data, tool_use_id, context):
    if "rm -rf" in input_data["tool_input"].get("command", ""):
        return {
            "hookSpecificOutput": {
                "permissionDecision": "deny",
                "permissionDecisionReason": "Destructive command blocked"
            }
        }
    return {"hookSpecificOutput": {"permissionDecision": "allow"}}
```

Hook events: `PreToolUse`, `PostToolUse`, `PermissionRequest`, `SessionStart/Stop`, `PreCompact`

#### 5. Multi-Agent (Subagents)

```
Benefits:
- Context isolation (prevents task-specific clutter)
- Parallel execution (45 min → <10 min on benchmarks)
- Specialized agents for different domains

Performance: Claude Opus 4 + Sonnet 4 subagents = 90.2% improvement on complex tasks
```

### Code Examples

**Minimal Python Agent**:
```python
import anyio
from claude_agent_sdk import query, ClaudeAgentOptions, AssistantMessage, TextBlock

async def main():
    options = ClaudeAgentOptions(
        system_prompt="You are a helpful coding assistant",
        max_turns=10,
        allowed_tools=["Read", "Write", "Bash"]
    )

    async for message in query(prompt="List Python files", options=options):
        if isinstance(message, AssistantMessage):
            for block in message.content:
                if isinstance(block, TextBlock):
                    print(f"Assistant: {block.text}")

anyio.run(main())
```

**Custom Tools + Hooks**:
```python
from claude_agent_sdk import ClaudeSDKClient, ClaudeAgentOptions

async def calculate_tax(args):
    return {"content": [{"type": "text", "text": f"Tax: {args['amount'] * args['rate']}"}]}

options = ClaudeAgentOptions(
    custom_tools=[{
        "name": "calculate_tax",
        "description": "Calculate tax",
        "input_schema": {
            "type": "object",
            "properties": {
                "amount": {"type": "number"},
                "rate": {"type": "number"}
            }
        }
    }],
    hooks={"PreToolUse": [{"handler": approval_hook}]}
)
```

### Comparison to Other Frameworks

| Dimension | Claude Agent SDK | LangGraph | LangChain | OpenAI Agents |
|-----------|------------------|-----------|-----------|---------------|
| Best For | Autonomous file/code agents | Complex stateful workflows | RAG, multi-model | Multi-agent handoffs |
| Context Mgmt | Automatic compaction | State persistence | Manual | Session mgmt |
| Built-in Tools | File, Bash, Web, Memory | Retrievers, evaluators | LLM providers, vector DBs | Guardrails |
| Multi-agent | Parallel subagents | Graph orchestration | Limited | Handoff focus |
| Production Ready | Yes (Claude Code) | Yes | Community | Newer |
| Vendor Lock-in | Claude-optimized | Agnostic | Agnostic | Agnostic |

### Why Anthropic Claims It's Good

1. **Battle-tested**: Powers Claude Code (thousands of daily users)
2. **Context compaction**: Prevents "context exhaustion" failure mode
3. **Rich tool ecosystem**: No boilerplate auth/integration code
4. **MCP standardization**: Clean external service integration
5. **Permissions-first**: Deterministic control via hooks
6. **Long-running**: Session management for hours of coherence
7. **Claude-optimized**: Automatic prompt caching and optimizations

---

## 4. Recommended Architecture for Pip

### Adapted Four-Tier Memory for Pip

| Tier | Star Atlas | Pip Adaptation | Storage |
|------|------------|----------------|---------|
| 1. Session | Current game chat | Current chat session | In-memory |
| 2. Short-term | 48h conversation cache | 7-day conversation history | SQLite (TTL) |
| 3. Long-term | Game preferences, patterns | Business context + memories | SQLite + Embeddings |
| 4. Relationship | Player profile, trust | User profile, personality phase | SQLite (structured) |

### Context Retrieval Pipeline

```
┌──────────────────────────────────────────────────────────────────────────┐
│                     PIP CONTEXT RETRIEVAL PIPELINE                       │
│                                                                          │
│  User Query: "Can I afford to hire someone?"                            │
│       │                                                                  │
│       ▼                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │ 1. QUERY EMBEDDING                                                  ││
│  │    Generate 768-dim vector (Ollama nomic-embed-text)                ││
│  └─────────────────────────────────────────────────────────────────────┘│
│       │                                                                  │
│       ▼                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │ 2. PARALLEL CONTEXT RETRIEVAL                                       ││
│  │                                                                      ││
│  │    ┌──────────────┐  ┌──────────────┐  ┌──────────────┐            ││
│  │    │ Business     │  │ Financial    │  │ Conversation │            ││
│  │    │ Context      │  │ Context      │  │ Memory       │            ││
│  │    │ (Documents)  │  │ (Xero Live)  │  │ (History)    │            ││
│  │    └──────┬───────┘  └──────┬───────┘  └──────┬───────┘            ││
│  │           │                  │                  │                    ││
│  │    Vector Search      Tool Calls         Vector Search              ││
│  │    Top-5 chunks       P&L, Cash Flow     Top-3 memories             ││
│  │           │                  │                  │                    ││
│  │           └──────────────────┼──────────────────┘                    ││
│  │                              ▼                                       ││
│  └─────────────────────────────────────────────────────────────────────┘│
│       │                                                                  │
│       ▼                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │ 3. CONTEXT ASSEMBLY                                                 ││
│  │                                                                      ││
│  │    System Prompt: Pip personality (relationship stage)              ││
│  │    Business Context: Retrieved chunks (with similarity scores)      ││
│  │    Financial Context: Live Xero data (from tool calls)              ││
│  │    Conversation Memory: Relevant past interactions                  ││
│  │                                                                      ││
│  │    Token Budget: Max 20K tokens for context                         ││
│  └─────────────────────────────────────────────────────────────────────┘│
│       │                                                                  │
│       ▼                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │ 4. LLM REASONING (Claude via Agent SDK or direct API)               ││
│  │    Synthesize all context → Actionable answer                       ││
│  └─────────────────────────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────────────────────┘
```

### SQLite Schema for RAG

```sql
-- Business context documents (chunked with embeddings)
CREATE TABLE business_context (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  doc_type TEXT NOT NULL,           -- 'business_plan', 'kpi', 'strategy', 'notes'
  doc_name TEXT NOT NULL,
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,            -- Chunk text (max 2000 chars)
  summary TEXT,                     -- LLM-generated summary
  embedding BLOB NOT NULL,          -- Vector as binary (768 floats = 3KB)
  metadata TEXT,                    -- JSON: headings, source page
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX idx_context_user ON business_context(user_id);
CREATE INDEX idx_context_type ON business_context(user_id, doc_type);

-- Conversation memories (key learnings extracted)
CREATE TABLE memories (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL,               -- 'preference', 'decision', 'insight', 'goal'
  summary TEXT NOT NULL,            -- "User prioritizes cash flow over growth"
  embedding BLOB NOT NULL,
  confidence REAL DEFAULT 0.8,
  reinforced_count INTEGER DEFAULT 1,
  source_session_id TEXT,
  created_at INTEGER NOT NULL,
  expires_at INTEGER                -- Optional TTL
);
CREATE INDEX idx_memories_user ON memories(user_id);
CREATE INDEX idx_memories_type ON memories(user_id, type);

-- Conversation summaries (compressed history)
CREATE TABLE conversation_summaries (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  summary TEXT NOT NULL,
  embedding BLOB NOT NULL,
  key_topics TEXT,                  -- JSON array
  created_at INTEGER NOT NULL,
  original_message_count INTEGER
);
CREATE INDEX idx_summaries_user ON conversation_summaries(user_id);
```

---

## 5. RAG Implementation Strategy

### Why RAG > Full Context Loading

| Approach | Token Usage | Scalability | Relevance |
|----------|-------------|-------------|-----------|
| Full History | Grows unbounded | Hits 200K limit | Includes irrelevant |
| Truncated History | Fixed (last N) | Works but loses context | May miss important |
| **RAG (Vector Search)** | Fixed (top-K) | Unlimited history | Only relevant content |

**RAG enables "unlimited" context** because:
1. Store everything as embeddings (cheap storage)
2. At query time, retrieve only relevant chunks (fixed token cost)
3. Older conversations don't cost more tokens
4. Quality improves as more context accumulates

### Embedding Options for VPS (384MB constraint)

| Option | Model | Dimensions | Self-Hosted | Cost | Latency |
|--------|-------|------------|-------------|------|---------|
| **A. Ollama** | nomic-embed-text | 768 | Yes | $0 | 50-100ms |
| B. Ollama | mxbai-embed-large | 1024 | Yes | $0 | 100-200ms |
| C. OpenAI | text-embedding-3-small | 1536 | No | $0.02/1M | 200-300ms |
| D. Voyage | voyage-3-lite | 512 | No | $0.02/1M | 150-250ms |

**Recommendation**: Start with **Option A (Ollama nomic-embed-text)** for zero cost.

### Vector Search Implementation

Since SQLite lacks native vector search, use client-side cosine similarity:

```typescript
// packages/agent-core/src/context/vector-search.ts

export class VectorSearch {
  async search(
    userId: string,
    queryEmbedding: number[],
    options: { tables: string[]; topK?: number; threshold?: number }
  ): Promise<SearchResult[]> {
    const { tables, topK = 5, threshold = 0.7 } = options;
    const results: SearchResult[] = [];

    for (const table of tables) {
      const rows = await this.db.query(
        `SELECT id, content, summary, embedding FROM ${table} WHERE user_id = ?`,
        [userId]
      );

      for (const row of rows) {
        const embedding = this.deserializeEmbedding(row.embedding);
        const similarity = this.cosineSimilarity(queryEmbedding, embedding);

        if (similarity >= threshold) {
          results.push({ id: row.id, content: row.summary || row.content, similarity });
        }
      }
    }

    return results.sort((a, b) => b.similarity - a.similarity).slice(0, topK);
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    let dot = 0, normA = 0, normB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
  }
}
```

### Scalability Thresholds

| User Scale | Storage | Search Latency | Action |
|------------|---------|----------------|--------|
| 1-100 users | SQLite vectors | <100ms | Current approach |
| 100-500 users | SQLite + cache | <200ms | Add Redis cache |
| 500-1K users | SQLite sharded | <300ms | Shard by user_id |
| 1K+ users | PostgreSQL + pgvector | <100ms | Migrate to pgvector |

---

## 6. Implementation Phases

### Phase 1: Demo MVP (3-5 days)

**Goal**: Basic document upload + simple context injection for Thursday demo

**No RAG required** - just simple recent document retrieval:

```typescript
// Simple context injection (no embeddings)
async getRelevantContext(userId: string, query: string) {
  const docs = await this.db.query(
    `SELECT summary FROM business_context
     WHERE user_id = ?
     ORDER BY created_at DESC LIMIT 3`,
    [userId]
  );
  return docs.map(d => d.summary).join('\n');
}
```

**Deliverables**:
- Document upload API (PDF, TXT, MD)
- Basic text extraction
- SQLite storage (without embeddings)
- Simple prompt injection
- Demo test cases

### Phase 2: RAG Spike (3-5 days post-demo)

**Goal**: Validate embedding + vector search approach

**Deliverables**:
- Ollama embedding integration
- Vector search implementation
- Chunking strategy validation
- Performance benchmarks

### Phase 3: Full RAG Implementation (1-2 weeks)

**Goal**: Production-ready semantic retrieval

**Deliverables**:
- Complete embedding pipeline
- Conversation memory extraction
- Progressive compression
- Token budget management
- Query intent classification

### Phase 4: Claude Agent SDK Integration (Optional)

**Goal**: Leverage SDK's context compaction and multi-agent features

**Deliverables**:
- Migrate from direct API to Agent SDK
- Implement permission hooks
- Add subagents for specialized tasks
- Enable automatic context compaction

---

## 7. Decision: MVP vs RAG-First

### Recommendation: **Hybrid Approach**

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    RECOMMENDED IMPLEMENTATION PATH                       │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Week 1 (Demo):     Design RAG-ready schema, implement simple retrieval │
│                     ↓                                                   │
│  Week 2 (Spike):    Validate RAG with Ollama embeddings                 │
│                     ↓                                                   │
│  Week 3-4:          Full RAG implementation                             │
│                     ↓                                                   │
│  Week 5+:           Agent SDK integration (if beneficial)               │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Why This Approach?

**Design RAG-ready from start**:
- Schema includes `embedding BLOB` column (even if null initially)
- Abstraction layer allows swapping retrieval strategy
- Avoids migration pain later

**But implement simple first**:
- Demo needs working product, not perfect architecture
- Validate business value before technical investment
- RAG spike reduces uncertainty before full implementation

### Schema Design (RAG-Ready but Simple-First)

```sql
-- RAG-ready schema (embedding nullable for Phase 1)
CREATE TABLE business_context (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  doc_type TEXT NOT NULL,
  doc_name TEXT NOT NULL,
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  summary TEXT,
  embedding BLOB,                   -- NULL in Phase 1, populated in Phase 2+
  created_at INTEGER NOT NULL
);

-- Phase 1: Simple query (no embeddings)
SELECT content FROM business_context WHERE user_id = ? ORDER BY created_at DESC LIMIT 3;

-- Phase 2+: Vector search (with embeddings)
SELECT content, embedding FROM business_context WHERE user_id = ? AND embedding IS NOT NULL;
```

### Abstraction for Strategy Swap

```typescript
// packages/agent-core/src/context/retriever.ts

interface ContextRetriever {
  retrieve(userId: string, query: string): Promise<RetrievedContext[]>;
}

// Phase 1: Simple recency-based
class SimpleRetriever implements ContextRetriever {
  async retrieve(userId: string, query: string) {
    return this.db.query(
      'SELECT content FROM business_context WHERE user_id = ? ORDER BY created_at DESC LIMIT 5',
      [userId]
    );
  }
}

// Phase 2+: Vector search
class VectorRetriever implements ContextRetriever {
  async retrieve(userId: string, query: string) {
    const embedding = await this.embedder.embed(query);
    return this.vectorSearch.search(userId, embedding, { topK: 5 });
  }
}

// Factory switches implementation based on config
function createRetriever(config: Config): ContextRetriever {
  return config.useVectorSearch
    ? new VectorRetriever(config)
    : new SimpleRetriever(config);
}
```

---

## Appendix A: Claude Agent SDK vs Direct API Decision

### When to Use Agent SDK

| Scenario | Use SDK | Use Direct API |
|----------|---------|----------------|
| Long-running autonomous agents | ✅ | ❌ |
| File operations needed | ✅ | ❌ |
| Context >50K tokens | ✅ (compaction) | ❌ (manual) |
| Multi-step tool workflows | ✅ | ⚠️ (manual loop) |
| Simple Q&A chatbot | ❌ | ✅ |
| Tight latency requirements | ⚠️ (overhead) | ✅ |

### Recommendation for Pip

**Phase 1-3**: Continue with direct API
- Simpler deployment
- Better control over context
- Lower latency

**Phase 4 (Post-RAG)**: Evaluate Agent SDK
- If context compaction needed
- If multi-agent architecture beneficial
- If file operations become core feature

---

## Appendix B: Star Atlas Agent Reference Files

Key architecture documents from `/home/x-forge/repos/star-atlas-agent/`:

| File | Content |
|------|---------|
| `docs/memory-architecture-spike.md` | Four-tier memory design (389 lines) |
| `docs/product-decisions-2025-11-12.md` | Product decisions including memory (636 lines) |
| `docs/planning-session-2025-11-12.md` | Architecture planning (276 lines) |
| `ARCHITECTURE.md` | System architecture + ADRs (458 lines) |
| `terraform/dynamodb.tf` | DynamoDB schema definitions |

---

## Appendix C: Token Budget Management

### Budget Allocation

| Component | Token Budget | Notes |
|-----------|--------------|-------|
| System Prompt | 2,000 | Pip personality + capabilities |
| Business Context | 8,000 | Top-K retrieved chunks |
| Financial Context | 5,000 | Xero tool results |
| Conversation History | 3,000 | Recent messages |
| User Query | 500 | Current question |
| **Total Input** | **18,500** | |
| Response Buffer | 4,000 | Claude's answer |
| **Max Context** | **22,500** | Within Claude's 200K limit |

### Dynamic Budget Management

```typescript
class TokenBudgetManager {
  private readonly MAX_INPUT_TOKENS = 18500;

  allocate(components: ContextComponent[]): ContextComponent[] {
    // Priority order: System > Query > Financial > Business > History
    const priorities = ['system', 'query', 'financial', 'business', 'history'];

    let remaining = this.MAX_INPUT_TOKENS;
    const result: ContextComponent[] = [];

    for (const priority of priorities) {
      const component = components.find(c => c.type === priority);
      if (component) {
        const tokens = Math.min(component.tokens, remaining);
        result.push({ ...component, tokens });
        remaining -= tokens;
      }
    }

    return result;
  }
}
```

---

## References

### Internal
- `specs/BLUEPRINT.yaml` - Architectural blueprint for Pip
- `PROGRESS.md` - Implementation tracking
- `ISSUES.md` - Flagged items and spikes

### External
- [Claude Agent SDK Documentation](https://docs.claude.com/en/api/agent-sdk/overview)
- [Building Agents with Claude Agent SDK](https://www.anthropic.com/engineering/building-agents-with-the-claude-agent-sdk)
- [Managing Context on Claude Platform](https://anthropic.com/news/context-management)
- [Ollama Embedding Models](https://ollama.com/search?c=embedding)
