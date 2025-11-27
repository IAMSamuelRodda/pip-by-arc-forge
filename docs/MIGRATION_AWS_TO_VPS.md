# Zero Agent: AWS to DigitalOcean VPS Migration Plan

> **Purpose**: Migrate from AWS serverless (Lambda, DynamoDB, API Gateway, Cognito) to self-hosted VPS architecture
> **Target**: DigitalOcean VPS at `repos/do-vps-prod`
> **Previous AWS Cost**: ~$4/day ($120/month) despite optimizations
> **Target VPS Cost**: ~$6-12/month (single droplet)

---

## Executive Summary

### Why This Migration is Feasible

**Good News**: The codebase already has the abstraction layers needed for self-hosting:

| Component | AWS Version | Self-Hosted Version | Status |
|-----------|-------------|---------------------|--------|
| LLM Provider | Anthropic only | Anthropic + Ollama | **Already implemented** |
| Database | DynamoDB | SQLite + PostgreSQL | **Already implemented** |
| OAuth Server | Lambda + Cognito | Express server | **Already implemented** |

The Lambda functions are **thin wrappers** around the core packages. Migration is primarily about:
1. Replacing Lambda invocation with HTTP/process calls
2. Using SQLite instead of DynamoDB
3. Running Express servers instead of API Gateway

---

## Current AWS Architecture (To Be Replaced)

```
┌─────────────────────────────────────────────────────────────┐
│                    AWS Infrastructure                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  CloudFront (CDN)                                           │
│       ↓                                                      │
│  S3 (PWA Static Files)                                      │
│       ↓                                                      │
│  API Gateway ───────────────────────────────────────┐       │
│       │                                              │       │
│       ├── /chat ──────→ Agent Lambda ──→ Claude API │       │
│       │                      │                       │       │
│       │                      ↓                       │       │
│       │                 MCP Lambda ──→ Xero API     │       │
│       │                      │                       │       │
│       │                      ↓                       │       │
│       │                 DynamoDB                     │       │
│       │                                              │       │
│       └── /auth/* ────→ Auth Lambda                 │       │
│                              │                       │       │
│                              ↓                       │       │
│                        Secrets Manager              │       │
│                                                              │
│  Cognito (User Auth)                                        │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### AWS Services Used (from terraform/)

| Service | Purpose | Monthly Cost Est. |
|---------|---------|-------------------|
| Lambda x3 | Agent, MCP, Auth functions | ~$5-20 |
| DynamoDB | Sessions, memory, tokens | ~$10-30 |
| API Gateway | HTTP routing | ~$5-15 |
| Cognito | User authentication | ~$0-5 |
| Secrets Manager | API keys, OAuth tokens | ~$1-5 |
| CloudFront | CDN for PWA | ~$0-5 |
| S3 | Static file hosting | ~$0-1 |
| CloudWatch | Logging/monitoring | ~$5-10 |
| **Total** | | **~$30-90/month** |

---

## Target VPS Architecture

```
┌─────────────────────────────────────────────────────────────┐
│           DigitalOcean Droplet ($6-12/month)                │
│           Ubuntu 24.04 LTS                                   │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │  Caddy (Reverse Proxy + Auto HTTPS)                │    │
│  │  zero-agent.yourdomain.com → localhost:3000        │    │
│  └──────────────────────┬─────────────────────────────┘    │
│                          │                                   │
│  ┌───────────────────────▼───────────────────────────┐     │
│  │  Zero Agent Server (Node.js + Express)            │     │
│  │  Port 3000                                         │     │
│  │                                                    │     │
│  │  Routes:                                           │     │
│  │  ├── POST /api/chat      → Agent Orchestrator     │     │
│  │  ├── POST /api/sessions  → Session Management     │     │
│  │  ├── GET  /api/sessions/:id → Get History         │     │
│  │  ├── GET  /auth/xero     → OAuth Init             │     │
│  │  ├── GET  /auth/callback → OAuth Callback         │     │
│  │  └── GET  /*             → Serve PWA              │     │
│  │                                                    │     │
│  │  Internal:                                         │     │
│  │  ├── AgentOrchestrator (Claude API calls)         │     │
│  │  ├── XeroTools (MCP tools as direct functions)    │     │
│  │  └── XeroClient (OAuth token management)          │     │
│  └───────────────────────┬───────────────────────────┘     │
│                          │                                   │
│  ┌───────────────────────▼───────────────────────────┐     │
│  │  SQLite Database                                   │     │
│  │  /var/lib/zero-agent/data.db                      │     │
│  │                                                    │     │
│  │  Tables:                                           │     │
│  │  ├── sessions (conversation history)              │     │
│  │  ├── core_memory (user preferences)               │     │
│  │  ├── extended_memory (semantic search)            │     │
│  │  └── oauth_tokens (Xero credentials)              │     │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │  Environment Variables (.env)                      │    │
│  │  ├── ANTHROPIC_API_KEY                            │    │
│  │  ├── XERO_CLIENT_ID                               │    │
│  │  ├── XERO_CLIENT_SECRET                           │    │
│  │  └── DATABASE_PATH=/var/lib/zero-agent/data.db    │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Component Migration Map

### 1. Lambda Functions → Express Routes

| Lambda | Replacement | Implementation |
|--------|-------------|----------------|
| Agent Lambda | `POST /api/chat` route | Use `AgentOrchestrator` class directly |
| MCP Lambda | Direct function calls | Import MCP handlers, skip stdio transport |
| Auth Lambda | `/auth/*` routes | Use existing `oauth-server` package |

**Key Insight**: The MCP Lambda is unnecessary in VPS mode. Instead of:
```
Agent Lambda → invoke MCP Lambda → MCP Server (stdio) → Xero API
```

We can do:
```
Express route → AgentOrchestrator → XeroTools (direct) → Xero API
```

### 2. DynamoDB → SQLite

**Already Implemented!** The `@zero-agent/core` package has:
- `packages/core/src/database/providers/sqlite.ts` - Full SQLite provider
- `packages/core/src/database/providers/dynamodb.ts` - DynamoDB provider

**Migration**: Just configure `DATABASE_PROVIDER=sqlite` in `.env`

### 3. API Gateway → Express/Fastify

| API Gateway Route | Express Route | Handler |
|-------------------|---------------|---------|
| `POST /chat` | `POST /api/chat` | `AgentOrchestrator.processMessage()` |
| `POST /sessions` | `POST /api/sessions` | `SessionManager.createSession()` |
| `GET /sessions/{id}` | `GET /api/sessions/:id` | `SessionManager.getSession()` |
| `GET /auth/xero/login` | `GET /auth/xero` | OAuth redirect |
| `GET /auth/xero/callback` | `GET /auth/callback` | Token exchange |

### 4. Cognito → Simple Auth (or Passport.js)

**Options**:

| Option | Complexity | Best For |
|--------|------------|----------|
| **Session cookies** | Low | Single-user/demo |
| **JWT tokens** | Medium | Multi-user self-host |
| **Passport.js + Local** | Medium | Full auth system |
| **Auth0/Clerk** | Low (SaaS) | Managed auth |

**Recommendation for MVP**: Start with session cookies + simple login, upgrade later.

### 5. Secrets Manager → Environment Variables

| Secret | AWS Storage | VPS Storage |
|--------|-------------|-------------|
| `ANTHROPIC_API_KEY` | Secrets Manager | `.env` file (chmod 600) |
| `XERO_CLIENT_ID` | Secrets Manager | `.env` file |
| `XERO_CLIENT_SECRET` | Secrets Manager | `.env` file |
| OAuth tokens | Secrets Manager | SQLite `oauth_tokens` table |

### 6. CloudFront + S3 → Caddy Static Serving

The PWA can be served directly by the Express server or Caddy:

```
# Caddyfile
zero-agent.yourdomain.com {
    # API routes
    handle /api/* {
        reverse_proxy localhost:3000
    }
    handle /auth/* {
        reverse_proxy localhost:3000
    }

    # PWA static files
    handle {
        root * /var/www/zero-agent/dist
        try_files {path} /index.html
        file_server
    }
}
```

---

## New Server Architecture

### packages/server/ (NEW)

Create a new unified server package that combines all functionality:

```
packages/server/
├── src/
│   ├── index.ts              # Entry point
│   ├── app.ts                # Express app setup
│   ├── routes/
│   │   ├── chat.ts           # POST /api/chat
│   │   ├── sessions.ts       # Session CRUD
│   │   ├── auth.ts           # Xero OAuth
│   │   └── health.ts         # Health checks
│   ├── middleware/
│   │   ├── auth.ts           # Authentication
│   │   ├── rateLimit.ts      # Rate limiting
│   │   └── errorHandler.ts   # Error handling
│   └── services/
│       ├── agent.ts          # AgentOrchestrator wrapper
│       ├── xero.ts           # XeroClient wrapper
│       └── database.ts       # Database initialization
├── package.json
└── tsconfig.json
```

### Example: `routes/chat.ts`

```typescript
import { Router } from 'express';
import { AgentOrchestrator } from '@zero-agent/agent-core';

const router = Router();
const orchestrator = new AgentOrchestrator();

// Initialize on startup
await orchestrator.initialize();

router.post('/chat', async (req, res) => {
  const { message, sessionId } = req.body;
  const userId = req.user?.id || 'default-user'; // From auth middleware

  try {
    const response = await orchestrator.processMessage({
      userId,
      sessionId,
      message,
    });

    res.json({
      message: response.content,
      sessionId: response.sessionId,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
```

---

## Migration Steps

### Phase 1: Create Unified Server (Week 1)

1. **Create `packages/server/` package**
   - [ ] Initialize with Express + TypeScript
   - [ ] Add routes for chat, sessions, auth
   - [ ] Import handlers from existing packages

2. **Consolidate MCP tools into direct calls**
   - [ ] Extract tool handlers from `mcp-xero-server`
   - [ ] Create `XeroToolExecutor` class
   - [ ] Remove stdio transport dependency

3. **Configure SQLite as default**
   - [ ] Set `DATABASE_PROVIDER=sqlite` default
   - [ ] Test session persistence
   - [ ] Test OAuth token storage

### Phase 2: Deployment Setup (Week 1-2)

4. **Create Docker configuration**
   ```yaml
   # docker-compose.yml
   version: '3.8'
   services:
     zero-agent:
       build: .
       ports:
         - "3000:3000"
       volumes:
         - ./data:/var/lib/zero-agent
       env_file:
         - .env
   ```

5. **Create systemd service (alternative to Docker)**
   ```ini
   # /etc/systemd/system/zero-agent.service
   [Unit]
   Description=Zero Agent Server
   After=network.target

   [Service]
   Type=simple
   User=zero-agent
   WorkingDirectory=/opt/zero-agent
   ExecStart=/usr/bin/node dist/index.js
   EnvironmentFile=/opt/zero-agent/.env
   Restart=always

   [Install]
   WantedBy=multi-user.target
   ```

6. **Configure Caddy/Nginx**
   - [ ] Set up reverse proxy
   - [ ] Enable auto HTTPS with Let's Encrypt
   - [ ] Configure WebSocket support (for streaming)

### Phase 3: Testing & Cutover (Week 2)

7. **Test all functionality**
   - [ ] OAuth flow with Xero
   - [ ] Chat with Claude API
   - [ ] Session persistence
   - [ ] PWA installation

8. **Deploy to DigitalOcean VPS**
   - [ ] Clone repo to VPS
   - [ ] Install Node.js 20+
   - [ ] Configure environment
   - [ ] Start service

---

## Files to Create/Modify

### New Files

| File | Purpose |
|------|---------|
| `packages/server/src/index.ts` | Server entry point |
| `packages/server/src/app.ts` | Express app configuration |
| `packages/server/src/routes/*.ts` | API route handlers |
| `docker-compose.yml` | Docker deployment |
| `Dockerfile` | Container build |
| `Caddyfile` | Reverse proxy config |

### Files to Modify

| File | Changes |
|------|---------|
| `packages/agent-core/src/orchestrator.ts` | Remove Lambda invocation, use direct tool calls |
| `packages/agent-core/src/tools/xero-tools.ts` | Already exists, no changes needed |
| `pnpm-workspace.yaml` | Add `packages/server` |
| `package.json` | Add `server:start` script |

### Files No Longer Needed (AWS-specific)

| File/Directory | Reason |
|----------------|--------|
| `functions/` | Lambda wrappers (replaced by Express routes) |
| `terraform/` | AWS infrastructure |
| `docs/SESSION_SUMMARY.md` | AWS deployment docs |

---

## Cost Comparison

| Item | AWS (Current) | DigitalOcean VPS |
|------|---------------|------------------|
| Compute | Lambda: ~$20/mo | Droplet: $6-12/mo |
| Database | DynamoDB: ~$15/mo | SQLite: $0 |
| API Gateway | ~$10/mo | Included in Droplet |
| Auth | Cognito: ~$5/mo | Session/JWT: $0 |
| CDN | CloudFront: ~$5/mo | Optional: $0-5 |
| Secrets | Secrets Mgr: ~$3/mo | .env file: $0 |
| **Total** | **~$60-90/mo** | **~$6-12/mo** |

**Savings: ~85-90%**

---

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Single point of failure | High | Add health checks, auto-restart, backups |
| No auto-scaling | Medium | Monitor usage, upgrade droplet if needed |
| SSL certificate management | Low | Caddy handles auto-renewal |
| Database corruption | Medium | Daily SQLite backups to S3/Spaces |
| DDoS vulnerability | Medium | Cloudflare free tier, rate limiting |

---

## Success Criteria

- [ ] Chat functionality works (Claude API integration)
- [ ] Xero OAuth flow completes successfully
- [ ] Session persistence across server restarts
- [ ] PWA loads and is installable
- [ ] Response latency < 3 seconds
- [ ] Server handles 10+ concurrent users
- [ ] Auto-restart on crash
- [ ] HTTPS with valid certificate

---

## Next Actions

1. **Merge feature branch** to get latest code:
   ```bash
   git checkout master
   git merge origin/feature/infrastructure-complete
   ```

2. **Create `packages/server/`** with Express setup

3. **Test locally** with SQLite + Anthropic

4. **Deploy to VPS** at `repos/do-vps-prod`

---

## References

- Existing self-hosting research: `docs/SELF_HOSTED_ALTERNATIVES.md`
- Database abstraction: `packages/core/src/database/`
- LLM abstraction: `packages/core/src/llm/`
- OAuth server: `packages/oauth-server/`
