/**
 * Database Provider Factory
 *
 * Creates database provider instances based on configuration
 */

import type { DatabaseProvider, DatabaseConfig } from "./types.js";
import { SQLiteProvider } from "./providers/sqlite.js";
import { DynamoDBProvider } from "./providers/dynamodb.js";

/**
 * Create a database provider from configuration
 *
 * @example
 * // SQLite (self-hosted)
 * const db = await createDatabaseProvider({
 *   provider: "sqlite",
 *   connection: {
 *     type: "sqlite",
 *     filename: "./data/zero-agent.db"
 *   }
 * });
 *
 * @example
 * // DynamoDB (managed service)
 * const db = await createDatabaseProvider({
 *   provider: "dynamodb",
 *   connection: {
 *     type: "dynamodb",
 *     tableName: "zero-agent-prod",
 *     region: "ap-southeast-2"
 *   }
 * });
 */
export async function createDatabaseProvider(
  config: DatabaseConfig
): Promise<DatabaseProvider> {
  let provider: DatabaseProvider;

  switch (config.provider) {
    case "sqlite":
      if (config.connection.type !== "sqlite") {
        throw new Error("Invalid connection config for SQLite provider");
      }
      provider = new SQLiteProvider(config.connection);
      break;

    case "dynamodb":
      if (config.connection.type !== "dynamodb") {
        throw new Error("Invalid connection config for DynamoDB provider");
      }
      provider = new DynamoDBProvider(config.connection);
      break;

    case "postgresql":
      throw new Error("PostgreSQL provider not yet implemented");

    default:
      throw new Error(`Unsupported database provider: ${config.provider}`);
  }

  // Connect to database
  await provider.connect();

  return provider;
}

/**
 * Create a database provider from environment variables
 *
 * Environment variables:
 * - DATABASE_PROVIDER: sqlite | dynamodb | postgresql
 * - DATABASE_FILENAME: path to SQLite database (if SQLite)
 * - DATABASE_TABLE_NAME: DynamoDB table name (if DynamoDB)
 * - DATABASE_REGION: AWS region (if DynamoDB)
 * - DATABASE_ENDPOINT: DynamoDB endpoint for local testing (optional)
 */
export async function createDatabaseProviderFromEnv(): Promise<DatabaseProvider> {
  const providerName = (process.env.DATABASE_PROVIDER || "sqlite") as DatabaseConfig["provider"];

  let config: DatabaseConfig;

  switch (providerName) {
    case "sqlite":
      config = {
        provider: "sqlite",
        connection: {
          type: "sqlite",
          filename: process.env.DATABASE_FILENAME || "./data/zero-agent.db",
          readonly: process.env.DATABASE_READONLY === "true",
        },
      };
      break;

    case "dynamodb":
      if (!process.env.DATABASE_TABLE_NAME) {
        throw new Error("DATABASE_TABLE_NAME is required for DynamoDB provider");
      }
      config = {
        provider: "dynamodb",
        connection: {
          type: "dynamodb",
          tableName: process.env.DATABASE_TABLE_NAME,
          region: process.env.DATABASE_REGION || "ap-southeast-2",
          endpoint: process.env.DATABASE_ENDPOINT, // For local DynamoDB
        },
      };
      break;

    case "postgresql":
      throw new Error("PostgreSQL provider not yet implemented");

    default:
      throw new Error(`Unsupported database provider: ${providerName}`);
  }

  return createDatabaseProvider(config);
}
