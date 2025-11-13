/**
 * Financial reporting tools for MCP server
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js';

export const reportingTools: Tool[] = [
  {
    name: 'generate_profit_loss',
    description: 'Generate a profit and loss report. Returns summary by default. Set fullReport=true for complete data via ResourceLink.',
    inputSchema: {
      type: 'object',
      properties: {
        fromDate: {
          type: 'string',
          description: 'Start date (YYYY-MM-DD)',
          pattern: '^\\d{4}-\\d{2}-\\d{2}$',
        },
        toDate: {
          type: 'string',
          description: 'End date (YYYY-MM-DD)',
          pattern: '^\\d{4}-\\d{2}-\\d{2}$',
        },
        periods: {
          type: 'number',
          description: 'Number of periods to include',
          minimum: 1,
          maximum: 12,
          default: 1,
        },
        timeframe: {
          type: 'string',
          enum: ['MONTH', 'QUARTER', 'YEAR'],
          description: 'Time period grouping',
          default: 'MONTH',
        },
        fullReport: {
          type: 'boolean',
          description: 'If true, returns preview + ResourceLink for complete data (out-of-band retrieval). If false (default), returns summary only.',
          default: false,
        },
      },
      required: ['fromDate', 'toDate'],
    },
  },
  {
    name: 'generate_balance_sheet',
    description: 'Generate a balance sheet report',
    inputSchema: {
      type: 'object',
      properties: {
        date: {
          type: 'string',
          description: 'Date for balance sheet (ISO format)',
        },
        periods: {
          type: 'number',
          description: 'Number of periods for comparison',
          default: 1,
        },
      },
      required: ['date'],
    },
  },
  {
    name: 'generate_bank_summary',
    description: 'Generate a bank account summary report',
    inputSchema: {
      type: 'object',
      properties: {
        accountId: {
          type: 'string',
          description: 'Bank account ID',
        },
        fromDate: {
          type: 'string',
          description: 'Start date (ISO format)',
        },
        toDate: {
          type: 'string',
          description: 'End date (ISO format)',
        },
      },
      required: ['accountId', 'fromDate', 'toDate'],
    },
  },
];
