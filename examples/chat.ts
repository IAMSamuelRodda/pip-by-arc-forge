#!/usr/bin/env tsx
/**
 * Interactive CLI Chat with Zero Agent
 *
 * Simple REPL for chatting with the agent
 */

import { config } from "dotenv";
import * as readline from "readline";
import { AgentOrchestrator } from "../packages/agent-core/dist/orchestrator.js";

// Load environment variables
config();

const TEST_USER_ID = "test-user-001";

async function main() {
  console.log("\n🤖 Zero Agent - Interactive Chat\n");
  console.log("Type your questions about Xero data. Type 'exit' to quit.\n");

  try {
    // Initialize the agent orchestrator
    const agent = new AgentOrchestrator();

    // Create a new session
    const sessionId = await agent.createSession(TEST_USER_ID);
    console.log(`Session started: ${sessionId}\n`);

    // Create readline interface
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: "You: ",
    });

    rl.prompt();

    rl.on("line", async (line: string) => {
      const input = line.trim();

      if (input.toLowerCase() === "exit") {
        console.log("\nGoodbye! 👋\n");
        rl.close();
        process.exit(0);
      }

      if (!input) {
        rl.prompt();
        return;
      }

      try {
        const response = await agent.processMessage({
          userId: TEST_USER_ID,
          sessionId,
          message: input,
        });

        console.log(`\nAgent: ${response.message}\n`);
      } catch (error: any) {
        console.error(`\n❌ Error: ${error.message}\n`);
      }

      rl.prompt();
    });

    rl.on("close", () => {
      console.log("\nGoodbye! 👋\n");
      process.exit(0);
    });
  } catch (error: any) {
    console.error("\n❌ Failed to start agent:", error.message);
    process.exit(1);
  }
}

main();
