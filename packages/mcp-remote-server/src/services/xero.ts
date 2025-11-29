/**
 * Xero Service for MCP Remote Server
 *
 * Handles Xero API interactions with token management.
 * Uses SQLite database (shared with main server).
 */

import { XeroClient } from "xero-node";
import { createDatabaseProvider, type OAuthTokens, type DatabaseProvider } from "@zero-agent/core";

// Xero OAuth configuration
const XERO_TOKEN_URL = "https://identity.xero.com/connect/token";

// Initialize database provider (SQLite by default)
const dbPath = process.env.DATABASE_PATH || "./data/zero-agent.db";
let db: DatabaseProvider;

// Initialize database (called at startup)
async function initDatabase(): Promise<void> {
  if (!db) {
    db = await createDatabaseProvider({
      provider: "sqlite",
      connection: { type: "sqlite", filename: dbPath },
    });
  }
}

// Ensure database is initialized before use
async function getDb(): Promise<DatabaseProvider> {
  if (!db) {
    await initDatabase();
  }
  return db;
}

/**
 * Get Xero client with valid tokens for a user
 */
export async function getXeroClient(
  userId: string
): Promise<{ client: XeroClient; tenantId: string } | null> {
  try {
    const database = await getDb();
    // Get tokens from database
    let tokens = await database.getOAuthTokens(userId, "xero");

    if (!tokens) {
      return null;
    }

    // Check if token needs refresh (5-minute buffer)
    if (tokens.expiresAt < Date.now() + 5 * 60 * 1000) {
      tokens = await refreshTokens(tokens);
      if (!tokens) {
        return null;
      }
    }

    // Initialize Xero client
    const xero = new XeroClient({
      clientId: process.env.XERO_CLIENT_ID!,
      clientSecret: process.env.XERO_CLIENT_SECRET!,
    });

    await xero.initialize();
    await xero.setTokenSet({
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
      token_type: tokens.tokenType || "Bearer",
      expires_at: Math.floor(tokens.expiresAt / 1000),
      scope: tokens.scopes?.join(" ") || "",
    });

    return {
      client: xero,
      tenantId: tokens.tenantId!,
    };
  } catch (error) {
    console.error("Error getting Xero client:", error);
    return null;
  }
}

/**
 * Refresh expired tokens
 */
async function refreshTokens(tokens: OAuthTokens): Promise<OAuthTokens | null> {
  const clientId = process.env.XERO_CLIENT_ID;
  const clientSecret = process.env.XERO_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.error("Xero OAuth not configured");
    return null;
  }

  try {
    const response = await fetch(XERO_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: tokens.refreshToken,
      }),
    });

    if (!response.ok) {
      console.error("Token refresh failed:", await response.text());
      return null;
    }

    const data = await response.json() as {
      access_token: string;
      refresh_token: string;
      expires_in: number;
    };

    const updatedTokens: OAuthTokens = {
      ...tokens,
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: Date.now() + data.expires_in * 1000,
      updatedAt: Date.now(),
    };

    const database = await getDb();
    await database.saveOAuthTokens(updatedTokens);
    console.log(`Tokens refreshed for user ${tokens.userId}`);

    return updatedTokens;
  } catch (error) {
    console.error("Error refreshing tokens:", error);
    return null;
  }
}

/**
 * Check if a user has Xero connected
 */
export async function isXeroConnected(userId: string): Promise<boolean> {
  const database = await getDb();
  const tokens = await database.getOAuthTokens(userId, "xero");
  return tokens !== null;
}

/**
 * Get Xero connection status for a user
 */
export async function getXeroStatus(userId: string): Promise<{
  connected: boolean;
  tenantName?: string;
  expired?: boolean;
}> {
  const database = await getDb();
  const tokens = await database.getOAuthTokens(userId, "xero");

  if (!tokens) {
    return { connected: false };
  }

  return {
    connected: true,
    tenantName: tokens.tenantName,
    expired: tokens.expiresAt < Date.now(),
  };
}

// Export getDb for use in other services if needed
export { getDb };
