/**
 * Auth Lambda Function
 *
 * Handles Xero OAuth 2.0 authorization flow:
 * 1. /auth/xero/login - Redirect to Xero authorization URL
 * 2. /auth/xero/callback - Exchange code for tokens, store in Secrets Manager
 * 3. /auth/xero/refresh - Refresh access token
 *
 * Xero OAuth Flow:
 * - Authorization URL: https://login.xero.com/identity/connect/authorize
 * - Token URL: https://identity.xero.com/connect/token
 * - Scopes: accounting.transactions, accounting.contacts, accounting.reports.read, offline_access
 *
 * Environment Variables:
 * - XERO_CLIENT_ID: Xero OAuth client ID
 * - XERO_CLIENT_SECRET: Xero OAuth client secret (from Secrets Manager)
 * - REDIRECT_URI: OAuth callback URL (API Gateway URL)
 * - FRONTEND_URL: PWA URL for redirect after auth
 * - AWS_REGION: AWS region
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { SecretsManagerClient, PutSecretValueCommand, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import axios from 'axios';

const secretsClient = new SecretsManagerClient({ region: process.env.AWS_REGION });

const XERO_AUTH_URL = 'https://login.xero.com/identity/connect/authorize';
const XERO_TOKEN_URL = 'https://identity.xero.com/connect/token';
const XERO_CONNECTIONS_URL = 'https://api.xero.com/connections';

const REQUIRED_SCOPES = [
  'accounting.transactions',
  'accounting.contacts',
  'accounting.reports.read',
  'offline_access', // Required for refresh tokens
].join(' ');

/**
 * Lambda handler for OAuth routes
 */
export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  console.log('Auth Lambda invoked:', {
    path: event.path,
    method: event.httpMethod
  });

  try {
    const path = event.path;

    // Initiate OAuth flow
    if (path === '/auth/xero/login' && event.httpMethod === 'GET') {
      return handleLogin(event);
    }

    // OAuth callback from Xero
    if (path === '/auth/xero/callback' && event.httpMethod === 'GET') {
      return await handleCallback(event);
    }

    // Refresh access token
    if (path === '/auth/xero/refresh' && event.httpMethod === 'POST') {
      return await handleRefresh(event);
    }

    // Check authentication status
    if (path === '/auth/status' && event.httpMethod === 'GET') {
      return await handleStatus(event);
    }

    return errorResponse(404, 'Not found');

  } catch (error) {
    console.error('Auth Lambda error:', error);
    return errorResponse(500, `Internal server error: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Initiate OAuth flow - redirect to Xero
 */
function handleLogin(event: APIGatewayProxyEvent): APIGatewayProxyResult {
  const clientId = process.env.XERO_CLIENT_ID;
  const redirectUri = process.env.REDIRECT_URI;

  if (!clientId || !redirectUri) {
    return errorResponse(500, 'OAuth not configured');
  }

  // Get user ID from Cognito (if authenticated)
  const userId = event.requestContext.authorizer?.claims?.sub;
  const state = userId ? Buffer.from(JSON.stringify({ userId })).toString('base64') : 'default';

  const authUrl = new URL(XERO_AUTH_URL);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('scope', REQUIRED_SCOPES);
  authUrl.searchParams.set('state', state);

  return {
    statusCode: 302,
    headers: {
      'Location': authUrl.toString(),
    },
    body: '',
  };
}

/**
 * Handle OAuth callback from Xero
 */
async function handleCallback(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const code = event.queryStringParameters?.code;
  const state = event.queryStringParameters?.state;

  if (!code) {
    return errorResponse(400, 'Missing authorization code');
  }

  const clientId = process.env.XERO_CLIENT_ID;
  const clientSecret = await getXeroClientSecret();
  const redirectUri = process.env.REDIRECT_URI;
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

  if (!clientId || !clientSecret || !redirectUri) {
    return errorResponse(500, 'OAuth not configured');
  }

  try {
    // Exchange code for tokens
    const tokenResponse = await axios.post(XERO_TOKEN_URL, new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
    }), {
      auth: {
        username: clientId,
        password: clientSecret,
      },
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    const {
      access_token,
      refresh_token,
      expires_in,
      token_type,
    } = tokenResponse.data;

    // Get tenant ID from Xero connections
    const connectionsResponse = await axios.get(XERO_CONNECTIONS_URL, {
      headers: {
        'Authorization': `Bearer ${access_token}`,
      },
    });

    const tenantId = connectionsResponse.data[0]?.tenantId;
    if (!tenantId) {
      return errorResponse(500, 'No Xero organization found');
    }

    // Decode state to get user ID
    let userId = 'default';
    if (state) {
      try {
        const decoded = JSON.parse(Buffer.from(state, 'base64').toString());
        userId = decoded.userId || 'default';
      } catch {
        // Use default if state is invalid
      }
    }

    // Store tokens in Secrets Manager
    await storeTokens(userId, tenantId, {
      accessToken: access_token,
      refreshToken: refresh_token,
      expiresAt: new Date(Date.now() + expires_in * 1000).toISOString(),
      tokenType: token_type,
    });

    console.log('OAuth tokens stored successfully:', { userId, tenantId });

    // Redirect to frontend with success message
    const redirectUrl = new URL(frontendUrl);
    redirectUrl.searchParams.set('auth', 'success');
    redirectUrl.searchParams.set('tenantId', tenantId);

    return {
      statusCode: 302,
      headers: {
        'Location': redirectUrl.toString(),
      },
      body: '',
    };

  } catch (error) {
    console.error('OAuth callback error:', error);

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const redirectUrl = new URL(frontendUrl);
    redirectUrl.searchParams.set('auth', 'error');
    redirectUrl.searchParams.set('message', error instanceof Error ? error.message : 'Unknown error');

    return {
      statusCode: 302,
      headers: {
        'Location': redirectUrl.toString(),
      },
      body: '',
    };
  }
}

/**
 * Refresh access token
 */
async function handleRefresh(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const userId = event.requestContext.authorizer?.claims?.sub;
  if (!userId) {
    return errorResponse(401, 'Unauthorized');
  }

  const clientId = process.env.XERO_CLIENT_ID;
  const clientSecret = await getXeroClientSecret();

  if (!clientId || !clientSecret) {
    return errorResponse(500, 'OAuth not configured');
  }

  try {
    // Get current tokens from Secrets Manager
    const tokens = await getTokens(userId);
    if (!tokens || !tokens.refreshToken) {
      return errorResponse(401, 'No refresh token found');
    }

    // Refresh access token
    const tokenResponse = await axios.post(XERO_TOKEN_URL, new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: tokens.refreshToken,
    }), {
      auth: {
        username: clientId,
        password: clientSecret,
      },
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    const {
      access_token,
      refresh_token,
      expires_in,
      token_type,
    } = tokenResponse.data;

    // Update tokens in Secrets Manager
    await storeTokens(userId, tokens.tenantId, {
      accessToken: access_token,
      refreshToken: refresh_token || tokens.refreshToken, // Xero may not return new refresh token
      expiresAt: new Date(Date.now() + expires_in * 1000).toISOString(),
      tokenType: token_type,
    });

    console.log('Access token refreshed:', { userId });

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ success: true }),
    };

  } catch (error) {
    console.error('Token refresh error:', error);
    return errorResponse(500, `Failed to refresh token: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Check authentication status
 */
async function handleStatus(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const userId = event.requestContext.authorizer?.claims?.sub;
  if (!userId) {
    return errorResponse(401, 'Unauthorized');
  }

  try {
    const tokens = await getTokens(userId);
    const isAuthenticated = !!tokens && !!tokens.accessToken;
    const isExpired = tokens ? new Date(tokens.expiresAt) < new Date() : true;

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        authenticated: isAuthenticated,
        expired: isExpired,
        tenantId: tokens?.tenantId,
      }),
    };
  } catch (error) {
    return errorResponse(500, `Failed to check status: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Store OAuth tokens in Secrets Manager
 */
async function storeTokens(userId: string, tenantId: string, tokens: {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  tokenType: string;
}): Promise<void> {
  const secretName = `zero-agent/oauth/${userId}`;

  const secretValue = JSON.stringify({
    tenantId,
    ...tokens,
    updatedAt: new Date().toISOString(),
  });

  const command = new PutSecretValueCommand({
    SecretId: secretName,
    SecretString: secretValue,
  });

  await secretsClient.send(command);
}

/**
 * Get OAuth tokens from Secrets Manager
 */
async function getTokens(userId: string): Promise<{
  tenantId: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  tokenType: string;
} | null> {
  const secretName = `zero-agent/oauth/${userId}`;

  try {
    const command = new GetSecretValueCommand({
      SecretId: secretName,
    });

    const result = await secretsClient.send(command);
    if (!result.SecretString) {
      return null;
    }

    return JSON.parse(result.SecretString);
  } catch (error: any) {
    if (error.name === 'ResourceNotFoundException') {
      return null;
    }
    throw error;
  }
}

/**
 * Get Xero client secret from Secrets Manager
 */
async function getXeroClientSecret(): Promise<string> {
  const secretName = process.env.XERO_CLIENT_SECRET_ARN || 'zero-agent/xero-client-secret';

  const command = new GetSecretValueCommand({
    SecretId: secretName,
  });

  const result = await secretsClient.send(command);
  if (!result.SecretString) {
    throw new Error('Xero client secret not found');
  }

  return result.SecretString;
}

/**
 * Helper to create error response
 */
function errorResponse(statusCode: number, message: string): APIGatewayProxyResult {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
    body: JSON.stringify({ error: message }),
  };
}
