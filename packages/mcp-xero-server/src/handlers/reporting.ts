/**
 * Reporting handler implementations
 */

import { getXeroClient, makeXeroRequest } from '../lib/xero-client.js';

export async function generateProfitLoss(args: any) {
  try {
    const { userId, fromDate, toDate, periods = 1, timeframe = 'MONTH' } = args;

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

    // Extract key sections from the report
    const sections = report.rows?.map((row: any) => ({
      title: row.title,
      rows: row.rows?.map((detailRow: any) => ({
        cells: detailRow.cells?.map((cell: any) => cell.value),
      })),
    }));

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            reportName: report.reportName,
            reportDate: report.reportDate,
            reportTitles: report.reportTitles,
            updatedDateUTC: report.updatedDateUTC,
            sections,
          }, null, 2),
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

    // Extract key sections from the report
    const sections = report.rows?.map((row: any) => ({
      title: row.title,
      rows: row.rows?.map((detailRow: any) => ({
        cells: detailRow.cells?.map((cell: any) => cell.value),
      })),
    }));

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            reportName: report.reportName,
            reportDate: report.reportDate,
            reportTitles: report.reportTitles,
            updatedDateUTC: report.updatedDateUTC,
            sections,
          }, null, 2),
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
    const { userId, accountId, fromDate, toDate } = args;

    const { client: xero, tenantId } = await getXeroClient(userId);

    const response = await makeXeroRequest(() =>
      xero.accountingApi.getReportBankSummary(
        tenantId,
        fromDate,
        toDate
      )
    );

    const report = response.body.reports![0];

    // Extract key sections from the report
    const sections = report.rows?.map((row: any) => ({
      title: row.title,
      rows: row.rows?.map((detailRow: any) => ({
        cells: detailRow.cells?.map((cell: any) => cell.value),
      })),
    }));

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            reportName: report.reportName,
            reportDate: report.reportDate,
            reportTitles: report.reportTitles,
            updatedDateUTC: report.updatedDateUTC,
            sections,
          }, null, 2),
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
