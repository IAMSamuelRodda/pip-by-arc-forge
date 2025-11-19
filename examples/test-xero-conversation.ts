/**
 * Test Conversational Xero Access
 *
 * Demonstrates agent responding to questions about Xero data
 * Uses the integrated LLM + Database + Xero OAuth stack
 */

import { config } from "dotenv";
import {
  createLLMProviderFromEnv,
  createDatabaseProviderFromEnv,
} from "../packages/core/dist/index.js";
import { XeroClient } from "../packages/agent-core/dist/xero/client.js";
import { createXeroTools } from "../packages/agent-core/dist/tools/xero-tools.js";

// Load environment variables
config();

const TEST_USER_ID = "test-user-001";

async function main() {
  console.log("\n🤖 Testing Conversational Xero Access\n");

  try {
    // Initialize providers
    const db = await createDatabaseProviderFromEnv();
    const llm = await createLLMProviderFromEnv();
    console.log(`✅ Database: ${db.name}`);
    console.log(`✅ LLM: ${llm.name}`);

    // Initialize Xero client
    const xeroClient = new XeroClient(
      db,
      process.env.XERO_CLIENT_ID!,
      process.env.XERO_CLIENT_SECRET!
    );

    // Create Xero tools
    const tools = createXeroTools(xeroClient);
    console.log(`✅ Xero tools loaded: ${tools.length} tools available\n`);

    // Test 1: Get invoices directly
    console.log("--- Test 1: Get Invoices (Direct API Call) ---");
    const invoices = await xeroClient.getInvoices(TEST_USER_ID, {
      status: "AUTHORISED",
    });
    console.log(`Found ${invoices.length} authorised invoices`);
    if (invoices.length > 0) {
      const first = invoices[0];
      console.log(`  Example: ${first.InvoiceNumber} - ${first.Contact?.Name} - $${first.Total}`);
    }

    // Test 2: Get organization
    console.log("\n--- Test 2: Get Organization ---");
    const org = await xeroClient.getOrganisation(TEST_USER_ID);
    console.log(`Organization: ${org.Name}`);
    console.log(`  Legal Name: ${org.LegalName || "N/A"}`);
    console.log(`  Currency: ${org.BaseCurrency}`);
    console.log(`  Country: ${org.CountryCode}`);

    // Test 3: Use tool (simulates what the LLM would do)
    console.log("\n--- Test 3: Tool Execution (Simulated LLM Call) ---");
    const getInvoicesTool = tools.find((t) => t.name === "get_invoices")!;
    const toolResult = await getInvoicesTool.execute(
      { status: "PAID", limit: 5 },
      TEST_USER_ID
    );
    console.log(`Tool returned ${toolResult.length} paid invoices`);
    if (toolResult.length > 0) {
      console.log(`  Example: ${toolResult[0].invoiceNumber} - ${toolResult[0].contact} - $${toolResult[0].total}`);
    }

    // Test 4: Conversational query (what the full agent would do)
    console.log("\n--- Test 4: Conversational Query ---");
    console.log('User question: "How many unpaid invoices do I have?"');
    console.log("\nAgent response:");

    const systemPrompt = `You are a helpful AI assistant with access to Xero accounting data.

Available tools:
${tools.map((t) => `- ${t.name}: ${t.description}`).join("\n")}

When asked about Xero data, explain what you would do and use the appropriate tool.`;

    const conversation = [
      { role: "system" as const, content: systemPrompt },
      { role: "user" as const, content: "How many unpaid invoices do I have?" },
    ];

    const response = await llm.chat(conversation);
    console.log(response.content);

    console.log("\n✅ All tests complete!\n");

    // Disconnect
    await db.disconnect();
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
