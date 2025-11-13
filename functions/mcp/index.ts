/**
 * MCP Lambda Function
 *
 * Invokes the MCP Xero Server to execute tool calls.
 * Acts as a bridge between the Agent Lambda and the MCP server.
 *
 * Architecture:
 * - Agent Lambda invokes this function with tool name + arguments
 * - This function spawns MCP server process with stdio transport
 * - Returns tool execution result to Agent Lambda
 *
 * Environment Variables:
 * - XERO_CLIENT_ID: Xero OAuth client ID (from Secrets Manager)
 * - XERO_CLIENT_SECRET: Xero OAuth client secret (from Secrets Manager)
 * - DYNAMODB_TABLE: DynamoDB table name for caching
 * - AWS_REGION: AWS region for Secrets Manager/DynamoDB
 */

import { spawn } from 'child_process';
import { promisify } from 'util';

interface MCPToolRequest {
  tool: string;
  arguments: Record<string, any>;
  tenantId: string;
  userId: string;
}

interface MCPToolResponse {
  content: Array<{
    type: 'text' | 'image' | 'resource';
    text?: string;
    data?: string;
    mimeType?: string;
  }>;
  isError?: boolean;
}

/**
 * Lambda handler for MCP tool invocation
 */
export async function handler(event: MCPToolRequest): Promise<MCPToolResponse> {
  console.log('MCP Lambda invoked:', { tool: event.tool, tenantId: event.tenantId });

  try {
    // Validate input
    if (!event.tool || !event.arguments) {
      throw new Error('Missing required fields: tool, arguments');
    }

    // Execute MCP tool via stdio
    const result = await invokeMCPTool(event.tool, event.arguments, event.tenantId, event.userId);

    console.log('MCP tool execution completed:', {
      tool: event.tool,
      success: !result.isError
    });

    return result;

  } catch (error) {
    console.error('MCP Lambda error:', error);

    return {
      content: [{
        type: 'text',
        text: `Error executing MCP tool: ${error instanceof Error ? error.message : String(error)}`
      }],
      isError: true
    };
  }
}

/**
 * Invoke MCP tool by spawning server process
 *
 * The MCP server runs as a stdio process. We send JSON-RPC requests
 * and parse the responses.
 */
async function invokeMCPTool(
  toolName: string,
  args: Record<string, any>,
  tenantId: string,
  userId: string
): Promise<MCPToolResponse> {

  return new Promise((resolve, reject) => {
    // Path to the compiled MCP server
    // In Lambda, this will be in /opt/nodejs/mcp-xero-server (Lambda Layer)
    const mcpServerPath = process.env.MCP_SERVER_PATH || '/opt/nodejs/mcp-xero-server/dist/index.js';

    // Spawn MCP server process
    const mcp = spawn('node', [mcpServerPath], {
      env: {
        ...process.env,
        TENANT_ID: tenantId,
        USER_ID: userId,
      },
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';

    mcp.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    mcp.stderr.on('data', (data) => {
      stderr += data.toString();
      // Log stderr for debugging
      console.error('MCP stderr:', data.toString());
    });

    mcp.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`MCP server exited with code ${code}: ${stderr}`));
        return;
      }

      try {
        // Parse JSON-RPC response from stdout
        const lines = stdout.split('\n').filter(line => line.trim());

        // Find the tool response (skip initialization messages)
        for (const line of lines) {
          try {
            const parsed = JSON.parse(line);

            // Look for tool call result
            if (parsed.result && parsed.result.content) {
              resolve(parsed.result as MCPToolResponse);
              return;
            }
          } catch {
            // Skip non-JSON lines
            continue;
          }
        }

        reject(new Error('No valid MCP response found in output'));

      } catch (error) {
        reject(new Error(`Failed to parse MCP response: ${error}`));
      }
    });

    mcp.on('error', (error) => {
      reject(new Error(`Failed to spawn MCP server: ${error.message}`));
    });

    // Send JSON-RPC request to MCP server
    const request = {
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: {
        name: toolName,
        arguments: args
      }
    };

    mcp.stdin.write(JSON.stringify(request) + '\n');
    mcp.stdin.end();
  });
}
