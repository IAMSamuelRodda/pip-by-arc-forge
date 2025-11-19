/**
 * Xero Tools for Agent
 *
 * Tool definitions that the LLM can call to interact with Xero API
 */

import type { XeroClient } from "../xero/client.js";

export interface Tool {
  name: string;
  description: string;
  parameters: {
    type: "object";
    properties: Record<string, any>;
    required?: string[];
  };
  execute: (params: any, userId: string) => Promise<any>;
}

export function createXeroTools(xeroClient: XeroClient): Tool[] {
  return [
    {
      name: "get_invoices",
      description:
        "Get invoices from Xero. Can filter by status (DRAFT, AUTHORISED, PAID, VOIDED). Use this when user asks about invoices, bills, or outstanding payments.",
      parameters: {
        type: "object",
        properties: {
          status: {
            type: "string",
            enum: ["DRAFT", "SUBMITTED", "AUTHORISED", "PAID", "VOIDED"],
            description: "Filter by invoice status",
          },
          limit: {
            type: "number",
            description: "Maximum number of invoices to return (default: 10)",
          },
        },
      },
      execute: async (params, userId) => {
        const invoices = await xeroClient.getInvoices(userId, {
          status: params.status,
        });

        // Limit results
        const limited = invoices.slice(0, params.limit || 10);

        // Simplify response for LLM
        return limited.map((inv: any) => ({
          invoiceNumber: inv.InvoiceNumber,
          contact: inv.Contact?.Name,
          date: inv.Date,
          dueDate: inv.DueDate,
          status: inv.Status,
          total: inv.Total,
          amountDue: inv.AmountDue,
          currencyCode: inv.CurrencyCode,
        }));
      },
    },
    {
      name: "get_invoice",
      description: "Get details of a specific invoice by its ID or invoice number",
      parameters: {
        type: "object",
        properties: {
          invoiceId: {
            type: "string",
            description: "The Xero invoice ID (GUID format)",
          },
        },
        required: ["invoiceId"],
      },
      execute: async (params, userId) => {
        const invoice = await xeroClient.getInvoice(userId, params.invoiceId);

        return {
          invoiceNumber: invoice.InvoiceNumber,
          contact: invoice.Contact?.Name,
          date: invoice.Date,
          dueDate: invoice.DueDate,
          status: invoice.Status,
          lineItems: invoice.LineItems?.map((item: any) => ({
            description: item.Description,
            quantity: item.Quantity,
            unitAmount: item.UnitAmount,
            lineAmount: item.LineAmount,
            accountCode: item.AccountCode,
          })),
          subtotal: invoice.SubTotal,
          totalTax: invoice.TotalTax,
          total: invoice.Total,
          amountDue: invoice.AmountDue,
          currencyCode: invoice.CurrencyCode,
        };
      },
    },
    {
      name: "get_contacts",
      description:
        "Get contacts (customers/suppliers) from Xero. Use when user asks about customers, clients, or suppliers.",
      parameters: {
        type: "object",
        properties: {
          limit: {
            type: "number",
            description: "Maximum number of contacts to return (default: 10)",
          },
        },
      },
      execute: async (params, userId) => {
        const contacts = await xeroClient.getContacts(userId);

        const limited = contacts.slice(0, params.limit || 10);

        return limited.map((contact: any) => ({
          name: contact.Name,
          contactId: contact.ContactID,
          emailAddress: contact.EmailAddress,
          phoneNumbers: contact.Phones?.map((p: any) => ({
            type: p.PhoneType,
            number: p.PhoneNumber,
          })),
          isCustomer: contact.IsCustomer,
          isSupplier: contact.IsSupplier,
        }));
      },
    },
    {
      name: "get_organisation",
      description:
        "Get organization details from Xero (company name, address, tax number, etc.)",
      parameters: {
        type: "object",
        properties: {},
      },
      execute: async (params, userId) => {
        const org = await xeroClient.getOrganisation(userId);

        return {
          name: org.Name,
          legalName: org.LegalName,
          organisationStatus: org.OrganisationStatus,
          baseCurrency: org.BaseCurrency,
          countryCode: org.CountryCode,
          taxNumber: org.TaxNumber,
          financialYearEndDay: org.FinancialYearEndDay,
          financialYearEndMonth: org.FinancialYearEndMonth,
        };
      },
    },
    {
      name: "get_profit_and_loss",
      description:
        "Get profit & loss report from Xero for a date range. Use when user asks about revenue, expenses, or profit.",
      parameters: {
        type: "object",
        properties: {
          fromDate: {
            type: "string",
            description: "Start date in YYYY-MM-DD format",
          },
          toDate: {
            type: "string",
            description: "End date in YYYY-MM-DD format",
          },
        },
      },
      execute: async (params, userId) => {
        const report = await xeroClient.getProfitAndLoss(userId, {
          fromDate: params.fromDate,
          toDate: params.toDate,
        });

        // Simplify the complex report structure
        return {
          reportName: report.ReportName,
          reportDate: report.ReportDate,
          updatedDateUTC: report.UpdatedDateUTC,
          summary: {
            // Extract key figures from report rows
            // This is simplified - real implementation would parse Rows array
            message: "P&L report retrieved. Parse report.Rows for detailed breakdown.",
          },
        };
      },
    },
    {
      name: "get_balance_sheet",
      description:
        "Get balance sheet report from Xero as of a specific date. Shows assets, liabilities, and equity.",
      parameters: {
        type: "object",
        properties: {
          date: {
            type: "string",
            description: "Date in YYYY-MM-DD format (defaults to today)",
          },
        },
      },
      execute: async (params, userId) => {
        const report = await xeroClient.getBalanceSheet(
          userId,
          params.date
        );

        return {
          reportName: report.ReportName,
          reportDate: report.ReportDate,
          updatedDateUTC: report.UpdatedDateUTC,
          summary: {
            message: "Balance sheet retrieved. Parse report.Rows for detailed breakdown.",
          },
        };
      },
    },
  ];
}
