/**
 * LLM Provider Factory
 *
 * Creates LLM provider instances based on configuration
 */

import type { LLMProvider, ProviderConfig, LLMProviderName } from "./types.js";
import { LLMProviderError } from "./types.js";
import { AnthropicProvider } from "./providers/anthropic.js";
import { OllamaProvider } from "./providers/ollama.js";

/**
 * Create an LLM provider instance
 */
export async function createLLMProvider(
  config: ProviderConfig
): Promise<LLMProvider> {
  let provider: LLMProvider;

  switch (config.provider) {
    case "anthropic":
      provider = new AnthropicProvider();
      break;

    case "ollama":
      provider = new OllamaProvider();
      break;

    case "openai":
      throw new LLMProviderError(
        "OpenAI provider not yet implemented. Coming soon!",
        "openai"
      );

    case "google":
      throw new LLMProviderError(
        "Google Gemini provider not yet implemented. Coming soon!",
        "google"
      );

    case "grok":
      throw new LLMProviderError(
        "Grok provider not yet implemented. Coming soon!",
        "grok"
      );

    case "custom":
      throw new LLMProviderError(
        "Custom provider not yet implemented. Coming soon!",
        "custom"
      );

    default:
      throw new LLMProviderError(
        `Unknown provider: ${config.provider}`,
        config.provider
      );
  }

  // Authenticate the provider
  await provider.authenticate(config.auth);

  return provider;
}

/**
 * Get provider from environment variables
 *
 * Supports:
 * - LLM_PROVIDER: provider name
 * - LLM_AUTH_METHOD: auth method
 * - LLM_API_KEY: API key (for api_key method)
 * - LLM_ENDPOINT: endpoint URL (for local method)
 */
export async function createLLMProviderFromEnv(): Promise<LLMProvider> {
  const providerName = (process.env.LLM_PROVIDER ||
    "anthropic") as LLMProviderName;
  const authMethod = (process.env.LLM_AUTH_METHOD || "api_key") as
    | "api_key"
    | "oauth"
    | "local";

  const config: ProviderConfig = {
    provider: providerName,
    auth: {
      method: authMethod,
      credentials: {
        apiKey: process.env.LLM_API_KEY || process.env.ANTHROPIC_API_KEY,
        endpoint: process.env.LLM_ENDPOINT,
      },
    },
    defaultModel: process.env.LLM_DEFAULT_MODEL,
  };

  return createLLMProvider(config);
}

/**
 * Get list of supported providers
 */
export function getSupportedProviders(): LLMProviderName[] {
  return ["anthropic", "ollama", "openai", "google", "grok", "custom"];
}

/**
 * Get list of implemented providers (ready to use)
 */
export function getImplementedProviders(): LLMProviderName[] {
  return ["anthropic", "ollama"];
}
