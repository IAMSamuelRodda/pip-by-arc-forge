/**
 * Pip Calculator MCP Server
 *
 * Provides accurate mathematical and financial calculations for Pip.
 * Includes Australian-specific financial tools (GST, BAS, super).
 *
 * Based on mcp-calc-tools patterns, customized for bookkeeping use cases.
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import * as math from "mathjs";

// ============================================================================
// Tool Definitions
// ============================================================================

const tools = [
  // === Basic Math ===
  {
    name: "calculate",
    description:
      "Evaluate a mathematical expression. Supports +, -, *, /, ^, sqrt, sin, cos, tan, log, exp, abs, round, floor, ceil, and more.",
    inputSchema: {
      type: "object" as const,
      properties: {
        expression: {
          type: "string",
          description: 'Mathematical expression to evaluate (e.g., "2 + 2", "sqrt(16)", "15% of 200")',
        },
      },
      required: ["expression"],
    },
  },

  // === Australian Tax ===
  {
    name: "gst_calculate",
    description:
      "Calculate GST (Goods and Services Tax) for Australian businesses. Can calculate GST from total (inclusive) or add GST to amount (exclusive).",
    inputSchema: {
      type: "object" as const,
      properties: {
        amount: {
          type: "number",
          description: "The dollar amount",
        },
        type: {
          type: "string",
          enum: ["inclusive", "exclusive"],
          description: "inclusive = amount includes GST, exclusive = amount before GST",
        },
      },
      required: ["amount", "type"],
    },
  },
  {
    name: "bas_summary",
    description:
      "Calculate BAS (Business Activity Statement) summary from sales and purchases figures.",
    inputSchema: {
      type: "object" as const,
      properties: {
        totalSales: {
          type: "number",
          description: "Total sales (GST inclusive)",
        },
        totalPurchases: {
          type: "number",
          description: "Total purchases (GST inclusive)",
        },
        wagesWithheld: {
          type: "number",
          description: "PAYG withholding from employee wages (optional)",
        },
        paygInstalment: {
          type: "number",
          description: "PAYG instalment amount (optional)",
        },
      },
      required: ["totalSales", "totalPurchases"],
    },
  },
  {
    name: "super_calculate",
    description:
      "Calculate Australian superannuation guarantee (super) on wages. Current rate is 11.5% (2024-25).",
    inputSchema: {
      type: "object" as const,
      properties: {
        wages: {
          type: "number",
          description: "Ordinary time earnings (gross wages)",
        },
        rate: {
          type: "number",
          description: "Super guarantee rate as percentage (default: 11.5)",
        },
      },
      required: ["wages"],
    },
  },

  // === Financial Calculations ===
  {
    name: "compound_interest",
    description: "Calculate compound interest on an investment or loan.",
    inputSchema: {
      type: "object" as const,
      properties: {
        principal: {
          type: "number",
          description: "Initial amount",
        },
        rate: {
          type: "number",
          description: "Annual interest rate as percentage (e.g., 5 for 5%)",
        },
        years: {
          type: "number",
          description: "Number of years",
        },
        compoundsPerYear: {
          type: "number",
          description: "Compounding frequency per year (default: 12 for monthly)",
        },
      },
      required: ["principal", "rate", "years"],
    },
  },
  {
    name: "loan_repayment",
    description: "Calculate loan repayment amount (principal + interest).",
    inputSchema: {
      type: "object" as const,
      properties: {
        principal: {
          type: "number",
          description: "Loan amount",
        },
        rate: {
          type: "number",
          description: "Annual interest rate as percentage",
        },
        years: {
          type: "number",
          description: "Loan term in years",
        },
        frequency: {
          type: "string",
          enum: ["weekly", "fortnightly", "monthly"],
          description: "Repayment frequency (default: monthly)",
        },
      },
      required: ["principal", "rate", "years"],
    },
  },
  {
    name: "percentage",
    description: "Calculate percentages - what is X% of Y, or X is what % of Y.",
    inputSchema: {
      type: "object" as const,
      properties: {
        operation: {
          type: "string",
          enum: ["of", "is_what_percent"],
          description: "of = X% of Y, is_what_percent = X is what % of Y",
        },
        x: {
          type: "number",
          description: "First number",
        },
        y: {
          type: "number",
          description: "Second number",
        },
      },
      required: ["operation", "x", "y"],
    },
  },
  {
    name: "margin_markup",
    description: "Calculate profit margin or markup from cost and selling price.",
    inputSchema: {
      type: "object" as const,
      properties: {
        cost: {
          type: "number",
          description: "Cost price",
        },
        sellingPrice: {
          type: "number",
          description: "Selling price",
        },
      },
      required: ["cost", "sellingPrice"],
    },
  },
];

// ============================================================================
// Calculation Functions
// ============================================================================

function calculate(expression: string): string {
  try {
    // Handle percentage expressions like "15% of 200"
    const percentOfMatch = expression.match(/(\d+(?:\.\d+)?)\s*%\s*of\s*(\d+(?:\.\d+)?)/i);
    if (percentOfMatch) {
      const percent = parseFloat(percentOfMatch[1]);
      const value = parseFloat(percentOfMatch[2]);
      const result = (percent / 100) * value;
      return `${percent}% of ${value} = ${result}`;
    }

    const result = math.evaluate(expression);
    return typeof result === "number" ? result.toString() : String(result);
  } catch (error) {
    throw new Error(`Invalid expression: ${expression}`);
  }
}

function gstCalculate(amount: number, type: "inclusive" | "exclusive"): object {
  const GST_RATE = 0.1; // 10%

  if (type === "inclusive") {
    // Amount includes GST - extract it
    const gstAmount = amount - amount / (1 + GST_RATE);
    const exGst = amount - gstAmount;
    return {
      originalAmount: amount,
      type: "GST Inclusive",
      gstAmount: Math.round(gstAmount * 100) / 100,
      amountExGst: Math.round(exGst * 100) / 100,
      amountIncGst: amount,
    };
  } else {
    // Amount excludes GST - add it
    const gstAmount = amount * GST_RATE;
    const incGst = amount + gstAmount;
    return {
      originalAmount: amount,
      type: "GST Exclusive",
      gstAmount: Math.round(gstAmount * 100) / 100,
      amountExGst: amount,
      amountIncGst: Math.round(incGst * 100) / 100,
    };
  }
}

function basSummary(
  totalSales: number,
  totalPurchases: number,
  wagesWithheld?: number,
  paygInstalment?: number
): object {
  const GST_RATE = 0.1;

  // GST on sales (1A) - extract from inclusive amount
  const gstOnSales = totalSales - totalSales / (1 + GST_RATE);

  // GST on purchases (1B) - extract from inclusive amount
  const gstOnPurchases = totalPurchases - totalPurchases / (1 + GST_RATE);

  // Net GST payable/refundable
  const netGst = gstOnSales - gstOnPurchases;

  // Total BAS payable
  const totalPayable = netGst + (wagesWithheld || 0) + (paygInstalment || 0);

  return {
    period: "BAS Summary",
    salesGstInclusive: totalSales,
    salesGstExclusive: Math.round((totalSales / (1 + GST_RATE)) * 100) / 100,
    gstOnSales_1A: Math.round(gstOnSales * 100) / 100,
    purchasesGstInclusive: totalPurchases,
    purchasesGstExclusive: Math.round((totalPurchases / (1 + GST_RATE)) * 100) / 100,
    gstOnPurchases_1B: Math.round(gstOnPurchases * 100) / 100,
    netGstPayable: Math.round(netGst * 100) / 100,
    paygWithholding_W1: wagesWithheld || 0,
    paygInstalment_T1: paygInstalment || 0,
    totalAmountOwing: Math.round(totalPayable * 100) / 100,
    note: netGst < 0 ? "GST refund due (purchases > sales)" : "GST payment due",
  };
}

function superCalculate(wages: number, rate?: number): object {
  const superRate = (rate || 11.5) / 100; // Default 11.5% for 2024-25
  const superAmount = wages * superRate;

  return {
    ordinaryTimeEarnings: wages,
    superGuaranteeRate: `${(superRate * 100).toFixed(1)}%`,
    superContribution: Math.round(superAmount * 100) / 100,
    totalCostToEmployer: Math.round((wages + superAmount) * 100) / 100,
    note: "Super guarantee rate: 11% (2023-24), 11.5% (2024-25), 12% (2025-26 onwards)",
  };
}

function compoundInterest(
  principal: number,
  rate: number,
  years: number,
  compoundsPerYear?: number
): object {
  const n = compoundsPerYear || 12;
  const r = rate / 100;
  const amount = principal * Math.pow(1 + r / n, n * years);
  const interest = amount - principal;

  return {
    principal,
    annualRate: `${rate}%`,
    years,
    compoundingFrequency: n === 12 ? "monthly" : n === 1 ? "annually" : `${n} times/year`,
    finalAmount: Math.round(amount * 100) / 100,
    totalInterest: Math.round(interest * 100) / 100,
  };
}

function loanRepayment(
  principal: number,
  rate: number,
  years: number,
  frequency?: "weekly" | "fortnightly" | "monthly"
): object {
  const freq = frequency || "monthly";
  const periodsPerYear = freq === "weekly" ? 52 : freq === "fortnightly" ? 26 : 12;
  const totalPeriods = years * periodsPerYear;
  const periodRate = rate / 100 / periodsPerYear;

  // PMT formula
  const payment =
    (principal * periodRate * Math.pow(1 + periodRate, totalPeriods)) /
    (Math.pow(1 + periodRate, totalPeriods) - 1);

  const totalPayments = payment * totalPeriods;
  const totalInterest = totalPayments - principal;

  return {
    loanAmount: principal,
    annualRate: `${rate}%`,
    termYears: years,
    repaymentFrequency: freq,
    repaymentAmount: Math.round(payment * 100) / 100,
    totalRepayments: Math.round(totalPayments * 100) / 100,
    totalInterest: Math.round(totalInterest * 100) / 100,
  };
}

function percentageCalc(
  operation: "of" | "is_what_percent",
  x: number,
  y: number
): object {
  if (operation === "of") {
    const result = (x / 100) * y;
    return {
      calculation: `${x}% of ${y}`,
      result: Math.round(result * 100) / 100,
    };
  } else {
    const result = (x / y) * 100;
    return {
      calculation: `${x} is what % of ${y}`,
      result: `${Math.round(result * 100) / 100}%`,
    };
  }
}

function marginMarkup(cost: number, sellingPrice: number): object {
  const profit = sellingPrice - cost;
  const margin = (profit / sellingPrice) * 100;
  const markup = (profit / cost) * 100;

  return {
    cost,
    sellingPrice,
    profit: Math.round(profit * 100) / 100,
    profitMargin: `${Math.round(margin * 100) / 100}%`,
    markup: `${Math.round(markup * 100) / 100}%`,
    note: "Margin = profit/selling price, Markup = profit/cost",
  };
}

// ============================================================================
// MCP Server Setup
// ============================================================================

const server = new Server(
  {
    name: "pip-calculator",
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools,
}));

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    let result: unknown;

    switch (name) {
      case "calculate":
        result = calculate(args?.expression as string);
        break;

      case "gst_calculate":
        result = gstCalculate(
          args?.amount as number,
          args?.type as "inclusive" | "exclusive"
        );
        break;

      case "bas_summary":
        result = basSummary(
          args?.totalSales as number,
          args?.totalPurchases as number,
          args?.wagesWithheld as number | undefined,
          args?.paygInstalment as number | undefined
        );
        break;

      case "super_calculate":
        result = superCalculate(args?.wages as number, args?.rate as number | undefined);
        break;

      case "compound_interest":
        result = compoundInterest(
          args?.principal as number,
          args?.rate as number,
          args?.years as number,
          args?.compoundsPerYear as number | undefined
        );
        break;

      case "loan_repayment":
        result = loanRepayment(
          args?.principal as number,
          args?.rate as number,
          args?.years as number,
          args?.frequency as "weekly" | "fortnightly" | "monthly" | undefined
        );
        break;

      case "percentage":
        result = percentageCalc(
          args?.operation as "of" | "is_what_percent",
          args?.x as number,
          args?.y as number
        );
        break;

      case "margin_markup":
        result = marginMarkup(args?.cost as number, args?.sellingPrice as number);
        break;

      default:
        throw new Error(`Unknown tool: ${name}`);
    }

    return {
      content: [
        {
          type: "text",
          text: typeof result === "string" ? result : JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Error: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Pip Calculator MCP server running on stdio");
}

main().catch(console.error);
