/**
 * Database Provider Factory
 *
 * Creates database provider instances based on configuration
 */

import type { DatabaseProvider, DatabaseConfig } from "./types.js";
import { SQLiteProvider } from "./providers/sqlite.js";

/**
 * Create a database provider from configuration
 *
 * @example
 * // SQLite (self-hosted)
 * const db = await createDatabaseProvider({
 *   provider: "sqlite",
 *   connection: {
 *     type: "sqlite",
 *     filename: "./data/pip.db"
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
 * - DATABASE_PROVIDER: sqlite | postgresql
 * - DATABASE_FILENAME: path to SQLite database (if SQLite)
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
          filename: process.env.DATABASE_PATH || process.env.DATABASE_FILENAME || "./data/pip.db",
          readonly: process.env.DATABASE_READONLY === "true",
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
