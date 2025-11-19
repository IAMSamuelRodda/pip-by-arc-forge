/**
 * MCP Xero Server - Model Context Protocol server for Xero API
 *
 * Provides standardized tools for Xero accounting operations:
 * - Invoice management (create, read, update, list, send)
 * - Bank transaction reconciliation
 * - Financial reporting (P&L, balance sheet, bank summary)
 * - Expense tracking and categorization
 *
 * This server handles:
 * - Xero OAuth token management (via AWS Secrets Manager)
 * - API request/response transformation
 * - Error handling and retry logic
 * - Response caching (via DynamoDB)
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';

// Tool definitions
import { invoiceTools } from './tools/invoices.js';
import { bankTransactionTools } from './tools/bank-transactions.js';
import { reportingTools } from './tools/reporting.js';
import { expenseTools } from './tools/expenses.js';

// Create MCP server
const server = new Server(
  {
    name: '@zero-agent/mcp-xero-server',
    version: '0.1.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Combine all tools
const allTools: Tool[] = [
  ...invoiceTools,
  ...bankTransactionTools,
  ...reportingTools,
  ...expenseTools,
];

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: allTools,
  };
});

// Handle tool execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    // Route to appropriate tool handler
    switch (name) {
      // Invoice tools
      case 'create_invoice':
        const { createInvoice } = await import('./handlers/invoices.js');
        return await createInvoice(args);

      case 'get_invoice':
        const { getInvoice } = await import('./handlers/invoices.js');
        return await getInvoice(args);

      case 'update_invoice':
        const { updateInvoice } = await import('./handlers/invoices.js');
        return await updateInvoice(args);

      case 'list_invoices':
        const { listInvoices } = await import('./handlers/invoices.js');
        return await listInvoices(args);

      case 'send_invoice':
        const { sendInvoice } = await import('./handlers/invoices.js');
        return await sendInvoice(args);

      // Bank transaction tools
      case 'get_bank_transactions':
        const { getBankTransactions } = await import('./handlers/bank-transactions.js');
        return await getBankTransactions(args);

      case 'create_bank_transaction':
        const { createBankTransaction } = await import('./handlers/bank-transactions.js');
        return await createBankTransaction(args);

      case 'reconcile_transaction':
        const { reconcileTransaction } = await import('./handlers/bank-transactions.js');
        return await reconcileTransaction(args);

      // Reporting tools
      case 'generate_profit_loss':
        const { generateProfitLoss } = await import('./handlers/reporting.js');
        return await generateProfitLoss(args);

      case 'generate_balance_sheet':
        const { generateBalanceSheet } = await import('./handlers/reporting.js');
        return await generateBalanceSheet(args);

      case 'generate_bank_summary':
        const { generateBankSummary } = await import('./handlers/reporting.js');
        return await generateBankSummary(args);

      // Expense tools
      case 'create_expense':
        const { createExpense } = await import('./handlers/expenses.js');
        return await createExpense(args);

      case 'categorize_expense':
        const { categorizeExpense } = await import('./handlers/expenses.js');
        return await categorizeExpense(args);

      case 'list_expenses':
        const { listExpenses } = await import('./handlers/expenses.js');
        return await listExpenses(args);

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [
        {
          type: 'text',
          text: `Error executing tool ${name}: ${errorMessage}`,
        },
      ],
      isError: true,
    };
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('MCP Xero Server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
