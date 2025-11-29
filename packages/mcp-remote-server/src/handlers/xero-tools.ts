/**
 * Xero Tool Handlers for MCP Remote Server
 *
 * Implements actual Xero API calls for each MCP tool.
 */

import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { getXeroClient } from "../services/xero.js";

type ToolResult = CallToolResult;

/**
 * Helper to format currency amounts
 */
function formatCurrency(amount: number | undefined): string {
  if (amount === undefined || amount === null) return "$0.00";
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
  }).format(amount);
}

/**
 * Helper to create error response
 */
function errorResult(message: string): ToolResult {
  return {
    content: [{ type: "text", text: message }],
    isError: true,
  };
}

/**
 * Helper to create success response
 */
function successResult(text: string): ToolResult {
  return {
    content: [{ type: "text", text }],
  };
}

/**
 * Get invoices from Xero
 */
export async function getInvoices(
  userId: string,
  args: { status?: string; limit?: number }
): Promise<ToolResult> {
  const xero = await getXeroClient(userId);
  if (!xero) {
    return errorResult(
      "Xero not connected. Please connect your Xero account first."
    );
  }

  try {
    const { client, tenantId } = xero;
    const limit = args.limit || 10;

    // Use statuses array parameter for reliability (where clause can be unreliable)
    const statusFilter = args.status ? [args.status.toUpperCase()] : undefined;

    const response = await client.accountingApi.getInvoices(
      tenantId,
      undefined, // modifiedAfter
      undefined, // where - don't use, unreliable with Xero API
      undefined, // order
      undefined, // ids
      undefined, // invoiceNumbers
      undefined, // contactIDs
      statusFilter // statuses array - more reliable
    );

    // Apply fallback filter in code for safety
    let invoices = response.body.invoices || [];
    if (args.status) {
      const targetStatus = args.status.toUpperCase();
      invoices = invoices.filter(inv => String(inv.status || "").toUpperCase() === targetStatus);
    }

    // Apply limit after filtering
    invoices = invoices.slice(0, limit);

    if (invoices.length === 0) {
      return successResult(
        args.status
          ? `No ${args.status.toLowerCase()} invoices found.`
          : "No invoices found."
      );
    }

    const now = new Date();
    const summary = invoices
      .map((inv) => {
        const dueDate = inv.dueDate ? new Date(inv.dueDate) : null;
        const statusStr = String(inv.status || "");
        const isOverdue = dueDate && dueDate < now && statusStr === "AUTHORISED";
        const daysOverdue = isOverdue
          ? Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))
          : 0;

        let line = `• ${inv.invoiceNumber}: ${inv.contact?.name} - ${formatCurrency(inv.total)}`;
        if (statusStr === "AUTHORISED") {
          line += ` (unpaid, due: ${dueDate?.toLocaleDateString("en-AU") || "N/A"})`;
          if (isOverdue) {
            line += ` ⚠️ OVERDUE by ${daysOverdue} days`;
          }
        } else {
          line += ` (${statusStr.toLowerCase()})`;
        }
        return line;
      })
      .join("\n");

    const total = invoices.reduce((sum, inv) => sum + (inv.total || 0), 0);

    return successResult(
      `Found ${invoices.length} invoice(s):\n\n${summary}\n\nTotal: ${formatCurrency(total)}`
    );
  } catch (error: any) {
    console.error("Error fetching invoices:", error);
    const message = error?.response?.body?.Message || error?.message || "Unknown error";
    return errorResult(`Failed to fetch invoices: ${message}`);
  }
}

/**
 * Get profit and loss report
 */
export async function getProfitAndLoss(
  userId: string,
  args: { fromDate?: string; toDate?: string }
): Promise<ToolResult> {
  const xero = await getXeroClient(userId);
  if (!xero) {
    return errorResult(
      "Xero not connected. Please connect your Xero account first."
    );
  }

  try {
    const { client, tenantId } = xero;

    // Default to current financial year
    const now = new Date();
    const fyStart = now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1;
    const fromDate = args.fromDate || `${fyStart}-07-01`;
    const toDate = args.toDate || now.toISOString().split("T")[0];

    const response = await client.accountingApi.getReportProfitAndLoss(
      tenantId,
      fromDate,
      toDate
    );

    const report = response.body.reports?.[0];
    if (!report) {
      return successResult("No profit and loss data available for this period.");
    }

    // Parse report rows
    const rows = report.rows || [];
    let income = 0;
    let expenses = 0;

    for (const section of rows) {
      const rowTypeStr = String(section.rowType || "");
      if (rowTypeStr === "Section") {
        const title = section.title?.toLowerCase() || "";
        const sectionRows = section.rows || [];

        for (const row of sectionRows) {
          const innerRowType = String(row.rowType || "");
          if (innerRowType === "SummaryRow" && row.cells) {
            const value = parseFloat(String(row.cells[1]?.value || "0"));
            if (title.includes("income") || title.includes("revenue")) {
              income = value;
            } else if (title.includes("expense") || title.includes("cost")) {
              expenses = Math.abs(value);
            }
          }
        }
      }
    }

    const netProfit = income - expenses;
    const margin = income > 0 ? ((netProfit / income) * 100).toFixed(1) : "0";

    return successResult(
      `📊 Profit & Loss Report (${fromDate} to ${toDate})\n\n` +
        `Revenue: ${formatCurrency(income)}\n` +
        `Expenses: ${formatCurrency(expenses)}\n` +
        `Net Profit: ${formatCurrency(netProfit)}\n` +
        `Profit Margin: ${margin}%`
    );
  } catch (error: any) {
    console.error("Error fetching P&L:", error);
    const message = error?.response?.body?.Message || error?.message || "Unknown error";
    return errorResult(`Failed to fetch profit and loss: ${message}`);
  }
}

/**
 * Get balance sheet
 */
export async function getBalanceSheet(
  userId: string,
  args: { date?: string }
): Promise<ToolResult> {
  const xero = await getXeroClient(userId);
  if (!xero) {
    return errorResult(
      "Xero not connected. Please connect your Xero account first."
    );
  }

  try {
    const { client, tenantId } = xero;
    const date = args.date || new Date().toISOString().split("T")[0];

    const response = await client.accountingApi.getReportBalanceSheet(
      tenantId,
      date
    );

    const report = response.body.reports?.[0];
    if (!report) {
      return successResult("No balance sheet data available.");
    }

    // Parse report
    const rows = report.rows || [];
    let assets = 0;
    let liabilities = 0;
    let equity = 0;

    for (const section of rows) {
      const rowTypeStr = String(section.rowType || "");
      if (rowTypeStr === "Section") {
        const title = section.title?.toLowerCase() || "";
        const sectionRows = section.rows || [];

        for (const row of sectionRows) {
          const innerRowType = String(row.rowType || "");
          if (innerRowType === "SummaryRow" && row.cells) {
            const value = parseFloat(String(row.cells[1]?.value || "0"));
            if (title.includes("asset")) {
              assets = value;
            } else if (title.includes("liabilit")) {
              liabilities = Math.abs(value);
            } else if (title.includes("equity")) {
              equity = value;
            }
          }
        }
      }
    }

    return successResult(
      `📊 Balance Sheet (as of ${date})\n\n` +
        `Assets: ${formatCurrency(assets)}\n` +
        `Liabilities: ${formatCurrency(liabilities)}\n` +
        `Equity: ${formatCurrency(equity)}`
    );
  } catch (error: any) {
    console.error("Error fetching balance sheet:", error);
    const message = error?.response?.body?.Message || error?.message || "Unknown error";
    return errorResult(`Failed to fetch balance sheet: ${message}`);
  }
}

/**
 * Get bank accounts
 */
export async function getBankAccounts(userId: string): Promise<ToolResult> {
  const xero = await getXeroClient(userId);
  if (!xero) {
    return errorResult(
      "Xero not connected. Please connect your Xero account first."
    );
  }

  try {
    const { client, tenantId } = xero;

    const response = await client.accountingApi.getAccounts(
      tenantId,
      undefined,
      'Type=="BANK"' // where clause for bank accounts
    );

    // Fallback filter in code for safety (where clause can be unreliable)
    const accounts = (response.body.accounts || []).filter(
      acc => String(acc.type || "").toUpperCase() === "BANK"
    );

    if (accounts.length === 0) {
      return successResult("No bank accounts found in Xero.");
    }

    const summary = accounts
      .map(
        (acc) =>
          `• ${acc.name}: ${formatCurrency(acc.bankAccountNumber ? undefined : 0)}`
      )
      .join("\n");

    return successResult(`🏦 Bank Accounts:\n\n${summary}`);
  } catch (error: any) {
    console.error("Error fetching bank accounts:", error);
    const message = error?.response?.body?.Message || error?.message || "Unknown error";
    return errorResult(`Failed to fetch bank accounts: ${message}`);
  }
}

/**
 * Get bank transactions
 */
export async function getBankTransactions(
  userId: string,
  args: { limit?: number }
): Promise<ToolResult> {
  const xero = await getXeroClient(userId);
  if (!xero) {
    return errorResult(
      "Xero not connected. Please connect your Xero account first."
    );
  }

  try {
    const { client, tenantId } = xero;
    const limit = args.limit || 10;

    const response = await client.accountingApi.getBankTransactions(
      tenantId,
      undefined,
      undefined,
      "Date DESC",
      limit
    );

    const transactions = response.body.bankTransactions || [];

    if (transactions.length === 0) {
      return successResult("No recent bank transactions found.");
    }

    const summary = transactions
      .map((tx) => {
        const date = tx.date
          ? new Date(tx.date).toLocaleDateString("en-AU")
          : "N/A";
        const typeStr = String(tx.type || "");
        const type = typeStr === "RECEIVE" ? "+" : "-";
        return `• ${date}: ${tx.contact?.name || "Unknown"} ${type}${formatCurrency(tx.total)}`;
      })
      .join("\n");

    return successResult(`💳 Recent Bank Transactions:\n\n${summary}`);
  } catch (error: any) {
    console.error("Error fetching bank transactions:", error);
    const message = error?.response?.body?.Message || error?.message || "Unknown error";
    return errorResult(`Failed to fetch bank transactions: ${message}`);
  }
}

/**
 * Get contacts
 */
export async function getContacts(
  userId: string,
  args: { limit?: number }
): Promise<ToolResult> {
  const xero = await getXeroClient(userId);
  if (!xero) {
    return errorResult(
      "Xero not connected. Please connect your Xero account first."
    );
  }

  try {
    const { client, tenantId } = xero;
    const limit = args.limit || 10;

    const response = await client.accountingApi.getContacts(
      tenantId,
      undefined,
      undefined,
      "Name ASC",
      undefined,
      limit
    );

    const contacts = response.body.contacts || [];

    if (contacts.length === 0) {
      return successResult("No contacts found in Xero.");
    }

    const summary = contacts
      .map((c) => {
        const type = c.isCustomer && c.isSupplier ? "Customer/Supplier" : c.isCustomer ? "Customer" : c.isSupplier ? "Supplier" : "Contact";
        return `• ${c.name} (${type})`;
      })
      .join("\n");

    return successResult(`👥 Contacts (${contacts.length}):\n\n${summary}`);
  } catch (error: any) {
    console.error("Error fetching contacts:", error);
    const message = error?.response?.body?.Message || error?.message || "Unknown error";
    return errorResult(`Failed to fetch contacts: ${message}`);
  }
}

/**
 * Get organisation info
 */
export async function getOrganisation(userId: string): Promise<ToolResult> {
  const xero = await getXeroClient(userId);
  if (!xero) {
    return errorResult(
      "Xero not connected. Please connect your Xero account first."
    );
  }

  try {
    const { client, tenantId } = xero;

    const response = await client.accountingApi.getOrganisations(tenantId);
    const org = response.body.organisations?.[0];

    if (!org) {
      return successResult("No organisation information available.");
    }

    return successResult(
      `🏢 Organisation Details:\n\n` +
        `Name: ${org.name}\n` +
        `Legal Name: ${org.legalName || org.name}\n` +
        `ABN: ${org.taxNumber || "Not set"}\n` +
        `Country: ${org.countryCode}\n` +
        `Base Currency: ${org.baseCurrency}\n` +
        `Financial Year End: ${org.financialYearEndMonth}/${org.financialYearEndDay}`
    );
  } catch (error: any) {
    console.error("Error fetching organisation:", error);
    const message = error?.response?.body?.Message || error?.message || "Unknown error";
    return errorResult(`Failed to fetch organisation: ${message}`);
  }
}

/**
 * Get aged receivables - who owes you money
 * Uses invoices endpoint instead of reports API for reliability
 */
export async function getAgedReceivables(
  userId: string,
  args: { date?: string }
): Promise<ToolResult> {
  const xero = await getXeroClient(userId);
  if (!xero) {
    return errorResult(
      "Xero not connected. Please connect your Xero account first."
    );
  }

  try {
    const { client, tenantId } = xero;
    const today = new Date();
    const reportDate = args.date || today.toISOString().split("T")[0];

    // Get all unpaid sales invoices (AUTHORISED status = approved but not paid)
    // Use statuses array parameter for reliability, filter Type in code
    const response = await client.accountingApi.getInvoices(
      tenantId,
      undefined, // modifiedAfter
      'Type=="ACCREC"', // where - ACCREC = Accounts Receivable (sales invoices)
      undefined, // order
      undefined, // ids
      undefined, // invoiceNumbers
      undefined, // contactIDs
      ["AUTHORISED"] // statuses - only unpaid/approved invoices
    );

    // Filter to only ACCREC (sales invoices) in case where clause didn't work
    const invoices = (response.body.invoices || []).filter(
      inv => String(inv.type || "") === "ACCREC" && String(inv.status || "") === "AUTHORISED"
    );

    if (invoices.length === 0) {
      return successResult("No outstanding receivables! Nobody owes you money. 🎉");
    }

    // Group invoices by contact and calculate aging
    const contactTotals: Map<string, { name: string; total: number; overdue: number; invoices: number }> = new Map();

    for (const invoice of invoices) {
      const contactName = invoice.contact?.name || "Unknown Contact";
      const contactId = invoice.contact?.contactID || "unknown";
      const amountDue = invoice.amountDue || 0;

      if (amountDue <= 0) continue;

      const dueDate = invoice.dueDate ? new Date(invoice.dueDate) : today;
      const isOverdue = dueDate < today;

      const existing = contactTotals.get(contactId) || { name: contactName, total: 0, overdue: 0, invoices: 0 };
      existing.total += amountDue;
      existing.invoices += 1;
      if (isOverdue) {
        existing.overdue += amountDue;
      }
      contactTotals.set(contactId, existing);
    }

    // Format output
    const contactLines: string[] = [];
    let totalOwed = 0;
    let totalOverdue = 0;

    // Sort by total owed (highest first)
    const sorted = Array.from(contactTotals.values()).sort((a, b) => b.total - a.total);

    for (const contact of sorted) {
      totalOwed += contact.total;
      totalOverdue += contact.overdue;

      let line = `• ${contact.name}: ${formatCurrency(contact.total)}`;
      if (contact.overdue > 0) {
        line += ` (${formatCurrency(contact.overdue)} overdue)`;
      }
      if (contact.invoices > 1) {
        line += ` [${contact.invoices} invoices]`;
      }
      contactLines.push(line);
    }

    let result = `📥 Aged Receivables (as of ${reportDate})\n\n`;
    result += `Who owes you money:\n${contactLines.join("\n")}\n\n`;
    result += `Total Outstanding: ${formatCurrency(totalOwed)}`;
    if (totalOverdue > 0) {
      result += `\n⚠️ Total Overdue: ${formatCurrency(totalOverdue)}`;
    }

    return successResult(result);
  } catch (error: any) {
    console.error("Error fetching aged receivables:", error);
    const message = error?.response?.body?.Message || error?.message || "Unknown error";
    return errorResult(`Failed to fetch aged receivables: ${message}`);
  }
}

/**
 * Get aged payables - who you owe money to
 * Uses invoices endpoint instead of reports API for reliability
 */
export async function getAgedPayables(
  userId: string,
  args: { date?: string }
): Promise<ToolResult> {
  const xero = await getXeroClient(userId);
  if (!xero) {
    return errorResult(
      "Xero not connected. Please connect your Xero account first."
    );
  }

  try {
    const { client, tenantId } = xero;
    const today = new Date();
    const reportDate = args.date || today.toISOString().split("T")[0];

    // Get all unpaid bills (AUTHORISED status = approved but not paid)
    // Use statuses array parameter for reliability, filter Type in code
    const response = await client.accountingApi.getInvoices(
      tenantId,
      undefined, // modifiedAfter
      'Type=="ACCPAY"', // where - ACCPAY = Accounts Payable (bills)
      undefined, // order
      undefined, // ids
      undefined, // invoiceNumbers
      undefined, // contactIDs
      ["AUTHORISED"] // statuses - only unpaid/approved bills
    );

    // Filter to only ACCPAY (bills) in case where clause didn't work
    const invoices = (response.body.invoices || []).filter(
      inv => String(inv.type || "") === "ACCPAY" && String(inv.status || "") === "AUTHORISED"
    );

    if (invoices.length === 0) {
      return successResult("No outstanding payables! You don't owe anyone money. 🎉");
    }

    // Group bills by contact and calculate aging
    const contactTotals: Map<string, { name: string; total: number; overdue: number; bills: number }> = new Map();

    for (const invoice of invoices) {
      const contactName = invoice.contact?.name || "Unknown Contact";
      const contactId = invoice.contact?.contactID || "unknown";
      const amountDue = invoice.amountDue || 0;

      if (amountDue <= 0) continue;

      const dueDate = invoice.dueDate ? new Date(invoice.dueDate) : today;
      const isOverdue = dueDate < today;

      const existing = contactTotals.get(contactId) || { name: contactName, total: 0, overdue: 0, bills: 0 };
      existing.total += amountDue;
      existing.bills += 1;
      if (isOverdue) {
        existing.overdue += amountDue;
      }
      contactTotals.set(contactId, existing);
    }

    // Format output
    const contactLines: string[] = [];
    let totalOwed = 0;
    let totalOverdue = 0;

    // Sort by total owed (highest first)
    const sorted = Array.from(contactTotals.values()).sort((a, b) => b.total - a.total);

    for (const contact of sorted) {
      totalOwed += contact.total;
      totalOverdue += contact.overdue;

      let line = `• ${contact.name}: ${formatCurrency(contact.total)}`;
      if (contact.overdue > 0) {
        line += ` (${formatCurrency(contact.overdue)} overdue)`;
      }
      if (contact.bills > 1) {
        line += ` [${contact.bills} bills]`;
      }
      contactLines.push(line);
    }

    let result = `📤 Aged Payables (as of ${reportDate})\n\n`;
    result += `Who you owe money to:\n${contactLines.join("\n")}\n\n`;
    result += `Total Outstanding: ${formatCurrency(totalOwed)}`;
    if (totalOverdue > 0) {
      result += `\n⚠️ Total Overdue: ${formatCurrency(totalOverdue)}`;
    }

    return successResult(result);
  } catch (error: any) {
    console.error("Error fetching aged payables:", error);
    const message = error?.response?.body?.Message || error?.message || "Unknown error";
    return errorResult(`Failed to fetch aged payables: ${message}`);
  }
}

/**
 * Search contacts
 */
export async function searchContacts(
  userId: string,
  args: { searchTerm: string }
): Promise<ToolResult> {
  const xero = await getXeroClient(userId);
  if (!xero) {
    return errorResult(
      "Xero not connected. Please connect your Xero account first."
    );
  }

  try {
    const { client, tenantId } = xero;
    const searchLower = args.searchTerm.toLowerCase();

    const response = await client.accountingApi.getContacts(
      tenantId,
      undefined,
      `Name.Contains("${args.searchTerm}")` // where clause for name search
    );

    // Fallback filter in code for safety (where clause can be unreliable)
    const contacts = (response.body.contacts || []).filter(
      c => (c.name || "").toLowerCase().includes(searchLower)
    );

    if (contacts.length === 0) {
      return successResult(`No contacts found matching "${args.searchTerm}".`);
    }

    const summary = contacts
      .map((c) => {
        const type = c.isCustomer && c.isSupplier ? "Customer/Supplier" : c.isCustomer ? "Customer" : c.isSupplier ? "Supplier" : "Contact";
        const email = c.emailAddress ? ` - ${c.emailAddress}` : "";
        return `• ${c.name} (${type})${email}`;
      })
      .join("\n");

    return successResult(
      `🔍 Found ${contacts.length} contact(s) matching "${args.searchTerm}":\n\n${summary}`
    );
  } catch (error: any) {
    console.error("Error searching contacts:", error);
    const message = error?.response?.body?.Message || error?.message || "Unknown error";
    return errorResult(`Failed to search contacts: ${message}`);
  }
}
