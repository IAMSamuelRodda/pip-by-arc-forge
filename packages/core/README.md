# @zero-agent/core

Core abstractions for Zero Agent platform.

## Features

- **LLM Provider Abstraction**: Unified interface for multiple LLM providers
  - ✅ Anthropic (Claude 4.5 Sonnet, 3.7 Sonnet, 3.5 Haiku)
  - ✅ Ollama (Local LLMs - llama3, mistral, etc.)
  - 🔜 OpenAI (GPT-4o, GPT-4o mini)
  - 🔜 Google Gemini (Gemini 1.5 Pro/Flash)
  - 🔜 Grok (xAI Grok 4)

- **Database Abstraction** (Coming Soon)
  - SQLite (self-hosted default)
  - PostgreSQL (advanced self-hosting)
  - DynamoDB (managed service)

## Installation

```bash
pnpm add @zero-agent/core
```

## Usage

### Using Environment Variables

```typescript
import { createLLMProviderFromEnv } from "@zero-agent/core";

// Set environment variables:
// LLM_PROVIDER=anthropic
// LLM_AUTH_METHOD=api_key
// LLM_API_KEY=sk-ant-...

const provider = await createLLMProviderFromEnv();

const response = await provider.chat([
  { role: "user", content: "What's the capital of France?" },
]);

console.log(response.content);
```

### Using Configuration Object

```typescript
import { createLLMProvider } from "@zero-agent/core";

// Anthropic with API key
const anthropic = await createLLMProvider({
  provider: "anthropic",
  auth: {
    method: "api_key",
    credentials: {
      apiKey: "sk-ant-...",
    },
  },
  defaultModel: "claude-sonnet-4-5-20250514",
});

// Ollama (local, free)
const ollama = await createLLMProvider({
  provider: "ollama",
  auth: {
    method: "local",
    credentials: {
      endpoint: "http://localhost:11434",
    },
  },
  defaultModel: "llama3:8b",
});

const response = await ollama.chat([
  { role: "user", content: "Explain quantum computing in simple terms" },
]);
```

### Streaming Responses

```typescript
for await (const chunk of provider.streamChat([
  { role: "user", content: "Write a haiku about coding" },
])) {
  if (!chunk.isComplete) {
    process.stdout.write(chunk.content);
  }
}
```

### Usage Tracking

```typescript
const usage = await provider.getUsage();

console.log(`Input tokens: ${usage.inputTokens}`);
console.log(`Output tokens: ${usage.outputTokens}`);
console.log(`Total cost: $${usage.costUsd?.toFixed(4) || 0}`);
```

## Environment Variables

```bash
# Provider selection
LLM_PROVIDER=anthropic          # anthropic | ollama | openai | google | grok
LLM_AUTH_METHOD=api_key         # api_key | oauth | local
LLM_DEFAULT_MODEL=claude-sonnet-4-5-20250514

# Anthropic
ANTHROPIC_API_KEY=sk-ant-...
LLM_API_KEY=sk-ant-...          # Alternative

# Ollama (local)
LLM_ENDPOINT=http://localhost:11434

# OpenAI (coming soon)
OPENAI_API_KEY=sk-...

# Google Gemini (coming soon)
GOOGLE_API_KEY=...
```

## Testing Locally with Ollama

1. **Install Ollama**: https://ollama.com
2. **Pull a model**: `ollama pull llama3`
3. **Run Ollama**: `ollama serve`
4. **Use in code**:

```typescript
import { createLLMProvider } from "@zero-agent/core";

const provider = await createLLMProvider({
  provider: "ollama",
  auth: { method: "local" },
  defaultModel: "llama3:8b",
});

// Zero cost, runs locally, private!
const response = await provider.chat([
  { role: "user", content: "Hello!" },
]);
```

## Error Handling

```typescript
import {
  createLLMProvider,
  AuthenticationError,
  RateLimitError,
  LLMProviderError,
} from "@zero-agent/core";

try {
  const provider = await createLLMProvider(config);
  const response = await provider.chat(messages);
} catch (error) {
  if (error instanceof AuthenticationError) {
    console.error("Invalid API key or auth failed");
  } else if (error instanceof RateLimitError) {
    console.error(`Rate limited. Retry after ${error.retryAfter}ms`);
  } else if (error instanceof LLMProviderError) {
    console.error(`Provider error: ${error.message}`);
  }
}
```

## License

MIT
