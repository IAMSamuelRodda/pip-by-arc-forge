# Pip - AI Bookkeeping Assistant

> **Purpose**: Project introduction and quick start guide
> **Lifecycle**: Stable (update when fundamentals change)

AI-powered bookkeeping assistant for Xero, built with Claude and native tool calling.

**Live Demo**: https://app.pip.arcforge.au
**MCP Server**: https://mcp.pip.arcforge.au (for Claude.ai/ChatGPT)
**Current Work**: See [`STATUS.md`](./STATUS.md)

---

## Overview

Pip is a mobile-first Progressive Web App (PWA) that brings natural language interaction to Xero accounting software. Ask questions about your invoices, check unpaid bills, and get insights from your accounting data through conversational AI powered by Claude.

**Key Features:**
- **Conversational Accounting** - Ask questions about invoices, contacts, and financials
- **Business Context Layer** - Upload business plans/KPIs for context-aware advice
- **Xero Integration** - Direct connection to your Xero organization
- **Multi-device Support** - Works on smartphones, tablets, and laptops
- **Self-Hostable** - Run on your own infrastructure with Docker
- **LLM Agnostic** - Supports Anthropic Claude or local models via Ollama
- **MCP Remote Server** - Use Pip from Claude.ai or ChatGPT ($0 LLM cost)

---

## Quick Start

### Use the Live Demo

Visit https://app.pip.arcforge.au to try Pip with your Xero account.

### Use with Claude.ai

**Requirements**: Claude Pro, Max, or Team subscription

#### Step 1: Add Custom Connector in Claude.ai

1. Open [Claude.ai](https://claude.ai) and sign in
2. Click your profile icon (bottom-left) → **Settings**
3. Go to **Connectors** tab
4. Click **Add Connector** → **Add custom connector**

#### Step 2: Enter Connection Details

| Field | Value |
|-------|-------|
| **Name** | `Pip by Arc Forge` |
| **URL** | `https://mcp.pip.arcforge.au/sse` |
| **Authentication** | Select `OAuth 2.0` |
| **Client ID** | `pip-mcp-client` |
| **Client Secret** | *(provided separately with your invite)* |

Click **Add** to save.

#### Step 3: Connect Your Account

1. Click **Connect** on the Pip connector
2. You'll be redirected to the Pip sign-in page
3. **New users**: Click "Sign Up" tab, enter your email, password, and invite code
4. **Existing users**: Sign in with your email and password
5. You'll then be redirected to connect your Xero account
6. Authorize Pip to access your Xero organization
7. You'll be redirected back to Claude.ai

#### Step 4: Start Using Pip

In any Claude conversation, try:
- "Who owes me money?"
- "Show me my recent invoices"
- "What's my profit and loss this financial year?"
- "Get my balance sheet"

---

### Use with ChatGPT

**Requirements**: ChatGPT Plus ($20/month) or higher

**Important**: Memory behavior differs by subscription:
- **Business/Teams/Enterprise**: Publish connector for full memory support
- **Plus**: Memory disabled in Developer Mode (see [Memory Guide](./docs/CHATGPT-MEMORY-GUIDE.md))

#### Step 1: Enable Developer Mode

1. Open [ChatGPT](https://chat.openai.com) and sign in
2. Click your profile icon (bottom-left) → **Settings**
3. Go to **Apps & Connectors**
4. Scroll to **Advanced** section
5. Enable **Developer Mode**

#### Step 2: Add Custom Connector

1. In Apps & Connectors, click the **+** button to add a new connector
2. Fill in the connection details:

| Field | Value |
|-------|-------|
| **Name** | `Pip by Arc Forge` |
| **Description** | `The helpful bookkeeping assistant - connects to Xero for invoices, reports, and financial insights` |
| **MCP Server URL** | `https://mcp.pip.arcforge.au/sse` |
| **Authentication** | Select `OAuth` |
| **OAuth Client ID** | `pip-mcp-client` |
| **OAuth Client Secret** | *(provided separately with your invite)* |

3. Check "I understand and want to continue"
4. Click **Create**

#### Step 3: Connect Your Account

1. You'll see the connector in your list showing "Pip by Arc Forge"
2. The OAuth flow will redirect you to sign in/sign up
3. Connect your Xero account when prompted
4. You'll be redirected back to ChatGPT

#### Step 4: Start Using Pip

In any ChatGPT conversation (with Developer Mode badge visible), try:
- "Can you see who owes me money?"
- "Show me my Xero invoices"
- "What's my profit and loss?"
- "Get my organisation details"

---

### Available Tools

Once connected, Pip provides these Xero tools:

| Category | Tools |
|----------|-------|
| **Invoices** | `get_invoices`, `get_aged_receivables`, `get_aged_payables` |
| **Reports** | `get_profit_and_loss`, `get_balance_sheet` |
| **Banking** | `get_bank_accounts`, `get_bank_transactions` |
| **Contacts** | `get_contacts`, `search_contacts` |
| **Organisation** | `get_organisation` |

---

### Troubleshooting

**"Configure" button instead of "Connect"** (Claude.ai)
- The OAuth flow isn't triggering. Check that you entered the correct URL ending in `/sse`

**No invoices showing when you know there are some**
- Check you're connected to the correct Xero organisation
- Invoices must be in "Authorised" status (not Draft) to appear in aged receivables

**OAuth error during sign-up**
- Ensure you have a valid invite code
- Check your email is correctly formatted

**Need an invite code?**
- Contact the Pip team at Arc Forge for beta access

### Run Locally (CLI)

```bash
# 1. Clone and setup
git clone https://github.com/IAMSamuelRodda/pip.git
cd pip
pnpm install

# 2. Configure environment
cp .env.example .env
# Edit .env with your Anthropic API key and Xero credentials

# 3. Build packages
pnpm build

# 4. Start the server
pnpm --filter @pip/server dev

# 5. Connect to Xero
# Visit http://localhost:3000/auth/xero and authorize

# 6. Start chatting!
pnpm chat
```

See [`CHAT_GUIDE.md`](./CHAT_GUIDE.md) for detailed usage instructions.

### Docker Deployment

```bash
# Build and run with Docker Compose
docker compose up -d

# Check health
curl http://localhost:3000/health
```

---

## Architecture

**Tech Stack:**
- **Frontend**: React + Vite (PWA)
- **Backend**: Express.js (Node.js 20+)
- **Agent**: Native Claude tool calling
- **Integration**: xero-node SDK
- **Database**: SQLite (default) or DynamoDB
- **Hosting**: Docker + Caddy (auto-HTTPS)

**Architecture Pattern:**
```
PWA (React) → Express API → Agent Orchestrator → Xero API
                  ↓               ↓
              SQLite         Claude (Anthropic)
```

See [`ARCHITECTURE.md`](./ARCHITECTURE.md) for complete details.

---

## Documentation

- [`ARCHITECTURE.md`](./ARCHITECTURE.md) - System architecture, database schema, ADRs
- [`STATUS.md`](./STATUS.md) - Current work, known issues
- [`CONTRIBUTING.md`](./CONTRIBUTING.md) - Workflow, progress tracking
- [`DEVELOPMENT.md`](./DEVELOPMENT.md) - Git workflow, CI/CD, testing
- [`CHANGELOG.md`](./CHANGELOG.md) - Release history
- [`docs/CHATGPT-MEMORY-GUIDE.md`](./docs/CHATGPT-MEMORY-GUIDE.md) - ChatGPT memory with Pip

---

## Testing

```bash
# Run all tests
pnpm test

# Unit tests only
pnpm test:unit

# E2E tests
pnpm test:e2e
```

See [`DEVELOPMENT.md`](./DEVELOPMENT.md) for complete testing setup.

---

## Contributing

See [`CONTRIBUTING.md`](./CONTRIBUTING.md) for workflow guide and best practices.

---

## License

MIT License

---

**Last Updated**: 2025-11-30
