/**
 * Response filtering utilities for token optimization
 *
 * Extracts only essential fields from Xero API responses to reduce context window usage.
 * Implements 85% token reduction pattern from MCP optimization guidelines.
 */

import { Invoice, BankTransaction } from 'xero-node';

/**
 * Filter invoice to summary format with essential fields only
 *
 * Token reduction: ~85% (full invoice ~2000 tokens → summary ~300 tokens)
 */
export interface InvoiceSummary {
  invoiceID?: string;
  invoiceNumber?: string;
  contact?: string;
  total?: number;
  amountDue?: number;
  amountPaid?: number;
  status?: Invoice.StatusEnum | string;
  date?: string;
  dueDate?: string;
}

export function filterInvoiceSummary(invoice: Invoice): InvoiceSummary {
  return {
    invoiceID: invoice.invoiceID,
    invoiceNumber: invoice.invoiceNumber,
    contact: invoice.contact?.name,
    total: invoice.total,
    amountDue: invoice.amountDue,
    amountPaid: invoice.amountPaid,
    status: invoice.status,
    date: invoice.date,
    dueDate: invoice.dueDate
    // Excluded: lineItems details, contact full object, payments array,
    // tracking categories, attachments, currencyCode, etc.
  };
}

/**
 * Filter invoice with line items for detail view
 *
 * Token reduction: ~70% (includes line item summaries)
 */
export interface InvoiceDetail extends InvoiceSummary {
  lineItems?: Array<{
    description?: string;
    quantity?: number;
    unitAmount?: number;
    lineAmount?: number;
    taxType?: string;
  }>;
}

export function filterInvoiceDetail(invoice: Invoice): InvoiceDetail {
  return {
    ...filterInvoiceSummary(invoice),
    lineItems: invoice.lineItems?.map((item) => ({
      description: item.description,
      quantity: item.quantity,
      unitAmount: item.unitAmount,
      lineAmount: item.lineAmount,
      taxType: item.taxType
      // Excluded: accountCode, taxAmount, tracking, itemCode, etc.
    }))
  };
}

/**
 * Filter bank transaction to summary format
 *
 * Token reduction: ~80%
 */
export interface BankTransactionSummary {
  bankTransactionID?: string;
  date?: string;
  type?: BankTransaction.TypeEnum | string;
  reference?: string;
  total?: number;
  status?: BankTransaction.StatusEnum | string;
  contact?: string;
  isReconciled?: boolean;
}

export function filterBankTransactionSummary(transaction: BankTransaction): BankTransactionSummary {
  return {
    bankTransactionID: transaction.bankTransactionID,
    date: transaction.date,
    type: transaction.type,
    reference: transaction.reference,
    total: transaction.total,
    status: transaction.status,
    contact: transaction.contact?.name,
    isReconciled: transaction.isReconciled
    // Excluded: lineItems, bankAccount details, attachments, etc.
  };
}

/**
 * Filter expense to summary format
 *
 * Token reduction: ~80%
 */
export interface ExpenseSummary {
  expenseID?: string;
  date?: string;
  contact?: string;
  total?: number;
  status?: string;
  category?: string;
}

export function filterExpenseSummary(expense: any): ExpenseSummary {
  return {
    expenseID: expense.expenseID,
    date: expense.date,
    contact: expense.contact?.name,
    total: expense.total,
    status: expense.status,
    category: expense.accountCode
    // Excluded: lineItems, attachments, tracking, etc.
  };
}

/**
 * Filter report section to key metrics only
 *
 * Token reduction: ~90% (for large reports)
 */
export interface ReportMetric {
  title: string;
  value?: string | number;
  type?: 'header' | 'summary' | 'detail';
}

export interface ReportSummary {
  reportName?: string;
  reportDate?: string;
  reportTitles?: string[];
  updatedDateUTC?: string;
  keyMetrics: ReportMetric[];
  rowCount?: number;
}

export function filterReportSummary(report: any): ReportSummary {
  // Extract only summary rows and key metrics
  const keyMetrics: ReportMetric[] = [];

  report.rows?.forEach((row: any) => {
    if (row.rowType === 'Header' || row.rowType === 'SummaryRow') {
      // Only include headers and summaries, skip detailed rows
      keyMetrics.push({
        title: row.title || 'Untitled',
        value: row.cells?.[0]?.value,
        type: row.rowType === 'Header' ? 'header' : 'summary'
      });
    }
  });

  return {
    reportName: report.reportName,
    reportDate: report.reportDate,
    reportTitles: report.reportTitles,
    updatedDateUTC: report.updatedDateUTC,
    keyMetrics,
    rowCount: report.rows?.length || 0
    // Excluded: Full nested row structure with all detail rows
  };
}

/**
 * Estimate token count for a string (rough approximation)
 *
 * Token estimation: ~1 token per 4 characters
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Log token usage metrics for monitoring
 */
export function logTokenMetrics(toolName: string, response: string): void {
  const tokens = estimateTokens(response);

  // Log to console for CloudWatch
  console.log(JSON.stringify({
    type: 'token_metrics',
    toolName,
    tokens,
    responseLength: response.length,
    timestamp: new Date().toISOString()
  }));
}
