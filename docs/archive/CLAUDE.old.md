# Zero Agent - Claude Code Instructions

## Project Overview

Zero Agent is a Claude Code-like AI assistant built with the Claude Agent SDK that connects to Xero accounting software through a custom MCP server. The agent enables natural language interaction with Xero's API, allowing users to manage invoices, track expenses, generate financial reports, and perform bank reconciliation from any device.

## Architecture

### Technology Stack

- **Agent Framework**: Claude Agent SDK (TypeScript)
- **MCP Server**: @modelcontextprotocol/sdk + xero-node
- **Frontend**: Mobile-first PWA (React + Vite)
- **Backend**: Firebase Functions (serverless)
- **Database**: Firestore (user data, sessions, token storage)
- **Authentication**: Firebase Auth + Xero OAuth 2.0
- **Hosting**: Firebase Hosting

### Project Structure

```
zero-agent/
├── packages/
│   ├── mcp-xero-server/    # MCP server for Xero API
│   ├── agent-core/         # Claude Agent SDK wrapper
│   └── pwa-app/            # Mobile-first PWA
├── backend/functions/      # Serverless backend
├── infrastructure/         # Firebase configuration
└── docs/                   # Project documentation
```

## Development Workflow

### Package Management

**ALWAYS use `pnpm` for package management:**
- Install: `pnpm install`
- Add dependency: `pnpm add <package>`
- Run scripts: `pnpm run <script>`

### Environment Setup

1. **Install dependencies:**
   ```bash
   pnpm install
   ```

2. **Configure Firebase:**
   ```bash
   firebase login
   firebase use <project-id>
   ```

3. **Set up environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your Xero API credentials
   ```

4. **Configure Xero OAuth:**
   - Register app in Xero Developer Portal
   - Add CLIENT_ID and CLIENT_SECRET to environment
   - Configure redirect URI

### Running the Project

**Development mode:**
```bash
pnpm dev
```

**Build for production:**
```bash
pnpm build
```

**Run tests:**
```bash
pnpm test
```

## Xero API Integration

### OAuth 2.0 Authentication

**Critical Implementation Details:**
- Access tokens expire after **30 minutes**
- Refresh tokens valid for **30 days**
- Must request `offline_access` scope for refresh tokens
- Implement automatic token refresh to avoid re-authentication
- Store tokens securely in Firestore

### Required Scopes

```
accounting.transactions
accounting.contacts
accounting.settings
accounting.attachments
offline_access
```

### API Endpoints

**Invoicing:**
- Create invoice: `POST /api.xro/2.0/Invoices`
- Get invoices: `GET /api.xro/2.0/Invoices`
- Update invoice: `POST /api.xro/2.0/Invoices/{InvoiceID}`

**Bank Transactions:**
- Get transactions: `GET /api.xro/2.0/BankTransactions`
- Create transaction: `POST /api.xro/2.0/BankTransactions`

**Reports:**
- Profit & Loss: `GET /Reports/ProfitAndLoss`
- Balance Sheet: `GET /Reports/BalanceSheet`
- Bank Summary: `GET /Reports/BankSummary`

## MCP Server Design

### Tool Pattern

Each Xero feature maps to MCP tools:

```typescript
server.defineTool({
  name: "get_invoice",
  description: "Retrieve Xero invoice by ID",
  inputSchema: z.object({
    invoiceId: z.string()
  }),
  handler: async ({ invoiceId }) => {
    // Call Xero API via xero-node SDK
    return result;
  }
});
```

### Authentication Flow

1. User initiates OAuth flow in PWA
2. Redirect to Xero authorization
3. Callback receives auth code
4. Exchange for access + refresh tokens
5. Store tokens in Firestore
6. MCP server retrieves tokens for API calls
7. Auto-refresh when expired

## Agent Architecture

### Orchestrator Pattern

- **Main Agent**: Coordinates tasks, maintains conversation context
- **Sub-Agents**: Specialized for invoice management, reconciliation, reporting
- **MCP Integration**: All Xero operations delegated to MCP server

### Specialization

**Invoice Agent** (`/.claude/agents/invoice-agent.md`):
- Create, update, retrieve invoices
- Handle payment terms and line items
- Manage invoice status transitions

**Reconciliation Agent** (`/.claude/agents/reconciliation-agent.md`):
- Match bank transactions to invoices
- Handle discrepancies
- Generate reconciliation reports

**Reporting Agent** (`/.claude/agents/reporting-agent.md`):
- Generate financial reports
- Custom date range queries
- Data visualization preparation

## PWA Architecture

### Mobile-First Design

- Responsive across smartphones, tablets, laptops
- Touch-friendly interactions
- Offline-capable with service workers

### Service Worker Strategy

- **Cache-First**: Static assets (HTML shell, CSS, images)
- **Network-First**: Dynamic data (API responses)
- **Stale-While-Revalidate**: Balance freshness and performance

### Performance Targets

- Largest Contentful Paint (LCP): < 2.5s
- First Input Delay (FID): < 100ms
- Cumulative Layout Shift (CLS): < 0.1

## Security Considerations

- **HTTPS Mandatory**: Service workers require HTTPS
- **Token Storage**: Encrypted in Firestore with restricted access
- **Content Security Policy**: XSS protection
- **Rate Limiting**: Protect against abuse
- **Audit Logging**: Track sensitive operations

## Testing Strategy

### Unit Tests
- MCP tool handlers
- API client wrappers
- Agent logic

### Integration Tests
- OAuth flow end-to-end
- MCP server with Xero API
- Agent + MCP integration

### E2E Tests
- PWA user flows
- Invoice creation workflow
- Reconciliation process

## Deployment

### Firebase Deployment

```bash
firebase deploy
```

### Environment-Specific Configuration

- **Development**: `.env.development`
- **Staging**: `.env.staging`
- **Production**: `.env.production`

## Troubleshooting

### Common Issues

**OAuth "Invalid URI" Error:**
- Verify redirect URI matches exactly in Xero Developer Portal
- Check for trailing slashes

**Token Refresh Failures:**
- Ensure `offline_access` scope requested
- Verify refresh token not expired (30 days)
- Check token storage integrity

**MCP Connection Issues:**
- Verify MCP server running
- Check firewall/network configuration
- Validate MCP server URL in agent configuration

## References

- [Xero API Documentation](https://developer.xero.com/documentation/api/accounting/overview)
- [xero-node SDK](https://github.com/XeroAPI/xero-node)
- [Claude Agent SDK](https://docs.claude.com/en/api/agent-sdk/overview)
- [MCP Documentation](https://modelcontextprotocol.io/)
- [PWA Best Practices](https://web.dev/progressive-web-apps/)
