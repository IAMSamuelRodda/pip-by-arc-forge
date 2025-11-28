/**
 * Xero OAuth Routes
 *
 * Handles Xero OAuth 2.0 authorization flow
 * Replaces: Auth Lambda (functions/auth/) + oauth-server package
 */

import { Router } from 'express';
import type { DatabaseProvider, OAuthTokens } from '@zero-agent/core';
import crypto from 'crypto';
import { requireAuth } from '../middleware/auth.js';
import { verifyToken } from '../services/auth.js';

interface XeroTokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
}

interface XeroTenant {
  tenantId: string;
  tenantName: string;
  tenantType: string;
}

// Xero OAuth configuration
const XERO_AUTH_URL = 'https://login.xero.com/identity/connect/authorize';
const XERO_TOKEN_URL = 'https://identity.xero.com/connect/token';
const XERO_CONNECTIONS_URL = 'https://api.xero.com/connections';

const SCOPES = [
  'offline_access',
  'accounting.transactions',
  'accounting.contacts',
  'accounting.settings',
  'accounting.reports.read',
].join(' ');

export function createAuthRoutes(db: DatabaseProvider): Router {
  const router = Router();

  const XERO_CLIENT_ID = process.env.XERO_CLIENT_ID;
  const XERO_CLIENT_SECRET = process.env.XERO_CLIENT_SECRET;
  const BASE_URL = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
  const REDIRECT_URI = `${BASE_URL}/auth/callback`;
  const FRONTEND_URL = process.env.FRONTEND_URL || BASE_URL;

  // Log configuration on startup for debugging
  console.log(`🔧 Auth routes configured:`);
  console.log(`   BASE_URL: ${BASE_URL}`);
  console.log(`   REDIRECT_URI: ${REDIRECT_URI}`);
  console.log(`   FRONTEND_URL: ${FRONTEND_URL}`);
  console.log(`   XERO_CLIENT_ID: ${XERO_CLIENT_ID ? '✓ Set' : '✗ Missing'}`);
  console.log(`   XERO_CLIENT_SECRET: ${XERO_CLIENT_SECRET ? '✓ Set' : '✗ Missing'}`);

  /**
   * GET /auth/xero
   * Initiate OAuth flow - redirect to Xero
   * Requires authentication - will link Xero to the logged-in user
   * Accepts token via query param (for redirect flows)
   */
  router.get('/xero', (req, res) => {
    // Check for token in query param (for redirect flows where headers can't be used)
    const tokenFromQuery = req.query.token as string | undefined;
    const tokenFromHeader = req.headers.authorization?.replace('Bearer ', '');
    const token = tokenFromQuery || tokenFromHeader;

    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    // Set userId from decoded token
    const userId = decoded.userId;
    if (!XERO_CLIENT_ID) {
      return res.status(500).json({
        error: 'Xero OAuth not configured. Set XERO_CLIENT_ID and XERO_CLIENT_SECRET.',
      });
    }

    // Encode user ID in state for the callback
    const stateData = {
      csrf: crypto.randomUUID(),
      userId,
    };
    const state = Buffer.from(JSON.stringify(stateData)).toString('base64url');

    const authUrl = new URL(XERO_AUTH_URL);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('client_id', XERO_CLIENT_ID);
    authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
    authUrl.searchParams.set('scope', SCOPES);
    authUrl.searchParams.set('state', state);

    console.log(`🔐 Redirecting to Xero authorization for user: ${userId}`);
    console.log(`   Redirect URI: ${REDIRECT_URI}`);

    res.redirect(authUrl.toString());
  });

  /**
   * GET /auth/callback
   * Handle OAuth callback from Xero
   */
  router.get('/callback', async (req, res) => {
    const { code, state, error } = req.query;

    // Helper to show error page instead of blank screen
    const showError = (title: string, message: string, details?: string) => {
      console.error(`❌ OAuth error: ${title} - ${message}`);
      res.status(400).send(`
        <!DOCTYPE html>
        <html>
          <head><title>OAuth Error</title>
            <style>
              body { font-family: system-ui, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; }
              .error { background: #fee; border: 1px solid #fcc; padding: 20px; border-radius: 8px; }
              .details { background: #f5f5f5; padding: 10px; margin-top: 10px; font-family: monospace; font-size: 12px; overflow-x: auto; }
              button { margin-top: 20px; padding: 10px 20px; cursor: pointer; }
            </style>
          </head>
          <body>
            <div class="error">
              <h2>❌ ${title}</h2>
              <p>${message}</p>
              ${details ? `<div class="details">${details}</div>` : ''}
            </div>
            <button onclick="window.location.href='/auth/xero'">Try Again</button>
            <button onclick="window.location.href='/'">Go Home</button>
          </body>
        </html>
      `);
    };

    if (error) {
      return showError('Xero Authorization Failed', `Xero returned an error: ${error}`);
    }

    if (!code) {
      return showError('Missing Authorization Code', 'No authorization code received from Xero.');
    }

    if (!XERO_CLIENT_ID || !XERO_CLIENT_SECRET) {
      return showError('Server Configuration Error', 'Xero OAuth credentials not configured.',
        'Missing XERO_CLIENT_ID or XERO_CLIENT_SECRET environment variables.');
    }

    try {
      console.log(`🔄 Exchanging authorization code for tokens...`);
      console.log(`   Using REDIRECT_URI: ${REDIRECT_URI}`);

      // Exchange code for tokens with timeout
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000); // 30s timeout

      const tokenResponse = await fetch(XERO_TOKEN_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${Buffer.from(`${XERO_CLIENT_ID}:${XERO_CLIENT_SECRET}`).toString('base64')}`,
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code: String(code),
          redirect_uri: REDIRECT_URI,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        console.error(`Token exchange failed (${tokenResponse.status}): ${errorText}`);
        return showError(
          'Token Exchange Failed',
          'Failed to exchange authorization code for tokens.',
          `Status: ${tokenResponse.status}<br>REDIRECT_URI: ${REDIRECT_URI}<br>Response: ${errorText}`
        );
      }

      const tokenData = await tokenResponse.json() as XeroTokenResponse;
      console.log(`✅ Tokens received`);

      // Get tenant (organization) information
      const connectionsResponse = await fetch(XERO_CONNECTIONS_URL, {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!connectionsResponse.ok) {
        const errorText = await connectionsResponse.text();
        return showError('Failed to Get Xero Organizations',
          'Could not retrieve connected organizations.',
          errorText);
      }

      const connections = await connectionsResponse.json() as XeroTenant[];
      const tenant = connections[0]; // Use first connected organization

      if (!tenant) {
        return showError('No Xero Organization Found',
          'You need to connect at least one Xero organization to use this app.');
      }

      console.log(`✅ Connected to tenant: ${tenant.tenantName}`);

      // Extract user ID from state
      let userId: string;
      try {
        const stateData = JSON.parse(Buffer.from(String(state), 'base64url').toString());
        userId = stateData.userId;
        if (!userId) {
          throw new Error('No userId in state');
        }
      } catch (err) {
        return showError('Invalid State', 'Could not verify authentication state. Please try again.');
      }

      console.log(`   Saving tokens for user: ${userId}`);

      // Save tokens to database
      const tokens: OAuthTokens = {
        userId,
        provider: 'xero',
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        tokenType: tokenData.token_type,
        expiresAt: Date.now() + tokenData.expires_in * 1000,
        scopes: tokenData.scope.split(' '),
        tenantId: tenant.tenantId,
        tenantName: tenant.tenantName,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      await db.saveOAuthTokens(tokens);
      console.log(`✅ Tokens saved to database`);

      // Redirect to frontend with success
      res.redirect(`${FRONTEND_URL}?auth=success&org=${encodeURIComponent(tenant.tenantName)}`);

    } catch (error: any) {
      console.error(`❌ OAuth callback error:`, error);
      if (error.name === 'AbortError') {
        return showError('Request Timeout', 'The request to Xero timed out. Please try again.');
      }
      return showError('OAuth Error', error.message || 'An unexpected error occurred.');
    }
  });

  /**
   * POST /auth/refresh
   * Manually refresh access token
   */
  router.post('/refresh', requireAuth, async (req, res, next) => {
    try {
      const userId = req.userId!;
      const tokens = await db.getOAuthTokens(userId, 'xero');

      if (!tokens) {
        return res.status(401).json({ error: 'No Xero tokens found' });
      }

      if (!XERO_CLIENT_ID || !XERO_CLIENT_SECRET) {
        return res.status(500).json({ error: 'Xero OAuth not configured' });
      }

      const tokenResponse = await fetch(XERO_TOKEN_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${Buffer.from(`${XERO_CLIENT_ID}:${XERO_CLIENT_SECRET}`).toString('base64')}`,
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: tokens.refreshToken,
        }),
      });

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        throw new Error(`Token refresh failed: ${errorText}`);
      }

      const tokenData = await tokenResponse.json() as XeroTokenResponse;

      const updatedTokens: OAuthTokens = {
        ...tokens,
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        expiresAt: Date.now() + tokenData.expires_in * 1000,
        updatedAt: Date.now(),
      };

      await db.saveOAuthTokens(updatedTokens);

      res.json({
        success: true,
        expiresAt: updatedTokens.expiresAt,
      });

    } catch (error) {
      next(error);
    }
  });

  /**
   * GET /auth/status
   * Check Xero authentication status
   */
  router.get('/status', requireAuth, async (req, res, next) => {
    try {
      const userId = req.userId!;
      const tokens = await db.getOAuthTokens(userId, 'xero');

      if (!tokens) {
        return res.json({
          connected: false,
        });
      }

      const isExpired = tokens.expiresAt < Date.now();

      res.json({
        connected: true,
        expired: isExpired,
        tenantName: tokens.tenantName,
        tenantId: tokens.tenantId,
        expiresAt: tokens.expiresAt,
      });

    } catch (error) {
      next(error);
    }
  });

  /**
   * DELETE /auth/disconnect
   * Disconnect Xero account
   */
  router.delete('/disconnect', requireAuth, async (req, res, next) => {
    try {
      const userId = req.userId!;
      await db.deleteOAuthTokens(userId, 'xero');

      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
