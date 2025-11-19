/**
 * LLM Provider Abstraction - Types
 *
 * Unified interface for multiple LLM providers (Anthropic, OpenAI, Google, Grok, Ollama)
 * Supports API keys, OAuth, and local models
 */

export type LLMProviderName =
  | "anthropic"
  | "openai"
  | "google"
  | "grok"
  | "ollama"
  | "custom";

export type AuthMethod = "api_key" | "oauth" | "local";

export interface AuthConfig {
  method: AuthMethod;
  credentials?: {
    apiKey?: string;
    oauthToken?: string;
    endpoint?: string;  // For local models (e.g., http://localhost:11434)
  };
}

export interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface ToolDefinition {
  name: string;
  description: string;
  input_schema: {
    type: "object";
    properties: Record<string, any>;
    required?: string[];
  };
}

export interface ToolUse {
  type: "tool_use";
  id: string;
  name: string;
  input: Record<string, any>;
}

export interface ChatOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  stopSequences?: string[];
  stream?: boolean;
  tools?: ToolDefinition[];
}

export interface ChatResponse {
  id: string;
  content: string;
  model: string;
  usage: UsageMetrics;
  finishReason?: "stop" | "length" | "content_filter" | "tool_use";
  toolUse?: ToolUse;
}

export interface ChatChunk {
  content: string;
  isComplete: boolean;
}

export interface UsageMetrics {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  costUsd?: number;  // Optional cost calculation
}

export interface LLMProvider {
  readonly name: LLMProviderName;
  readonly supportedModels: string[];

  /**
   * Authenticate with the provider
   */
  authenticate(config: AuthConfig): Promise<void>;

  /**
   * Send a chat completion request
   */
  chat(messages: Message[], options?: ChatOptions): Promise<ChatResponse>;

  /**
   * Stream chat completion responses
   */
  streamChat(
    messages: Message[],
    options?: ChatOptions
  ): AsyncIterator<ChatChunk>;

  /**
   * Get current usage metrics (for managed tier tracking)
   */
  getUsage(): Promise<UsageMetrics>;

  /**
   * Check if provider is authenticated and ready
   */
  isReady(): boolean;
}

/**
 * Provider configuration options
 */
export interface ProviderConfig {
  provider: LLMProviderName;
  auth: AuthConfig;
  defaultModel?: string;
  defaultOptions?: ChatOptions;
}

/**
 * Error types for LLM operations
 */
export class LLMProviderError extends Error {
  constructor(
    message: string,
    public readonly provider: LLMProviderName,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = "LLMProviderError";
  }
}

export class AuthenticationError extends LLMProviderError {
  constructor(provider: LLMProviderName, message?: string, cause?: unknown) {
    super(message || "Authentication failed", provider, cause);
    this.name = "AuthenticationError";
  }
}

export class RateLimitError extends LLMProviderError {
  constructor(
    provider: LLMProviderName,
    public readonly retryAfter?: number,
    cause?: unknown
  ) {
    super("Rate limit exceeded", provider, cause);
    this.name = "RateLimitError";
  }
}
