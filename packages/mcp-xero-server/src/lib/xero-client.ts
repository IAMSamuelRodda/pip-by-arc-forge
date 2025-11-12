/**
 * Xero Client wrapper with token management
 */

import { XeroClient, TokenSet } from 'xero-node';
import { SecretsManagerClient, GetSecretValueCommand, PutSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';

const secretsClient = new SecretsManagerClient({ region: process.env.AWS_REGION || 'us-east-1' });
const dynamoClient = DynamoDBDocumentClient.from(new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' }));

/**
 * Get Xero client with valid (refreshed if needed) access token
 */
export async function getXeroClient(userId: string): Promise<{ client: XeroClient; tenantId: string }> {
  // 1. Get valid token set (refreshes if expired)
  const tokenSet = await getValidTokenSet(userId);

  // 2. Initialize Xero client
  const xero = new XeroClient({
    clientId: process.env.XERO_CLIENT_ID!,
    clientSecret: process.env.XERO_CLIENT_SECRET!,
  });

  await xero.initialize();
  await xero.setTokenSet(tokenSet);

  // 3. Get tenant ID (organization ID)
  const tenantId = await getXeroTenantId(xero, userId);

  return { client: xero, tenantId };
}

/**
 * Get valid token set, refreshing if needed
 */
async function getValidTokenSet(userId: string): Promise<TokenSet> {
  // Load token from Secrets Manager
  const secretArn = process.env.SECRETS_MANAGER_XERO_TOKENS_ARN!;

  const response = await secretsClient.send(new GetSecretValueCommand({
    SecretId: `${secretArn}/user-${userId}`,
  }));

  if (!response.SecretString) {
    throw new Error('No Xero tokens found for user');
  }

  const tokenData = JSON.parse(response.SecretString);

  // Check if expired (with 5-minute buffer)
  const expiresIn = tokenData.expires_at - Math.floor(Date.now() / 1000);

  if (expiresIn < 300) {
    // Token expired or expiring soon - refresh
    const xero = new XeroClient({
      clientId: process.env.XERO_CLIENT_ID!,
      clientSecret: process.env.XERO_CLIENT_SECRET!,
    });

    const newTokenSet = await xero.refreshWithRefreshToken(
      process.env.XERO_CLIENT_ID!,
      process.env.XERO_CLIENT_SECRET!,
      tokenData.refresh_token
    );

    // Update Secrets Manager
    await secretsClient.send(new PutSecretValueCommand({
      SecretId: `${secretArn}/user-${userId}`,
      SecretString: JSON.stringify({
        access_token: newTokenSet.access_token,
        refresh_token: newTokenSet.refresh_token,
        id_token: newTokenSet.id_token,
        expires_at: newTokenSet.expires_at,
        scope: newTokenSet.scope,
      }),
    }));

    // Update DynamoDB metadata
    await dynamoClient.send(new UpdateCommand({
      TableName: process.env.DYNAMODB_TABLE_NAME!,
      Key: {
        PK: `USER#${userId}`,
        SK: `TOKEN#xero`,
      },
      UpdateExpression: 'SET expiresAt = :expiresAt, updatedAt = :updatedAt',
      ExpressionAttributeValues: {
        ':expiresAt': newTokenSet.expires_at,
        ':updatedAt': Date.now(),
      },
    }));

    return newTokenSet;
  }

  // Return existing valid token
  return tokenData as TokenSet;
}

/**
 * Get Xero tenant ID from token claims or connections
 */
async function getXeroTenantId(xero: XeroClient, userId: string): Promise<string> {
  // Check if cached in DynamoDB
  const cached = await dynamoClient.send(new GetCommand({
    TableName: process.env.DYNAMODB_TABLE_NAME!,
    Key: {
      PK: `USER#${userId}`,
      SK: `TOKEN#xero`,
    },
  }));

  if (cached.Item?.xeroTenantId) {
    return cached.Item.xeroTenantId;
  }

  // Get from Xero API
  const connections = await xero.updateTenants();

  if (connections.length === 0) {
    throw new Error('No Xero organization connected');
  }

  const tenantId = connections[0].tenantId;

  // Cache in DynamoDB
  await dynamoClient.send(new UpdateCommand({
    TableName: process.env.DYNAMODB_TABLE_NAME!,
    Key: {
      PK: `USER#${userId}`,
      SK: `TOKEN#xero`,
    },
    UpdateExpression: 'SET xeroTenantId = :tenantId',
    ExpressionAttributeValues: {
      ':tenantId': tenantId,
    },
  }));

  return tenantId;
}

/**
 * Make Xero API request with retry logic
 */
export async function makeXeroRequest<T>(
  requestFn: () => Promise<T>,
  maxRetries = 3
): Promise<T> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await requestFn();
    } catch (error: any) {
      const status = error.response?.statusCode || error.statusCode;

      if (status === 429 || status >= 500) {
        // Rate limit or server error - exponential backoff
        const delay = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s
        await sleep(delay);
        continue;
      }

      // Non-retryable error
      throw error;
    }
  }

  throw new Error('Max retries exceeded for Xero API request');
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
