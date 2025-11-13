/**
 * Reporting handler implementations
 */

import { getXeroClient, makeXeroRequest } from '../lib/xero-client.js';
import { filterReportSummary, logTokenMetrics } from '../lib/response-filters.js';
import { createDualResponse } from '../lib/resource-storage.js';

export async function generateProfitLoss(args: any) {
  try {
    const { userId, fromDate, toDate, periods = 1, timeframe = 'MONTH', fullReport = false } = args;

    const { client: xero, tenantId } = await getXeroClient(userId);

    const response = await makeXeroRequest(() =>
      xero.accountingApi.getReportProfitAndLoss(
        tenantId,
        fromDate,
        toDate,
        periods,
        timeframe
      )
    );

    const report = response.body.reports![0];

    // If fullReport requested, use ResourceLink pattern (dual-response)
    if (fullReport) {
      // Extract all rows for complete dataset
      const allRows = report.rows || [];

      // Create dual-response: preview (first 10 rows) + ResourceLink
      const dualResponse = await createDualResponse(
        allRows,
        10, // Preview size
        'report',
        tenantId,
        userId,
        {
          total_rows: allRows.length,
          columns: ['Section', 'Account', 'Amount']
        }
      );

      const responseText = JSON.stringify({
        reportName: report.reportName,
        reportDate: report.reportDate,
        preview: dualResponse.preview,
        resource: dualResponse.resource,
        metadata: dualResponse.metadata,
        note: 'This is a preview. Use the resource URI to retrieve the complete report.'
      }, null, 2);

      logTokenMetrics('generate_profit_loss_full', responseText);

      return {
        content: [{
          type: 'text',
          text: responseText,
        }],
      };
    }

    // Default: Return summary format (key metrics only)
    const reportSummary = filterReportSummary(report);

    const responseText = JSON.stringify(reportSummary, null, 2);
    logTokenMetrics('generate_profit_loss', responseText);

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
          text: `Error generating profit & loss report: ${error.message}.

Troubleshooting:
- Verify date format is YYYY-MM-DD
- Ensure fromDate is before toDate
- Check periods is a positive integer
- Verify timeframe is MONTH, QUARTER, or YEAR
- Confirm Xero OAuth token is valid`,
        },
      ],
      isError: true,
    };
  }
}

export async function generateBalanceSheet(args: any) {
  try {
    const { userId, date, periods = 1 } = args;

    const { client: xero, tenantId } = await getXeroClient(userId);

    const response = await makeXeroRequest(() =>
      xero.accountingApi.getReportBalanceSheet(
        tenantId,
        date,
        periods
      )
    );

    const report = response.body.reports![0];

    // Filter to summary format (key metrics only, not full nested structure)
    const reportSummary = filterReportSummary(report);

    const responseText = JSON.stringify(reportSummary, null, 2);
    logTokenMetrics('generate_balance_sheet', responseText);

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
          text: `Error generating balance sheet report: ${error.message}.

Troubleshooting:
- Verify date format is YYYY-MM-DD
- Check periods is a positive integer
- Ensure date is not in the future
- Confirm Xero OAuth token is valid`,
        },
      ],
      isError: true,
    };
  }
}

export async function generateBankSummary(args: any) {
  try {
    const { userId, fromDate, toDate } = args;

    const { client: xero, tenantId } = await getXeroClient(userId);

    const response = await makeXeroRequest(() =>
      xero.accountingApi.getReportBankSummary(
        tenantId,
        fromDate,
        toDate
      )
    );

    const report = response.body.reports![0];

    // Filter to summary format (key metrics only, not full nested structure)
    const reportSummary = filterReportSummary(report);

    const responseText = JSON.stringify(reportSummary, null, 2);
    logTokenMetrics('generate_bank_summary', responseText);

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
          text: `Error generating bank summary report: ${error.message}.

Troubleshooting:
- Verify date format is YYYY-MM-DD
- Ensure fromDate is before toDate
- Check accountId is a valid Xero bank account GUID (if filtering by account)
- Confirm Xero OAuth token is valid`,
        },
      ],
      isError: true,
    };
  }
}
