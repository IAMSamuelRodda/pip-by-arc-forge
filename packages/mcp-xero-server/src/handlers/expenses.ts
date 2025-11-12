/**
 * Expense handler implementations
 *
 * Note: Xero tracks expenses as bank transactions (SPEND type) or as bill invoices.
 * This implementation uses bank transactions for expense tracking.
 */

import { BankTransaction } from 'xero-node';
import { getXeroClient, makeXeroRequest } from '../lib/xero-client.js';

export async function createExpense(args: any) {
  try {
    const { userId, date, description, amount, category, receipt } = args;

    const { client: xero, tenantId } = await getXeroClient(userId);

    // Create expense as a bank transaction (SPEND type)
    const bankTransaction: BankTransaction = {
      type: BankTransaction.TypeEnum.SPEND,
      date,
      reference: description,
      lineItems: [
        {
          description,
          quantity: 1,
          unitAmount: amount,
          accountCode: category || '400', // Default expense account
        },
      ],
      status: BankTransaction.StatusEnum.AUTHORISED,
    };

    const response = await makeXeroRequest(() =>
      xero.accountingApi.createBankTransactions(tenantId, {
        bankTransactions: [bankTransaction],
      })
    );

    const createdExpense = response.body.bankTransactions![0];

    // TODO: Handle receipt attachment if provided
    // This would require using the attachments API

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            expense: {
              bankTransactionID: createdExpense.bankTransactionID,
              date: createdExpense.date,
              reference: createdExpense.reference,
              total: createdExpense.total,
              status: createdExpense.status,
              category: createdExpense.lineItems?.[0]?.accountCode,
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
          text: `Error creating expense: ${error.message}.

Troubleshooting:
- Verify date format is YYYY-MM-DD
- Check amount is a positive number
- Ensure category/accountCode is valid in your Xero chart of accounts
- Confirm Xero OAuth token is valid

Note: Expenses are created as SPEND bank transactions in Xero.`,
        },
      ],
      isError: true,
    };
  }
}

export async function categorizeExpense(args: any) {
  try {
    const { userId, expenseId, category } = args;

    const { client: xero, tenantId } = await getXeroClient(userId);

    // Get existing expense (bank transaction)
    const getResponse = await makeXeroRequest(() =>
      xero.accountingApi.getBankTransaction(tenantId, expenseId)
    );

    const expense = getResponse.body.bankTransactions![0];

    // Update line items with new category
    const updatedLineItems = expense.lineItems?.map((item) => ({
      ...item,
      accountCode: category,
    }));

    // Update the bank transaction
    const updateResponse = await makeXeroRequest(() =>
      xero.accountingApi.updateBankTransaction(tenantId, expenseId, {
        bankTransactions: [{
          bankTransactionID: expenseId,
          lineItems: updatedLineItems,
        }],
      })
    );

    const updatedExpense = updateResponse.body.bankTransactions![0];

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            expense: {
              bankTransactionID: updatedExpense.bankTransactionID,
              date: updatedExpense.date,
              reference: updatedExpense.reference,
              total: updatedExpense.total,
              category: updatedExpense.lineItems?.[0]?.accountCode,
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
          text: `Error categorizing expense: ${error.message}.

Troubleshooting:
- Verify expenseId is a valid Xero bank transaction GUID
- Ensure category/accountCode is valid in your Xero chart of accounts
- Check expense is not locked or reconciled
- Confirm Xero OAuth token is valid`,
        },
      ],
      isError: true,
    };
  }
}

export async function listExpenses(args: any) {
  try {
    const { userId, fromDate, toDate, category, page = 1 } = args;

    const { client: xero, tenantId } = await getXeroClient(userId);

    // Build where clause to filter for SPEND transactions (expenses)
    const whereClauses: string[] = ['Type=="SPEND"'];

    if (fromDate) {
      whereClauses.push(`Date >= DateTime(${fromDate})`);
    }

    if (toDate) {
      whereClauses.push(`Date <= DateTime(${toDate})`);
    }

    const where = whereClauses.join(' AND ');

    const response = await makeXeroRequest(() =>
      xero.accountingApi.getBankTransactions(
        tenantId,
        undefined, // IDs
        where,
        undefined, // order
        page,
        100 // pageSize
      )
    );

    let expenses = response.body.bankTransactions || [];

    // Filter by category if provided (post-query filtering)
    if (category) {
      expenses = expenses.filter((exp) =>
        exp.lineItems?.some((item) => item.accountCode === category)
      );
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            count: expenses.length,
            page,
            expenses: expenses.map((exp) => ({
              bankTransactionID: exp.bankTransactionID,
              date: exp.date,
              reference: exp.reference,
              total: exp.total,
              status: exp.status,
              category: exp.lineItems?.[0]?.accountCode,
              description: exp.lineItems?.[0]?.description,
              isReconciled: exp.isReconciled,
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
          text: `Error listing expenses: ${error.message}.

Troubleshooting:
- Verify date format is YYYY-MM-DD
- Ensure fromDate is before toDate
- Check category/accountCode is valid if filtering
- Confirm Xero OAuth token is valid

Note: Expenses are retrieved as SPEND bank transactions from Xero.`,
        },
      ],
      isError: true,
    };
  }
}
