/**
 * View Chat History
 *
 * Shows all sessions and their conversation history
 */

import { config } from "dotenv";
import { createDatabaseProviderFromEnv } from "../packages/core/dist/index.js";

config();

async function main() {
  console.log("\n📜 Zero Agent - Chat History\n");

  try {
    const db = await createDatabaseProviderFromEnv();

    // Get all sessions
    const sessions = await db.listSessions("test-user-001");

    if (sessions.length === 0) {
      console.log("No chat sessions found.\n");
      await db.disconnect();
      return;
    }

    console.log(`Found ${sessions.length} session(s):\n`);

    for (const session of sessions) {
      const date = new Date(session.createdAt).toLocaleString();
      console.log(`\n${"=".repeat(80)}`);
      console.log(`Session ID: ${session.sessionId}`);
      console.log(`Created: ${date}`);
      console.log(`Messages: ${session.messages.length}`);
      console.log(`${"=".repeat(80)}\n`);

      if (session.messages.length > 0) {
        session.messages.forEach((msg, i) => {
          const role = msg.role === "user" ? "You" : "Agent";
          const content = msg.content.substring(0, 500); // Truncate long messages

          console.log(`[${i + 1}] ${role}:`);
          console.log(content);
          if (msg.content.length > 500) {
            console.log(`... (${msg.content.length - 500} more characters)`);
          }
          console.log();
        });
      } else {
        console.log("(No messages in this session)\n");
      }
    }

    await db.disconnect();
  } catch (error: any) {
    console.error("\n❌ Error:", error.message);
    process.exit(1);
  }
}

main();
