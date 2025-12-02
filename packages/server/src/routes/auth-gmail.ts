/**
 * Gmail OAuth Routes
 *
 * Handles Google Gmail OAuth 2.0 authorization flow
 * Uses gmail.readonly scope (RESTRICTED - requires CASA for production)
 * Testing mode: 100 user limit, 7-day refresh token expiry
 */

import { Router } from 'express';
import type { DatabaseProvider, OAuthTokens } from '@pip/core';
import crypto from 'crypto';
import { requireAuth } from '../middleware/auth.js';
import { verifyToken } from '../services/auth.js';

interface GoogleTokenResponse {
  access_token: string;
  refresh_token?: string; // Only returned on initial authorization
  token_type: string;
  expires_in: number;
  scope: string;
}

interface GoogleUserInfo {
  id: string;
  email: string;
  name?: string;
  picture?: string;
}

// Google OAuth configuration
const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo';

// Gmail readonly scope - RESTRICTED (requires CASA for production)
// Testing mode allows 100 users without CASA
const GMAIL_SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/userinfo.email', // To get user's email
].join(' ');

export function createGmailAuthRoutes(db: DatabaseProvider): Router {
  const router = Router();

  const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
  const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
  const BASE_URL = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
  const REDIRECT_URI = `${BASE_URL}/auth/google/gmail/callback`;
  const FRONTEND_URL = process.env.FRONTEND_URL || BASE_URL;

  // Log configuration on startup for debugging
  console.log(`🔧 Gmail auth routes configured:`);
  console.log(`   REDIRECT_URI: ${REDIRECT_URI}`);
  console.log(`   GOOGLE_CLIENT_ID: ${GOOGLE_CLIENT_ID ? '✓ Set' : '✗ Missing'}`);
  console.log(`   GOOGLE_CLIENT_SECRET: ${GOOGLE_CLIENT_SECRET ? '✓ Set' : '✗ Missing'}`);

  /**
   * GET /auth/google/gmail
   * Initiate Gmail OAuth flow - redirect to Google
   * Requires authentication - will link Gmail to the logged-in user
   */
  router.get('/', (req, res) => {
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

    const userId = decoded.userId;

    if (!GOOGLE_CLIENT_ID) {
      return res.status(500).json({
        error: 'Google OAuth not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.',
      });
    }

    // Encode user ID in state for the callback
    const stateData = {
      csrf: crypto.randomUUID(),
      userId,
    };
    const state = Buffer.from(JSON.stringify(stateData)).toString('base64url');

    const authUrl = new URL(GOOGLE_AUTH_URL);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('client_id', GOOGLE_CLIENT_ID);
    authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
    authUrl.searchParams.set('scope', GMAIL_SCOPES);
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('access_type', 'offline'); // Request refresh token
    authUrl.searchParams.set('prompt', 'consent'); // Force consent to get refresh token

    console.log(`🔐 Redirecting to Google authorization for user: ${userId}`);
    console.log(`   Redirect URI: ${REDIRECT_URI}`);

    res.redirect(authUrl.toString());
  });

  /**
   * GET /auth/google/gmail/callback
   * Handle OAuth callback from Google
   */
  router.get('/callback', async (req, res) => {
    const { code, state, error } = req.query;

    // Helper to show error page instead of blank screen
    const showError = (title: string, message: string, details?: string) => {
      console.error(`❌ Gmail OAuth error: ${title} - ${message}`);
      res.status(400).send(`
        <!DOCTYPE html>
        <html>
          <head><title>Pip by Arc Forge</title>
            <style>
              body { font-family: system-ui, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; background: #0f1419; color: #fff; }
              .error { background: #3a1a1a; border: 1px solid #6b2d2d; padding: 20px; border-radius: 8px; }
              .details { background: #1a1a1a; padding: 10px; margin-top: 10px; font-family: monospace; font-size: 12px; overflow-x: auto; }
              button { margin-top: 20px; padding: 10px 20px; cursor: pointer; background: #7eb88e; border: none; border-radius: 4px; color: #0f1419; font-weight: 600; }
              button:hover { background: #6aa87e; }
            </style>
          </head>
          <body>
            <div class="error">
              <h2>❌ ${title}</h2>
              <p>${message}</p>
              ${details ? `<div class="details">${details}</div>` : ''}
            </div>
            <button onclick="window.location.href='${FRONTEND_URL}/settings'">Back to Settings</button>
          </body>
        </html>
      `);
    };

    if (error) {
      return showError('Gmail Authorization Failed', `Google returned an error: ${error}`);
    }

    if (!code) {
      return showError('Missing Authorization Code', 'No authorization code received from Google.');
    }

    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
      return showError('Server Configuration Error', 'Google OAuth credentials not configured.',
        'Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET environment variables.');
    }

    try {
      console.log(`🔄 Exchanging Gmail authorization code for tokens...`);

      // Exchange code for tokens
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000);

      const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code: String(code),
          redirect_uri: REDIRECT_URI,
          client_id: GOOGLE_CLIENT_ID,
          client_secret: GOOGLE_CLIENT_SECRET,
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
          `Status: ${tokenResponse.status}<br>Response: ${errorText}`
        );
      }

      const tokenData = await tokenResponse.json() as GoogleTokenResponse;
      console.log(`✅ Gmail tokens received`);

      // Get user info (email)
      const userInfoResponse = await fetch(GOOGLE_USERINFO_URL, {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
        },
      });

      if (!userInfoResponse.ok) {
        const errorText = await userInfoResponse.text();
        return showError('Failed to Get User Info',
          'Could not retrieve Google user information.',
          errorText);
      }

      const userInfo = await userInfoResponse.json() as GoogleUserInfo;
      console.log(`✅ Gmail connected for: ${userInfo.email}`);

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

      // Check if we got a refresh token
      if (!tokenData.refresh_token) {
        // This can happen if user has already authorized the app before
        // We need to either revoke and re-auth, or use existing refresh token
        const existingTokens = await db.getOAuthTokens(userId, 'gmail');
        if (existingTokens?.refreshToken) {
          // Use existing refresh token with new access token
          tokenData.refresh_token = existingTokens.refreshToken;
          console.log(`ℹ Using existing refresh token (re-authorization)`);
        } else {
          return showError(
            'Refresh Token Missing',
            'Google did not provide a refresh token. This can happen if you\'ve previously authorized the app.',
            'To fix: Go to <a href="https://myaccount.google.com/permissions" target="_blank">Google Account Permissions</a>, remove Pip, then try connecting again.'
          );
        }
      }

      console.log(`   Saving Gmail tokens for user: ${userId}`);

      // Save tokens to database
      const tokens: OAuthTokens = {
        userId,
        provider: 'gmail',
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        tokenType: tokenData.token_type,
        expiresAt: Date.now() + tokenData.expires_in * 1000,
        scopes: tokenData.scope.split(' '),
        providerUserId: userInfo.id,
        providerEmail: userInfo.email,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      await db.saveOAuthTokens(tokens);
      console.log(`✅ Gmail tokens saved to database`);

      // Redirect to frontend settings with success
      res.redirect(`${FRONTEND_URL}/settings?gmail=connected&email=${encodeURIComponent(userInfo.email)}`);

    } catch (error: any) {
      console.error(`❌ Gmail OAuth callback error:`, error);
      if (error.name === 'AbortError') {
        return showError('Request Timeout', 'The request to Google timed out. Please try again.');
      }
      return showError('OAuth Error', error.message || 'An unexpected error occurred.');
    }
  });

  /**
   * POST /auth/google/gmail/refresh
   * Manually refresh Gmail access token
   */
  router.post('/refresh', requireAuth, async (req, res, next) => {
    try {
      const userId = req.userId!;
      const tokens = await db.getOAuthTokens(userId, 'gmail');

      if (!tokens) {
        return res.status(401).json({ error: 'No Gmail tokens found' });
      }

      if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
        return res.status(500).json({ error: 'Google OAuth not configured' });
      }

      const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: tokens.refreshToken,
          client_id: GOOGLE_CLIENT_ID,
          client_secret: GOOGLE_CLIENT_SECRET,
        }),
      });

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        // Check if refresh token is expired (Testing mode: 7 days)
        if (tokenResponse.status === 400 && errorText.includes('invalid_grant')) {
          return res.status(401).json({
            error: 'Gmail refresh token expired',
            message: 'Please reconnect your Gmail account. In testing mode, tokens expire after 7 days.',
            needsReconnect: true,
          });
        }
        throw new Error(`Token refresh failed: ${errorText}`);
      }

      const tokenData = await tokenResponse.json() as GoogleTokenResponse;

      const updatedTokens: OAuthTokens = {
        ...tokens,
        accessToken: tokenData.access_token,
        // Google may return a new refresh token
        refreshToken: tokenData.refresh_token || tokens.refreshToken,
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
   * GET /auth/google/gmail/status
   * Check Gmail authentication status
   */
  router.get('/status', requireAuth, async (req, res, next) => {
    try {
      const userId = req.userId!;
      const tokens = await db.getOAuthTokens(userId, 'gmail');

      if (!tokens) {
        return res.json({
          connected: false,
        });
      }

      const isExpired = tokens.expiresAt < Date.now();

      res.json({
        connected: true,
        expired: isExpired,
        email: tokens.providerEmail,
        expiresAt: tokens.expiresAt,
      });

    } catch (error) {
      next(error);
    }
  });

  /**
   * DELETE /auth/google/gmail/disconnect
   * Disconnect Gmail account
   */
  router.delete('/disconnect', requireAuth, async (req, res, next) => {
    try {
      const userId = req.userId!;
      await db.deleteOAuthTokens(userId, 'gmail');

      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
