/**
 * Test LLM Abstraction Layer
 *
 * Example usage of the LLM provider abstraction
 * Tests both Anthropic and Ollama providers
 */

import { config } from "dotenv";
import { createLLMProvider, type LLMProvider } from "../packages/core/dist/index.js";

// Load environment variables from .env
config();

async function testAnthropicProvider() {
  console.log("\n=== Testing Anthropic Provider ===\n");

  if (!process.env.ANTHROPIC_API_KEY) {
    console.log("⚠️  ANTHROPIC_API_KEY not set. Skipping Anthropic test.");
    return;
  }

  try {
    const provider = await createLLMProvider({
      provider: "anthropic",
      auth: {
        method: "api_key",
        credentials: {
          apiKey: process.env.ANTHROPIC_API_KEY,
        },
      },
      defaultModel: "claude-3-5-haiku-20241022",  // Use cheapest model for testing
    });

    console.log("✓ Provider authenticated successfully");
    console.log(`✓ Provider ready: ${provider.isReady()}`);

    // Test basic chat
    const response = await provider.chat([
      { role: "user", content: "Say hello in exactly 5 words." },
    ]);

    console.log(`\nResponse: ${response.content}`);
    console.log(`Model: ${response.model}`);
    console.log(`\nUsage:`);
    console.log(`  Input tokens: ${response.usage.inputTokens}`);
    console.log(`  Output tokens: ${response.usage.outputTokens}`);
    console.log(`  Cost: $${response.usage.costUsd?.toFixed(6) || 0}`);

    // Test cumulative usage
    const totalUsage = await provider.getUsage();
    console.log(`\nTotal Usage:`);
    console.log(`  Total tokens: ${totalUsage.totalTokens}`);
  } catch (error) {
    console.error("✗ Anthropic test failed:", error);
  }
}

async function testOllamaProvider() {
  console.log("\n=== Testing Ollama Provider ===\n");

  try {
    const provider = await createLLMProvider({
      provider: "ollama",
      auth: {
        method: "local",
        credentials: {
          endpoint: process.env.LLM_ENDPOINT || "http://localhost:11434",
        },
      },
      defaultModel: "llama3:8b",
    });

    console.log("✓ Provider authenticated successfully");
    console.log(`✓ Provider ready: ${provider.isReady()}`);

    // List available models
    if ("listAvailableModels" in provider) {
      const models = await (provider as any).listAvailableModels();
      console.log(`\nAvailable models: ${models.join(", ")}`);
    }

    // Test basic chat
    const response = await provider.chat([
      { role: "user", content: "Say hello in exactly 5 words." },
    ]);

    console.log(`\nResponse: ${response.content}`);
    console.log(`Model: ${response.model}`);
    console.log(`\nUsage:`);
    console.log(`  Input tokens: ${response.usage.inputTokens}`);
    console.log(`  Output tokens: ${response.usage.outputTokens}`);
    console.log(`  Cost: $${response.usage.costUsd || 0} (FREE - local model)`);

    // Test streaming
    console.log(`\nStreaming test:`);
    process.stdout.write("  ");
    for await (const chunk of provider.streamChat([
      { role: "user", content: "Count from 1 to 5" },
    ])) {
      if (!chunk.isComplete) {
        process.stdout.write(chunk.content);
      }
    }
    console.log("\n");
  } catch (error) {
    console.error("✗ Ollama test failed:", error);
    console.error("\n💡 Make sure Ollama is running: ollama serve");
    console.error("💡 And you have a model: ollama pull llama3");
  }
}

async function main() {
  console.log("🚀 Testing LLM Abstraction Layer\n");

  await testAnthropicProvider();
  await testOllamaProvider();

  console.log("\n✅ Tests complete!\n");
}

main().catch(console.error);
