# Xero API Integration Guide

> **Last Updated**: 2025-11-12
> **Purpose**: Comprehensive reference for Xero API integration via xero-node SDK

## Overview

This document provides implementation guidance for integrating with the Xero Accounting API using the official xero-node SDK. It covers authentication, token management, API usage patterns, rate limits, and best practices.

**Sources**:
- [xero-node SDK (GitHub)](https://github.com/XeroAPI/xero-node)
- [Xero OAuth 2.0 Documentation](https://developer.xero.com/documentation/guides/oauth2/)
- [Xero Accounting API](https://developer.xero.com/documentation/api/accounting/overview)

---

## Installation

```bash
npm install xero-node@^7.2.0
```

**Version Note**: Using xero-node v7+ (OAuth 2.0 based, OpenAPI generated).

---

## OAuth 2.0 Authentication

### 1. OAuth Flow Types

**Standard OAuth 2.0 (User Authorization)** - Recommended for Xero Agent:
```typescript
import { XeroClient } from 'xero-node';

const xero = new XeroClient({
  clientId: process.env.XERO_CLIENT_ID,
  clientSecret: process.env.XERO_CLIENT_SECRET,
  redirectUris: ['https://your-app.com/auth/callback'],
  scopes: [
    'openid',
    'profile',
    'email',
    'accounting.transactions',      // Read/write invoices, expenses
    'accounting.settings',           // Read organization details
    'accounting.reports.read',       // Read financial reports
    'offline_access',                // Get refresh token
  ],
  httpTimeout: 3000,
  clockTolerance: 10,
});
```

**Client Credentials (M2M)** - For server-to-server:
```typescript
const xero = new XeroClient({
  clientId: process.env.XERO_CLIENT_ID,
  clientSecret: process.env.XERO_CLIENT_SECRET,
  grantType: 'client_credentials',
});
```

### 2. OAuth Scopes

| Scope | Purpose | Required for Xero Agent? |
|-------|---------|--------------------------|
| `openid` | OIDC authentication | ✅ Yes |
| `profile` | User profile info | ✅ Yes |
| `email` | User email | ✅ Yes |
| `accounting.transactions` | Read/write invoices, expenses, bank transactions | ✅ Yes |
| `accounting.settings` | Read organization details | ✅ Yes |
| `accounting.reports.read` | Read P&L, balance sheet, etc. | ✅ Yes |
| `offline_access` | Get refresh token (60-day validity) | ✅ Yes |
| `accounting.contacts` | Manage contacts | ⚠️ Optional |
| `accounting.attachments` | Manage file attachments | ⚠️ Optional |

### 3. Authorization Flow

**Step 1: Build Consent URL**
```typescript
async function initiateOAuth() {
  await xero.initialize(); // Loads OpenID config
  const consentUrl = await xero.buildConsentUrl();
  // Redirect user to consentUrl
  return consentUrl;
}
```

**Step 2: Handle Callback**
```typescript
async function handleOAuthCallback(req: Request) {
  // Exchange authorization code for tokens
  const tokenSet = await xero.apiCallback(req.url);

  // Store token set in AWS Secrets Manager
  await secretsManager.putSecretValue({
    SecretId: `xero-agent/tokens/${userId}`,
    SecretString: JSON.stringify({
      access_token: tokenSet.access_token,
      refresh_token: tokenSet.refresh_token,
      id_token: tokenSet.id_token,
      expires_at: tokenSet.expires_at, // Unix timestamp
      scope: tokenSet.scope,
    }),
  });

  // Store metadata in DynamoDB
  await dynamoDB.put({
    TableName: 'xero-agent-main',
    Item: {
      PK: `USER#${userId}`,
      SK: `TOKEN#${xeroTenantId}`,
      userId,
      xeroTenantId: tokenSet.claims.xero_userid,
      secretArn: `arn:aws:secretsmanager:...`,
      expiresAt: tokenSet.expires_at,
      scopes: tokenSet.scope,
      createdAt: Date.now(),
    },
  });
}
```

### 4. Token Management

**Token Expiry Times:**
- **Access Token**: 30 minutes
- **Refresh Token**: 60 days (unused)
- **ID Token**: Same as access token

**Automatic Refresh Logic:**
```typescript
async function getValidTokenSet(userId: string): Promise<TokenSet> {
  // 1. Load token set from Secrets Manager
  const secret = await secretsManager.getSecretValue({
    SecretId: `xero-agent/tokens/${userId}`,
  });

  const tokenSet = JSON.parse(secret.SecretString);

  // 2. Check if expired (with 5-minute buffer)
  const expiresIn = tokenSet.expires_at - Math.floor(Date.now() / 1000);
  if (expiresIn < 300) {
    // Less than 5 minutes remaining

    // 3. Refresh using refresh token
    const newTokenSet = await xero.refreshWithRefreshToken(
      process.env.XERO_CLIENT_ID,
      process.env.XERO_CLIENT_SECRET,
      tokenSet.refresh_token
    );

    // 4. Update Secrets Manager
    await secretsManager.putSecretValue({
      SecretId: `xero-agent/tokens/${userId}`,
      SecretString: JSON.stringify({
        access_token: newTokenSet.access_token,
        refresh_token: newTokenSet.refresh_token,
        id_token: newTokenSet.id_token,
        expires_at: newTokenSet.expires_at,
        scope: newTokenSet.scope,
      }),
    });

    // 5. Update DynamoDB metadata
    await dynamoDB.update({
      TableName: 'xero-agent-main',
      Key: {
        PK: `USER#${userId}`,
        SK: `TOKEN#${xeroTenantId}`,
      },
      UpdateExpression: 'SET expiresAt = :expiresAt, updatedAt = :updatedAt',
      ExpressionAttributeValues: {
        ':expiresAt': newTokenSet.expires_at,
        ':updatedAt': Date.now(),
      },
    });

    return newTokenSet;
  }

  return tokenSet;
}
```

---

## API Client Usage

### 1. Initialize Client with Token

```typescript
async function getXeroClient(userId: string): Promise<XeroClient> {
  // Get valid (refreshed if needed) token set
  const tokenSet = await getValidTokenSet(userId);

  // Initialize client
  const xero = new XeroClient({
    clientId: process.env.XERO_CLIENT_ID,
    clientSecret: process.env.XERO_CLIENT_SECRET,
    redirectUris: [process.env.XERO_REDIRECT_URI],
  });

  await xero.initialize();
  await xero.setTokenSet(tokenSet);

  return xero;
}
```

### 2. Get Tenant ID

**IMPORTANT**: Most Xero API methods require a `xeroTenantId` (organization ID).

```typescript
async function getXeroTenantId(xero: XeroClient): Promise<string> {
  const connections = await xero.updateTenants();
  // Use first tenant (most users have 1 organization)
  return connections[0].tenantId;
}
```

---

## Invoices API

### Create Invoice

```typescript
import { Invoice, LineItem, Contact } from 'xero-node';

async function createInvoice(
  xero: XeroClient,
  xeroTenantId: string,
  data: {
    contactName: string;
    contactEmail?: string;
    invoiceNumber?: string;
    date: string; // 'YYYY-MM-DD'
    dueDate: string;
    lineItems: Array<{
      description: string;
      quantity: number;
      unitAmount: number;
      accountCode?: string;
      taxType?: string;
    }>;
  }
) {
  const invoice: Invoice = {
    type: Invoice.TypeEnum.ACCREC, // Accounts Receivable (sales invoice)
    contact: {
      name: data.contactName,
      emailAddress: data.contactEmail,
    },
    invoiceNumber: data.invoiceNumber,
    date: data.date,
    dueDate: data.dueDate,
    lineItems: data.lineItems.map((item) => ({
      description: item.description,
      quantity: item.quantity,
      unitAmount: item.unitAmount,
      accountCode: item.accountCode || '200', // Default sales account
      taxType: item.taxType || 'OUTPUT2', // Default tax
    })),
    status: Invoice.StatusEnum.DRAFT,
  };

  const response = await xero.accountingApi.createInvoices(
    xeroTenantId,
    { invoices: [invoice] }
  );

  return response.body.invoices[0];
}
```

### Get Invoice

```typescript
async function getInvoice(
  xero: XeroClient,
  xeroTenantId: string,
  invoiceId: string
) {
  const response = await xero.accountingApi.getInvoice(
    xeroTenantId,
    invoiceId
  );

  return response.body.invoices[0];
}
```

### List Invoices with Filters

```typescript
async function listInvoices(
  xero: XeroClient,
  xeroTenantId: string,
  filters?: {
    status?: 'DRAFT' | 'SUBMITTED' | 'AUTHORISED' | 'PAID' | 'VOIDED';
    contactName?: string;
    fromDate?: string; // 'YYYY-MM-DD'
    toDate?: string;
    page?: number;
  }
) {
  // Build where clause
  const whereClauses: string[] = [];

  if (filters?.status) {
    whereClauses.push(`Status=="${filters.status}"`);
  }

  if (filters?.contactName) {
    whereClauses.push(`Contact.Name.Contains("${filters.contactName}")`);
  }

  if (filters?.fromDate) {
    whereClauses.push(`Date >= DateTime(${filters.fromDate})`);
  }

  if (filters?.toDate) {
    whereClauses.push(`Date <= DateTime(${filters.toDate})`);
  }

  const where = whereClauses.length > 0 ? whereClauses.join(' AND ') : undefined;

  const response = await xero.accountingApi.getInvoices(
    xeroTenantId,
    undefined, // modifiedSince
    where,
    undefined, // order
    undefined, // IDs
    undefined, // invoiceNumbers
    undefined, // contactIDs
    undefined, // statuses
    filters?.page || 1, // page
    100, // pageSize (max 100)
    false, // includeArchived
    false, // createdByMyApp
    false, // summaryOnly
    undefined // searchTerm
  );

  return response.body.invoices || [];
}
```

### Send Invoice

```typescript
async function sendInvoice(
  xero: XeroClient,
  xeroTenantId: string,
  invoiceId: string
) {
  // First, get invoice to ensure status is AUTHORISED
  const invoice = await getInvoice(xero, xeroTenantId, invoiceId);

  if (invoice.status !== Invoice.StatusEnum.AUTHORISED) {
    // Update status to AUTHORISED before sending
    await xero.accountingApi.updateInvoice(
      xeroTenantId,
      invoiceId,
      {
        invoices: [{
          invoiceID: invoiceId,
          status: Invoice.StatusEnum.AUTHORISED,
        }],
      }
    );
  }

  // Email invoice to contact
  await xero.accountingApi.emailInvoice(xeroTenantId, invoiceId);
}
```

---

## Bank Transactions API

### Get Bank Transactions

```typescript
async function getBankTransactions(
  xero: XeroClient,
  xeroTenantId: string,
  accountId: string,
  filters?: {
    fromDate?: string;
    toDate?: string;
    page?: number;
  }
) {
  const whereClauses: string[] = [`BankAccount.AccountID == Guid("${accountId}")`];

  if (filters?.fromDate) {
    whereClauses.push(`Date >= DateTime(${filters.fromDate})`);
  }

  if (filters?.toDate) {
    whereClauses.push(`Date <= DateTime(${filters.toDate})`);
  }

  const where = whereClauses.join(' AND ');

  const response = await xero.accountingApi.getBankTransactions(
    xeroTenantId,
    undefined, // modifiedSince
    where,
    undefined, // order
    filters?.page || 1,
    100 // pageSize
  );

  return response.body.bankTransactions || [];
}
```

### Reconcile Transaction

```typescript
import { BankTransaction } from 'xero-node';

async function reconcileTransaction(
  xero: XeroClient,
  xeroTenantId: string,
  transactionId: string,
  invoiceId: string
) {
  // Update bank transaction to link with invoice
  const response = await xero.accountingApi.updateBankTransaction(
    xeroTenantId,
    transactionId,
    {
      bankTransactions: [{
        bankTransactionID: transactionId,
        isReconciled: true,
        lineItems: [{
          invoiceID: invoiceId,
        }],
      }],
    }
  );

  return response.body.bankTransactions[0];
}
```

---

## Reporting API

### Profit & Loss Report

```typescript
async function generateProfitLoss(
  xero: XeroClient,
  xeroTenantId: string,
  options: {
    fromDate: string; // 'YYYY-MM-DD'
    toDate: string;
    periods?: number; // Number of periods (default 1)
    timeframe?: 'MONTH' | 'QUARTER' | 'YEAR';
  }
) {
  const response = await xero.accountingApi.getReportProfitAndLoss(
    xeroTenantId,
    options.fromDate,
    options.toDate,
    options.periods || 1,
    options.timeframe || 'MONTH'
  );

  return response.body.reports[0];
}
```

### Balance Sheet Report

```typescript
async function generateBalanceSheet(
  xero: XeroClient,
  xeroTenantId: string,
  date: string, // 'YYYY-MM-DD'
  periods?: number
) {
  const response = await xero.accountingApi.getReportBalanceSheet(
    xeroTenantId,
    date,
    periods || 1,
    'MONTH'
  );

  return response.body.reports[0];
}
```

### Bank Summary Report

```typescript
async function generateBankSummary(
  xero: XeroClient,
  xeroTenantId: string,
  accountId: string,
  fromDate: string,
  toDate: string
) {
  const response = await xero.accountingApi.getReportBankSummary(
    xeroTenantId,
    fromDate,
    toDate
  );

  // Filter for specific account
  const report = response.body.reports[0];
  const accountData = report.rows?.find(
    (row) => row.cells[0].value === accountId
  );

  return accountData;
}
```

---

## Rate Limits & Pagination

### Rate Limits

**Per-Tenant Limits:**
- **Per Minute**: 60 API calls
- **Per Day**: 5,000 API calls

**Global Limits:**
- **Concurrent Requests**: 100

**Best Practices:**
1. Implement exponential backoff on 429 responses
2. Cache frequently accessed data (contacts, accounts)
3. Use pagination to reduce payload sizes
4. Batch operations when possible

### Pagination Pattern

```typescript
async function getAllInvoices(
  xero: XeroClient,
  xeroTenantId: string
): Promise<Invoice[]> {
  let allInvoices: Invoice[] = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const response = await xero.accountingApi.getInvoices(
      xeroTenantId,
      undefined, // modifiedSince
      undefined, // where
      undefined, // order
      undefined, // IDs
      undefined, // invoiceNumbers
      undefined, // contactIDs
      undefined, // statuses
      page,
      100 // pageSize (max)
    );

    const invoices = response.body.invoices || [];
    allInvoices = allInvoices.concat(invoices);

    hasMore = invoices.length === 100; // If full page, there may be more
    page++;

    // Respect rate limits
    await sleep(1000); // 1 second between requests
  }

  return allInvoices;
}
```

---

## Error Handling

### Common Errors

| HTTP Status | Error | Handling Strategy |
|-------------|-------|-------------------|
| 401 | Unauthorized | Refresh access token |
| 403 | Forbidden | Check scopes, user permissions |
| 404 | Not Found | Resource doesn't exist |
| 429 | Too Many Requests | Exponential backoff, retry |
| 500 | Internal Server Error | Retry with exponential backoff |
| 503 | Service Unavailable | Retry after delay |

### Retry Logic with Exponential Backoff

```typescript
async function makeXeroRequest<T>(
  requestFn: () => Promise<T>,
  maxRetries = 3
): Promise<T> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await requestFn();
    } catch (error: any) {
      const status = error.response?.statusCode || error.statusCode;

      if (status === 401) {
        // Token expired - refresh and retry once
        if (attempt === 0) {
          await refreshAccessToken();
          continue;
        }
        throw new Error('Authentication failed after token refresh');
      }

      if (status === 429 || status >= 500) {
        // Rate limit or server error - exponential backoff
        const delay = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s
        await sleep(delay);
        continue;
      }

      // Non-retryable error
      throw error;
    }
  }

  throw new Error('Max retries exceeded');
}
```

---

## Caching Strategy

Cache API responses in DynamoDB to reduce API calls:

```typescript
async function getCachedInvoices(
  xero: XeroClient,
  xeroTenantId: string,
  filters: any
): Promise<Invoice[]> {
  const cacheKey = `CACHE#invoices-${JSON.stringify(filters)}`;

  // Check cache
  const cached = await dynamoDB.get({
    TableName: 'xero-agent-main',
    Key: { PK: cacheKey, SK: 'DATA' },
  });

  if (cached.Item && cached.Item.ttl > Math.floor(Date.now() / 1000)) {
    return JSON.parse(cached.Item.data);
  }

  // Cache miss - fetch from Xero
  const invoices = await listInvoices(xero, xeroTenantId, filters);

  // Store in cache (5-minute TTL)
  await dynamoDB.put({
    TableName: 'xero-agent-main',
    Item: {
      PK: cacheKey,
      SK: 'DATA',
      data: JSON.stringify(invoices),
      ttl: Math.floor(Date.now() / 1000) + 300, // 5 minutes
      createdAt: Date.now(),
    },
  });

  return invoices;
}
```

---

## Security Best Practices

1. **Never Log Tokens**: Exclude access_token, refresh_token from logs
2. **Encrypt at Rest**: Use AWS Secrets Manager (KMS-encrypted)
3. **Short-Lived Tokens**: Xero enforces 30-minute expiry
4. **Scope Minimization**: Request only required scopes
5. **User Consent**: Always require explicit user authorization
6. **HTTPS Only**: All API calls over TLS 1.3
7. **CSRF Protection**: Use state parameter in OAuth flow

---

## Testing

### Local Development

```typescript
// .env.local
XERO_CLIENT_ID=your_client_id
XERO_CLIENT_SECRET=your_client_secret
XERO_REDIRECT_URI=http://localhost:3000/auth/callback

// Test with Xero Demo Company
// https://developer.xero.com/myapps/
```

### Integration Tests

```typescript
describe('Xero Invoice API', () => {
  let xero: XeroClient;
  let xeroTenantId: string;

  beforeAll(async () => {
    xero = await getXeroClient(testUserId);
    xeroTenantId = await getXeroTenantId(xero);
  });

  test('should create invoice', async () => {
    const invoice = await createInvoice(xero, xeroTenantId, {
      contactName: 'Test Customer',
      date: '2025-01-01',
      dueDate: '2025-01-31',
      lineItems: [
        {
          description: 'Test Service',
          quantity: 1,
          unitAmount: 100,
        },
      ],
    });

    expect(invoice.invoiceID).toBeDefined();
    expect(invoice.total).toBe(100);
  });
});
```

---

## References

- **xero-node SDK**: https://github.com/XeroAPI/xero-node
- **Xero API Docs**: https://developer.xero.com/documentation/api/accounting/overview
- **OAuth 2.0 Guide**: https://developer.xero.com/documentation/guides/oauth2/
- **Rate Limits**: https://developer.xero.com/documentation/guides/oauth2/limits/
- **Demo App**: https://github.com/XeroAPI/xero-node-oauth2-app
- **API Reference**: https://xeroapi.github.io/xero-node/accounting/

---

**Last Updated**: 2025-11-12
