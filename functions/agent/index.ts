/**
 * Agent Lambda Function
 *
 * API Gateway handler that processes user messages via Claude Agent SDK.
 * Orchestrates conversation flow and invokes MCP Lambda for tool execution.
 *
 * Architecture:
 * - PWA → API Gateway → This Lambda → Claude API
 * - This Lambda → MCP Lambda (for Xero tool calls)
 * - DynamoDB for session/memory persistence
 *
 * Environment Variables:
 * - ANTHROPIC_API_KEY: Claude API key (from Secrets Manager)
 * - MCP_LAMBDA_ARN: ARN of MCP Lambda function
 * - DYNAMODB_TABLE: DynamoDB table name
 * - AWS_REGION: AWS region
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';
import Anthropic from '@anthropic-ai/sdk';
import { AgentOrchestrator } from '@zero-agent/agent-core';

const lambdaClient = new LambdaClient({ region: process.env.AWS_REGION });
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Initialize orchestrator
const orchestrator = new AgentOrchestrator();

interface ChatRequest {
  message: string;
  sessionId?: string;
}

interface ChatResponse {
  message: string;
  sessionId: string;
}

/**
 * Lambda handler for agent API
 */
export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  console.log('Agent Lambda invoked:', {
    path: event.path,
    method: event.httpMethod,
    requestId: event.requestContext.requestId
  });

  try {
    // Get user ID from Cognito authorizer
    const userId = event.requestContext.authorizer?.claims?.sub;
    if (!userId) {
      return errorResponse(401, 'Unauthorized: No user ID found');
    }

    // Route based on path
    const path = event.path;

    if (path === '/chat' && event.httpMethod === 'POST') {
      return await handleChat(event, userId);
    }

    if (path === '/sessions' && event.httpMethod === 'POST') {
      return await handleCreateSession(userId);
    }

    if (path.startsWith('/sessions/') && event.httpMethod === 'GET') {
      const sessionId = path.split('/')[2];
      return await handleGetHistory(userId, sessionId);
    }

    return errorResponse(404, 'Not found');

  } catch (error) {
    console.error('Agent Lambda error:', error);
    return errorResponse(500, `Internal server error: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Handle chat message
 */
async function handleChat(event: APIGatewayProxyEvent, userId: string): Promise<APIGatewayProxyResult> {
  const body: ChatRequest = JSON.parse(event.body || '{}');

  if (!body.message) {
    return errorResponse(400, 'Missing required field: message');
  }

  // Create session if not provided
  let sessionId = body.sessionId;
  if (!sessionId) {
    sessionId = await orchestrator.createSession(userId);
  }

  // Process message with orchestrator
  const response = await orchestrator.processMessage({
    userId,
    sessionId,
    message: body.message,
  });

  const chatResponse: ChatResponse = {
    message: response.message,
    sessionId: response.sessionId,
  };

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*', // Configure properly in production
    },
    body: JSON.stringify(chatResponse),
  };
}

/**
 * Handle session creation
 */
async function handleCreateSession(userId: string): Promise<APIGatewayProxyResult> {
  const sessionId = await orchestrator.createSession(userId);

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
    body: JSON.stringify({ sessionId }),
  };
}

/**
 * Handle get conversation history
 */
async function handleGetHistory(userId: string, sessionId: string): Promise<APIGatewayProxyResult> {
  const history = await orchestrator.getHistory(userId, sessionId);

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
    body: JSON.stringify({ messages: history }),
  };
}

/**
 * Helper to invoke MCP Lambda
 */
export async function invokeMCPTool(
  tool: string,
  args: Record<string, any>,
  tenantId: string,
  userId: string
): Promise<any> {
  const mcpLambdaArn = process.env.MCP_LAMBDA_ARN;
  if (!mcpLambdaArn) {
    throw new Error('MCP_LAMBDA_ARN not configured');
  }

  const payload = {
    tool,
    arguments: args,
    tenantId,
    userId,
  };

  const command = new InvokeCommand({
    FunctionName: mcpLambdaArn,
    InvocationType: 'RequestResponse',
    Payload: Buffer.from(JSON.stringify(payload)),
  });

  const result = await lambdaClient.send(command);

  if (result.FunctionError) {
    throw new Error(`MCP Lambda error: ${result.FunctionError}`);
  }

  const response = JSON.parse(Buffer.from(result.Payload!).toString());
  return response;
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
