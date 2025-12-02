/**
 * Anthropic Claude Provider Implementation
 *
 * Supports API key authentication (OAuth not available for third-party apps)
 * Models: Claude Opus 4, Claude Sonnet 4, Claude 3.5 Sonnet, Claude 3.5 Haiku
 */

import Anthropic from "@anthropic-ai/sdk";
import type {
  LLMProvider,
  AuthConfig,
  Message,
  ChatOptions,
  ChatResponse,
  ChatChunk,
  UsageMetrics,
} from "../types.js";
import { AuthenticationError, LLMProviderError } from "../types.js";

export class AnthropicProvider implements LLMProvider {
  readonly name = "anthropic" as const;
  readonly supportedModels = [
    "claude-opus-4-20250514",
    "claude-sonnet-4-20250514",
    "claude-haiku-4-5-20251001",
    "claude-3-5-sonnet-20241022",
    "claude-3-5-haiku-20241022",
  ];

  private client: Anthropic | null = null;
  private apiKey: string | null = null;
  private defaultModel = process.env.LLM_DEFAULT_MODEL || "claude-sonnet-4-20250514";
  private usageStats: UsageMetrics = {
    inputTokens: 0,
    outputTokens: 0,
    totalTokens: 0,
  };

  async authenticate(config: AuthConfig): Promise<void> {
    if (config.method !== "api_key") {
      throw new AuthenticationError(
        this.name,
        "Anthropic only supports API key authentication currently"
      );
    }

    if (!config.credentials?.apiKey) {
      throw new AuthenticationError(
        this.name,
        "API key is required for Anthropic authentication"
      );
    }

    this.apiKey = config.credentials.apiKey;

    try {
      this.client = new Anthropic({
        apiKey: this.apiKey,
      });

      // Test authentication with a minimal request
      await this.client.messages.create({
        model: this.defaultModel,
        max_tokens: 1,
        messages: [{ role: "user", content: "test" }],
      });
    } catch (error) {
      this.client = null;
      this.apiKey = null;
      throw new AuthenticationError(
        this.name,
        "Failed to authenticate with Anthropic API",
        error
      );
    }
  }

  async chat(
    messages: Message[],
    options?: ChatOptions
  ): Promise<ChatResponse> {
    if (!this.client) {
      throw new LLMProviderError(
        "Provider not authenticated. Call authenticate() first.",
        this.name
      );
    }

    try {
      const response = await this.client.messages.create({
        model: options?.model || this.defaultModel,
        max_tokens: options?.maxTokens || 4096,
        temperature: options?.temperature,
        stop_sequences: options?.stopSequences,
        messages: messages.map((msg) => ({
          role: msg.role === "system" ? "user" : msg.role,
          content: msg.content,
        })),
        // System messages handled via system parameter in Anthropic
        system:
          messages.find((m) => m.role === "system")?.content || undefined,
        // Add tools if provided
        tools: options?.tools as any,
      });

      // Update usage stats
      if (response.usage) {
        this.usageStats.inputTokens += response.usage.input_tokens;
        this.usageStats.outputTokens += response.usage.output_tokens;
        this.usageStats.totalTokens +=
          response.usage.input_tokens + response.usage.output_tokens;
      }

      // Extract text content
      const textContent = response.content.find((c) => c.type === "text");
      const content = textContent?.type === "text" ? textContent.text : "";

      // Extract tool use if present
      const toolUseContent = response.content.find((c) => c.type === "tool_use");
      const toolUse = toolUseContent?.type === "tool_use" ? {
        type: "tool_use" as const,
        id: toolUseContent.id,
        name: toolUseContent.name,
        input: toolUseContent.input,
      } : undefined;

      return {
        id: response.id,
        content,
        model: response.model,
        toolUse,
        usage: {
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens,
          totalTokens:
            response.usage.input_tokens + response.usage.output_tokens,
          costUsd: this.calculateCost(response.usage, response.model),
        },
        finishReason: response.stop_reason === "tool_use" ? "tool_use" : this.mapStopReason(response.stop_reason),
      };
    } catch (error: any) {
      if (error?.status === 401) {
        throw new AuthenticationError(
          this.name,
          "Invalid API key",
          error
        );
      }

      throw new LLMProviderError(
        `Anthropic API request failed: ${error?.message || "Unknown error"}`,
        this.name,
        error
      );
    }
  }

  async *streamChat(
    messages: Message[],
    options?: ChatOptions
  ): AsyncIterator<ChatChunk> {
    if (!this.client) {
      throw new LLMProviderError(
        "Provider not authenticated. Call authenticate() first.",
        this.name
      );
    }

    try {
      const stream = await this.client.messages.stream({
        model: options?.model || this.defaultModel,
        max_tokens: options?.maxTokens || 4096,
        temperature: options?.temperature,
        stop_sequences: options?.stopSequences,
        messages: messages.map((msg) => ({
          role: msg.role === "system" ? "user" : msg.role,
          content: msg.content,
        })),
        system:
          messages.find((m) => m.role === "system")?.content || undefined,
      });

      for await (const event of stream) {
        if (event.type === "content_block_delta") {
          if (event.delta.type === "text_delta") {
            yield {
              content: event.delta.text,
              isComplete: false,
            };
          }
        } else if (event.type === "message_stop") {
          yield {
            content: "",
            isComplete: true,
          };
        }
      }

      // Update usage stats after stream completes
      const finalMessage = await stream.finalMessage();
      if (finalMessage.usage) {
        this.usageStats.inputTokens += finalMessage.usage.input_tokens;
        this.usageStats.outputTokens += finalMessage.usage.output_tokens;
        this.usageStats.totalTokens +=
          finalMessage.usage.input_tokens + finalMessage.usage.output_tokens;
      }
    } catch (error: any) {
      if (error?.status === 401) {
        throw new AuthenticationError(
          this.name,
          "Invalid API key",
          error
        );
      }

      throw new LLMProviderError(
        `Anthropic stream failed: ${error?.message || "Unknown error"}`,
        this.name,
        error
      );
    }
  }

  async getUsage(): Promise<UsageMetrics> {
    return { ...this.usageStats };
  }

  isReady(): boolean {
    return this.client !== null && this.apiKey !== null;
  }

  /**
   * Calculate cost based on Anthropic pricing (Dec 2025)
   * Opus 4: $15 input / $75 output per MTok
   * Sonnet 4: $3 input / $15 output per MTok
   * Haiku 4.5: $1 input / $5 output per MTok
   * Haiku 3.5: $0.80 input / $4 output per MTok
   */
  private calculateCost(
    usage: { input_tokens: number; output_tokens: number },
    model: string
  ): number {
    const pricing: Record<string, { input: number; output: number }> = {
      "claude-opus-4-20250514": { input: 15.0, output: 75.0 },
      "claude-sonnet-4-20250514": { input: 3.0, output: 15.0 },
      "claude-haiku-4-5-20251001": { input: 1.0, output: 5.0 },
      "claude-3-5-sonnet-20241022": { input: 3.0, output: 15.0 },
      "claude-3-5-haiku-20241022": { input: 0.8, output: 4.0 },
    };

    const modelPricing = pricing[model] || pricing["claude-sonnet-4-20250514"];
    const inputCost = (usage.input_tokens / 1_000_000) * modelPricing.input;
    const outputCost = (usage.output_tokens / 1_000_000) * modelPricing.output;

    return inputCost + outputCost;
  }

  private mapStopReason(
    reason: string | null
  ): "stop" | "length" | "content_filter" | "tool_use" | undefined {
    if (!reason) return undefined;

    const mapping: Record<string, ChatResponse["finishReason"]> = {
      end_turn: "stop",
      max_tokens: "length",
      stop_sequence: "stop",
      tool_use: "tool_use",
    };

    return mapping[reason];
  }
}
