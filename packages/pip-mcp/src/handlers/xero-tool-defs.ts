/**
 * Xero Tool Definitions
 *
 * Provider-aware tool definitions for Xero accounting integration.
 * Handlers are in xero-tools.ts
 */

import type { ProviderToolDefinition } from "../types/tools.js";

/**
 * Xero tool definitions with provider namespacing
 */
export const xeroToolDefinitions: ProviderToolDefinition[] = [
  // ==========================================================================
  // Invoices Category
  // ==========================================================================
  {
    provider: "xero",
    providerType: "accounting",
    category: "invoices",
    name: "xero:get_invoices",
    shortName: "get_invoices",
    description: "Get invoices from Xero. Use status 'AUTHORISED' for unpaid, 'PAID' for paid.",
    inputSchema: {
      type: "object",
      properties: {
        status: {
          type: "string",
          enum: ["DRAFT", "AUTHORISED", "PAID", "VOIDED"],
          description: "Filter by status. AUTHORISED = unpaid, PAID = paid",
        },
        limit: {
          type: "number",
          description: "Max invoices to return (default: 10)",
        },
      },
    },
  },
  {
    provider: "xero",
    providerType: "accounting",
    category: "invoices",
    name: "xero:get_aged_receivables",
    shortName: "get_aged_receivables",
    description: "Get aged receivables - who owes you money and how overdue",
    inputSchema: {
      type: "object",
      properties: {
        date: {
          type: "string",
          description: "Date for aging (YYYY-MM-DD), defaults to today",
        },
      },
    },
  },
  {
    provider: "xero",
    providerType: "accounting",
    category: "invoices",
    name: "xero:get_aged_payables",
    shortName: "get_aged_payables",
    description: "Get aged payables - who you owe money to and how overdue",
    inputSchema: {
      type: "object",
      properties: {
        date: {
          type: "string",
          description: "Date for aging (YYYY-MM-DD), defaults to today",
        },
      },
    },
  },

  // ==========================================================================
  // Reports Category
  // ==========================================================================
  {
    provider: "xero",
    providerType: "accounting",
    category: "reports",
    name: "xero:get_profit_and_loss",
    shortName: "get_profit_and_loss",
    description: "Get profit & loss report for a date range",
    inputSchema: {
      type: "object",
      properties: {
        fromDate: {
          type: "string",
          description: "Start date (YYYY-MM-DD)",
        },
        toDate: {
          type: "string",
          description: "End date (YYYY-MM-DD)",
        },
      },
    },
  },
  {
    provider: "xero",
    providerType: "accounting",
    category: "reports",
    name: "xero:get_balance_sheet",
    shortName: "get_balance_sheet",
    description: "Get balance sheet as of a specific date",
    inputSchema: {
      type: "object",
      properties: {
        date: {
          type: "string",
          description: "Date (YYYY-MM-DD), defaults to today",
        },
      },
    },
  },

  // ==========================================================================
  // Banking Category
  // ==========================================================================
  {
    provider: "xero",
    providerType: "accounting",
    category: "banking",
    name: "xero:get_bank_accounts",
    shortName: "get_bank_accounts",
    description: "Get bank accounts and their current balances",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    provider: "xero",
    providerType: "accounting",
    category: "banking",
    name: "xero:get_bank_transactions",
    shortName: "get_bank_transactions",
    description: "Get recent bank transactions",
    inputSchema: {
      type: "object",
      properties: {
        limit: {
          type: "number",
          description: "Max transactions to return (default: 10)",
        },
      },
    },
  },

  // ==========================================================================
  // Contacts Category
  // ==========================================================================
  {
    provider: "xero",
    providerType: "accounting",
    category: "contacts",
    name: "xero:get_contacts",
    shortName: "get_contacts",
    description: "Get customers and suppliers",
    inputSchema: {
      type: "object",
      properties: {
        limit: {
          type: "number",
          description: "Max contacts to return (default: 10)",
        },
      },
    },
  },
  {
    provider: "xero",
    providerType: "accounting",
    category: "contacts",
    name: "xero:search_contacts",
    shortName: "search_contacts",
    description: "Search for a customer or supplier by name",
    inputSchema: {
      type: "object",
      properties: {
        searchTerm: {
          type: "string",
          description: "Name to search for",
        },
      },
      required: ["searchTerm"],
    },
  },

  // ==========================================================================
  // Organisation Category
  // ==========================================================================
  {
    provider: "xero",
    providerType: "accounting",
    category: "organisation",
    name: "xero:get_organisation",
    shortName: "get_organisation",
    description: "Get company details from Xero",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },

  // ==========================================================================
  // Accounts Category
  // ==========================================================================
  {
    provider: "xero",
    providerType: "accounting",
    category: "accounts",
    name: "xero:list_accounts",
    shortName: "list_accounts",
    description:
      "Get chart of accounts. Optionally filter by account type (BANK, CURRENT, EXPENSE, REVENUE, etc.)",
    inputSchema: {
      type: "object",
      properties: {
        accountType: {
          type: "string",
          description:
            "Optional: Filter by account type (BANK, CURRENT, CURRLIAB, FIXED, LIABILITY, EQUITY, DEPRECIATN, DIRECTCOSTS, EXPENSE, REVENUE, SALES, OTHERINCOME, OVERHEADS)",
        },
      },
    },
  },
];

/**
 * Map short name to handler function name
 * Used by the execution layer to route to correct handler
 */
export const xeroToolHandlerMap: Record<string, string> = {
  get_invoices: "getInvoices",
  get_aged_receivables: "getAgedReceivables",
  get_aged_payables: "getAgedPayables",
  get_profit_and_loss: "getProfitAndLoss",
  get_balance_sheet: "getBalanceSheet",
  get_bank_accounts: "getBankAccounts",
  get_bank_transactions: "getBankTransactions",
  get_contacts: "getContacts",
  search_contacts: "searchContacts",
  get_organisation: "getOrganisation",
  list_accounts: "listAccounts",
};
