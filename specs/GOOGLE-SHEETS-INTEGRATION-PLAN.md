# Google Sheets Integration Plan

> **Date**: 2025-12-09
> **Status**: Planning
> **Branch**: feature/google-sheets-integration
> **Purpose**: Design Google Sheets read/write integration with Pip's existing OAuth infrastructure

## Executive Summary

Integrate Google Sheets API to enable Pip to read and write data from/to user spreadsheets for bookkeeping workflows (expense tracking, budget forecasting, custom reports, invoice logs). Reuses existing Gmail OAuth infrastructure pattern with minimal extensions.

**Key Decision**: Use **separate OAuth flow for Sheets** (not incremental auth from Gmail) to maintain clear separation of concerns and allow users to connect services independently.

**Safety Philosophy**: Match Xero's tiered permission model, but adjusted for Google's recoverable architecture (30-day trash retention, version history, undo capabilities).

---

## 1. OAuth Scopes & Verification Requirements

### Scope Options

| Scope | Access Level | Category | Verification Required |
|-------|-------------|----------|----------------------|
| `https://www.googleapis.com/auth/spreadsheets` | Full read/write | **Sensitive** | 3-5 business days |
| `https://www.googleapis.com/auth/spreadsheets.readonly` | Read-only | **Sensitive** | 3-5 business days |
| `https://www.googleapis.com/auth/drive.file` | App-created files only | Non-sensitive | Minimal |

**Recommended Approach**: Start with `spreadsheets.readonly` (read-only) for MVP, then add `spreadsheets` (full access) in Phase 2 with proper safety guardrails.

### Verification Timeline

| Phase | Scope | Timeline | Risk |
|-------|-------|----------|------|
| **Testing Mode** | Any scope | Immediate (100 user limit) | 7-day token expiry |
| **Published (Sensitive)** | `spreadsheets.readonly`, `spreadsheets` | 3-5 business days | Standard (unlimited users) |
| **Published (Restricted)** | N/A for Sheets | N/A | N/A |

**Note**: Unlike Gmail (`gmail.readonly` = RESTRICTED), Sheets scopes are only SENSITIVE, making verification significantly easier.

### Sources
- [Google Sheets API Scopes](https://developers.google.com/workspace/sheets/api/scopes)
- [Sensitive Scope Verification](https://developers.google.com/identity/protocols/oauth2/production-readiness/sensitive-scope-verification)
- [Restricted Scope Verification](https://developers.google.com/identity/protocols/oauth2/production-readiness/restricted-scope-verification)

---

## 2. Architecture Design

### Integration with Existing OAuth Infrastructure

```
┌─────────────────────────────────────────────────────────┐
│                     PWA Settings Page                    │
│  ┌───────────────────────────────────────────────────┐  │
│  │ Connected Services                                │  │
│  │  • Xero: ✓ Connected (Demo Company)              │  │
│  │  • Gmail: ✓ Connected (samuelrodda@gmail.com)    │  │
│  │  • Google Sheets: [Connect]   ← NEW              │  │
│  └───────────────────────────────────────────────────┘  │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│              Express Server (OAuth Routes)               │
│  /auth/google/sheets → redirects to Google OAuth        │
│  /auth/google/sheets/callback → exchange code → tokens  │
│  /auth/google/sheets/status → check connection status   │
│  /auth/google/sheets/refresh → manually refresh token   │
│  /auth/google/sheets/disconnect → revoke access         │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│           SQLite (oauth_tokens table)                    │
│  provider='google_sheets'                                │
│  scopes=['spreadsheets.readonly'] (Phase 1)             │
│  scopes=['spreadsheets'] (Phase 2)                      │
│  providerUserId, providerEmail (reuse Gmail pattern)    │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│          MCP Server (Tool Execution)                     │
│  getSheetsClient(userId) → auto-refresh → API calls     │
│  Tools: read_sheet_range, get_sheet_metadata (Phase 1)  │
│  Tools: write_sheet_range, create_spreadsheet (Phase 2) │
└─────────────────────────────────────────────────────────┘
```

### Database Schema (No Changes Needed!)

The existing `oauth_tokens` table already supports Google Sheets:

```typescript
// packages/core/src/database/types.ts (ALREADY EXISTS)
export type OAuthProvider = "xero" | "gmail" | "google_drive" | "google_sheets";

export interface OAuthTokens {
  userId: string;
  provider: OAuthProvider; // "google_sheets"
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresAt: number;
  scopes: string[]; // ["https://www.googleapis.com/auth/spreadsheets.readonly"]
  providerUserId?: string; // Google user ID
  providerEmail?: string; // user@example.com
  createdAt: number;
  updatedAt: number;
}
```

**Decision**: Schema is already prepared. No migrations needed!

---

## 3. Safety Guardrails (Tiered Permission Model)

### Comparison: Xero vs Google Sheets Risk Profile

| Factor | Xero | Google Sheets |
|--------|------|---------------|
| **Undo capability** | ❌ None | ✅ Version history + Ctrl+Z |
| **Trash retention** | ❌ Voiding is instant & permanent | ✅ 30-day trash retention |
| **Recovery options** | ❌ No restore API | ✅ Restore from trash, version history |
| **Extreme danger operations** | ✅ Void/delete invoices (catastrophic) | ❌ None truly irreversible |
| **Regulatory impact** | ✅ Accounting records | ⚪ User data only |

**Key Insight**: Google Sheets operations are inherently **less dangerous** than Xero because:
1. Deleted files go to trash (30-day retention)
2. Spreadsheets have version history (restore any version)
3. No regulatory/accounting implications
4. Agent can implement undo via version restore

### Programmatic Enforcement (NOT Prompt Instructions)

**Critical**: Safety is enforced programmatically at the tool execution layer, NOT via system prompt instructions:

1. **Tool Visibility Filtering**: `getVisibleTools()` hides tools the user can't use from the agent entirely
2. **Execution-Time Permission Check**: `checkToolPermission()` returns `allowed: false` if user lacks permission
3. **Hard Denial**: Tool execution fails with clear error message if permission insufficient
4. **Default Read-Only**: New users get `permissionLevel: 0` automatically in `user_settings` table

```typescript
// From packages/pip-mcp/src/services/safety.ts
export async function checkToolPermission(userId: string, toolName: string): Promise<PermissionCheckResult> {
  const settings = await getUserSettingsOrDefault(userId);  // Creates default if none
  const requiredLevel = TOOL_PERMISSION_LEVELS[toolName];

  if (settings.permissionLevel < requiredLevel) {
    return {
      allowed: false,  // HARD DENIAL - tool cannot execute
      reason: `This operation requires "${PERMISSION_LEVEL_NAMES[requiredLevel]}" permission...`,
    };
  }
  return { allowed: true };
}
```

**Agent cannot bypass this**: Even if an agent tries to call a write tool, the MCP server will reject the request at execution time (line 578-591 in `packages/pip-mcp/src/index.ts`).

### Permission Levels for Google Sheets

#### Level 0: Read-Only (Default) - No Special Permission Required

**Risk**: None
**Operations**: All read operations, no confirmation needed
**Enforcement**: Automatic - all new users start here

| Tool | Category | Risk | Notes |
|------|----------|------|-------|
| `read_sheet_range` | Read | None | Read any range from user's sheets |
| `get_sheet_metadata` | Read | None | View sheet structure, names, properties |
| `search_spreadsheets` | Read | None | Find spreadsheets by name (Drive API) |
| `list_sheets` | Read | None | List all sheets in a spreadsheet |

#### Level 1: Write & Create (Low Risk) - Requires "Allow Sheets Write"

**Risk**: Low - all changes are reversible via version history
**Requires**: User enables "Allow Sheets Write" in settings

| Tool | Category | Risk | Recovery Method |
|------|----------|------|-----------------|
| `write_sheet_range` | Write | Low | Version history → restore previous version |
| `append_sheet_rows` | Write | Low | Version history OR delete added rows |
| `update_cell` | Write | Low | Ctrl+Z or version history |
| `create_spreadsheet` | Create | Low | Move to trash if unwanted |
| `add_sheet` | Create | Low | Delete sheet via UI or API |
| `clear_range` | Write | Low | Version history → restore cleared data |

**Agent Undo Capability**: Pip should be able to:
- Call `get_spreadsheet_revisions` to list version history
- Inform user how to restore (or trigger restore if API supports)
- Track what operations were performed for audit trail

**Safeguards**:
- Snapshot operation details in `operation_snapshots` table
- Log before/after state for audit trail
- Rate limit: configurable (default: 50 write operations per hour)

#### Level 2: Delete Operations (Medium Risk) - Requires "Allow Sheets Delete"

**Risk**: Medium - recoverable but requires user action to restore
**Requires**: User enables "Allow Sheets Delete" + optional confirmation

| Tool | Category | Risk | Recovery Method |
|------|----------|------|-----------------|
| `delete_sheet` | Delete | Medium | Cannot easily undo - creates new sheet |
| `delete_rows` | Delete | Medium | Version history → restore |
| `delete_columns` | Delete | Medium | Version history → restore |
| `trash_spreadsheet` | Delete | Medium | Restore from Drive trash (30 days) |

**Safeguards**:
- Pre-operation snapshot of deleted data
- Confirmation dialog: "Delete sheet 'December Expenses'? This will remove all data in this sheet."
- Log deleted content for potential manual restoration guidance
- Inform user: "Deleted sheets can be recovered from version history"

#### Level 3: Permanent Delete (High Risk) - NOT RECOMMENDED FOR AGENT

**Risk**: High - bypasses trash, requires Drive API with special parameters
**Recommendation**: **DO NOT IMPLEMENT** for agent use

| Tool | Category | Risk | Recovery Method |
|------|----------|------|-----------------|
| `permanently_delete_spreadsheet` | Extreme | High | ❌ No recovery possible |
| `empty_trash` | Extreme | High | ❌ No recovery possible |

**Analysis**: These operations use Drive API's `files.delete()` which:
- Permanently deletes without moving to trash
- Requires explicit `supportsAllDrives` parameter
- Deletes all descendants if target is a folder

**Decision**: **Do not expose these tools to the agent.** Users who need permanent deletion should do so manually through Google Drive interface where warnings are clearly displayed.

### Comparison to Xero Permission Levels

| Level | Xero | Google Sheets |
|-------|------|---------------|
| **0 - Read** | get_* tools | read_*, get_*, search_* |
| **1 - Create/Draft** | create_invoice_draft, create_contact | write_*, append_*, create_*, add_* |
| **2 - Update** | approve_invoice, update_*, record_payment | delete_sheet, delete_rows, trash_* |
| **3 - Destroy** | void_invoice, delete_* (IRREVERSIBLE) | permanent_delete (NOT EXPOSED) |

**Key Difference**: Xero Level 3 has catastrophic, unrecoverable consequences. Google Sheets Level 2 is recoverable via trash/version history. Therefore:
- Google Sheets doesn't need the same extreme caution as Xero Level 3
- We don't expose permanent delete (Level 3 equivalent) to the agent at all
- Google Sheets Level 2 (delete) is roughly equivalent to Xero Level 1-2 in risk

### Agent Undo & Recovery Tools

Pip should implement helper tools to assist with recovery:

```typescript
/**
 * Get version history for a spreadsheet
 * Allows user to see what changed and when
 */
get_spreadsheet_revisions(spreadsheetId: string, maxRevisions?: number): Array<{
  revisionId: string;
  modifiedTime: string;
  lastModifyingUser: string;
}>

/**
 * Provide recovery guidance based on operation type
 * Agent calls this after any write/delete to inform user of recovery options
 */
get_recovery_guidance(operationType: string): {
  canUndo: boolean;
  method: "version_history" | "trash" | "none";
  instructions: string;
  timeLimit?: string; // e.g., "30 days" for trash
}
```

### Safety Settings UI (PWA)

```
🔒 Google Sheets Safety Settings

Permission Level: [Read-Only ▼]
  ○ Read-Only (Default)
    Pip can only view your spreadsheet data. No changes possible.

  ○ Write & Create
    Pip can write data, add rows, and create spreadsheets.
    All changes can be undone via version history.

  ○ Full Access
    Pip can also delete sheets and trash spreadsheets.
    Deleted items go to Drive trash (30-day retention).

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ℹ️ Unlike Xero, Google Sheets operations are reversible:
   • Version history preserves all changes
   • Deleted files stay in trash for 30 days
   • Pip will tell you how to undo any action

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Operation History: [View All →]
Last 7 days: 0 write operations
```

### Tool Visibility by Permission Level

Just like Xero, tools are dynamically shown/hidden based on user's permission level:

| Tool | Level 0 | Level 1 | Level 2 |
|------|---------|---------|---------|
| `read_sheet_range` | ✅ | ✅ | ✅ |
| `get_sheet_metadata` | ✅ | ✅ | ✅ |
| `search_spreadsheets` | ✅ | ✅ | ✅ |
| `write_sheet_range` | ❌ | ✅ | ✅ |
| `append_sheet_rows` | ❌ | ✅ | ✅ |
| `create_spreadsheet` | ❌ | ✅ | ✅ |
| `delete_sheet` | ❌ | ❌ | ✅ |
| `trash_spreadsheet` | ❌ | ❌ | ✅ |
| `permanently_delete` | ❌ | ❌ | ❌ (never exposed) |

### Implementation: Extending the Safety Service

The existing `packages/pip-mcp/src/services/safety.ts` needs to be extended for Google Sheets tools:

```typescript
// Add to TOOL_PERMISSION_LEVELS in safety.ts
export const TOOL_PERMISSION_LEVELS: Record<string, PermissionLevel> = {
  // Existing Xero tools (Level 0 - read-only)
  get_invoices: 0,
  get_aged_receivables: 0,
  // ... existing Xero tools ...

  // Google Sheets - Level 0 (read-only)
  read_sheet_range: 0,
  get_sheet_metadata: 0,
  search_spreadsheets: 0,
  list_sheets: 0,
  get_spreadsheet_revisions: 0,

  // Google Sheets - Level 1 (write/create)
  write_sheet_range: 1,
  append_sheet_rows: 1,
  update_cell: 1,
  create_spreadsheet: 1,
  add_sheet: 1,
  clear_range: 1,

  // Google Sheets - Level 2 (delete)
  delete_sheet: 2,
  delete_rows: 2,
  delete_columns: 2,
  trash_spreadsheet: 2,

  // Level 3 NOT EXPOSED for Google Sheets
};
```

**Design Decision: Shared vs Per-Connector Permissions**

Current implementation uses a **single global permission level** across all connectors. This is simpler but means:
- User sets Level 1 → can write to BOTH Xero drafts AND Google Sheets
- User sets Level 2 → can delete in BOTH Xero AND Sheets

**Future Enhancement** (issue_030): Per-connector permissions via `tool_permissions` table:
```sql
CREATE TABLE tool_permissions (
  user_id TEXT NOT NULL,
  connector TEXT NOT NULL,  -- 'xero', 'google_sheets', 'gmail'
  permission_level INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, connector)
);
```

**For MVP**: Use shared permission level (simpler, Xero has no write tools yet anyway).

---

## 4. Proposed MCP Tools

### Phase 1: Read-Only Tools (MVP)

```typescript
/**
 * Read data from a spreadsheet range
 * Example: read_sheet_range("1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms", "Sheet1!A1:D10")
 */
read_sheet_range(spreadsheetId: string, range: string): {
  values: any[][];
  range: string;
  majorDimension: "ROWS" | "COLUMNS";
}

/**
 * Get spreadsheet metadata (sheet names, structure, properties)
 * Example: get_sheet_metadata("1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms")
 */
get_sheet_metadata(spreadsheetId: string): {
  spreadsheetId: string;
  title: string;
  locale: string;
  timeZone: string;
  sheets: Array<{
    sheetId: number;
    title: string;
    index: number;
    sheetType: string;
    gridProperties: {
      rowCount: number;
      columnCount: number;
    };
  }>;
}

/**
 * Search for spreadsheets by name (uses Drive API)
 * Example: search_spreadsheets("Expense Tracker", 10)
 */
search_spreadsheets(query: string, maxResults?: number): Array<{
  id: string;
  name: string;
  mimeType: string;
  createdTime: string;
  modifiedTime: string;
  owners: string[];
}>
```

### Phase 2: Write Operations (Level 1 Permission Required)

```typescript
/**
 * Write data to a spreadsheet range
 * Requires: Level 1 (Write & Create) permission
 * Recovery: Version history → restore previous version
 */
write_sheet_range(
  spreadsheetId: string,
  range: string,
  values: any[][],
  inputOption?: "RAW" | "USER_ENTERED"
): {
  updatedCells: number;
  updatedRows: number;
  updatedColumns: number;
}

/**
 * Append rows to the end of a sheet
 * Requires: Level 1 (Write & Create) permission
 * Recovery: Version history OR delete added rows
 */
append_sheet_rows(
  spreadsheetId: string,
  range: string,
  values: any[][],
  inputOption?: "RAW" | "USER_ENTERED"
): {
  updates: {
    updatedCells: number;
    updatedRows: number;
  };
}

/**
 * Create a new spreadsheet
 * Requires: Level 1 (Write & Create) permission
 * Recovery: Move to trash if unwanted
 */
create_spreadsheet(
  title: string,
  sheets?: Array<{ title: string }>
): {
  spreadsheetId: string;
  spreadsheetUrl: string;
  title: string;
}

/**
 * Clear data from a range (preserves formatting)
 * Requires: Level 1 (Write & Create) permission
 * Recovery: Version history → restore cleared data
 */
clear_range(
  spreadsheetId: string,
  range: string
): {
  clearedRange: string;
}
```

### Phase 3: Delete Operations (Level 2 Permission Required)

```typescript
/**
 * Delete a sheet (tab) from a spreadsheet
 * Requires: Level 2 (Full Access) permission
 * Recovery: Version history → restore (creates new sheet with same data)
 * Confirmation: Required before execution
 */
delete_sheet(
  spreadsheetId: string,
  sheetId: number
): {
  success: boolean;
  deletedSheetTitle: string;
}

/**
 * Delete rows from a sheet
 * Requires: Level 2 (Full Access) permission
 * Recovery: Version history → restore deleted rows
 */
delete_rows(
  spreadsheetId: string,
  sheetId: number,
  startIndex: number,
  endIndex: number
): {
  deletedRowCount: number;
}

/**
 * Move spreadsheet to Drive trash
 * Requires: Level 2 (Full Access) permission
 * Recovery: Restore from Drive trash (30-day retention)
 * Confirmation: Required before execution
 */
trash_spreadsheet(
  spreadsheetId: string
): {
  success: boolean;
  trashedAt: string;
  recoverableUntil: string; // 30 days from now
}
```

---

## 5. Bookkeeping Use Cases

### Primary Use Cases

1. **Expense Tracking Integration**
   - User maintains expense log in Google Sheets
   - Pip reads expenses and cross-references with Xero transactions
   - "Show me expenses from my Sheet that aren't in Xero"

2. **Budget Forecasting**
   - User sets budget targets in Sheets
   - Pip compares actual spend (from Xero) vs budget (from Sheets)
   - "Am I on track to hit my revenue goal?"

3. **Custom Reporting**
   - Pip writes monthly financial summaries to user's Sheet
   - User can pivot/chart data in familiar spreadsheet environment
   - "Generate this month's P&L and save it to my reporting spreadsheet"

4. **Invoice Tracking**
   - User maintains invoice status outside Xero (e.g., internal approval workflow)
   - Pip syncs invoice data between Xero and Sheets
   - "Update my invoice tracker with this month's sent invoices"

### Example Queries

**Read Operations:**
- "What expenses are in my tracking sheet for December?"
- "Read row 5 from my budget spreadsheet"
- "What's the total in column D of my invoice tracker?"

**Write Operations (Phase 2):**
- "Add this invoice to my tracking sheet"
- "Create a new spreadsheet for Q1 2026 expenses"
- "Update the budget with actual spend from Xero"

---

## 6. Implementation Plan

### Phase 1: Read-Only Integration (1-2 weeks)

**Week 1: Backend Infrastructure**
- [ ] Create `/auth/google/sheets` route (copy Gmail pattern)
- [ ] Implement OAuth callback handler with token storage
- [ ] Create `getSheetsClient()` service with auto-refresh logic
- [ ] Add status/refresh/disconnect endpoints
- [ ] Test OAuth flow in Testing Mode (100 users)

**Week 2: MCP Tools**
- [ ] Implement `read_sheet_range` MCP tool
- [ ] Implement `get_sheet_metadata` MCP tool
- [ ] Implement `search_spreadsheets` MCP tool (Drive API)
- [ ] Test tools via Claude.ai and ChatGPT
- [ ] Update PWA settings page with "Connect Google Sheets" button

**Acceptance Criteria:**
- Users can connect Google Sheets account via Settings page
- Pip can read data from user's spreadsheets via MCP tools
- Token auto-refresh works correctly
- OAuth flow tested with multiple users

### Phase 2: Write Operations + Safety (1-2 weeks)

**Week 3: Safety Guardrails**
- [ ] Extend safety permission system to cover Sheets tools
- [ ] Add tool permission levels:
  - Safe (read-only): `read_sheet_range`, `get_sheet_metadata`, `search_spreadsheets`
  - Moderate (create/append): `create_spreadsheet`, `append_sheet_rows`
  - Serious (update): `write_sheet_range`
- [ ] Implement confirmation flow for write operations
- [ ] Update scope to `spreadsheets` (full access)

**Week 4: Write Tools + Testing**
- [ ] Implement `write_sheet_range` MCP tool
- [ ] Implement `append_sheet_rows` MCP tool
- [ ] Implement `create_spreadsheet` MCP tool
- [ ] E2E testing with real bookkeeping workflows
- [ ] Update documentation and user guide

**Acceptance Criteria:**
- Write operations require user approval (unless permission level allows)
- No accidental data overwrites (safety checks in place)
- All write operations logged for audit trail
- Users can manage Sheets permissions independently from Xero

### Phase 3: Production Publishing (3-5 days)

- [ ] Submit OAuth consent screen for verification
- [ ] Update privacy policy for Sheets data access
- [ ] Pass sensitive scope verification (3-5 business days)
- [ ] Switch from Testing Mode to Published
- [ ] Monitor for any verification issues

---

## 7. Technical Implementation Details

### File Structure

```
packages/
├── server/src/routes/
│   ├── auth-gmail.ts (EXISTING - reference implementation)
│   └── auth-sheets.ts (NEW - copy Gmail pattern)
├── mcp-remote-server/src/
│   ├── services/
│   │   ├── google-gmail.ts (EXISTING - reference)
│   │   └── google-sheets.ts (NEW - Sheets API client)
│   └── tools/
│       ├── gmail-tools.ts (EXISTING)
│       └── sheets-tools.ts (NEW - MCP tool definitions)
└── pwa-app/src/
    └── pages/SettingsPage.tsx (UPDATE - add Sheets connector)
```

### Key Code Patterns (Reuse Gmail Architecture)

**1. OAuth Route Handler** (`packages/server/src/routes/auth-sheets.ts`):
```typescript
// Copy packages/server/src/routes/auth-gmail.ts
// Change:
// - Route: /auth/google/gmail → /auth/google/sheets
// - Provider: 'gmail' → 'google_sheets'
// - Scopes: GMAIL_SCOPES → SHEETS_SCOPES
// - All other logic remains identical
```

**2. Sheets Service** (`packages/mcp-remote-server/src/services/google-sheets.ts`):
```typescript
import { google } from 'googleapis';
import { getDb } from './database.js';

export async function getSheetsClient(userId: string) {
  const db = await getDb();
  let tokens = await db.getOAuthTokens(userId, 'google_sheets');

  if (!tokens) return null;

  // Auto-refresh if expiring in 5 minutes
  if (tokens.expiresAt < Date.now() + 5 * 60 * 1000) {
    tokens = await refreshSheetsTokens(tokens);
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_SHEETS_REDIRECT_URI
  );

  oauth2Client.setCredentials({
    access_token: tokens.accessToken,
    refresh_token: tokens.refreshToken,
  });

  return google.sheets({ version: 'v4', auth: oauth2Client });
}
```

**3. MCP Tool Example** (`packages/mcp-remote-server/src/tools/sheets-tools.ts`):
```typescript
{
  name: 'read_sheet_range',
  description: 'Read data from a Google Sheets range (e.g., "Sheet1!A1:D10")',
  inputSchema: {
    type: 'object',
    properties: {
      spreadsheetId: {
        type: 'string',
        description: 'The ID of the spreadsheet (from the URL)',
      },
      range: {
        type: 'string',
        description: 'A1 notation range (e.g., "Sheet1!A1:D10")',
      },
    },
    required: ['spreadsheetId', 'range'],
  },
}
```

---

## 8. Rate Limits & Quotas

### Google Sheets API Quotas

| Limit Type | Value |
|------------|-------|
| **Per Project** | 20,000 queries / 100 seconds |
| **Per User** | 1,000 queries / 100 seconds |

**Best Practices:**
- Use batch operations where possible (up to 100 requests per batch)
- Implement exponential backoff for 429 (rate limit) errors
- Cache frequently accessed metadata
- Use `fields` parameter for partial responses

**Example Rate Limit Handling:**
```typescript
async function readSheetWithRetry(sheets, spreadsheetId, range, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range,
      });
      return response.data;
    } catch (error) {
      if (error.code === 429 && i < retries - 1) {
        // Exponential backoff: 1s, 2s, 4s
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)));
        continue;
      }
      throw error;
    }
  }
}
```

---

## 9. Security & Privacy

### OAuth Security

**Token Storage:**
- Access tokens: SQLite (encrypted database recommended)
- Refresh tokens: SQLite with secure permissions
- All tokens encrypted at rest on VPS

**Token Refresh:**
- Auto-refresh 5 minutes before expiry
- Handle refresh failures gracefully (prompt user to reconnect)
- Testing mode: 7-day refresh token expiry (acceptable for demo/beta)
- Published mode: Effectively unlimited refresh token (until revoked)

### Privacy Policy Requirements

Update `docs/PRIVACY_POLICY.md` to include:
- Google Sheets data access disclosure
- Data retention policy (stored temporarily for processing)
- User rights (export, deletion, disconnect)
- Third-party data sharing (none)

**Key Points:**
- "Pip accesses your Google Sheets only when you explicitly connect your account"
- "Sheet data is read on-demand and not permanently stored on our servers"
- "You can disconnect Google Sheets at any time from Settings"

### GDPR Compliance

- **Data Minimization**: Request only `spreadsheets.readonly` initially
- **Purpose Limitation**: Bookkeeping assistance only
- **User Rights**: Export/deletion available via Settings
- **Consent**: Clear opt-in via OAuth consent screen

---

## 10. Testing Strategy

### Manual Testing Checklist

**Phase 1 (Read-Only):**
- [ ] OAuth flow: Redirect to Google → Grant access → Callback success
- [ ] Token storage: Verify tokens saved to database correctly
- [ ] Token refresh: Wait for expiry, verify auto-refresh works
- [ ] Read tool: `read_sheet_range` returns correct data
- [ ] Metadata tool: `get_sheet_metadata` returns sheet structure
- [ ] Search tool: `search_spreadsheets` finds user's sheets
- [ ] Error handling: Invalid spreadsheet ID, range errors
- [ ] Disconnection: Verify tokens deleted from database

**Phase 2 (Write Operations):**
- [ ] Write tool: `write_sheet_range` updates cells correctly
- [ ] Append tool: `append_sheet_rows` adds rows to end
- [ ] Create tool: `create_spreadsheet` creates new sheet
- [ ] Safety guardrails: Write requires permission level >= 1
- [ ] Confirmation flow: User approves write operations
- [ ] Error handling: Permission denied, quota exceeded

### Integration Testing

**Test Scenarios:**
1. **Expense Tracking**:
   - Create expense sheet with columns: Date, Vendor, Amount, Category
   - Use Pip to read expenses: "Show me all expenses from my tracking sheet"
   - Verify Pip correctly parses and displays data

2. **Budget Comparison**:
   - Create budget sheet with monthly targets
   - Use Pip to compare: "Am I over budget this month?"
   - Verify Pip reads Sheet budget and compares with Xero actuals

3. **Report Generation (Phase 2)**:
   - Ask Pip: "Create a P&L summary spreadsheet for November"
   - Verify new spreadsheet created with correct data from Xero

### Edge Cases

- Empty spreadsheet (0 rows)
- Very large spreadsheet (>10,000 rows)
- Multiple users accessing same spreadsheet
- Spreadsheet deleted between connection and access
- User revokes permissions from Google Account page
- Refresh token expired (Testing mode: 7 days)

---

## 11. Risks & Mitigations

| Risk | Severity | Probability | Mitigation |
|------|----------|-------------|------------|
| **Verification delay** (3-5 days) | Medium | High | Start in Testing Mode, submit verification early |
| **100-user cap** (Testing) | Low | Medium | Track connections, publish before limit |
| **Token refresh failures** | Low | Medium | Clear error messages, reconnect flow |
| **Rate limit exhaustion** | Low | Low | Exponential backoff, batch operations |
| **Data overwrites** (Phase 2) | High | Low | Safety guardrails, confirmation flow, audit log |
| **Privacy concerns** | Medium | Low | Clear consent screen, privacy policy update |

---

## 12. Success Metrics

### Phase 1 (Read-Only)
- [ ] 5+ beta users connected Google Sheets
- [ ] 50+ successful `read_sheet_range` calls
- [ ] 0 OAuth connection failures
- [ ] <5% token refresh failures

### Phase 2 (Write Operations)
- [ ] 3+ users using write operations
- [ ] 20+ successful `write_sheet_range` calls
- [ ] 0 unintended data overwrites
- [ ] 100% write operations logged

### Production
- [ ] Pass sensitive scope verification (<5 days)
- [ ] Published app with unlimited users
- [ ] <1% OAuth error rate
- [ ] Positive user feedback on Sheets integration

---

## 13. Open Questions & Decisions Needed

### Questions for User/Stakeholder

1. **Scope Preference**: Start with read-only (`spreadsheets.readonly`) or full access (`spreadsheets`) from day one?
   - **Recommendation**: Read-only first (lower risk, faster verification)

2. **Safety Default**: Should write operations default to "needs approval" or "always allow" for trusted users?
   - **Recommendation**: "Needs approval" by default (safer)

3. **Incremental Auth**: Should Sheets OAuth be separate from Gmail, or combined?
   - **Recommendation**: Separate (clearer separation of concerns, users may not want both)

4. **Drive API**: Do we need Drive API scope for searching spreadsheets, or only Sheets API?
   - **Recommendation**: Add `drive.readonly` for `search_spreadsheets` tool

### Technical Decisions

1. **googleapis npm**: Use official `googleapis` package (same as Gmail integration)
   - **Decision**: ✅ Yes - proven, well-maintained, TypeScript support

2. **Batch Operations**: Implement batching from day one or defer to optimization phase?
   - **Decision**: Defer to Phase 3 (not needed for MVP)

3. **Caching**: Cache spreadsheet metadata to reduce API calls?
   - **Decision**: No caching for MVP (adds complexity, quotas are generous)

---

## 14. Dependencies & Prerequisites

### Required Before Starting

- [x] Gmail OAuth infrastructure (reference implementation)
- [x] `oauth_tokens` table schema supports `google_sheets` provider
- [x] Google Cloud Console project with Sheets API enabled
- [x] GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables
- [ ] Add `https://www.googleapis.com/auth/spreadsheets.readonly` to OAuth consent screen
- [ ] Configure redirect URI: `https://app.pip.arcforge.au/auth/google/sheets/callback`

### Environment Variables Needed

```bash
# .env (already exist for Gmail, reuse for Sheets)
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_SHEETS_REDIRECT_URI=https://app.pip.arcforge.au/auth/google/sheets/callback
```

### npm Dependencies

```json
{
  "dependencies": {
    "googleapis": "^128.0.0"  // Already installed for Gmail
  }
}
```

---

## 15. Documentation & User Communication

### User-Facing Documentation

**Settings Page Help Text:**
```
Connect Google Sheets to let Pip read and analyze data from your spreadsheets.
Use cases: expense tracking, budget comparisons, custom reports.

Your data is accessed on-demand and not stored on our servers.
You can disconnect at any time.
```

**Example Queries Guide** (Add to README.md):
```markdown
### Google Sheets Integration

Once connected, ask Pip to:
- "Read expenses from my tracking sheet"
- "What's in row 5 of my budget spreadsheet?"
- "Show me the totals column from my invoice tracker"
```

### Developer Documentation

- Update `ARCHITECTURE.md` with Sheets OAuth flow diagram
- Add `CONTRIBUTING.md` section on adding new OAuth providers
- Document MCP tool patterns in `docs/MCP_TOOL_GUIDE.md`

---

## 16. Post-Launch Monitoring

### Metrics to Track

**OAuth Health:**
- Connection success rate
- Token refresh success rate
- Disconnection frequency
- Time to first successful API call

**API Usage:**
- Calls per user per day
- Rate limit 429 errors
- API error rate by endpoint
- Average response latency

**User Engagement:**
- % of users who connect Sheets
- Most frequently used tools
- User retention after connecting Sheets

### Alerts to Configure

- OAuth success rate < 95%
- Token refresh failures > 5%
- API rate limit errors > 1%
- New OAuth verification requirements published by Google

---

## Appendix A: OAuth Flow Diagram

```
User clicks "Connect Google Sheets" in Settings
              ↓
GET /auth/google/sheets (with JWT token in query param)
              ↓
Redirect to Google OAuth consent screen
  - Scope: spreadsheets.readonly (Phase 1)
  - State: base64(userId + CSRF token)
              ↓
User grants permission
              ↓
Google redirects to /auth/google/sheets/callback?code=...&state=...
              ↓
Exchange code for access_token + refresh_token
              ↓
Fetch user info (email, Google user ID)
              ↓
Save to oauth_tokens table:
  - provider: 'google_sheets'
  - scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
  - providerEmail, providerUserId
              ↓
Redirect to Settings page with ?sheets=connected
              ↓
User sees "Google Sheets: ✓ Connected (user@example.com)"
```

---

## Appendix B: MCP Tool Response Examples

### read_sheet_range

**Request:**
```json
{
  "spreadsheetId": "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms",
  "range": "Sheet1!A1:D5"
}
```

**Response:**
```json
{
  "range": "Sheet1!A1:D5",
  "majorDimension": "ROWS",
  "values": [
    ["Date", "Vendor", "Amount", "Category"],
    ["2025-12-01", "Office Supplies Co", "125.50", "Office"],
    ["2025-12-03", "AWS", "89.00", "Software"],
    ["2025-12-05", "Coffee Shop", "45.00", "Meals"],
    ["2025-12-07", "Gas Station", "75.00", "Travel"]
  ]
}
```

### get_sheet_metadata

**Request:**
```json
{
  "spreadsheetId": "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
}
```

**Response:**
```json
{
  "spreadsheetId": "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms",
  "title": "Expense Tracker 2025",
  "locale": "en_AU",
  "timeZone": "Australia/Sydney",
  "sheets": [
    {
      "sheetId": 0,
      "title": "December",
      "index": 0,
      "sheetType": "GRID",
      "gridProperties": {
        "rowCount": 100,
        "columnCount": 10
      }
    },
    {
      "sheetId": 1,
      "title": "November",
      "index": 1,
      "sheetType": "GRID",
      "gridProperties": {
        "rowCount": 100,
        "columnCount": 10
      }
    }
  ]
}
```

---

## References

- [Google Sheets API Documentation](https://developers.google.com/sheets/api)
- [Google Sheets API Scopes](https://developers.google.com/workspace/sheets/api/scopes)
- [Google OAuth 2.0](https://developers.google.com/identity/protocols/oauth2)
- [Sensitive Scope Verification](https://developers.google.com/identity/protocols/oauth2/production-readiness/sensitive-scope-verification)
- [googleapis npm Package](https://www.npmjs.com/package/googleapis)
- [Pip Gmail Integration](../server/src/routes/auth-gmail.ts) (reference implementation)
- [Google Workspace Integration Research](./GOOGLE-WORKSPACE-INTEGRATION-RESEARCH-20251203.md)

---

**Last Updated**: 2025-12-09
