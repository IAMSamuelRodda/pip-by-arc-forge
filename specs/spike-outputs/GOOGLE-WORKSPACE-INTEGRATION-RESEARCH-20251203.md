# Google Workspace Integration Research Report

> **Date**: 2025-12-03
> **Status**: Complete (Updated with CRITICAL corrections)
> **Purpose**: Research for issue_028 (Connectors Menu) - Google Workspace integration

## Executive Summary

Integrating Google Workspace (Drive, Sheets, Gmail) as MCP connectors alongside Xero is feasible, but Gmail integration has significant compliance barriers.

**⚠️ CRITICAL FINDING: `gmail.readonly` is a RESTRICTED scope (not sensitive)**
- Requires CASA (Cloud Application Security Assessment)
- Annual security audits: $500 - $75,000+ per year
- Verification takes several weeks
- NO workarounds exist for production apps

**Key Recommendations:**
1. **For Demo (Dental Practice)**: Use Testing Mode (100 user limit) - no CASA required
2. **For Production**: Budget for CASA assessment OR use Google Workspace domain-wide delegation
3. **Reuse existing Xero OAuth infrastructure** with minor extensions
4. **Use lazy-loading pattern** (already proven with Xero - 85% context reduction)
5. **Consider Drive/Sheets first** (non-sensitive scopes available)

---

## 1. OAuth 2.0 Architecture

### Token Lifecycle Comparison

| Provider | Access Token Expiry | Refresh Token Expiry |
|----------|--------------------|--------------------|
| **Xero** | 30 minutes | 60 days |
| **Google** | 1 hour | Effectively unlimited (published apps) |

**Google Refresh Token Caveats:**
- Testing apps: 7-day expiration (must publish before launch)
- User limit: 100 refresh tokens per Google Account per OAuth client
- Revoked on: password change (if Gmail scopes), 6 months inactivity, explicit revoke

### Service Account vs User OAuth

| Feature | User OAuth (Recommended) | Service Account |
|---------|-------------------------|-----------------|
| **Use case** | Multi-user SaaS | Server-to-server |
| **Access scope** | User's files only | Entire domain (with delegation) |
| **Best for Pip** | ✅ YES | ❌ NO |

### Incremental Authorization

Google supports requesting scopes incrementally using `include_granted_scopes=true`:

```typescript
// Initial connection - Drive only
authUrl = buildAuthUrl({
  scopes: ['https://www.googleapis.com/auth/drive.file'],
  include_granted_scopes: true
});

// Later - add Sheets
authUrl = buildAuthUrl({
  scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  include_granted_scopes: true // Preserves Drive access
});
```

---

## 2. Scope Strategy (Critical for Verification)

### Gmail Scope Categories (CORRECTED)

| Scope | Category | Requirements |
|-------|----------|-------------|
| `gmail.labels` | **Non-Sensitive** | Minimal verification |
| `gmail.send` | **Sensitive** | 3-5 business days verification |
| `gmail.addons.current.message.metadata` | **Sensitive** | 3-5 business days verification |
| `gmail.readonly` | **⚠️ RESTRICTED** | CASA security assessment (annual) |
| `gmail.compose` | **⚠️ RESTRICTED** | CASA security assessment (annual) |
| `gmail.modify` | **⚠️ RESTRICTED** | CASA security assessment (annual) |
| `gmail.metadata` | **⚠️ RESTRICTED** | CASA security assessment (annual) |
| `mail.google.com/` | **⚠️ RESTRICTED** | CASA security assessment (annual) |

### Drive/Sheets Scope Categories

| Category | Verification | Drive Scopes | Sheets Scopes |
|----------|-------------|--------------|---------------|
| **Non-Sensitive** | Minimal | `drive.file` (app-created only) | - |
| **Sensitive** | 3-5 business days | `drive.readonly` | `spreadsheets.readonly`, `spreadsheets` |
| **Restricted** | CASA required | `drive` (full) | - |

### CASA Security Assessment Details

| Tier | Scope | Typical Cost | Cadence |
|------|-------|--------------|---------|
| Tier 1 | Self-assessment | Free | Initial |
| Tier 2 | Lab-verified | $500 - $4,500 | Annual |
| Tier 3 | Full audit | $15,000 - $75,000+ | Annual |

**Key Point**: Any app storing restricted scope data on servers MUST complete CASA.

### Recommended Phased Approach

**For Demo/Testing (100 user limit)**:
- Keep app in "Testing" publishing status
- Add specific users as test users
- Full functionality without CASA
- 7-day refresh token expiration (acceptable for demo)

**For Production**:
- Drive/Sheets: Use sensitive scopes (3-5 day verification)
- Gmail: Budget for CASA ($4,500+ annually) OR use domain-wide delegation

---

## 3. Rate Limits & Quotas

### Gmail API Quotas (Detailed)

| Limit Type | Value |
|------------|-------|
| **Per Project** | 1,200,000 quota units/minute |
| **Per User** | 15,000 quota units/user/minute |

| Operation | Quota Units |
|-----------|-------------|
| `messages.list` | 5 |
| `messages.get` | 5 |
| `messages.attachments.get` | 5 |
| `messages.send` | 100 |
| `threads.list` | 10 |
| `threads.get` | 10 |
| `labels.list` | 1 |
| `labels.get` | 1 |

**Example**: At 15,000 units/user/minute:
- Can retrieve ~3,000 messages per minute per user
- Can send ~150 messages per minute per user

### Drive/Sheets Quotas

| API | Default Quota | Per-User Limit |
|-----|---------------|----------------|
| **Drive** | 20,000 queries/100s | 1,000/100s |
| **Sheets** | 20,000 queries/100s | Same |

**Best Practices:**
- Batch requests (up to 100 per batch)
- Exponential backoff with jitter for 429 errors
- Cache frequently accessed data
- Use `fields` parameter for partial responses
- Use Gmail push notifications (Pub/Sub) instead of polling

---

## 4. Proposed MCP Tools

### Google Drive Tools

```typescript
// Phase 1 - Read Only
search_drive_files(query, mimeType?, limit?)
  // Find invoices, receipts, financial docs

get_drive_file(fileId, exportFormat?)
  // Read document contents (with export for Docs/Sheets)

list_drive_folder(folderId?, maxResults?)
  // Browse structured file hierarchies

// Phase 2 - Write Operations
upload_drive_file(name, mimeType, content, folderId?)
  // Save reports, backups
```

### Google Sheets Tools

```typescript
// Phase 1 - Read Only
read_sheet_range(spreadsheetId, range)
  // Read expense logs, budgets, KPIs

get_sheet_metadata(spreadsheetId)
  // Discover sheet structure

// Phase 2 - Write Operations
create_spreadsheet(title, sheets?)
  // Generate monthly reports

write_sheet_range(spreadsheetId, range, values)
  // Write summaries, logs

append_sheet_rows(spreadsheetId, range, values)
  // Log transactions
```

### Gmail Tools (Testing Mode - 100 User Limit)

```typescript
// Search using Gmail query syntax (same as Gmail search box)
search_gmail(query: string, maxResults?: number)
  // Examples:
  // "from:supplier@example.com has:attachment filename:pdf"
  // "subject:invoice after:2025/01/01"
  // "from:accounts@dental-supplier.com"
  // Returns: [{messageId, snippet, from, subject, date}]

// Get full email content including body
get_email_content(messageId: string)
  // Returns: {
  //   id, threadId, labelIds,
  //   from, to, cc, subject, date,
  //   bodyText, bodyHtml,
  //   attachments: [{id, filename, mimeType, size}]
  // }

// Download and optionally parse attachment
download_attachment(messageId: string, attachmentId: string)
  // Returns: {
  //   filename, mimeType, size,
  //   data: base64,
  //   parsed?: string  // If PDF/text, include extracted text
  // }

// Convenience: List attachments matching criteria
list_email_attachments(query?: string, maxResults?: number)
  // Returns: [{messageId, attachmentId, filename, mimeType, size, emailSubject, emailFrom, emailDate}]
```

**Gmail Query Syntax Reference:**
- `from:sender@example.com` - From specific sender
- `to:recipient@example.com` - To specific recipient
- `subject:invoice` - Subject contains "invoice"
- `has:attachment` - Has attachments
- `filename:pdf` - Attachment filename contains "pdf"
- `after:2025/01/01` - After date
- `before:2025/12/31` - Before date
- `is:unread` - Unread only
- `label:inbox` - In specific label

---

## 5. Bookkeeping Use Cases

### Google Drive
- Search for invoices, receipts by name/date
- Read uploaded business documents for context
- Export Xero reports to Drive for archival

### Google Sheets
- **Expense Tracking**: User maintains expenses in Sheet, Pip cross-references with Xero
- **Budget Forecasting**: User sets targets in Sheet, Pip compares actual (Xero) vs budget
- **Invoice Log**: Track invoice status outside Xero
- **Custom Reports**: Pip writes monthly summaries to user's Sheet

### Gmail (Future)
- Parse invoice emails for amount/due date
- Extract receipts from supplier emails
- Match payment confirmations with bank transactions

---

## 6. Database Schema Extensions

### Extend oauth_tokens Table

```sql
-- Add columns for provider-specific data
ALTER TABLE oauth_tokens ADD COLUMN provider_user_id TEXT;
ALTER TABLE oauth_tokens ADD COLUMN provider_metadata TEXT; -- JSON

-- Example for Google:
-- provider_user_id: '108234567890123456789' (Google user ID)
-- provider_metadata: '{"email": "user@example.com"}'
```

### Per-Tool Permissions (issue_030)

```sql
CREATE TABLE tool_permissions (
  user_id TEXT NOT NULL,
  connector TEXT NOT NULL,    -- 'xero', 'google_drive', 'google_sheets'
  tool_name TEXT NOT NULL,
  permission TEXT NOT NULL CHECK (permission IN ('always', 'approval', 'blocked')),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, connector, tool_name)
);
```

### Permission Levels by Safety

| Safety Level | Drive Tools | Sheets Tools |
|--------------|------------|--------------|
| **Safe** | search_drive_files, get_drive_file | read_sheet_range, get_sheet_metadata |
| **Moderate** | upload_drive_file | create_spreadsheet, append_sheet_rows |
| **Serious** | update_drive_file | write_sheet_range |
| **Extreme** | delete_drive_file | delete_spreadsheet |

---

## 7. Implementation Architecture

### OAuth Flow Design

```
┌─────────────────────────────────────────────────────────┐
│                     PWA Settings Page                    │
│  ┌───────────────────────────────────────────────────┐  │
│  │ Connected Services                                │  │
│  │  • Xero: ✓ Connected (Demo Company)              │  │
│  │  • Google Drive: [Connect]                        │  │
│  │  • Google Sheets: [Connect]                       │  │
│  └───────────────────────────────────────────────────┘  │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│              Express Server (OAuth Routes)               │
│  /auth/google/drive → redirects to Google OAuth         │
│  /auth/google/drive/callback → exchange code → tokens   │
│  /auth/google/sheets → incremental auth (adds scope)    │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│           SQLite (oauth_tokens table)                    │
│  provider='google', scopes=[...], auto-refresh          │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│          MCP Server (Tool Execution)                     │
│  getGoogleClient(userId) → auto-refresh → API calls     │
└─────────────────────────────────────────────────────────┘
```

### Reuse Xero OAuth Pattern

```typescript
// packages/mcp-remote-server/src/services/google.ts

export async function getGoogleClient(userId: string) {
  const db = await getDb();
  let tokens = await db.getOAuthTokens(userId, "google");

  if (!tokens) return null;

  // Check if refresh needed (5-minute buffer)
  if (tokens.expiresAt < Date.now() + 5 * 60 * 1000) {
    tokens = await refreshGoogleTokens(tokens);
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );

  oauth2Client.setCredentials({
    access_token: tokens.accessToken,
    refresh_token: tokens.refreshToken,
  });

  return {
    auth: oauth2Client,
    drive: google.drive({ version: 'v3', auth: oauth2Client }),
    sheets: google.sheets({ version: 'v4', auth: oauth2Client }),
  };
}
```

---

## 8. Implementation Priority

### Phase 1: Drive Read-Only (2-3 weeks)
1. Database schema extensions
2. Google OAuth routes (Drive only)
3. `getGoogleClient()` service with auto-refresh
4. UI: "Connect Google Drive" in Settings
5. MCP tools: `search_drive_files`, `get_drive_file`

### Phase 2: Sheets Integration (1-2 weeks)
1. Incremental auth: Add Sheets scope
2. MCP tools: `read_sheet_range`, `get_sheet_metadata`
3. UI: Sheets connection status
4. Test: Read expense tracking sheet

### Phase 3: Write Operations (1 week)
1. Per-tool permissions UI (issue_030)
2. Approval flow for writes
3. MCP tools: `write_sheet_range`, `create_spreadsheet`

### Phase 4: Gmail (Defer - 3-4 weeks)
1. Scope verification application
2. Privacy policy updates
3. Gmail OAuth + MCP tools

**Total MVP (Phases 1-3): 4-6 weeks**

---

## 9. Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| **Verification delay** (2-4 weeks) | High | Start with non-sensitive scopes |
| **100-user cap** (unverified) | High | Track connections, verify before limit |
| **Gmail privacy concerns** | Medium | Defer Gmail, optional feature |
| **Rate limit exhaustion** | Low | Exponential backoff, batching |
| **Token refresh failures** | Low | Clear error messages, auto-detect |

---

## 10. Cost Considerations

| Service | Cost |
|---------|------|
| Drive API | Free (within quotas) |
| Sheets API | Free (within quotas) |
| Gmail API | Free (within quotas) |
| Infrastructure | No additional (same VPS) |

---

## 11. Security & Privacy

### Requirements
- Privacy policy must mention Google Workspace data
- "Disconnect Google" button in settings
- Data deletion on account deletion
- HTTPS enforced (already via Caddy)

### GDPR Compliance
- Data minimization: Request only needed scopes
- Purpose limitation: Bookkeeping assistance only
- User rights: Export/deletion available

---

## 12. Gmail API Terms of Service & Policy Requirements

### Approved Use Cases

Per [Google's Gmail API Policy](https://developers.google.com/gmail/api/policy):

✅ **Allowed:**
- Email clients enabling message composition, sending, and reading
- Applications that automatically backup email
- Productivity tools (CRM, delayed sending, AI-powered summaries)
- Services using email data for reporting/monitoring benefiting users

❌ **Prohibited:**
- Using multiple accounts to abuse Google policies
- Circumventing filters and spam protections
- Scraping user data without explicit consent
- Using AI-generated content from services to train ML models

### Data Access Restrictions

**Human access to user data prohibited except:**
- User's explicit documented consent obtained
- Data aggregated/anonymized for internal operations
- Security investigation necessity
- Legal compliance requirements

### Testing Mode Limitations

| Feature | Testing Mode | Published App |
|---------|-------------|---------------|
| User limit | **100 users max** | Unlimited (after verification) |
| Refresh token expiry | **7 days** | Effectively unlimited |
| Consent screen | Shows "unverified app" warning | Clean consent screen |
| CASA requirement | **None** | Required for restricted scopes |

### Dental Demo Strategy

1. **Keep app in Testing mode**
2. **Add dental practice email(s) as test users** (max 100)
3. **Full Gmail functionality available** - no CASA needed
4. **7-day refresh token** - acceptable for demo, users re-auth weekly
5. **Validate product-market fit** before investing in CASA ($4,500+/year)

### Domain-Wide Delegation Alternative

If dental practice uses **Google Workspace** (not personal Gmail):
- Service account with domain-wide delegation
- No user consent flow needed
- Workspace admin configures permissions
- **No CASA required** for internal apps
- Scopes granted at admin level

---

## References

- [Google OAuth 2.0](https://developers.google.com/identity/protocols/oauth2)
- [Gmail API Policy](https://developers.google.com/gmail/api/policy)
- [Gmail API Scopes](https://developers.google.com/workspace/gmail/api/auth/scopes)
- [Gmail API Quotas](https://developers.google.com/workspace/gmail/api/reference/quota)
- [Restricted Scope Verification](https://developers.google.com/identity/protocols/oauth2/production-readiness/restricted-scope-verification)
- [CASA Security Assessment](https://appdefensealliance.dev/casa)
- [googleapis npm](https://www.npmjs.com/package/googleapis)
- [Drive API Usage Limits](https://developers.google.com/workspace/drive/api/guides/limits)
- [Sheets API Guide](https://developers.google.com/sheets/api/guides/values)
