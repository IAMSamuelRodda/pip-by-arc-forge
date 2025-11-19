/**
 * Xero API Client Wrapper
 *
 * Handles OAuth token management and API requests to Xero
 * Uses tokens stored in the database
 */

import type { DatabaseProvider, OAuthTokens } from "@zero-agent/core";

const XERO_TOKEN_URL = "https://identity.xero.com/connect/token";
const XERO_API_BASE = "https://api.xero.com/api.xro/2.0";

export class XeroClient {
  private db: DatabaseProvider;
  private clientId: string;
  private clientSecret: string;

  constructor(db: DatabaseProvider, clientId: string, clientSecret: string) {
    this.db = db;
    this.clientId = clientId;
    this.clientSecret = clientSecret;
  }

  /**
   * Make an authenticated request to Xero API
   */
  async request(
    userId: string,
    endpoint: string,
    method: string = "GET",
    body?: any
  ): Promise<any> {
    // Get tokens and refresh if needed
    const tokens = await this.getValidTokens(userId);

    const url = `${XERO_API_BASE}/${endpoint}`;

    const response = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${tokens.accessToken}`,
        "xero-tenant-id": tokens.tenantId!,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Xero API error (${response.status}): ${errorText}`);
    }

    return await response.json();
  }

  /**
   * Get valid OAuth tokens, refreshing if needed
   */
  private async getValidTokens(userId: string): Promise<OAuthTokens> {
    let tokens = await this.db.getOAuthTokens(userId, "xero");

    if (!tokens) {
      throw new Error(
        "No Xero authentication found. Please connect to Xero first."
      );
    }

    // Refresh if token expires in less than 5 minutes
    if (tokens.expiresAt < Date.now() + 5 * 60 * 1000) {
      console.log("🔄 Refreshing Xero access token...");
      tokens = await this.refreshAccessToken(tokens);
    }

    return tokens;
  }

  /**
   * Refresh access token using refresh token
   */
  private async refreshAccessToken(tokens: OAuthTokens): Promise<OAuthTokens> {
    const tokenResponse = await fetch(XERO_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(
          `${this.clientId}:${this.clientSecret}`
        ).toString("base64")}`,
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: tokens.refreshToken,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      throw new Error(`Token refresh failed: ${errorText}`);
    }

    const tokenData = (await tokenResponse.json()) as {
      access_token: string;
      refresh_token: string;
      expires_in: number;
    };

    const updatedTokens: OAuthTokens = {
      ...tokens,
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      expiresAt: Date.now() + tokenData.expires_in * 1000,
      updatedAt: Date.now(),
    };

    await this.db.saveOAuthTokens(updatedTokens);
    console.log("✅ Xero token refreshed");

    return updatedTokens;
  }

  // ============================================================================
  // Convenience methods for common Xero operations
  // ============================================================================

  /**
   * Get organization details
   */
  async getOrganisation(userId: string) {
    const response = await this.request(userId, "Organisation");
    return response.Organisations?.[0];
  }

  /**
   * Get invoices with optional filters
   */
  async getInvoices(
    userId: string,
    options?: {
      status?: "DRAFT" | "SUBMITTED" | "AUTHORISED" | "PAID" | "VOIDED";
      page?: number;
      orderBy?: string;
    }
  ) {
    let endpoint = "Invoices";
    const params = new URLSearchParams();

    if (options?.status) {
      params.set("where", `Status=="${options.status}"`);
    }
    if (options?.page) {
      params.set("page", options.page.toString());
    }
    if (options?.orderBy) {
      params.set("order", options.orderBy);
    }

    if (params.toString()) {
      endpoint += `?${params.toString()}`;
    }

    const response = await this.request(userId, endpoint);
    return response.Invoices || [];
  }

  /**
   * Get a single invoice by ID
   */
  async getInvoice(userId: string, invoiceId: string) {
    const response = await this.request(userId, `Invoices/${invoiceId}`);
    return response.Invoices?.[0];
  }

  /**
   * Create a new invoice
   */
  async createInvoice(userId: string, invoiceData: any) {
    const response = await this.request(userId, "Invoices", "POST", {
      Invoices: [invoiceData],
    });
    return response.Invoices?.[0];
  }

  /**
   * Get contacts (customers/suppliers)
   */
  async getContacts(userId: string, options?: { page?: number }) {
    let endpoint = "Contacts";
    if (options?.page) {
      endpoint += `?page=${options.page}`;
    }

    const response = await this.request(userId, endpoint);
    return response.Contacts || [];
  }

  /**
   * Get bank transactions
   */
  async getBankTransactions(
    userId: string,
    options?: {
      bankAccountId?: string;
      status?: "AUTHORISED" | "DELETED" | "VOIDED";
      page?: number;
    }
  ) {
    let endpoint = "BankTransactions";
    const params = new URLSearchParams();

    if (options?.bankAccountId) {
      params.set("where", `BankAccountID=="${options.bankAccountId}"`);
    }
    if (options?.status) {
      params.set("where", `Status=="${options.status}"`);
    }
    if (options?.page) {
      params.set("page", options.page.toString());
    }

    if (params.toString()) {
      endpoint += `?${params.toString()}`;
    }

    const response = await this.request(userId, endpoint);
    return response.BankTransactions || [];
  }

  /**
   * Get accounts (chart of accounts)
   */
  async getAccounts(userId: string) {
    const response = await this.request(userId, "Accounts");
    return response.Accounts || [];
  }

  /**
   * Get balance sheet report
   */
  async getBalanceSheet(userId: string, date?: string) {
    let endpoint = "Reports/BalanceSheet";
    if (date) {
      endpoint += `?date=${date}`;
    }

    const response = await this.request(userId, endpoint);
    return response.Reports?.[0];
  }

  /**
   * Get profit & loss report
   */
  async getProfitAndLoss(
    userId: string,
    options?: {
      fromDate?: string;
      toDate?: string;
    }
  ) {
    let endpoint = "Reports/ProfitAndLoss";
    const params = new URLSearchParams();

    if (options?.fromDate) {
      params.set("fromDate", options.fromDate);
    }
    if (options?.toDate) {
      params.set("toDate", options.toDate);
    }

    if (params.toString()) {
      endpoint += `?${params.toString()}`;
    }

    const response = await this.request(userId, endpoint);
    return response.Reports?.[0];
  }
}
