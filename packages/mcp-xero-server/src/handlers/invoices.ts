/**
 * Invoice handler implementations
 */

import { Invoice, LineItem } from 'xero-node';
import { getXeroClient, makeXeroRequest } from '../lib/xero-client.js';

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

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            invoice: {
              invoiceID: createdInvoice.invoiceID,
              invoiceNumber: createdInvoice.invoiceNumber,
              contact: createdInvoice.contact?.name,
              total: createdInvoice.total,
              status: createdInvoice.status,
              date: createdInvoice.date,
              dueDate: createdInvoice.dueDate,
            },
          }, null, 2),
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

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            invoiceID: invoice.invoiceID,
            invoiceNumber: invoice.invoiceNumber,
            contact: invoice.contact?.name,
            total: invoice.total,
            amountDue: invoice.amountDue,
            amountPaid: invoice.amountPaid,
            status: invoice.status,
            date: invoice.date,
            dueDate: invoice.dueDate,
            lineItems: invoice.lineItems?.map((item) => ({
              description: item.description,
              quantity: item.quantity,
              unitAmount: item.unitAmount,
              lineAmount: item.lineAmount,
            })),
          }, null, 2),
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

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            invoice: {
              invoiceID: updatedInvoice.invoiceID,
              status: updatedInvoice.status,
              total: updatedInvoice.total,
            },
          }, null, 2),
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
    const { userId, status, contactName, fromDate, toDate, page = 1 } = args;

    const { client: xero, tenantId } = await getXeroClient(userId);

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
        100 // pageSize
      )
    );

    const invoices = response.body.invoices || [];

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            count: invoices.length,
            page,
            invoices: invoices.map((inv) => ({
              invoiceID: inv.invoiceID,
              invoiceNumber: inv.invoiceNumber,
              contact: inv.contact?.name,
              total: inv.total,
              amountDue: inv.amountDue,
              status: inv.status,
              date: inv.date,
              dueDate: inv.dueDate,
            })),
          }, null, 2),
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
      xero.accountingApi.emailInvoice(tenantId, invoiceId)
    );

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            message: `Invoice ${invoice.invoiceNumber} sent to ${invoice.contact?.emailAddress}`,
          }, null, 2),
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
