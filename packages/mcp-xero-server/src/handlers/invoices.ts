/**
 * Invoice handler implementations
 */

import { Invoice } from 'xero-node';
import { getXeroClient, makeXeroRequest } from '../lib/xero-client.js';
import {
  parsePaginationParams,
  createPaginatedResponse
} from '../lib/pagination.js';
import {
  filterInvoiceSummary,
  filterInvoiceDetail,
  logTokenMetrics
} from '../lib/response-filters.js';

export async function createInvoice(args: any) {
  try {
    const { userId, contactName, contactEmail, invoiceNumber, date, dueDate, lineItems } = args;

    // Get authenticated Xero client
    const { client: xero, tenantId } = await getXeroClient(userId);

    // Build invoice object
    const invoice: Invoice = {
      type: Invoice.TypeEnum.ACCREC, // Accounts Receivable
      contact: {
        name: contactName,
        emailAddress: contactEmail,
      },
      invoiceNumber,
      date,
      dueDate,
      lineItems: lineItems.map((item: any) => ({
        description: item.description,
        quantity: item.quantity,
        unitAmount: item.unitAmount,
        accountCode: item.accountCode || '200', // Default sales account
        taxType: item.taxType || 'OUTPUT2',
      })),
      status: Invoice.StatusEnum.DRAFT,
    };

    // Create invoice via Xero API
    const response = await makeXeroRequest(() =>
      xero.accountingApi.createInvoices(tenantId, { invoices: [invoice] })
    );

    const createdInvoice = response.body.invoices![0];

    const responseText = JSON.stringify({
      success: true,
      invoice: filterInvoiceSummary(createdInvoice)
    }, null, 2);

    logTokenMetrics('create_invoice', responseText);

    return {
      content: [
        {
          type: 'text',
          text: responseText,
        },
      ],
    };
  } catch (error: any) {
    return {
      content: [
        {
          type: 'text',
          text: `Error creating invoice: ${error.message}.

Troubleshooting:
- Ensure contact name exists in Xero or will be auto-created
- Verify date format is YYYY-MM-DD
- Check line items have valid quantities and amounts
- Confirm Xero OAuth token is valid`,
        },
      ],
      isError: true,
    };
  }
}

export async function getInvoice(args: any) {
  try {
    const { userId, invoiceId } = args;

    const { client: xero, tenantId } = await getXeroClient(userId);

    const response = await makeXeroRequest(() =>
      xero.accountingApi.getInvoice(tenantId, invoiceId)
    );

    const invoice = response.body.invoices![0];

    const responseText = JSON.stringify(filterInvoiceDetail(invoice), null, 2);
    logTokenMetrics('get_invoice', responseText);

    return {
      content: [
        {
          type: 'text',
          text: responseText,
        },
      ],
    };
  } catch (error: any) {
    return {
      content: [
        {
          type: 'text',
          text: `Error retrieving invoice: ${error.message}.

Troubleshooting:
- Verify invoiceId is a valid Xero invoice GUID
- Check user has access to this invoice
- Ensure Xero OAuth token is valid`,
        },
      ],
      isError: true,
    };
  }
}

export async function updateInvoice(args: any) {
  try {
    const { userId, invoiceId, data } = args;

    const { client: xero, tenantId } = await getXeroClient(userId);

    // Build update object
    const updateData: any = {
      invoiceID: invoiceId,
    };

    if (data.status) updateData.status = data.status;
    if (data.dueDate) updateData.dueDate = data.dueDate;
    if (data.lineItems) updateData.lineItems = data.lineItems;

    const response = await makeXeroRequest(() =>
      xero.accountingApi.updateInvoice(tenantId, invoiceId, {
        invoices: [updateData],
      })
    );

    const updatedInvoice = response.body.invoices![0];

    const responseText = JSON.stringify({
      success: true,
      invoice: filterInvoiceSummary(updatedInvoice)
    }, null, 2);

    logTokenMetrics('update_invoice', responseText);

    return {
      content: [
        {
          type: 'text',
          text: responseText,
        },
      ],
    };
  } catch (error: any) {
    return {
      content: [
        {
          type: 'text',
          text: `Error updating invoice: ${error.message}.

Troubleshooting:
- Verify invoiceId exists
- Check invoice status allows updates (DRAFT/SUBMITTED can be edited)
- Ensure data fields are valid`,
        },
      ],
      isError: true,
    };
  }
}

export async function listInvoices(args: any) {
  try {
    const { userId, status, contactName, fromDate, toDate, cursor } = args;

    const { client: xero, tenantId } = await getXeroClient(userId);

    // Parse pagination params (cursor or default to first page)
    const { offset, pageSize } = parsePaginationParams({ cursor }, 100);

    // Build where clause
    const whereClauses: string[] = [];

    if (status) {
      whereClauses.push(`Status=="${status}"`);
    }

    if (contactName) {
      whereClauses.push(`Contact.Name.Contains("${contactName}")`);
    }

    if (fromDate) {
      whereClauses.push(`Date >= DateTime(${fromDate})`);
    }

    if (toDate) {
      whereClauses.push(`Date <= DateTime(${toDate})`);
    }

    const where = whereClauses.length > 0 ? whereClauses.join(' AND ') : undefined;

    // Calculate page number from offset (Xero uses 1-indexed pages)
    const page = Math.floor(offset / pageSize) + 1;

    const response = await makeXeroRequest(() =>
      xero.accountingApi.getInvoices(
        tenantId,
        undefined, // modifiedSince
        where,
        undefined, // order
        undefined, // IDs
        undefined, // invoiceNumbers
        undefined, // contactIDs
        undefined, // statuses
        page,
        undefined, // includeArchived
        undefined, // createdByMyApp
        undefined, // unitdp
        undefined, // summaryOnly
        pageSize   // pageSize
      )
    );

    const invoices = response.body.invoices || [];

    // Filter to summary format
    const filteredInvoices = invoices.map(filterInvoiceSummary);

    // Create paginated response with nextCursor if more results exist
    const paginatedResponse = createPaginatedResponse(
      filteredInvoices,
      invoices.length,
      pageSize,
      offset
    );

    const responseText = JSON.stringify(paginatedResponse, null, 2);
    logTokenMetrics('list_invoices', responseText);

    return {
      content: [
        {
          type: 'text',
          text: responseText,
        },
      ],
    };
  } catch (error: any) {
    return {
      content: [
        {
          type: 'text',
          text: `Error listing invoices: ${error.message}.

Troubleshooting:
- Check filter values are valid (status: DRAFT/PAID/AUTHORISED, dates: YYYY-MM-DD)
- Verify Xero OAuth token is valid
- Try without filters to test basic connectivity`,
        },
      ],
      isError: true,
    };
  }
}

export async function sendInvoice(args: any) {
  try {
    const { userId, invoiceId } = args;

    const { client: xero, tenantId } = await getXeroClient(userId);

    // First, ensure invoice is AUTHORISED
    const getResponse = await xero.accountingApi.getInvoice(tenantId, invoiceId);
    const invoice = getResponse.body.invoices![0];

    if (invoice.status !== Invoice.StatusEnum.AUTHORISED) {
      // Update to AUTHORISED status
      await makeXeroRequest(() =>
        xero.accountingApi.updateInvoice(tenantId, invoiceId, {
          invoices: [{
            invoiceID: invoiceId,
            status: Invoice.StatusEnum.AUTHORISED,
          }],
        })
      );
    }

    // Email invoice to contact
    await makeXeroRequest(() =>
      xero.accountingApi.emailInvoice(tenantId, invoiceId, {})
    );

    const responseText = JSON.stringify({
      success: true,
      message: `Invoice ${invoice.invoiceNumber} sent to ${invoice.contact?.emailAddress}`,
      invoice: filterInvoiceSummary(invoice)
    }, null, 2);

    logTokenMetrics('send_invoice', responseText);

    return {
      content: [
        {
          type: 'text',
          text: responseText,
        },
      ],
    };
  } catch (error: any) {
    return {
      content: [
        {
          type: 'text',
          text: `Error sending invoice: ${error.message}.

Troubleshooting:
- Verify invoiceId exists
- Ensure contact has valid email address
- Check invoice can be sent (must have line items and contact)`,
        },
      ],
      isError: true,
    };
  }
}
