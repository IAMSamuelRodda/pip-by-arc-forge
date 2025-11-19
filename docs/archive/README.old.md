# Zero Agent

> AI-powered accounting assistant for Xero, built with Claude Agent SDK and Model Context Protocol

## Overview

Zero Agent is a mobile-first Progressive Web App (PWA) that brings natural language interaction to Xero accounting software. Manage invoices, track expenses, generate reports, and reconcile accounts through conversational AI, powered by Claude's advanced language understanding.

## Features

### 🧾 Invoicing & Bills
- Create, update, and retrieve invoices through natural language
- Manage payment terms and line items
- Track invoice status (draft, submitted, authorized, paid)
- Handle supplier bills and accounts payable

### 💰 Expense Tracking
- Record and categorize expenses conversationally
- Bank transaction management
- Expense claims for employee reimbursements
- Manual journal entries

### 📊 Financial Reports
- Generate profit & loss statements
- Create balance sheets
- Bank summaries with custom date ranges
- Real-time financial insights

### 🔄 Bank Reconciliation
- Automatic transaction matching
- Manual reconciliation support
- Bank feed integration
- Discrepancy handling

## Architecture

### Technology Stack

- **Frontend**: React + Vite (Mobile-first PWA)
- **Agent**: Claude Agent SDK (TypeScript)
- **MCP Server**: Custom Xero integration
- **Backend**: Firebase Functions (serverless)
- **Database**: Firestore
- **Authentication**: Firebase Auth + Xero OAuth 2.0
- **Hosting**: Firebase Hosting

### Architecture Diagram

```
┌─────────────┐
│   PWA App   │  Mobile-first interface
└──────┬──────┘
       │ WebSocket/HTTP
┌──────▼──────┐
│ Agent Core  │  Claude Agent SDK
└──────┬──────┘
       │ MCP Protocol
┌──────▼──────┐
│ MCP Server  │  Xero API integration
└──────┬──────┘
       │ REST API
┌──────▼──────┐
│  Xero API   │  Accounting backend
└─────────────┘
```

## Getting Started

### Prerequisites

- Node.js >= 20.0.0
- pnpm >= 9.0.0
- Firebase CLI (`npm install -g firebase-tools`)
- Xero Developer account

### Installation

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd zero-agent
   ```

2. **Install dependencies:**
   ```bash
   pnpm install
   ```

3. **Configure environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your credentials
   ```

4. **Set up Xero OAuth:**
   - Go to [Xero Developer Portal](https://developer.xero.com/)
   - Create a new app
   - Add `CLIENT_ID` and `CLIENT_SECRET` to `.env`
   - Configure redirect URI

5. **Initialize Firebase:**
   ```bash
   firebase login
   firebase use <project-id>
   ```

### Development

**Run in development mode:**
```bash
pnpm dev
```

This starts:
- MCP server on `http://localhost:3000`
- Agent core on `http://localhost:3001`
- PWA app on `http://localhost:5173`

**Build for production:**
```bash
pnpm build
```

**Run tests:**
```bash
pnpm test
```

### Deployment

**Deploy to Firebase:**
```bash
firebase deploy
```

## Usage Examples

### Create an Invoice

```
User: Create an invoice for Acme Corp for $5,000 for consulting services

Agent: I'll create that invoice for you. Let me gather the details:
- Customer: Acme Corp
- Amount: $5,000
- Description: Consulting services

Creating invoice... Done! Invoice #INV-001 created and saved as draft.
Would you like me to send it to the customer?
```

### Bank Reconciliation

```
User: Reconcile my bank transactions from last week

Agent: I'll review your bank transactions from the past week and match them with your Xero records.

Found 23 transactions:
- 18 automatically matched
- 5 require manual review

Would you like me to show you the unmatched transactions?
```

### Generate Report

```
User: Show me profit and loss for Q4 2024

Agent: Generating your Q4 2024 Profit & Loss statement...

Revenue: $125,000
Expenses: $87,500
Net Profit: $37,500 (30% margin)

Would you like me to break this down by category or compare it to previous quarters?
```

## Project Structure

```
zero-agent/
├── .claude/                 # Claude Code configuration
│   ├── agents/              # Specialized sub-agents
│   ├── skills/              # Domain expertise
│   └── commands/            # Custom slash commands
├── packages/
│   ├── mcp-xero-server/     # MCP server for Xero API
│   ├── agent-core/          # Claude Agent SDK wrapper
│   └── pwa-app/             # Progressive Web App
├── backend/
│   ├── functions/           # Firebase Functions
│   └── shared/              # Shared utilities
├── infrastructure/          # Firebase configuration
└── docs/                    # Documentation
```

## Configuration

### Environment Variables

```env
# Xero API
XERO_CLIENT_ID=your_client_id
XERO_CLIENT_SECRET=your_client_secret
XERO_REDIRECT_URI=https://your-app.com/auth/callback

# Firebase
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_API_KEY=your_api_key

# Claude API
ANTHROPIC_API_KEY=your_api_key
```

### Firebase Configuration

See `infrastructure/firebase.json` for Firebase hosting, functions, and Firestore configuration.

## Security

- **OAuth 2.0**: Secure Xero authentication
- **Token Encryption**: All tokens encrypted in Firestore
- **HTTPS Only**: Required for PWA and OAuth
- **Rate Limiting**: API request throttling
- **Audit Logs**: Track sensitive operations
- **CSP Headers**: XSS protection

## Performance

### PWA Metrics

- **Lighthouse Score**: 95+
- **LCP**: < 2.5s
- **FID**: < 100ms
- **CLS**: < 0.1

### Offline Support

- Service workers cache static assets
- IndexedDB for offline data storage
- Automatic sync when connection restored
- Draft mode for invoice creation offline

## Testing

```bash
# Run all tests
pnpm test

# Unit tests
pnpm test:unit

# Integration tests
pnpm test:integration

# E2E tests
pnpm test:e2e
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development guidelines.

## Documentation

- [Architecture](ARCHITECTURE.md) - Detailed system design
- [Development](DEVELOPMENT.md) - Development setup and workflows
- [CLAUDE.md](CLAUDE.md) - Instructions for Claude Code

## License

MIT License - see [LICENSE](../LICENSE) for details

## Support

For issues or questions:
- GitHub Issues: [Create an issue](../../issues)
- Documentation: [docs/](.)

## Roadmap

- [ ] Multi-organization support
- [ ] Advanced reporting dashboards
- [ ] AI-powered expense categorization
- [ ] Predictive cash flow analysis
- [ ] Voice interaction support
- [ ] Mobile native apps (iOS/Android)

## Acknowledgments

Built with:
- [Claude Agent SDK](https://docs.claude.com/en/api/agent-sdk/overview)
- [Model Context Protocol](https://modelcontextprotocol.io/)
- [Xero API](https://developer.xero.com/)
- [Firebase](https://firebase.google.com/)
