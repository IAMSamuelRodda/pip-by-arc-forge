/**
 * Test Agent Orchestrator with LLM Integration
 *
 * Verifies that the orchestrator can:
 * - Initialize LLM provider from environment
 * - Create sessions
 * - Process messages with context
 * - Track conversation history
 */

import { config } from "dotenv";
import { AgentOrchestrator } from "../packages/agent-core/dist/index.js";

// Load environment variables
config();

async function testOrchestrator() {
  console.log("\n=== Testing Agent Orchestrator with LLM Integration ===\n");

  try {
    // 1. Initialize orchestrator
    console.log("1. Initializing orchestrator...");
    const orchestrator = new AgentOrchestrator();

    // 2. Create a new session
    console.log("2. Creating session...");
    const userId = "test-user-001";
    const sessionId = await orchestrator.createSession(userId);
    console.log(`✓ Session created: ${sessionId}`);

    // 3. Send first message
    console.log("\n3. Sending first message...");
    const response1 = await orchestrator.processMessage({
      userId,
      sessionId,
      message: "Hello! Can you help me understand Xero invoicing?",
    });

    console.log(`\nAssistant: ${response1.message}`);
    console.log(`Tokens used: ${response1.metadata?.tokensUsed || 0}`);

    // 4. Send follow-up message (tests conversation history)
    console.log("\n4. Sending follow-up message...");
    const response2 = await orchestrator.processMessage({
      userId,
      sessionId,
      message: "What are the key fields in an invoice?",
    });

    console.log(`\nAssistant: ${response2.message}`);
    console.log(`Tokens used: ${response2.metadata?.tokensUsed || 0}`);

    // 5. Verify conversation history
    console.log("\n5. Retrieving conversation history...");
    const history = await orchestrator.getHistory(userId, sessionId);
    console.log(`✓ Conversation history has ${history.length} messages`);

    console.log("\n✅ Orchestrator integration test complete!\n");
  } catch (error: any) {
    console.error("\n✗ Test failed:", error.message);
    if (error.stack) {
      console.error("\nStack trace:");
      console.error(error.stack);
    }
    process.exit(1);
  }
}

testOrchestrator();
