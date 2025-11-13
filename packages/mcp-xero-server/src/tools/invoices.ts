/**
 * Invoice management tools for MCP server
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js';

export const invoiceTools: Tool[] = [
  {
    name: 'create_invoice',
    description: 'Create a new invoice in Xero',
    inputSchema: {
      type: 'object',
      properties: {
        contactName: {
          type: 'string',
          description: 'Name of the contact/customer',
          minLength: 1,
          maxLength: 255,
        },
        contactEmail: {
          type: 'string',
          description: 'Email address of the contact',
          format: 'email',
          pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$',
        },
        invoiceNumber: {
          type: 'string',
          description: 'Invoice number (optional, auto-generated if not provided)',
          maxLength: 50,
        },
        date: {
          type: 'string',
          description: 'Invoice date (YYYY-MM-DD)',
          pattern: '^\\d{4}-\\d{2}-\\d{2}$',
        },
        dueDate: {
          type: 'string',
          description: 'Due date (YYYY-MM-DD)',
          pattern: '^\\d{4}-\\d{2}-\\d{2}$',
        },
        lineItems: {
          type: 'array',
          description: 'Array of line items (1-100 items)',
          minItems: 1,
          maxItems: 100,
          items: {
            type: 'object',
            properties: {
              description: {
                type: 'string',
                minLength: 1,
                maxLength: 4000,
              },
              quantity: {
                type: 'number',
                minimum: 0.0001,
                maximum: 999999,
              },
              unitAmount: {
                type: 'number',
                minimum: 0.01,
                maximum: 999999999,
              },
              accountCode: {
                type: 'string',
                pattern: '^[0-9]{1,10}$',
              },
              taxType: {
                type: 'string',
                maxLength: 50,
              },
            },
            required: ['description', 'quantity', 'unitAmount'],
          },
        },
      },
      required: ['contactName', 'date', 'lineItems'],
    },
  },
  {
    name: 'get_invoice',
    description: 'Get details of a specific invoice by ID',
    inputSchema: {
      type: 'object',
      properties: {
        invoiceId: {
          type: 'string',
          description: 'Xero invoice ID',
        },
      },
      required: ['invoiceId'],
    },
  },
  {
    name: 'update_invoice',
    description: 'Update an existing invoice',
    inputSchema: {
      type: 'object',
      properties: {
        invoiceId: {
          type: 'string',
          description: 'Xero invoice ID',
        },
        data: {
          type: 'object',
          description: 'Fields to update (same structure as create_invoice)',
        },
      },
      required: ['invoiceId', 'data'],
    },
  },
  {
    name: 'list_invoices',
    description: 'List invoices with optional filters and cursor-based pagination',
    inputSchema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['DRAFT', 'SUBMITTED', 'AUTHORISED', 'PAID', 'VOIDED'],
          description: 'Filter by invoice status',
        },
        contactName: {
          type: 'string',
          description: 'Filter by contact name',
        },
        fromDate: {
          type: 'string',
          description: 'Start date filter (YYYY-MM-DD)',
          pattern: '^\\d{4}-\\d{2}-\\d{2}$',
        },
        toDate: {
          type: 'string',
          description: 'End date filter (YYYY-MM-DD)',
          pattern: '^\\d{4}-\\d{2}-\\d{2}$',
        },
        cursor: {
          type: 'string',
          description: 'Opaque pagination cursor from previous response. Omit for first page.',
        },
      },
    },
  },
  {
    name: 'send_invoice',
    description: 'Send an invoice to the customer via email',
    inputSchema: {
      type: 'object',
      properties: {
        invoiceId: {
          type: 'string',
          description: 'Xero invoice ID',
        },
      },
      required: ['invoiceId'],
    },
  },
];
