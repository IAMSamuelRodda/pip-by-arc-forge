# Zero Agent

> **Purpose**: Project introduction and quick start guide
> **Lifecycle**: Stable (update when fundamentals change)

AI-powered accounting assistant for Xero, built with Claude and native tool calling.

**Live Demo**: https://zero.rodda.xyz
**Current Work**: See [`STATUS.md`](./STATUS.md)

---

## Overview

Zero Agent is a mobile-first Progressive Web App (PWA) that brings natural language interaction to Xero accounting software. Ask questions about your invoices, check unpaid bills, and get insights from your accounting data through conversational AI powered by Claude.

**Key Features:**
- **Conversational Accounting** - Ask questions about invoices, contacts, and financials
- **Xero Integration** - Direct connection to your Xero organization
- **Multi-device Support** - Works on smartphones, tablets, and laptops
- **Self-Hostable** - Run on your own infrastructure with Docker
- **LLM Agnostic** - Supports Anthropic Claude or local models via Ollama

---

## Quick Start

### Use the Live Demo

Visit https://zero.rodda.xyz to try Zero Agent with your Xero account.

### Chat with Zero Agent (CLI)

The quickest way to try locally:

```bash
# 1. Clone and setup
git clone https://github.com/IAMSamuelRodda/zero-agent.git
cd zero-agent
pnpm install

# 2. Configure environment
cp .env.example .env
# Edit .env with your Anthropic API key and Xero credentials

# 3. Build packages
pnpm build

# 4. Start the server
pnpm --filter @zero-agent/server dev

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

**Last Updated**: 2025-11-27
