/**
 * Bank transaction handler implementations
 */

import { BankTransaction } from 'xero-node';
import { getXeroClient, makeXeroRequest } from '../lib/xero-client.js';
import { parsePaginationParams, createPaginatedResponse } from '../lib/pagination.js';
import { filterBankTransactionSummary, logTokenMetrics } from '../lib/response-filters.js';

export async function getBankTransactions(args: any) {
  try {
    const { userId, accountId, fromDate, toDate, cursor } = args;

    const { client: xero, tenantId } = await getXeroClient(userId);

    // Parse pagination params (cursor or default to first page)
    const { offset, pageSize } = parsePaginationParams({ cursor }, 100);

    // Build where clause for filtering
    const whereClauses: string[] = [`BankAccountID == GUID("${accountId}")`];

    if (fromDate) {
      whereClauses.push(`Date >= DateTime(${fromDate})`);
    }

    if (toDate) {
      whereClauses.push(`Date <= DateTime(${toDate})`);
    }

    const where = whereClauses.join(' AND ');

    // Calculate page number from offset (Xero uses 1-indexed pages)
    const page = Math.floor(offset / pageSize) + 1;

    const response = await makeXeroRequest(() =>
      xero.accountingApi.getBankTransactions(
        tenantId,
        undefined, // IDs
        where,
        undefined, // order
        page,
        pageSize
      )
    );

    const transactions = response.body.bankTransactions || [];

    // Filter to summary format (remove full nested structures)
    const filteredTransactions = transactions.map(filterBankTransactionSummary);

    // Create paginated response with nextCursor if more results exist
    const paginatedResponse = createPaginatedResponse(
      filteredTransactions,
      transactions.length,
      pageSize,
      offset
    );

    const responseText = JSON.stringify(paginatedResponse, null, 2);
    logTokenMetrics('get_bank_transactions', responseText);

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
          text: `Error retrieving bank transactions: ${error.message}.

Troubleshooting:
- Verify accountId is a valid Xero bank account GUID
- Check date format is YYYY-MM-DD
- Ensure user has access to this bank account
- Confirm Xero OAuth token is valid
- If using cursor, verify it hasn't expired (1 hour TTL)`,
        },
      ],
      isError: true,
    };
  }
}

export async function createBankTransaction(args: any) {
  try {
    const { userId, type, accountId, date, description, amount } = args;

    const { client: xero, tenantId } = await getXeroClient(userId);

    // Build bank transaction object
    const bankTransaction: BankTransaction = {
      type: type === 'SPEND' ? BankTransaction.TypeEnum.SPEND : BankTransaction.TypeEnum.RECEIVE,
      bankAccount: {
        accountID: accountId,
      },
      date,
      reference: description,
      lineItems: [
        {
          description,
          quantity: 1,
          unitAmount: amount,
          accountCode: '400', // Default account - should be configurable
        },
      ],
    };

    const response = await makeXeroRequest(() =>
      xero.accountingApi.createBankTransactions(tenantId, {
        bankTransactions: [bankTransaction],
      })
    );

    const createdTransaction = response.body.bankTransactions![0];

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            transaction: {
              bankTransactionID: createdTransaction.bankTransactionID,
              type: createdTransaction.type,
              date: createdTransaction.date,
              reference: createdTransaction.reference,
              total: createdTransaction.total,
              status: createdTransaction.status,
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
          text: `Error creating bank transaction: ${error.message}.

Troubleshooting:
- Verify accountId is a valid Xero bank account GUID
- Check date format is YYYY-MM-DD
- Ensure type is either 'SPEND' or 'RECEIVE'
- Verify amount is a positive number
- Confirm Xero OAuth token is valid`,
        },
      ],
      isError: true,
    };
  }
}

export async function reconcileTransaction(args: any) {
  try {
    const { userId, transactionId, invoiceId } = args;

    const { client: xero, tenantId } = await getXeroClient(userId);

    // Get the bank transaction to verify it exists
    const txnResponse = await makeXeroRequest(() =>
      xero.accountingApi.getBankTransaction(tenantId, transactionId)
    );

    const transaction = txnResponse.body.bankTransactions![0];

    // Get the invoice to verify it exists
    const invResponse = await makeXeroRequest(() =>
      xero.accountingApi.getInvoice(tenantId, invoiceId)
    );

    const invoice = invResponse.body.invoices![0];

    // Create a payment to reconcile the bank transaction with the invoice
    const payment = {
      invoice: {
        invoiceID: invoiceId,
      },
      account: {
        accountID: transaction.bankAccount?.accountID,
      },
      date: transaction.date,
      amount: transaction.total,
    };

    const paymentResponse = await makeXeroRequest(() =>
      xero.accountingApi.createPayment(tenantId, payment)
    );

    const createdPayment = paymentResponse.body.payments![0];

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            message: `Bank transaction reconciled with invoice ${invoice.invoiceNumber}`,
            payment: {
              paymentID: createdPayment.paymentID,
              amount: createdPayment.amount,
              date: createdPayment.date,
              status: createdPayment.status,
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
          text: `Error reconciling transaction: ${error.message}.

Troubleshooting:
- Verify transactionId is a valid Xero bank transaction GUID
- Verify invoiceId is a valid Xero invoice GUID
- Check transaction and invoice amounts match
- Ensure transaction is not already reconciled
- Confirm invoice is AUTHORISED or PAID
- Verify Xero OAuth token is valid`,
        },
      ],
      isError: true,
    };
  }
}
