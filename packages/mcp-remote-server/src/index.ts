/**
 * Remote MCP Server for Claude.ai and ChatGPT
 *
 * Provides Pip bookkeeping assistant as a remote MCP server that users
 * can connect to via Claude.ai Integrations or ChatGPT Apps.
 *
 * Features:
 * - HTTP/SSE transport for remote connections
 * - Multi-tenant Xero OAuth authentication
 * - Pip personality via MCP prompts
 * - Xero accounting tools (invoices, reports, bank transactions)
 */

import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
  Tool,
  Prompt,
  CallToolResult,
} from "@modelcontextprotocol/sdk/types.js";

// Import tool handlers
import * as xeroTools from "./handlers/xero-tools.js";
import { getXeroStatus } from "./services/xero.js";

// Types
interface Session {
  id: string;
  transport: SSEServerTransport;
  userId?: string;
  xeroConnected: boolean;
  createdAt: Date;
}

// Store active sessions
const sessions = new Map<string, Session>();

// Pip personality system prompt
const PIP_SYSTEM_PROMPT = `You are Pip, a friendly AI bookkeeping assistant for Australian small business owners.

## Your Personality
- Warm, approachable, and genuinely helpful
- Like a trusted colleague who happens to know accounting
- Uses Australian English (organisation, colour, labour)
- Direct and practical - no corporate jargon

## Your Approach
1. Always use tools to get REAL data - never guess
2. Reference specific numbers from Xero
3. Give clear, actionable advice
4. End with a helpful follow-up question when appropriate

## Response Format (for financial questions)
**Assessment**: [Clear answer with reason]

**The Numbers** (from Xero):
- [Actual data points]

**Recommendation**: [Specific, actionable advice]

## Available Tools
- get_invoices: Fetch invoices (filter by status)
- get_profit_and_loss: Get P&L report
- get_balance_sheet: Get current balance sheet
- get_bank_transactions: Get recent transactions
- get_contacts: Get customers/suppliers
- get_organisation: Get company info
- get_aged_receivables: Who owes you money
- get_aged_payables: Who you owe money to
- search_contacts: Find a specific customer/supplier
- get_bank_accounts: Get bank balances`;

// ===========================================
// Lazy-Loading Tool Registry
// Tools organized by category for context efficiency
// ===========================================

interface ToolDefinition extends Tool {
  category: string;
}

// Tool registry with categories
const toolRegistry: ToolDefinition[] = [
  // INVOICES category
  {
    category: "invoices",
    name: "get_invoices",
    description: "Get invoices from Xero. Use status 'AUTHORISED' for unpaid, 'PAID' for paid.",
    inputSchema: {
      type: "object",
      properties: {
        status: {
          type: "string",
          enum: ["DRAFT", "AUTHORISED", "PAID", "VOIDED"],
          description: "Filter by status. AUTHORISED = unpaid, PAID = paid",
        },
        limit: { type: "number", description: "Max invoices to return (default: 10)" },
      },
    },
  },
  {
    category: "invoices",
    name: "get_aged_receivables",
    description: "Get aged receivables - who owes you money and how overdue",
    inputSchema: {
      type: "object",
      properties: {
        date: { type: "string", description: "Date for aging (YYYY-MM-DD), defaults to today" },
      },
    },
  },
  {
    category: "invoices",
    name: "get_aged_payables",
    description: "Get aged payables - who you owe money to and how overdue",
    inputSchema: {
      type: "object",
      properties: {
        date: { type: "string", description: "Date for aging (YYYY-MM-DD), defaults to today" },
      },
    },
  },

  // REPORTS category
  {
    category: "reports",
    name: "get_profit_and_loss",
    description: "Get profit & loss report for a date range",
    inputSchema: {
      type: "object",
      properties: {
        fromDate: { type: "string", description: "Start date (YYYY-MM-DD)" },
        toDate: { type: "string", description: "End date (YYYY-MM-DD)" },
      },
    },
  },
  {
    category: "reports",
    name: "get_balance_sheet",
    description: "Get balance sheet as of a specific date",
    inputSchema: {
      type: "object",
      properties: {
        date: { type: "string", description: "Date (YYYY-MM-DD), defaults to today" },
      },
    },
  },

  // BANKING category
  {
    category: "banking",
    name: "get_bank_accounts",
    description: "Get bank accounts and their current balances",
    inputSchema: { type: "object", properties: {} },
  },
  {
    category: "banking",
    name: "get_bank_transactions",
    description: "Get recent bank transactions",
    inputSchema: {
      type: "object",
      properties: {
        limit: { type: "number", description: "Max transactions to return (default: 10)" },
      },
    },
  },

  // CONTACTS category
  {
    category: "contacts",
    name: "get_contacts",
    description: "Get customers and suppliers",
    inputSchema: {
      type: "object",
      properties: {
        limit: { type: "number", description: "Max contacts to return (default: 10)" },
      },
    },
  },
  {
    category: "contacts",
    name: "search_contacts",
    description: "Search for a customer or supplier by name",
    inputSchema: {
      type: "object",
      properties: {
        searchTerm: { type: "string", description: "Name to search for" },
      },
      required: ["searchTerm"],
    },
  },

  // ORGANISATION category
  {
    category: "organisation",
    name: "get_organisation",
    description: "Get company details from Xero",
    inputSchema: { type: "object", properties: {} },
  },
];

// Get unique categories with tool counts
const categories = [...new Set(toolRegistry.map((t) => t.category))];
const categoryOverview = categories
  .map((cat) => {
    const tools = toolRegistry.filter((t) => t.category === cat);
    return `${cat} (${tools.length} tools)`;
  })
  .join(", ");

// Meta-tools for lazy loading (only these are exposed initially)
const metaTools: Tool[] = [
  {
    name: "get_tools_in_category",
    description: `Get available Xero tools by category. Categories: ${categoryOverview}. Call this first to discover what tools are available, then use execute_tool to run them.`,
    inputSchema: {
      type: "object",
      properties: {
        category: {
          type: "string",
          enum: categories,
          description: "The category of tools to list",
        },
      },
      required: ["category"],
    },
  },
  {
    name: "execute_tool",
    description:
      "Execute a Xero tool by name. First use get_tools_in_category to discover available tools and their parameters.",
    inputSchema: {
      type: "object",
      properties: {
        tool_name: {
          type: "string",
          description: "The name of the tool to execute (e.g., 'get_invoices')",
        },
        arguments: {
          type: "object",
          description: "Arguments to pass to the tool",
        },
      },
      required: ["tool_name"],
    },
  },
];

// Prompts for Pip personality
const prompts: Prompt[] = [
  {
    name: "pip_assistant",
    description: "Pip - AI Bookkeeping Assistant for Australian Small Business",
    arguments: [],
  },
];

// JWT secret (shared with main server)
const JWT_SECRET = process.env.JWT_SECRET || "pip-mcp-secret-change-me";

/**
 * Verify JWT token and extract user ID
 */
function verifyToken(token: string): { userId: string } | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    return decoded;
  } catch {
    return null;
  }
}

// Create MCP server for a specific user session
function createMcpServer(userId?: string): Server {
  const server = new Server(
    {
      name: "pip-mcp-server",
      version: "0.1.0",
    },
    {
      capabilities: {
        tools: {},
        prompts: {},
      },
    }
  );

  // List available tools (only meta-tools for lazy loading)
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return { tools: metaTools };
  });

  // List available prompts
  server.setRequestHandler(ListPromptsRequestSchema, async () => {
    return { prompts };
  });

  // Get prompt content
  server.setRequestHandler(GetPromptRequestSchema, async (request) => {
    const { name } = request.params;

    if (name === "pip_assistant") {
      return {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: PIP_SYSTEM_PROMPT,
            },
          },
        ],
      };
    }

    throw new Error(`Unknown prompt: ${name}`);
  });

  // Handle tool calls with lazy-loading support
  server.setRequestHandler(CallToolRequestSchema, async (request): Promise<CallToolResult> => {
    const { name, arguments: args } = request.params;

    // Meta-tool: get_tools_in_category (doesn't require auth)
    if (name === "get_tools_in_category") {
      const category = (args as { category: string }).category;
      const categoryTools = toolRegistry.filter((t) => t.category === category);

      if (categoryTools.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: `Unknown category: ${category}. Available categories: ${categories.join(", ")}`,
            },
          ],
          isError: true,
        };
      }

      // Return tool definitions for this category
      const toolList = categoryTools.map((t) => ({
        name: t.name,
        description: t.description,
        parameters: t.inputSchema,
      }));

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                category,
                tools: toolList,
                usage: "Use execute_tool with tool_name and arguments to run these tools",
              },
              null,
              2
            ),
          },
        ],
      };
    }

    // Meta-tool: execute_tool
    if (name === "execute_tool") {
      const { tool_name, arguments: toolArgs } = args as {
        tool_name: string;
        arguments?: Record<string, unknown>;
      };

      // Verify tool exists in registry
      const tool = toolRegistry.find((t) => t.name === tool_name);
      if (!tool) {
        return {
          content: [
            {
              type: "text",
              text: `Unknown tool: ${tool_name}. Use get_tools_in_category first to discover available tools.`,
            },
          ],
          isError: true,
        };
      }

      // Check if user is authenticated for actual Xero tools
      if (!userId) {
        return {
          content: [
            {
              type: "text",
              text: `To use Xero tools, please authenticate first. Add your auth token to the SSE connection URL: /sse?token=YOUR_TOKEN`,
            },
          ],
        };
      }

      // Execute the actual tool
      return await executeXeroTool(userId, tool_name, toolArgs || {});
    }

    // Unknown meta-tool
    return {
      content: [
        {
          type: "text",
          text: `Unknown tool: ${name}. Available tools: get_tools_in_category, execute_tool`,
        },
      ],
      isError: true,
    };
  });

  return server;
}

/**
 * Execute a Xero tool by name
 */
async function executeXeroTool(
  userId: string,
  toolName: string,
  args: Record<string, unknown>
): Promise<CallToolResult> {
  try {
    switch (toolName) {
      case "get_invoices":
        return await xeroTools.getInvoices(userId, args as { status?: string; limit?: number });

      case "get_profit_and_loss":
        return await xeroTools.getProfitAndLoss(userId, args as { fromDate?: string; toDate?: string });

      case "get_balance_sheet":
        return await xeroTools.getBalanceSheet(userId, args as { date?: string });

      case "get_bank_accounts":
        return await xeroTools.getBankAccounts(userId);

      case "get_bank_transactions":
        return await xeroTools.getBankTransactions(userId, args as { limit?: number });

      case "get_contacts":
        return await xeroTools.getContacts(userId, args as { limit?: number });

      case "get_organisation":
        return await xeroTools.getOrganisation(userId);

      case "get_aged_receivables":
        return await xeroTools.getAgedReceivables(userId, args as { date?: string });

      case "get_aged_payables":
        return await xeroTools.getAgedPayables(userId, args as { date?: string });

      case "search_contacts":
        return await xeroTools.searchContacts(userId, args as { searchTerm: string });

      default:
        return {
          content: [{ type: "text", text: `Tool not implemented: ${toolName}` }],
          isError: true,
        };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Error executing ${toolName}:`, error);
    return {
      content: [
        {
          type: "text",
          text: `Error executing ${toolName}: ${errorMessage}`,
        },
      ],
      isError: true,
    };
  }
}

// Create Express app
const app: express.Application = express();
app.use(cors());
app.use(express.json());

// Health check
app.get("/health", (req: Request, res: Response) => {
  res.json({
    status: "ok",
    server: "pip-mcp-server",
    version: "0.1.0",
    activeSessions: sessions.size,
  });
});

// SSE endpoint for MCP connections
app.get("/sse", async (req: Request, res: Response) => {
  console.log("New SSE connection request");

  // Extract auth token from Authorization header (Bearer token) or query parameter
  let token: string | undefined;

  // Check Authorization header first (OAuth flow)
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.substring(7);
    console.log("Token from Authorization header");
  } else {
    // Fallback to query parameter
    token = req.query.token as string | undefined;
    if (token) {
      console.log("Token from query parameter");
    }
  }

  let userId: string | undefined;

  if (token) {
    const decoded = verifyToken(token);
    if (decoded) {
      userId = decoded.userId;
      console.log(`Authenticated user: ${userId}`);

      // Check Xero connection status
      const xeroStatus = await getXeroStatus(userId);
      console.log(`Xero connected: ${xeroStatus.connected}${xeroStatus.tenantName ? ` (${xeroStatus.tenantName})` : ""}`);
    } else {
      console.log("Invalid auth token provided");
    }
  } else {
    console.log("No auth token - tools will require authentication");
  }

  // Create new MCP server instance for this session (with user context)
  const server = createMcpServer(userId);

  // Create SSE transport - it generates its own session ID
  const transport = new SSEServerTransport("/messages", res);

  // Use the transport's built-in session ID
  const sessionId = transport.sessionId;

  // Store session with user info
  const session: Session = {
    id: sessionId,
    transport,
    userId,
    xeroConnected: userId ? (await getXeroStatus(userId)).connected : false,
    createdAt: new Date(),
  };
  sessions.set(sessionId, session);

  console.log(`Session created: ${sessionId}${userId ? ` for user ${userId}` : " (anonymous)"}`);

  // Handle disconnect
  res.on("close", () => {
    console.log(`Session closed: ${sessionId}`);
    sessions.delete(sessionId);
  });

  // Connect server to transport
  await server.connect(transport);
});

// Messages endpoint for MCP
// NOTE: We don't use express.json() for this route because handlePostMessage needs the raw body
app.post("/messages", async (req: Request, res: Response) => {
  // Get session ID from query
  const sessionId = req.query.sessionId as string;

  if (!sessionId) {
    res.status(400).json({ error: "Missing sessionId" });
    return;
  }

  const session = sessions.get(sessionId);
  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  // Forward message to transport - pass the already-parsed body from express.json()
  try {
    await session.transport.handlePostMessage(req, res, req.body);
  } catch (error) {
    console.error("Error handling message:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// OAuth callback for Xero (placeholder)
app.get("/auth/xero", (req: Request, res: Response) => {
  // TODO: Implement Xero OAuth flow
  res.redirect(
    `https://login.xero.com/identity/connect/authorize?` +
      `client_id=${process.env.XERO_CLIENT_ID}&` +
      `redirect_uri=${encodeURIComponent(process.env.BASE_URL + "/auth/xero/callback")}&` +
      `response_type=code&` +
      `scope=offline_access openid profile email accounting.transactions accounting.reports.read accounting.contacts.read accounting.settings.read`
  );
});

app.get("/auth/xero/callback", async (req: Request, res: Response) => {
  // TODO: Handle OAuth callback and store tokens
  res.send("Xero connected successfully! You can close this window.");
});

// ===========================================
// Simple Token Login (for Claude.ai Custom Connector)
// ===========================================

/**
 * Login page - generates a token URL for Claude.ai
 * Since Claude.ai custom connectors don't support OAuth redirects,
 * users login here and get a URL with their token to paste into Claude.ai
 */
app.get("/login", (req: Request, res: Response) => {
  const error = req.query.error as string | undefined;
  const tokenUrl = req.query.token_url as string | undefined;

  const loginHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Connect Pip to Claude</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #0a0e14;
      color: #e6e6e6;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1rem;
    }
    .container {
      background: #1a1f29;
      padding: 2rem;
      border-radius: 12px;
      max-width: 500px;
      width: 100%;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
    }
    h1 {
      color: #7eb88e;
      margin-bottom: 0.5rem;
      font-size: 1.5rem;
    }
    p {
      color: #999;
      margin-bottom: 1.5rem;
      font-size: 0.9rem;
    }
    .form-group {
      margin-bottom: 1rem;
    }
    label {
      display: block;
      margin-bottom: 0.5rem;
      color: #ccc;
      font-size: 0.85rem;
    }
    input {
      width: 100%;
      padding: 0.75rem;
      border: 1px solid #333;
      border-radius: 6px;
      background: #0f1419;
      color: #e6e6e6;
      font-size: 1rem;
    }
    input:focus {
      outline: none;
      border-color: #7eb88e;
    }
    button {
      width: 100%;
      padding: 0.75rem;
      background: #7eb88e;
      color: #0a0e14;
      border: none;
      border-radius: 6px;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      margin-top: 1rem;
    }
    button:hover {
      background: #6aa87e;
    }
    .error {
      color: #e57373;
      font-size: 0.85rem;
      margin-bottom: 1rem;
      padding: 0.75rem;
      background: rgba(229, 115, 115, 0.1);
      border-radius: 6px;
    }
    .success {
      margin-top: 1.5rem;
      padding: 1rem;
      background: rgba(126, 184, 142, 0.1);
      border: 1px solid #7eb88e;
      border-radius: 6px;
    }
    .success h3 {
      color: #7eb88e;
      margin-bottom: 0.5rem;
      font-size: 1rem;
    }
    .token-url {
      background: #0f1419;
      padding: 0.75rem;
      border-radius: 6px;
      font-family: monospace;
      font-size: 0.8rem;
      word-break: break-all;
      margin: 0.5rem 0;
      border: 1px solid #333;
    }
    .copy-btn {
      margin-top: 0.5rem;
      background: #333;
      color: #e6e6e6;
    }
    .copy-btn:hover {
      background: #444;
    }
    .instructions {
      color: #999;
      font-size: 0.8rem;
      margin-top: 0.75rem;
    }
    .instructions ol {
      margin-left: 1.25rem;
      margin-top: 0.5rem;
    }
    .instructions li {
      margin-bottom: 0.25rem;
    }
    .logo {
      text-align: center;
      margin-bottom: 1rem;
    }
    .logo span {
      font-size: 2rem;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo"><span>🤖</span></div>
    <h1>Connect Pip to Claude</h1>
    <p>Sign in to get your personal connection URL for Claude.ai.</p>

    ${error ? `<div class="error">${error === 'invalid_email' ? 'Please enter a valid email address.' : 'Login failed. Please try again.'}</div>` : ''}

    ${tokenUrl ? `
    <div class="success">
      <h3>✅ Your Connection URL</h3>
      <div class="token-url" id="tokenUrl">${tokenUrl}</div>
      <button class="copy-btn" onclick="copyUrl()">Copy URL</button>
      <div class="instructions">
        <strong>How to connect:</strong>
        <ol>
          <li>Copy the URL above</li>
          <li>In Claude.ai, go to Settings → Integrations</li>
          <li>Click "Add custom integration"</li>
          <li>Paste this URL and save</li>
        </ol>
      </div>
    </div>
    <script>
      function copyUrl() {
        navigator.clipboard.writeText(document.getElementById('tokenUrl').innerText);
        document.querySelector('.copy-btn').innerText = 'Copied!';
        setTimeout(() => document.querySelector('.copy-btn').innerText = 'Copy URL', 2000);
      }
    </script>
    ` : `
    <form method="POST" action="/login">
      <div class="form-group">
        <label for="email">Email</label>
        <input type="email" id="email" name="email" required placeholder="you@example.com">
      </div>
      <button type="submit">Get Connection URL</button>
    </form>
    `}
  </div>
</body>
</html>
  `;

  res.setHeader("Content-Type", "text/html");
  res.send(loginHtml);
});

/**
 * Login form submission - generates token and shows URL
 */
app.post("/login", express.urlencoded({ extended: true }), (req: Request, res: Response) => {
  const { email } = req.body;

  console.log("Login attempt:", { email });

  if (!email || !email.includes("@")) {
    res.redirect("/login?error=invalid_email");
    return;
  }

  // Generate JWT token for this user
  const token = jwt.sign(
    { userId: email, type: "access" },
    JWT_SECRET,
    { expiresIn: "30d" } // Long-lived token for MCP
  );

  // Generate the SSE URL with token
  const baseUrl = process.env.BASE_URL || "https://pip.arcforge.au";
  const tokenUrl = `${baseUrl}/sse?token=${token}`;

  console.log("Token generated for user:", email);

  res.redirect(`/login?token_url=${encodeURIComponent(tokenUrl)}`);
});

// ===========================================
// OAuth 2.0 for Claude.ai / ChatGPT Integration
// (Kept for future use when Claude.ai supports OAuth)
// ===========================================

// OAuth configuration
const OAUTH_CLIENT_ID = process.env.MCP_OAUTH_CLIENT_ID || "pip-mcp-client";
const OAUTH_CLIENT_SECRET = process.env.MCP_OAUTH_CLIENT_SECRET || "pip-mcp-secret-change-in-production";

// Store authorization codes temporarily (in production, use Redis or database)
const authorizationCodes = new Map<string, { userId: string; redirectUri: string; expiresAt: number }>();

/**
 * OAuth Authorization Endpoint
 * Claude.ai redirects users here to authenticate
 */
app.get("/oauth/authorize", (req: Request, res: Response) => {
  const { client_id, redirect_uri, response_type, state } = req.query;

  console.log("OAuth authorize request:", { client_id, redirect_uri, response_type, state });

  // Validate client_id
  if (client_id !== OAUTH_CLIENT_ID) {
    res.status(400).send("Invalid client_id");
    return;
  }

  // Validate response_type
  if (response_type !== "code") {
    res.status(400).send("Invalid response_type. Only 'code' is supported.");
    return;
  }

  // Show login page
  const loginHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Connect Pip to Claude</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #0a0e14;
      color: #e6e6e6;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .container {
      background: #1a1f29;
      padding: 2rem;
      border-radius: 12px;
      max-width: 400px;
      width: 90%;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
    }
    h1 {
      color: #7eb88e;
      margin-bottom: 0.5rem;
      font-size: 1.5rem;
    }
    p {
      color: #999;
      margin-bottom: 1.5rem;
      font-size: 0.9rem;
    }
    .form-group {
      margin-bottom: 1rem;
    }
    label {
      display: block;
      margin-bottom: 0.5rem;
      color: #ccc;
      font-size: 0.85rem;
    }
    input {
      width: 100%;
      padding: 0.75rem;
      border: 1px solid #333;
      border-radius: 6px;
      background: #0f1419;
      color: #e6e6e6;
      font-size: 1rem;
    }
    input:focus {
      outline: none;
      border-color: #7eb88e;
    }
    button {
      width: 100%;
      padding: 0.75rem;
      background: #7eb88e;
      color: #0a0e14;
      border: none;
      border-radius: 6px;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      margin-top: 1rem;
    }
    button:hover {
      background: #6aa87e;
    }
    .error {
      color: #e57373;
      font-size: 0.85rem;
      margin-top: 0.5rem;
      display: none;
    }
    .logo {
      text-align: center;
      margin-bottom: 1rem;
    }
    .logo span {
      font-size: 2rem;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo"><span>🤖</span></div>
    <h1>Connect Pip to Claude</h1>
    <p>Sign in with your Pip account to give Claude access to your Xero data.</p>
    <form id="loginForm" method="POST" action="/oauth/authorize/submit">
      <input type="hidden" name="redirect_uri" value="${redirect_uri || ""}">
      <input type="hidden" name="state" value="${state || ""}">
      <div class="form-group">
        <label for="email">Email</label>
        <input type="email" id="email" name="email" required placeholder="you@example.com">
      </div>
      <div class="form-group">
        <label for="password">Password</label>
        <input type="password" id="password" name="password" required placeholder="Your password">
      </div>
      <div class="error" id="error"></div>
      <button type="submit">Connect to Claude</button>
    </form>
  </div>
</body>
</html>
  `;

  res.setHeader("Content-Type", "text/html");
  res.send(loginHtml);
});

/**
 * OAuth Authorization Submit
 * Handles login form submission
 */
app.post("/oauth/authorize/submit", express.urlencoded({ extended: true }), async (req: Request, res: Response) => {
  const { email, password, redirect_uri, state } = req.body;

  console.log("OAuth login attempt:", { email, redirect_uri });

  // Validate credentials against main database
  // For now, we'll use a simple check - in production this should validate against the users table
  try {
    const { getDb } = await import("./services/xero.js");
    const db = await getDb();

    // Check if user exists and has Xero connected
    // We need to implement user lookup - for now, create a simple flow
    // that generates a token for any valid-looking email

    // In a real implementation, you'd validate against the users table
    // For MVP, we'll accept any email and create a session

    if (!email || !email.includes("@")) {
      res.redirect(`/oauth/authorize?error=invalid_email&redirect_uri=${encodeURIComponent(redirect_uri)}&state=${state}`);
      return;
    }

    // Generate authorization code
    const code = crypto.randomUUID();
    const userId = email; // Use email as userId for now

    authorizationCodes.set(code, {
      userId,
      redirectUri: redirect_uri,
      expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes
    });

    // Redirect back to Claude.ai with the code
    const redirectUrl = new URL(redirect_uri);
    redirectUrl.searchParams.set("code", code);
    if (state) {
      redirectUrl.searchParams.set("state", state);
    }

    console.log("OAuth code generated, redirecting to:", redirectUrl.toString());
    res.redirect(redirectUrl.toString());
  } catch (error) {
    console.error("OAuth login error:", error);
    res.redirect(`/oauth/authorize?error=server_error&redirect_uri=${encodeURIComponent(redirect_uri)}&state=${state}`);
  }
});

/**
 * OAuth Token Endpoint
 * Claude.ai exchanges authorization code for access token
 */
app.post("/oauth/token", express.urlencoded({ extended: true }), (req: Request, res: Response) => {
  const { grant_type, code, redirect_uri, client_id, client_secret } = req.body;

  console.log("OAuth token request:", { grant_type, code, client_id });

  // Validate grant_type
  if (grant_type !== "authorization_code") {
    res.status(400).json({ error: "unsupported_grant_type" });
    return;
  }

  // Validate client credentials
  if (client_id !== OAUTH_CLIENT_ID || client_secret !== OAUTH_CLIENT_SECRET) {
    res.status(401).json({ error: "invalid_client" });
    return;
  }

  // Validate authorization code
  const authCode = authorizationCodes.get(code);
  if (!authCode) {
    res.status(400).json({ error: "invalid_grant", error_description: "Authorization code not found" });
    return;
  }

  if (authCode.expiresAt < Date.now()) {
    authorizationCodes.delete(code);
    res.status(400).json({ error: "invalid_grant", error_description: "Authorization code expired" });
    return;
  }

  // Validate redirect_uri matches
  if (authCode.redirectUri !== redirect_uri) {
    res.status(400).json({ error: "invalid_grant", error_description: "Redirect URI mismatch" });
    return;
  }

  // Delete the used code
  authorizationCodes.delete(code);

  // Generate access token (JWT)
  const accessToken = jwt.sign(
    { userId: authCode.userId, type: "access" },
    JWT_SECRET,
    { expiresIn: "7d" } // Long-lived token for MCP
  );

  // Return token response
  res.json({
    access_token: accessToken,
    token_type: "Bearer",
    expires_in: 7 * 24 * 60 * 60, // 7 days in seconds
  });

  console.log("OAuth token issued for user:", authCode.userId);
});

// Error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error("Server error:", err);
  res.status(500).json({ error: "Internal server error" });
});

// Start server
const PORT = parseInt(process.env.MCP_PORT || "3001", 10);

app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║                    Pip MCP Server                          ║
║                                                            ║
║  Remote MCP server for Claude.ai and ChatGPT integration   ║
╠════════════════════════════════════════════════════════════╣
║  Endpoints:                                                ║
║    SSE:       http://localhost:${PORT}/sse                      ║
║    Messages:  http://localhost:${PORT}/messages                 ║
║    Health:    http://localhost:${PORT}/health                   ║
╠════════════════════════════════════════════════════════════╣
║  OAuth 2.0 Endpoints:                                      ║
║    Authorize: http://localhost:${PORT}/oauth/authorize          ║
║    Token:     http://localhost:${PORT}/oauth/token              ║
╠════════════════════════════════════════════════════════════╣
║  OAuth Config:                                             ║
║    Client ID:     ${OAUTH_CLIENT_ID.padEnd(36)}    ║
║    Client Secret: ${OAUTH_CLIENT_SECRET.substring(0, 20).padEnd(36)}... ║
╠════════════════════════════════════════════════════════════╣
║  Connect from Claude.ai:                                   ║
║    Settings → Connectors → Add Custom Connector            ║
║    URL:           https://your-domain.com/sse              ║
║    Client ID:     ${OAUTH_CLIENT_ID.padEnd(36)}    ║
║    Client Secret: [use MCP_OAUTH_CLIENT_SECRET env var]    ║
╚════════════════════════════════════════════════════════════╝
  `);
});

// Export for testing
export { app, sessions };
