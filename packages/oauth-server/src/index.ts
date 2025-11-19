/**
 * Xero OAuth 2.0 Server (Local Testing)
 *
 * Simple Express server to handle Xero OAuth flow:
 * 1. /auth/xero - Redirects to Xero authorization page
 * 2. /auth/callback - Handles OAuth callback and exchanges code for tokens
 * 3. /api/xero/* - Proxies requests to Xero API with stored tokens
 */

import express from "express";
import { config } from "dotenv";
import { createDatabaseProviderFromEnv } from "@zero-agent/core";
import type { DatabaseProvider, OAuthTokens } from "@zero-agent/core";

// Load environment variables
config();

const app = express();
const PORT = 3000;

// Will be initialized on startup
let db: DatabaseProvider;

// Xero OAuth configuration
const XERO_CLIENT_ID = process.env.XERO_CLIENT_ID!;
const XERO_CLIENT_SECRET = process.env.XERO_CLIENT_SECRET!;
const REDIRECT_URI = `${process.env.NGROK_URL}/auth/callback`;
const XERO_AUTH_URL = "https://login.xero.com/identity/connect/authorize";
const XERO_TOKEN_URL = "https://identity.xero.com/connect/token";
const XERO_CONNECTIONS_URL = "https://api.xero.com/connections";

// OAuth scopes
const SCOPES = [
  "offline_access",
  "accounting.transactions",
  "accounting.contacts",
  "accounting.settings",
  "accounting.reports.read",
].join(" ");

/**
 * Home page - shows OAuth status
 */
app.get("/", async (req, res) => {
  const userId = "test-user-001"; // For testing, hardcoded user
  const tokens = await db.getOAuthTokens(userId, "xero");

  if (tokens) {
    const isExpired = tokens.expiresAt < Date.now();
    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Xero OAuth - Connected</title>
          <style>
            body { font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; }
            .status { padding: 20px; border-radius: 8px; margin: 20px 0; }
            .connected { background: #d4edda; border: 1px solid #c3e6cb; color: #155724; }
            .expired { background: #f8d7da; border: 1px solid #f5c6cb; color: #721c24; }
            .info { background: #d1ecf1; border: 1px solid #bee5eb; color: #0c5460; }
            code { background: #f4f4f4; padding: 2px 6px; border-radius: 3px; }
            button { padding: 10px 20px; font-size: 16px; cursor: pointer; }
          </style>
        </head>
        <body>
          <h1>🎉 Xero OAuth - Connected!</h1>

          <div class="status ${isExpired ? 'expired' : 'connected'}">
            <strong>Status:</strong> ${isExpired ? '⚠️ Token Expired (needs refresh)' : '✅ Connected'}
          </div>

          <div class="info">
            <strong>Tenant:</strong> ${tokens.tenantName || tokens.tenantId || 'Unknown'}<br>
            <strong>Expires:</strong> ${new Date(tokens.expiresAt).toLocaleString()}<br>
            <strong>Scopes:</strong> ${tokens.scopes.join(', ')}
          </div>

          <h2>Test Xero API</h2>
          <button onclick="fetch('/api/xero/organisations').then(r => r.json()).then(d => alert(JSON.stringify(d, null, 2)))">
            Get Organizations
          </button>
          <button onclick="fetch('/api/xero/invoices').then(r => r.json()).then(d => alert(JSON.stringify(d, null, 2)))">
            Get Invoices
          </button>

          <br><br>
          <button onclick="window.location.href='/auth/xero'">Re-authorize</button>
        </body>
      </html>
    `);
  } else {
    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Xero OAuth - Not Connected</title>
          <style>
            body { font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; }
            .status { padding: 20px; border-radius: 8px; margin: 20px 0; background: #fff3cd; border: 1px solid #ffeeba; color: #856404; }
            button { padding: 15px 30px; font-size: 18px; cursor: pointer; background: #007bff; color: white; border: none; border-radius: 5px; }
            button:hover { background: #0056b3; }
          </style>
        </head>
        <body>
          <h1>Xero OAuth Setup</h1>

          <div class="status">
            <strong>Status:</strong> Not connected to Xero
          </div>

          <p>Click below to connect your Xero account:</p>

          <button onclick="window.location.href='/auth/xero'">
            Connect to Xero
          </button>
        </body>
      </html>
    `);
  }
});

/**
 * Step 1: Redirect to Xero authorization page
 */
app.get("/auth/xero", (req, res) => {
  const state = crypto.randomUUID(); // CSRF protection

  const authUrl = new URL(XERO_AUTH_URL);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("client_id", XERO_CLIENT_ID);
  authUrl.searchParams.set("redirect_uri", REDIRECT_URI);
  authUrl.searchParams.set("scope", SCOPES);
  authUrl.searchParams.set("state", state);

  console.log(`🔐 Redirecting to Xero authorization...`);
  console.log(`   Redirect URI: ${REDIRECT_URI}`);

  res.redirect(authUrl.toString());
});

/**
 * Step 2: Handle OAuth callback and exchange code for tokens
 */
app.get("/auth/callback", async (req, res) => {
  const { code, state, error } = req.query;

  if (error) {
    console.error(`❌ OAuth error: ${error}`);
    return res.send(`<h1>OAuth Error</h1><p>${error}</p>`);
  }

  if (!code) {
    return res.status(400).send("<h1>Error</h1><p>Missing authorization code</p>");
  }

  try {
    console.log(`🔄 Exchanging authorization code for tokens...`);

    // Exchange code for tokens
    const tokenResponse = await fetch(XERO_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(`${XERO_CLIENT_ID}:${XERO_CLIENT_SECRET}`).toString("base64")}`,
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code: code as string,
        redirect_uri: REDIRECT_URI,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      throw new Error(`Token exchange failed: ${errorText}`);
    }

    const tokenData = await tokenResponse.json();
    console.log(`✅ Tokens received`);

    // Get tenant (organization) information
    const connectionsResponse = await fetch(XERO_CONNECTIONS_URL, {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        "Content-Type": "application/json",
      },
    });

    const connections = await connectionsResponse.json();
    const tenant = connections[0]; // Use first connected organization

    console.log(`✅ Connected to tenant: ${tenant.tenantName}`);

    // Save tokens to database
    const userId = "test-user-001"; // For testing
    const tokens: OAuthTokens = {
      userId,
      provider: "xero",
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      tokenType: tokenData.token_type,
      expiresAt: Date.now() + tokenData.expires_in * 1000,
      scopes: tokenData.scope.split(" "),
      tenantId: tenant.tenantId,
      tenantName: tenant.tenantName,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await db.saveOAuthTokens(tokens);
    console.log(`✅ Tokens saved to database`);

    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Xero Connected!</title>
          <style>
            body { font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; text-align: center; }
            .success { padding: 30px; border-radius: 8px; background: #d4edda; border: 1px solid #c3e6cb; color: #155724; margin: 20px 0; }
            button { padding: 15px 30px; font-size: 18px; cursor: pointer; background: #28a745; color: white; border: none; border-radius: 5px; }
          </style>
        </head>
        <body>
          <div class="success">
            <h1>✅ Successfully Connected to Xero!</h1>
            <p><strong>Organization:</strong> ${tenant.tenantName}</p>
            <p><strong>Tenant ID:</strong> ${tenant.tenantId}</p>
          </div>
          <button onclick="window.location.href='/'">Continue</button>
        </body>
      </html>
    `);
  } catch (error: any) {
    console.error(`❌ OAuth callback error:`, error);
    res.status(500).send(`<h1>Error</h1><p>${error.message}</p>`);
  }
});

/**
 * Proxy endpoint for Xero API requests
 */
app.get("/api/xero/:endpoint", async (req, res) => {
  const userId = "test-user-001";
  const { endpoint } = req.params;

  try {
    let tokens = await db.getOAuthTokens(userId, "xero");

    if (!tokens) {
      return res.status(401).json({ error: "Not authenticated with Xero" });
    }

    // Check if token is expired and refresh if needed
    if (tokens.expiresAt < Date.now() + 60000) { // Refresh if expires in < 1 minute
      console.log(`🔄 Refreshing expired token...`);
      tokens = await refreshAccessToken(tokens);
    }

    // Map endpoint to Xero API URL
    const endpointMap: Record<string, string> = {
      organisations: `https://api.xero.com/api.xro/2.0/Organisation`,
      invoices: `https://api.xero.com/api.xro/2.0/Invoices`,
      contacts: `https://api.xero.com/api.xro/2.0/Contacts`,
    };

    const apiUrl = endpointMap[endpoint];
    if (!apiUrl) {
      return res.status(404).json({ error: `Unknown endpoint: ${endpoint}` });
    }

    // Make request to Xero API
    const xeroResponse = await fetch(apiUrl, {
      headers: {
        Authorization: `Bearer ${tokens.accessToken}`,
        "xero-tenant-id": tokens.tenantId!,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });

    if (!xeroResponse.ok) {
      const errorText = await xeroResponse.text();
      throw new Error(`Xero API error: ${errorText}`);
    }

    const data = await xeroResponse.json();
    res.json(data);
  } catch (error: any) {
    console.error(`❌ Xero API error:`, error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Refresh access token using refresh token
 */
async function refreshAccessToken(tokens: OAuthTokens): Promise<OAuthTokens> {
  const tokenResponse = await fetch(XERO_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${XERO_CLIENT_ID}:${XERO_CLIENT_SECRET}`).toString("base64")}`,
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: tokens.refreshToken,
    }),
  });

  if (!tokenResponse.ok) {
    const errorText = await tokenResponse.text();
    throw new Error(`Token refresh failed: ${errorText}`);
  }

  const tokenData = await tokenResponse.json();

  const updatedTokens: OAuthTokens = {
    ...tokens,
    accessToken: tokenData.access_token,
    refreshToken: tokenData.refresh_token,
    expiresAt: Date.now() + tokenData.expires_in * 1000,
    updatedAt: Date.now(),
  };

  await db.saveOAuthTokens(updatedTokens);
  console.log(`✅ Token refreshed`);

  return updatedTokens;
}

/**
 * Start server
 */
async function start() {
  try {
    // Initialize database
    db = await createDatabaseProviderFromEnv();
    console.log(`✅ Database initialized: ${db.name}`);

    // Start Express server
    app.listen(PORT, () => {
      console.log(`\n🚀 OAuth Server running!`);
      console.log(`\n   Local:  http://localhost:${PORT}`);
      console.log(`   Public: ${process.env.NGROK_URL}\n`);
      console.log(`👉 Open ${process.env.NGROK_URL} in your browser to connect to Xero\n`);
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
}

start();
