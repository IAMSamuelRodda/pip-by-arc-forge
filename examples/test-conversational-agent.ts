/**
 * Test End-to-End Conversational Agent with Xero Integration
 *
 * Demonstrates:
 * - Agent initialization with all providers
 * - Session management
 * - Conversational queries that trigger tool execution
 * - Automatic Xero API access with OAuth token management
 */

import { config } from "dotenv";
import { AgentOrchestrator } from "../packages/agent-core/dist/orchestrator.js";

// Load environment variables
config();

const TEST_USER_ID = "test-user-001";

async function main() {
  console.log("\n🤖 Testing End-to-End Conversational Agent with Xero\n");

  try {
    // Initialize the agent orchestrator
    console.log("--- Initializing Agent ---");
    const agent = new AgentOrchestrator();

    // Create a new session
    const sessionId = await agent.createSession(TEST_USER_ID);
    console.log(`✅ Created session: ${sessionId}\n`);

    // Test queries that should trigger tool calls
    const queries = [
      "How many unpaid invoices do I have?",
      "What is my organization name?",
      "Show me the first 3 paid invoices",
    ];

    for (const query of queries) {
      console.log(`\n--- User: "${query}" ---`);

      const response = await agent.processMessage({
        userId: TEST_USER_ID,
        sessionId,
        message: query,
      });

      console.log(`Agent: ${response.message}`);
      console.log(`Metadata: ${JSON.stringify(response.metadata, null, 2)}`);
    }

    console.log("\n✅ All conversational tests complete!\n");
  } catch (error: any) {
    console.error("\n❌ Test failed:", error.message);
    if (error.stack) {
      console.error("\nStack trace:");
      console.error(error.stack);
    }
    process.exit(1);
  }
}

main();
