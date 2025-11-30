# Memory Architecture: MCP-Native (Option B)

> **Purpose**: Implementation plan for MCP-native memory architecture (Memento-style)
> **Branch**: `feature/memory-mcp-native`
> **Status**: Ready for implementation
> **Parallel Branch**: `feature/memory-mem0-ollama` (Option A alternative)

---

## Overview

This approach lets the **calling LLM** (Claude.ai/ChatGPT) do fact extraction, while the MCP server just stores/retrieves structured data. This eliminates external API dependencies.

**Key Benefits:**
- **$0 API cost** - no embedding or LLM calls from server
- **ChatGPT memory works** - bypasses Developer Mode limitation
- **Aligns with philosophy** - "users bring their own LLM"

**Reference Implementation:** [Memento MCP Server](https://github.com/iachilles/memento)

---

## Architecture

```
User ↔ Claude.ai/ChatGPT (does fact extraction)
              ↓
         MCP Server (stores/retrieves only)
              ↓
         SQLite + Local Embeddings
```

### How It Works

1. **User says something memorable** → LLM extracts facts
2. **LLM calls `add_memory` tool** with extracted fact (pre-structured)
3. **MCP server stores** fact + generates local embedding
4. **On future queries** → MCP server retrieves relevant memories
5. **LLM incorporates** memories into response

### Key Difference from mem0

| Aspect | mem0 (Option A) | MCP-Native (Option B) |
|--------|-----------------|----------------------|
| Fact extraction | Server-side LLM | Client LLM (Claude/ChatGPT) |
| Embeddings | External API (OpenAI/Ollama) | Local (@xenova/transformers) |
| API cost | ~$0.001/request | $0 |
| ChatGPT memory | Broken (Dev Mode) | Works |

---

## Implementation Plan

### Phase 1: Core Infrastructure

#### task_1: Local Embedding Setup
- **Package**: `@xenova/transformers`
- **Model**: BGE-M3 or all-MiniLM-L6-v2 (small, fast)
- **Location**: `packages/mcp-remote-server/src/memory/embeddings.ts`

```typescript
// Example structure
import { pipeline } from '@xenova/transformers';

let embedder: any = null;

export async function getEmbedding(text: string): Promise<number[]> {
  if (!embedder) {
    embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
  }
  const output = await embedder(text, { pooling: 'mean', normalize: true });
  return Array.from(output.data);
}
```

**Acceptance Criteria:**
- [ ] Install @xenova/transformers
- [ ] Create embeddings service
- [ ] Test embedding generation (~384 dimensions for MiniLM)
- [ ] Measure latency (target: <100ms)

#### task_2: Memory Storage Schema
- **Location**: `packages/mcp-remote-server/src/db/schema.ts`

```sql
CREATE TABLE memories (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  content TEXT NOT NULL,           -- The fact/memory text
  embedding BLOB NOT NULL,         -- Vector as binary
  category TEXT,                   -- Optional: preference, goal, context
  source TEXT,                     -- Where it came from (chat, import)
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  metadata TEXT                    -- JSON for extensibility
);

CREATE INDEX idx_memories_user ON memories(user_id);
```

**Acceptance Criteria:**
- [ ] Add migration for memories table
- [ ] Create Memory model/repository
- [ ] Test CRUD operations

#### task_3: Vector Similarity Search
- **Approach**: SQLite with cosine similarity in JS
- **Alternative**: sqlite-vss extension (if needed)

```typescript
// Simple cosine similarity
function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}
```

**Acceptance Criteria:**
- [ ] Implement similarity search
- [ ] Test with sample data
- [ ] Benchmark performance (target: <50ms for 1000 memories)

---

### Phase 2: MCP Tools

#### task_4: Restructure Memory Tools

Current mem0 tools need to be adapted:

| Tool | Change |
|------|--------|
| `add_memory` | Accept pre-extracted fact (no server-side extraction) |
| `search_memory` | Use local embeddings for similarity |
| `list_memories` | No change |
| `delete_memory` | No change |
| `clear_all_memories` | No change |

**New Tool Signatures:**

```typescript
// add_memory - LLM provides the extracted fact
{
  name: "add_memory",
  description: "Store a fact about the user. The fact should be a clear, standalone statement.",
  parameters: {
    fact: { type: "string", description: "The fact to remember (e.g., 'User prefers invoices sent on Mondays')" },
    category: { type: "string", enum: ["preference", "goal", "context", "business"], optional: true }
  }
}

// search_memory - semantic search
{
  name: "search_memory",
  description: "Find relevant memories about the user",
  parameters: {
    query: { type: "string", description: "What to search for" },
    limit: { type: "number", default: 5 }
  }
}
```

**Acceptance Criteria:**
- [ ] Refactor add_memory to accept pre-extracted facts
- [ ] Refactor search_memory to use local embeddings
- [ ] Update tool descriptions to guide LLM behavior
- [ ] Test with Claude.ai and ChatGPT

#### task_5: System Prompt Updates

Guide LLMs to extract and store memories:

```markdown
## Memory Guidelines

When users share information about themselves, their business, or preferences:
1. Extract the key fact as a clear, standalone statement
2. Use `add_memory` to store it
3. Categorize appropriately (preference, goal, context, business)

Examples:
- User: "I always want invoices sent on Monday mornings"
  → add_memory({ fact: "Prefers invoices sent on Monday mornings", category: "preference" })

- User: "My business goal this quarter is to reduce overdue invoices by 50%"
  → add_memory({ fact: "Q4 goal: reduce overdue invoices by 50%", category: "goal" })

When answering questions, use `search_memory` to recall relevant context.
```

**Acceptance Criteria:**
- [ ] Update system prompt in MCP server
- [ ] Test memory extraction with various inputs
- [ ] Verify memories are being stored correctly

---

### Phase 3: Deduplication & Conflict Resolution

#### task_6: Duplicate Detection

Prevent storing redundant memories:

```typescript
async function isDuplicate(userId: string, newEmbedding: number[]): Promise<boolean> {
  const existing = await getMemories(userId);
  for (const memory of existing) {
    const similarity = cosineSimilarity(newEmbedding, memory.embedding);
    if (similarity > 0.9) return true; // Very similar = duplicate
  }
  return false;
}
```

**Acceptance Criteria:**
- [ ] Implement duplicate detection
- [ ] Configurable similarity threshold
- [ ] Return existing memory if duplicate detected

#### task_7: Conflict Resolution

Handle contradictory facts:

```typescript
// If new fact contradicts old, update rather than add
// E.g., "Prefers Monday invoices" vs "Prefers Friday invoices"
```

**Approach**:
- Detect high similarity (0.7-0.9) as potential conflict
- Use recency: newer fact overwrites older
- Optionally: ask user to confirm

**Acceptance Criteria:**
- [ ] Implement conflict detection
- [ ] Auto-update on conflict (keep newer)
- [ ] Log conflicts for debugging

---

### Phase 4: ChatGPT Memory Import

#### task_8: Import Endpoint

Allow importing ChatGPT exported memories:

```typescript
// POST /api/memory/import
{
  source: "chatgpt",
  data: { /* ChatGPT export format */ }
}
```

**Acceptance Criteria:**
- [ ] Parse ChatGPT data export format
- [ ] Extract facts from conversations.json
- [ ] Generate embeddings for imported facts
- [ ] Deduplicate against existing memories

---

## Testing Strategy

### Unit Tests
- Embedding generation
- Similarity calculation
- CRUD operations
- Duplicate detection

### Integration Tests
- Full add → search flow
- Memory injection into context
- Multi-user isolation

### E2E Tests
- Claude.ai: memory extraction → storage → retrieval
- ChatGPT: same flow (verify Dev Mode bypass works)

---

## Resource Estimates

| Component | Memory | Latency |
|-----------|--------|---------|
| Embedding model (MiniLM) | ~50MB | ~50ms |
| SQLite memories | Minimal | <10ms |
| Similarity search (1000 items) | Minimal | <50ms |
| **Total overhead** | **~50-100MB** | **<100ms** |

Fits within 256MB MCP container allocation.

---

## Open Questions

1. **Model choice**: MiniLM vs BGE-M3 vs other?
2. **Persistence**: Keep embeddings in SQLite or separate file?
3. **Batch operations**: Support bulk import efficiently?

---

## References

- [Memento MCP Server](https://github.com/iachilles/memento) - Reference implementation
- [@xenova/transformers](https://github.com/xenova/transformers.js) - Local embeddings
- [MCP Architecture](https://modelcontextprotocol.io/docs/learn/architecture)

---

**Last Updated**: 2025-11-30
