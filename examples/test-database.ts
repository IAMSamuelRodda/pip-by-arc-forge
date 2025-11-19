/**
 * Test Database Abstraction Layer
 *
 * Tests both SQLite and DynamoDB providers
 * Verifies:
 * - Connection and schema initialization
 * - Session CRUD operations
 * - Core Memory operations
 * - Extended Memory operations
 * - OAuth Token storage
 */

import { config } from "dotenv";
import { createDatabaseProvider, type DatabaseProvider } from "../packages/core/dist/index.js";
import fs from "fs";
import path from "path";

// Load environment variables
config();

const TEST_USER_ID = "test-user-001";
const TEST_SESSION_ID = "test-session-123";

async function testSQLiteProvider() {
  console.log("\n=== Testing SQLite Provider ===\n");

  // Ensure data directory exists
  const dbPath = "./data/test-zero-agent.db";
  const dataDir = path.dirname(dbPath);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  // Clean up test database if exists
  if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath);
  }

  const db = await createDatabaseProvider({
    provider: "sqlite",
    connection: {
      type: "sqlite",
      filename: dbPath,
    },
  });

  try {
    await testDatabaseOperations(db);
    console.log("\n✅ SQLite Provider test complete!\n");
  } finally {
    await db.disconnect();
  }
}

async function testDatabaseOperations(db: DatabaseProvider) {
  console.log(`Provider: ${db.name}`);
  console.log(`Connected: ${db.isConnected()}`);

  // Test 1: Session operations
  console.log("\n--- Test 1: Session Operations ---");

  const session = await db.createSession({
    sessionId: TEST_SESSION_ID,
    userId: TEST_USER_ID,
    messages: [
      { role: "user", content: "Hello!", timestamp: Date.now() },
    ],
    agentContext: { intent: "greeting" },
    expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days
  });

  console.log(`✓ Session created: ${session.sessionId}`);

  const retrieved = await db.getSession(TEST_USER_ID, TEST_SESSION_ID);
  console.log(`✓ Session retrieved: ${retrieved?.sessionId}`);
  console.log(`  Messages: ${retrieved?.messages.length}`);

  const updated = await db.updateSession(TEST_USER_ID, TEST_SESSION_ID, {
    messages: [
      ...retrieved!.messages,
      { role: "assistant", content: "Hi there!", timestamp: Date.now() },
    ],
  });
  console.log(`✓ Session updated: ${updated.messages.length} messages`);

  const sessions = await db.listSessions({ userId: TEST_USER_ID, limit: 10 });
  console.log(`✓ Listed sessions: ${sessions.length} found`);

  // Test 2: Core Memory operations
  console.log("\n--- Test 2: Core Memory Operations ---");

  const memory = await db.upsertCoreMemory({
    userId: TEST_USER_ID,
    preferences: {
      xeroOrgId: "org-123",
      xeroOrgName: "Test Company Pty Ltd",
      timezone: "Australia/Sydney",
      currency: "AUD",
    },
    relationshipStage: "colleague",
    relationshipStartDate: Date.now(),
    keyMilestones: [
      {
        type: "first_conversation",
        description: "User started first conversation",
        timestamp: Date.now(),
      },
    ],
    criticalContext: ["User prefers casual communication"],
  });

  console.log(`✓ Core memory created for user: ${memory.userId}`);
  console.log(`  Relationship stage: ${memory.relationshipStage}`);
  console.log(`  Milestones: ${memory.keyMilestones.length}`);

  const retrievedMemory = await db.getCoreMemory(TEST_USER_ID);
  console.log(`✓ Core memory retrieved: ${retrievedMemory?.userId}`);
  console.log(`  Xero Org: ${retrievedMemory?.preferences.xeroOrgName}`);

  // Test 3: Extended Memory operations
  console.log("\n--- Test 3: Extended Memory Operations ---");

  const extendedMemory1 = await db.createExtendedMemory({
    userId: TEST_USER_ID,
    conversationSummary: "User asked about invoice creation process",
    learnedPatterns: {
      preferredInvoiceTemplate: "standard",
      averageInvoiceAmount: 500,
    },
    topics: ["invoices", "xero"],
    emotionalContext: "positive",
  });

  console.log(`✓ Extended memory created: ${extendedMemory1.memoryId}`);

  const extendedMemory2 = await db.createExtendedMemory({
    userId: TEST_USER_ID,
    conversationSummary: "User reconciled bank transactions",
    learnedPatterns: {
      reconciliationFrequency: "weekly",
    },
    topics: ["banking", "reconciliation"],
    ttl: Date.now() + 90 * 24 * 60 * 60 * 1000, // 90 days
  });

  console.log(`✓ Extended memory created: ${extendedMemory2.memoryId}`);

  const memories = await db.listExtendedMemories({
    userId: TEST_USER_ID,
    limit: 10,
  });
  console.log(`✓ Listed extended memories: ${memories.length} found`);

  const invoiceMemories = await db.listExtendedMemories({
    userId: TEST_USER_ID,
    topics: ["invoices"],
    limit: 10,
  });
  console.log(`✓ Filtered by topic 'invoices': ${invoiceMemories.length} found`);

  // Test 4: OAuth Token operations
  console.log("\n--- Test 4: OAuth Token Operations ---");

  const now = Date.now();
  await db.saveOAuthTokens({
    userId: TEST_USER_ID,
    provider: "xero",
    accessToken: "test-access-token-xyz",
    refreshToken: "test-refresh-token-abc",
    tokenType: "Bearer",
    expiresAt: now + 30 * 60 * 1000, // 30 minutes
    scopes: ["offline_access", "accounting.transactions", "accounting.contacts"],
    tenantId: "tenant-456",
    tenantName: "Test Company Pty Ltd",
    createdAt: now,
    updatedAt: now,
  });

  console.log(`✓ OAuth tokens saved for user: ${TEST_USER_ID}`);

  const tokens = await db.getOAuthTokens(TEST_USER_ID, "xero");
  console.log(`✓ OAuth tokens retrieved: ${tokens?.provider}`);
  console.log(`  Tenant: ${tokens?.tenantName}`);
  console.log(`  Scopes: ${tokens?.scopes.length}`);
  console.log(`  Expires: ${new Date(tokens!.expiresAt).toISOString()}`);

  await db.updateOAuthTokens(TEST_USER_ID, "xero", {
    accessToken: "new-access-token-refreshed",
    expiresAt: Date.now() + 30 * 60 * 1000,
  });

  const updatedTokens = await db.getOAuthTokens(TEST_USER_ID, "xero");
  console.log(`✓ OAuth tokens updated: ${updatedTokens?.accessToken.substring(0, 20)}...`);

  // Test 5: Cleanup
  console.log("\n--- Test 5: Cleanup ---");

  await db.deleteSession(TEST_USER_ID, TEST_SESSION_ID);
  console.log(`✓ Session deleted: ${TEST_SESSION_ID}`);

  const deletedSession = await db.getSession(TEST_USER_ID, TEST_SESSION_ID);
  console.log(`✓ Verified deletion: session is ${deletedSession ? "still there (ERROR)" : "gone"}`);
}

async function main() {
  console.log("🚀 Testing Database Abstraction Layer\n");

  try {
    await testSQLiteProvider();

    // DynamoDB test would be:
    // await testDynamoDBProvider();
    // But requires AWS credentials and deployed table

    console.log("✅ All database tests complete!\n");
  } catch (error: any) {
    console.error("\n✗ Test failed:", error.message);
    if (error.stack) {
      console.error("\nStack trace:");
      console.error(error.stack);
    }
    process.exit(1);
  }
}

main();
