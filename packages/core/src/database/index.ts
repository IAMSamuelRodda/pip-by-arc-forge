/**
 * Database Abstraction Layer
 *
 * Supports multiple backends:
 * - SQLite (self-hosted default)
 * - DynamoDB (managed service)
 * - PostgreSQL (coming soon)
 *
 * @example
 * import { createDatabaseProvider } from "@zero-agent/core";
 *
 * const db = await createDatabaseProvider({
 *   provider: "sqlite",
 *   connection: {
 *     type: "sqlite",
 *     filename: "./data/app.db"
 *   }
 * });
 *
 * // Create session
 * const session = await db.createSession({
 *   sessionId: "session-123",
 *   userId: "user-456",
 *   messages: [],
 *   agentContext: {},
 *   expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days
 * });
 *
 * // Save OAuth tokens
 * await db.saveOAuthTokens({
 *   userId: "user-456",
 *   provider: "xero",
 *   accessToken: "...",
 *   refreshToken: "...",
 *   tokenType: "Bearer",
 *   expiresAt: Date.now() + 30 * 60 * 1000, // 30 minutes
 *   scopes: ["offline_access", "accounting.transactions"],
 *   createdAt: Date.now(),
 *   updatedAt: Date.now(),
 * });
 */

export * from "./types.js";
export * from "./factory.js";
export { SQLiteProvider } from "./providers/sqlite.js";
export { DynamoDBProvider } from "./providers/dynamodb.js";
