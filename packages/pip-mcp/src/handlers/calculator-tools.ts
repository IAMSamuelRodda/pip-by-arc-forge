/**
 * Calculator MCP Tools
 *
 * Provides accurate mathematical and financial calculations.
 * Includes Australian-specific tools (GST, BAS, super).
 */

import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { ProviderToolDefinition } from "../types/tools.js";
import * as math from "mathjs";

// ============================================================================
// Tool Definitions
// ============================================================================

export const calculatorToolDefinitions: ProviderToolDefinition[] = [
  {
    provider: "calc",
    providerType: "system",
    category: "math",
    name: "calc:calculate",
    shortName: "calculate",
    description:
      'Evaluate a mathematical expression accurately. Supports +, -, *, /, ^, sqrt, sin, cos, tan, log, exp, abs, round, floor, ceil. Also handles "X% of Y" syntax.',
    inputSchema: {
      type: "object" as const,
      properties: {
        expression: {
          type: "string",
          description: 'Mathematical expression (e.g., "2 + 2", "sqrt(16)", "15% of 200")',
        },
      },
      required: ["expression"],
    },
  },
  {
    provider: "calc",
    providerType: "system",
    category: "tax",
    name: "calc:gst",
    shortName: "gst",
    description:
      "Calculate Australian GST (10%). Use type='inclusive' to extract GST from total, or 'exclusive' to add GST.",
    inputSchema: {
      type: "object" as const,
      properties: {
        amount: {
          type: "number",
          description: "Dollar amount",
        },
        type: {
          type: "string",
          enum: ["inclusive", "exclusive"],
          description: "inclusive = extract GST from total, exclusive = add GST to amount",
        },
      },
      required: ["amount", "type"],
    },
  },
  {
    provider: "calc",
    providerType: "system",
    category: "tax",
    name: "calc:bas",
    shortName: "bas",
    description:
      "Calculate BAS (Business Activity Statement) summary from sales and purchases.",
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
          description: "PAYG withholding from wages (optional)",
        },
        paygInstalment: {
          type: "number",
          description: "PAYG instalment (optional)",
        },
      },
      required: ["totalSales", "totalPurchases"],
    },
  },
  {
    provider: "calc",
    providerType: "system",
    category: "tax",
    name: "calc:super",
    shortName: "super",
    description:
      "Calculate Australian superannuation guarantee on wages. Default rate: 11.5% (2024-25).",
    inputSchema: {
      type: "object" as const,
      properties: {
        wages: {
          type: "number",
          description: "Ordinary time earnings (gross wages)",
        },
        rate: {
          type: "number",
          description: "Super rate as percentage (default: 11.5)",
        },
      },
      required: ["wages"],
    },
  },
  {
    provider: "calc",
    providerType: "system",
    category: "finance",
    name: "calc:compound_interest",
    shortName: "compound_interest",
    description: "Calculate compound interest on investment or loan.",
    inputSchema: {
      type: "object" as const,
      properties: {
        principal: {
          type: "number",
          description: "Initial amount",
        },
        rate: {
          type: "number",
          description: "Annual interest rate as percentage",
        },
        years: {
          type: "number",
          description: "Number of years",
        },
        compoundsPerYear: {
          type: "number",
          description: "Compounding frequency (default: 12 for monthly)",
        },
      },
      required: ["principal", "rate", "years"],
    },
  },
  {
    provider: "calc",
    providerType: "system",
    category: "finance",
    name: "calc:loan_repayment",
    shortName: "loan_repayment",
    description: "Calculate loan repayment amount.",
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
    provider: "calc",
    providerType: "system",
    category: "finance",
    name: "calc:margin",
    shortName: "margin",
    description: "Calculate profit margin and markup from cost and selling price.",
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
}

function gstCalculate(amount: number, type: "inclusive" | "exclusive"): object {
  const GST_RATE = 0.1;

  if (type === "inclusive") {
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
  const gstOnSales = totalSales - totalSales / (1 + GST_RATE);
  const gstOnPurchases = totalPurchases - totalPurchases / (1 + GST_RATE);
  const netGst = gstOnSales - gstOnPurchases;
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
    note: netGst < 0 ? "GST refund due" : "GST payment due",
  };
}

function superCalculate(wages: number, rate?: number): object {
  const superRate = (rate || 11.5) / 100;
  const superAmount = wages * superRate;

  return {
    ordinaryTimeEarnings: wages,
    superGuaranteeRate: `${(superRate * 100).toFixed(1)}%`,
    superContribution: Math.round(superAmount * 100) / 100,
    totalCostToEmployer: Math.round((wages + superAmount) * 100) / 100,
    note: "Rates: 11% (2023-24), 11.5% (2024-25), 12% (2025-26+)",
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
    compoundingFrequency: n === 12 ? "monthly" : n === 1 ? "annually" : `${n}x/year`,
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
// Tool Execution
// ============================================================================

export async function executeCalculatorTool(
  toolName: string,
  args: Record<string, unknown>
): Promise<CallToolResult> {
  try {
    let result: unknown;

    switch (toolName) {
      case "calculate":
        result = calculate(args.expression as string);
        break;

      case "gst":
        result = gstCalculate(args.amount as number, args.type as "inclusive" | "exclusive");
        break;

      case "bas":
        result = basSummary(
          args.totalSales as number,
          args.totalPurchases as number,
          args.wagesWithheld as number | undefined,
          args.paygInstalment as number | undefined
        );
        break;

      case "super":
        result = superCalculate(args.wages as number, args.rate as number | undefined);
        break;

      case "compound_interest":
        result = compoundInterest(
          args.principal as number,
          args.rate as number,
          args.years as number,
          args.compoundsPerYear as number | undefined
        );
        break;

      case "loan_repayment":
        result = loanRepayment(
          args.principal as number,
          args.rate as number,
          args.years as number,
          args.frequency as "weekly" | "fortnightly" | "monthly" | undefined
        );
        break;

      case "margin":
        result = marginMarkup(args.cost as number, args.sellingPrice as number);
        break;

      default:
        return {
          content: [{ type: "text", text: `Unknown calculator tool: ${toolName}` }],
          isError: true,
        };
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
          text: `Calculation error: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
}
