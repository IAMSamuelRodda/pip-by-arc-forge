/**
 * LLM Abstraction Layer - Public API
 */

// Types
export type {
  LLMProvider,
  LLMProviderName,
  AuthMethod,
  AuthConfig,
  Message,
  ChatOptions,
  ChatResponse,
  ChatChunk,
  UsageMetrics,
  ProviderConfig,
} from "./types.js";

// Errors
export {
  LLMProviderError,
  AuthenticationError,
  RateLimitError,
} from "./types.js";

// Providers
export { AnthropicProvider } from "./providers/anthropic.js";
export { OllamaProvider } from "./providers/ollama.js";

// Factory
export {
  createLLMProvider,
  createLLMProviderFromEnv,
  getSupportedProviders,
  getImplementedProviders,
} from "./factory.js";
