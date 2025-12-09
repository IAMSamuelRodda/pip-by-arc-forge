# Integrations Hub Design

> **Date**: 2025-12-09
> **Status**: Planning
> **Purpose**: Central page for managing connector integrations during MCP OAuth flow

## Problem Statement

Current MCP OAuth flow:
1. User clicks "Connect" in Claude.ai
2. User signs in/registers on Pip
3. **Immediately redirects to Xero OAuth**
4. After Xero auth, **immediately redirects back to Claude.ai**

This flow has issues:
- User can only connect Xero during initial setup
- To add Gmail/Sheets later, user must disconnect and reconnect
- No visibility into what's connected before returning to Claude.ai
- No way to manage connector permissions during OAuth

## Solution: Integrations Hub

Insert a new page between authentication and Claude.ai redirect:

```
┌─────────────────────────────────────────────────────────────┐
│           MCP OAuth Flow with Integrations Hub              │
└─────────────────────────────────────────────────────────────┘

 Claude.ai                    Pip MCP Server                 External
 ─────────                    ──────────────                 ────────
     │                             │                            │
     │ 1. Connect Pip              │                            │
     │ ────────────────────────>   │                            │
     │                             │                            │
     │                   2. /oauth/authorize                    │
     │                      (sign in/register)                  │
     │                             │                            │
     │                   3. Store MCP flow context              │
     │                      (redirect_uri, state)               │
     │                             │                            │
     │                   4. Redirect to                         │
     │                      /integrations                       │
     │                             │                            │
     │            ┌────────────────────────────────┐            │
     │            │     INTEGRATIONS HUB PAGE      │            │
     │            │                                │            │
     │            │  ✓ Signed in as user@email.com │            │
     │            │                                │            │
     │            │  ━━━ Connected Services ━━━    │            │
     │            │                                │            │
     │            │  [🔗] Xero                     │            │
     │            │       Not connected            │            │
     │            │       [Connect Xero]───────────┼──> Xero OAuth
     │            │                                │      │
     │            │  [📧] Gmail                    │      │
     │            │       Not connected            │      │
     │            │       [Connect Gmail]──────────┼──> Google OAuth
     │            │                                │      │
     │            │  [📊] Google Sheets            │      │
     │            │       Not connected            │      │
     │            │       [Connect Sheets]─────────┼──> Google OAuth
     │            │                                │      │
     │            │  ━━━━━━━━━━━━━━━━━━━━━━━━━━━   │      │
     │            │                                │      │
     │            │  [Continue to Claude.ai →]     │      │
     │            │                                │      │
     │            └────────────────────────────────┘      │
     │                             │                      │
     │                             │<─────────────────────┘
     │                             │ (callback redirects
     │                             │  back to /integrations)
     │                             │
     │   5. User clicks            │
     │      "Continue to Claude"   │
     │                             │
     │   6. Generate auth code     │
     │      & redirect back        │
     │<────────────────────────────│
     │                             │
```

## Implementation Details

### 1. New Routes

```
GET  /integrations              → Show Integrations Hub page
GET  /integrations/status       → JSON API: get all connector statuses

POST /integrations/xero         → Start Xero OAuth (redirect to Xero)
GET  /integrations/xero/callback → Handle Xero callback, redirect to /integrations

POST /integrations/gmail        → Start Gmail OAuth
GET  /integrations/gmail/callback → Handle Gmail callback

POST /integrations/sheets       → Start Google Sheets OAuth
GET  /integrations/sheets/callback → Handle Sheets callback

POST /integrations/:connector/disconnect → Disconnect a connector (deletes tokens)

POST /integrations/complete     → Generate auth code, redirect to caller (Claude.ai/ChatGPT)
```

### 2. Session Storage

Store pending MCP flow in database (not just in-memory):

```typescript
interface PendingMcpFlow {
  id: string;           // Flow ID (UUID)
  userId: string;       // Authenticated user
  redirectUri: string;  // Claude.ai callback URL
  state: string;        // OAuth state parameter
  createdAt: number;    // Timestamp
  expiresAt: number;    // 30-minute expiry
}
```

### 3. Integrations Hub Page

```html
┌──────────────────────────────────────────────────────────────┐
│                     Pip Integrations                          │
│                                                               │
│  Signed in as: user@example.com                              │
│                                                               │
│  ─────────────────────────────────────────────────────────   │
│                                                               │
│  Connect the services you want Pip to access:                │
│                                                               │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  🔗 Xero                                    [Connect]  │  │
│  │  Access invoices, bank accounts, and reports          │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                               │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  📧 Gmail                                   [Connect]  │  │
│  │  Search emails and download invoices                   │  │
│  │  ⚠️ Testing mode (limited to 100 users)               │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                               │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  📊 Google Sheets                           [Connect]  │  │
│  │  Read and write spreadsheet data                       │  │
│  │  ⚠️ Coming soon                                        │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                               │
│  ─────────────────────────────────────────────────────────   │
│                                                               │
│  ℹ️ You can connect more services later from the Pip app    │
│                                                               │
│                              [ Continue → ]                   │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

**Connected State (same button toggles):**

```html
│  ┌────────────────────────────────────────────────────────┐  │
│  │  ✅ Xero                                [Disconnect]   │  │
│  │  Demo Company (AU)                                     │  │
│  └────────────────────────────────────────────────────────┘  │
```

**Button Behavior:**
- **Not connected**: Shows `[Connect]` → clicking starts OAuth flow
- **Connected**: Shows `[Disconnect]` → clicking immediately revokes tokens and updates UI
- No confirmation dialog for disconnect (tokens can be reconnected easily)

### 4. Flow Changes

#### Current Flow (after sign-in):
```
/oauth/authorize/submit
  → (create user session)
  → Start Xero OAuth immediately
  → /auth/xero/callback
  → Redirect to Claude.ai
```

#### New Flow (after sign-in):
```
/oauth/authorize/submit
  → (create user session)
  → Store MCP flow context
  → Redirect to /integrations?flow={flowId}

/integrations
  → Show all connectors with status
  → User can connect/disconnect any connector
  → Each connector OAuth redirects back to /integrations

/integrations/complete
  → Retrieve MCP flow context
  → Generate auth code
  → Redirect to Claude.ai
```

### 5. Code Changes

#### A. Modify `/oauth/authorize/submit` (sign-in handler)

```typescript
// After successful authentication:
// Instead of starting Xero OAuth immediately...

// Store MCP flow context
const flowId = crypto.randomUUID();
pendingMcpFlows.set(flowId, {
  userId: user.id,
  redirectUri: redirect_uri,
  state: state,
  expiresAt: Date.now() + 30 * 60 * 1000, // 30 minutes
});

// Redirect to Integrations Hub
res.redirect(`/integrations?flow=${flowId}`);
```

#### B. New `/integrations` route

```typescript
app.get("/integrations", async (req, res) => {
  const flowId = req.query.flow as string;
  const flow = pendingMcpFlows.get(flowId);

  if (!flow) {
    res.status(400).send("Invalid or expired flow");
    return;
  }

  // Get connector statuses
  const xeroTokens = await db.getOAuthTokens(flow.userId, "xero");
  const gmailTokens = await db.getOAuthTokens(flow.userId, "gmail");
  const sheetsTokens = await db.getOAuthTokens(flow.userId, "google_sheets");

  // Get connector permissions
  const permissions = await db.listConnectorPermissions(flow.userId);

  // Render page with connector status
  res.send(renderIntegrationsPage({
    flowId,
    email: user.email,
    connectors: {
      xero: { connected: !!xeroTokens, tenantName: xeroTokens?.tenantName },
      gmail: { connected: !!gmailTokens, email: gmailTokens?.providerEmail },
      google_sheets: { connected: !!sheetsTokens, email: sheetsTokens?.providerEmail },
    },
    permissions,
  }));
});
```

#### C. Connector OAuth routes

```typescript
// Start Xero OAuth from Integrations Hub
app.post("/integrations/xero", async (req, res) => {
  const flowId = req.body.flowId;
  const flow = pendingMcpFlows.get(flowId);

  if (!flow) {
    res.status(400).send("Invalid flow");
    return;
  }

  // Start Xero OAuth, but redirect back to /integrations after
  const xeroUrl = buildXeroAuthUrl({
    flowId,
    callbackUrl: `${baseUrl}/integrations/xero/callback`,
  });

  res.redirect(xeroUrl);
});

// Xero callback (redirects back to Integrations Hub)
app.get("/integrations/xero/callback", async (req, res) => {
  // ... exchange code for tokens (same as current /auth/xero/callback)

  // Redirect back to Integrations Hub
  res.redirect(`/integrations?flow=${flowId}&connected=xero`);
});
```

#### D. Complete flow (return to Claude.ai)

```typescript
app.post("/integrations/complete", async (req, res) => {
  const flowId = req.body.flowId;
  const flow = pendingMcpFlows.get(flowId);

  if (!flow) {
    res.status(400).send("Invalid or expired flow");
    return;
  }

  // Generate MCP auth code
  const authCode = crypto.randomUUID();
  authorizationCodes.set(authCode, {
    userId: flow.userId,
    redirectUri: flow.redirectUri,
    expiresAt: Date.now() + 10 * 60 * 1000,
  });

  // Clean up flow
  pendingMcpFlows.delete(flowId);

  // Redirect to Claude.ai
  const redirectUrl = new URL(flow.redirectUri);
  redirectUrl.searchParams.set("code", authCode);
  if (flow.state) {
    redirectUrl.searchParams.set("state", flow.state);
  }

  res.redirect(redirectUrl.toString());
});
```

### 6. UX Considerations

1. **Minimum requirement**: User must connect at least Xero to proceed
   - Or allow proceeding with no connectors (just memory tools work)

2. **Permission controls**: Show permission level dropdowns on Integrations Hub
   - "Xero: Read-Only [v]" with dropdown to change

3. **Success feedback**: After connecting, show success toast/banner
   - "✓ Xero connected: Demo Company"

4. **Error handling**: Clear error messages if OAuth fails
   - "Xero connection failed. Please try again."

5. **Skip button**: Allow user to skip connector setup
   - "Skip for now →" (smaller, below main button)
   - Proceeds with whatever is connected

### 7. Phase 1 Implementation (MVP)

Focus on:
- [x] Integrations Hub page with Xero connection
- [ ] Gmail connection (already have OAuth routes)
- [ ] Google Sheets connection (new OAuth routes needed)
- [ ] "Continue to Claude.ai" button
- [ ] Proper flow state management

Defer to Phase 2:
- Permission level controls on Integrations Hub
- Disconnect functionality
- Coming back to Integrations Hub from main PWA app

### 8. File Changes Required

| File | Change |
|------|--------|
| `packages/pip-mcp/src/index.ts` | Add /integrations routes, modify /oauth/authorize/submit |
| `packages/pip-mcp/src/services/integrations.ts` | NEW: Integrations page rendering |
| `packages/core/src/database/types.ts` | Add PendingMcpFlow type (optional if using in-memory) |

### 9. Security Considerations

1. **Flow ID expiry**: 30 minutes max, single-use
2. **CSRF protection**: Include flowId in all forms
3. **User verification**: Ensure flowId matches authenticated user
4. **No sensitive data in URL**: Flow IDs are opaque references

---

## Implementation Plan

### Phase 1: MVP (Current Sprint)
1. Add `/integrations` route with Xero connect button
2. Modify sign-in flow to redirect to Integrations Hub
3. Add "Continue to Claude.ai" completion
4. Add Gmail connect button (reuse existing OAuth)

### Phase 2: Full Integration
1. Add Google Sheets OAuth flow
2. Add permission level controls
3. Add disconnect functionality
4. Add "Manage Integrations" link from PWA app

---

**Last Updated**: 2025-12-09
