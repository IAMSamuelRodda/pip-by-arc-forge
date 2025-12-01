# @pip/server

Unified HTTP server for Zero Agent - designed for VPS deployment.

## Overview

This package replaces the AWS Lambda + API Gateway architecture with a single Express server that can run on any VPS (DigitalOcean, Linode, etc.) or container platform.

## Features

- **Chat API**: Process messages through the AI agent
- **Session Management**: Create, list, and manage conversation sessions
- **Xero OAuth**: Handle Xero OAuth 2.0 authorization flow
- **Health Checks**: Kubernetes-compatible health endpoints
- **PWA Serving**: Serve the frontend in production mode

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/chat` | Send message, get AI response |
| `POST` | `/api/sessions` | Create new session |
| `GET` | `/api/sessions` | List user sessions |
| `GET` | `/api/sessions/:id` | Get session history |
| `DELETE` | `/api/sessions/:id` | Delete session |
| `GET` | `/auth/xero` | Start Xero OAuth flow |
| `GET` | `/auth/callback` | OAuth callback |
| `POST` | `/auth/refresh` | Refresh Xero token |
| `GET` | `/auth/status` | Check auth status |
| `DELETE` | `/auth/disconnect` | Disconnect Xero |
| `GET` | `/health` | Basic health check |
| `GET` | `/health/ready` | Readiness check |
| `GET` | `/health/live` | Liveness check |

## Quick Start

```bash
# From repository root
pnpm install

# Set up environment
cp .env.example .env
# Edit .env with your credentials

# Run in development mode
pnpm server

# Build for production
pnpm server:build

# Run production build
pnpm server:start
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | No | Server port (default: 3000) |
| `NODE_ENV` | No | Environment (development/production) |
| `DATABASE_PROVIDER` | No | Database type: sqlite (default) or dynamodb |
| `DATABASE_PATH` | No | SQLite file path (default: ./data.db) |
| `ANTHROPIC_API_KEY` | Yes | Claude API key |
| `XERO_CLIENT_ID` | Yes | Xero OAuth client ID |
| `XERO_CLIENT_SECRET` | Yes | Xero OAuth client secret |
| `BASE_URL` | No | Public URL for OAuth callbacks |
| `FRONTEND_URL` | No | URL to redirect after OAuth |
| `CORS_ORIGIN` | No | Allowed CORS origin (production) |
| `PWA_DIST_PATH` | No | Path to PWA build output |

## Deployment

### Docker

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY . .
RUN npm install -g pnpm && pnpm install && pnpm server:build
EXPOSE 3000
CMD ["pnpm", "server:start"]
```

### systemd

```ini
[Unit]
Description=Pip Server
After=network.target

[Service]
Type=simple
User=pip
WorkingDirectory=/opt/pip
ExecStart=/usr/bin/node packages/server/dist/index.js
EnvironmentFile=/opt/pip/.env
Restart=always

[Install]
WantedBy=multi-user.target
```

### Caddy (Reverse Proxy)

```
app.pip.example.com {
    reverse_proxy localhost:3000
}
```

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                  Express Server                      │
│                                                      │
│  ┌──────────────────────────────────────────────┐  │
│  │  Routes                                       │  │
│  │  ├── /api/chat → AgentOrchestrator           │  │
│  │  ├── /api/sessions → SessionManager          │  │
│  │  ├── /auth/* → Xero OAuth                    │  │
│  │  └── /health → Health checks                 │  │
│  └──────────────────────────────────────────────┘  │
│                         │                           │
│  ┌──────────────────────▼──────────────────────┐  │
│  │  @pip/agent-core                      │  │
│  │  - AgentOrchestrator                         │  │
│  │  - Xero tools (direct function calls)        │  │
│  │  - Session/Memory managers                   │  │
│  └──────────────────────────────────────────────┘  │
│                         │                           │
│  ┌──────────────────────▼──────────────────────┐  │
│  │  @pip/core                            │  │
│  │  - LLM Provider (Anthropic/Ollama)           │  │
│  │  - Database Provider (SQLite/DynamoDB)       │  │
│  └──────────────────────────────────────────────┘  │
│                         │                           │
│  ┌──────────────────────▼──────────────────────┐  │
│  │  SQLite Database                             │  │
│  │  - Sessions, Memory, OAuth tokens            │  │
│  └──────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

## vs AWS Lambda Architecture

| Aspect | Lambda | VPS Server |
|--------|--------|------------|
| Cost | ~$60-90/mo | ~$6-12/mo |
| Cold starts | Yes | No |
| Scaling | Auto | Manual |
| Complexity | High (9+ services) | Low (single process) |
| Deployment | Terraform | Docker/systemd |
