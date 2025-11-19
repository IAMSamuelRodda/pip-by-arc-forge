# ADR-012: Open Source Platform Architecture

**Status**: Proposed
**Date**: 2025-11-17
**Deciders**: Architecture team, Product team
**Supersedes**: ADR-011 (BYOK model), ADR-003 (Subscription tiers)

---

## Context

Zero Agent started as a proprietary SaaS product, but we're pivoting to an **open source platform** model. The vision:

> **"Open source Xero AI assistant that works with ANY LLM backend - self-hostable, vendor-agnostic, with optional managed hosting"**

**Philosophy**:
- Don't lock users into our service
- Don't force them to pay for features unless we're managing infrastructure
- Encourage forking, modification, self-hosting
- Revenue from convenience, not vendor lock-in

**Similar To**: Supabase, PostHog, GitLab (open core platforms)

---

## Decision Drivers

1. **User Freedom**: Users should own their data and choose their AI provider
2. **Privacy**: Self-hosting option for sensitive financial data
3. **Flexibility**: Support ANY LLM (cloud API, local Ollama, future models)
4. **Sustainability**: Revenue model that funds development without extracting rent
5. **Community**: Open source attracts contributors and builds trust
6. **Differentiation**: Xero integration expertise is our moat, not AI vendor lock-in

---

## Architecture Decisions

### 1. License: MIT (Fully Open Source)

**Decision**: Release ALL code under MIT license

**Rationale**:
- Maximum freedom to fork/modify/commercialize
- Apache 2.0 considered, but MIT is simpler and more permissive
- GPL rejected (too restrictive, limits commercial adoption)
- No "open core" model - everything is open

**Implications**:
- Anyone can create competing hosted services
- Revenue must come from brand, convenience, expertise (not code secrecy)
- Community contributions flow back to us

### 2. Deployment Models: Hybrid (Self-Host + Managed)

**Decision**: Support THREE deployment models

#### Model A: Self-Hosted (Full DIY)
- User runs ALL infrastructure in their own environment
- Terraform/Docker configs provided
- Database: User's choice (DynamoDB, PostgreSQL, SQLite)
- LLM: User's API keys or local models
- Xero OAuth: User creates own Xero developer app OR uses our OAuth proxy (Option C)

**Target**: Developers, privacy-focused, cost-sensitive users

#### Model B: Managed Hosting (Full Service)
- We run ALL infrastructure (AWS Lambda, DynamoDB, CloudFront)
- We provide API keys to LLM providers (markup on costs)
- Single bill, zero DevOps
- Xero OAuth: Uses our Xero app registration

**Target**: Non-technical users, businesses, convenience seekers
**Pricing**: $20-100/month (includes infra + managed AI)

#### Model C: Hybrid (Bring Infrastructure, We Proxy OAuth)
- User self-hosts app logic
- We provide OAuth proxy for Xero (avoid everyone creating Xero apps)
- LLM: User's choice

**Target**: Advanced users who want control but need OAuth convenience

**Decision**: Support ALL THREE, focus MVP on Model A + B

### 3. LLM Abstraction Layer: Provider Agnostic

**Decision**: Create abstraction layer supporting ANY LLM backend

**Interface** (packages/core/src/llm/LLMProvider.ts):
```typescript
interface LLMProvider {
  name: string;  // "anthropic" | "openai" | "google" | "grok" | "ollama" | "custom"

  // Authentication
  authenticate(config: AuthConfig): Promise<void>;

  // Core chat interface (OpenAI-compatible)
  chat(messages: Message[], options?: ChatOptions): Promise<ChatResponse>;

  // Streaming support
  streamChat(messages: Message[], options?: ChatOptions): AsyncIterator<ChatChunk>;

  // Usage tracking (for managed tier)
  getUsage(): Promise<UsageMetrics>;
}

interface AuthConfig {
  method: "api_key" | "oauth" | "local";
  credentials?: {
    apiKey?: string;
    oauthToken?: string;
    endpoint?: string;  // For local models
  };
}
```

**Supported Providers (MVP)**:
1. ✅ **Anthropic** (API key) - Default for testing
2. ✅ **OpenAI** (API key)
3. ✅ **Google Gemini** (API key + OAuth)
4. ✅ **Grok** (API key)
5. ✅ **Ollama** (Local HTTP endpoint)
6. ✅ **Custom OpenAI-Compatible** (e.g., LM Studio, vLLM, LocalAI)

**Roadmap (Post-MVP)**:
- 🔜 OpenAI OAuth (when "Sign in with ChatGPT" launches)
- 🔜 Anthropic OAuth (if/when available)
- 🔜 Bedrock (AWS-hosted models)
- 🔜 Vertex AI (GCP-hosted models)

### 4. Database Abstraction: Multi-Backend Support

**Decision**: Support multiple database backends via abstraction layer

**Interface** (packages/core/src/database/DatabaseProvider.ts):
```typescript
interface DatabaseProvider {
  // Session management
  saveSession(session: Session): Promise<void>;
  getSession(sessionId: string): Promise<Session | null>;
  listSessions(userId: string): Promise<Session[]>;

  // User management
  saveUser(user: User): Promise<void>;
  getUser(userId: string): Promise<User | null>;

  // Xero token storage
  saveXeroTokens(userId: string, tokens: XeroTokens): Promise<void>;
  getXeroTokens(userId: string): Promise<XeroTokens | null>;

  // Usage tracking (for managed tier)
  incrementUsage(userId: string, usage: UsageMetrics): Promise<void>;
  getUsage(userId: string, month: string): Promise<UsageMetrics>;
}
```

**Supported Backends**:
1. ✅ **DynamoDB** (AWS managed) - Default for hosted service
2. ✅ **PostgreSQL** (Self-hosted or RDS) - For self-hosters
3. ✅ **SQLite** (Local file) - For desktop app, development
4. 🔜 **MongoDB** (If requested by community)

**Implementation**: Adapter pattern, pluggable via config

### 5. Xero OAuth: Dual Mode (Own App + Proxy)

**Challenge**: Xero OAuth requires fixed redirect URLs. Self-hosted users have dynamic URLs.

**Decision**: Support BOTH modes

#### Mode 1: User's Own Xero App (Full Self-Host)
- User creates Xero developer app at https://developer.xero.com/app/manage
- User configures redirect URL to their own domain
- User provides `XERO_CLIENT_ID` and `XERO_CLIENT_SECRET` in config

**Pros**: Full independence, no dependency on us
**Cons**: Extra setup friction, user manages Xero app

#### Mode 2: OAuth Proxy (Convenience)
- User self-hosts app, but uses OUR Xero app credentials
- OAuth flow redirects to our proxy: `https://api.zero-agent.com/oauth/callback`
- Proxy forwards tokens back to user's self-hosted instance

**Architecture**:
```
User's Self-Hosted App → Xero OAuth → Our Proxy API → User's App
                                       ↓
                                 (We relay tokens,
                                  don't store them)
```

**Security**:
- Proxy uses short-lived state tokens (5 min expiry)
- Tokens encrypted in transit (TLS)
- We never store user's Xero tokens (pass-through only)

**Pros**: Simple setup, user doesn't need Xero developer account
**Cons**: Dependency on our proxy service

**Implementation**: Both modes supported, user chooses via config flag `XERO_OAUTH_MODE=own|proxy`

### 6. Revenue Model: Convenience + Enterprise Features

**Decision**: Charge for what costs us to run, open source everything else

#### Free Tier (Open Source, Self-Hosted)
- **Price**: $0
- **Includes**: All features, unlimited usage
- **Requires**: User runs own infrastructure, brings own LLM
- **Support**: Community support (GitHub Discussions)
- **Revenue**: $0 (builds brand, attracts contributors)

#### Managed Hosting (Convenience)
- **Price**: $20/month
- **Includes**:
  - We run infrastructure (AWS Lambda, DynamoDB, CloudFront)
  - 100 conversations/month OR 1M tokens
  - Email support (48h response)
  - Automatic updates
- **LLM**: User brings API key OR pays us for managed AI (+$5-10/month markup)
- **Revenue**: ~$10-15/month profit per user

#### Managed AI (Optional Add-On)
- **Price**: +$10/month on top of hosting
- **Includes**:
  - We provide Anthropic/OpenAI API keys
  - 100 conversations/month (Sonnet 4.5)
  - No setup, just works
- **Cost**: ~$9/month in API fees
- **Revenue**: ~$1/month profit (low margin, convenience play)

#### Enterprise (Full Service + Advanced Features)
- **Price**: $100/month (or $50/seat, 5 seat minimum)
- **Includes**:
  - Everything in Managed
  - 500 conversations/month (or 10M tokens)
  - SSO integration (SAML, OAuth)
  - Audit logs (compliance)
  - Multi-user workspaces
  - Custom integrations
  - Priority support (4h response, Slack channel)
- **Revenue**: ~$50-70/month profit per account

#### Consulting/Support (Services)
- **Price**: $150/hour OR retainer packages
- **Includes**:
  - Self-hosting setup assistance
  - Custom integration development
  - Training for teams
  - SLA guarantees
- **Revenue**: High margin, scales with expertise

**Philosophy**:
- Don't charge for code (it's open source)
- Charge for running infrastructure (AWS costs money)
- Charge for convenience (managed AI, no DevOps)
- Charge for enterprise features (SSO, audit logs, compliance)
- Charge for expertise (consulting, priority support)

---

## Technical Implementation

### Monorepo Structure

```
zero-agent/
├── packages/
│   ├── core/                    # Shared types, abstractions
│   │   ├── llm/                 # LLM provider abstraction
│   │   ├── database/            # Database abstraction
│   │   └── xero/                # Xero API client
│   ├── agent/                   # Claude Agent SDK logic
│   │   ├── orchestrator/        # Main agent
│   │   ├── sub-agents/          # Specialized agents
│   │   └── memory/              # Session management
│   ├── mcp-xero/                # MCP server (Xero tools)
│   ├── pwa/                     # React PWA frontend
│   └── api/                     # REST API (Lambda or Express)
├── functions/                   # AWS Lambda handlers
│   ├── agent/                   # Agent Lambda wrapper
│   ├── mcp/                     # MCP Lambda wrapper
│   └── auth/                    # Xero OAuth callback
├── terraform/                   # AWS infrastructure (hosted)
├── docker/                      # Docker Compose (self-host)
├── scripts/                     # Setup scripts
│   ├── setup-aws.sh             # AWS deployment
│   ├── setup-docker.sh          # Docker self-host
│   └── setup-dev.sh             # Local development
└── docs/
    ├── self-hosting.md          # Self-hosting guide
    ├── managed-hosting.md       # Managed service docs
    └── contributing.md          # Contribution guide
```

### Configuration System

**Environment Variables** (`.env`):
```bash
# Deployment mode
DEPLOYMENT_MODE=self-hosted  # or "managed"

# LLM Provider
LLM_PROVIDER=anthropic  # or openai, google, grok, ollama, custom
LLM_AUTH_METHOD=api_key  # or oauth, local
LLM_API_KEY=sk-ant-...  # If using API key
LLM_ENDPOINT=http://localhost:11434  # If using local Ollama

# Database
DATABASE_PROVIDER=sqlite  # or dynamodb, postgresql
DATABASE_URL=./data/zero-agent.db  # For SQLite/PostgreSQL
AWS_REGION=ap-southeast-2  # For DynamoDB

# Xero OAuth
XERO_OAUTH_MODE=own  # or "proxy"
XERO_CLIENT_ID=your-client-id  # If mode=own
XERO_CLIENT_SECRET=your-secret  # If mode=own
XERO_REDIRECT_URI=http://localhost:3000/auth/callback

# Feature Flags (Enterprise only)
ENABLE_SSO=false
ENABLE_AUDIT_LOGS=false
ENABLE_MULTI_TENANCY=false
```

### Docker Compose (Self-Host)

```yaml
# docker-compose.yml
version: '3.8'

services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_DB: xero_agent
      POSTGRES_USER: xero
      POSTGRES_PASSWORD: changeme
    volumes:
      - postgres_data:/var/lib/postgresql/data

  ollama:  # Optional: Local LLM
    image: ollama/ollama:latest
    volumes:
      - ollama_data:/root/.ollama
    ports:
      - "11434:11434"

  app:
    build: .
    environment:
      DATABASE_PROVIDER: postgresql
      DATABASE_URL: postgres://xero:changeme@postgres:5432/xero_agent
      LLM_PROVIDER: ollama
      LLM_ENDPOINT: http://ollama:11434
      XERO_OAUTH_MODE: proxy  # Use our OAuth proxy
    ports:
      - "3000:3000"
    depends_on:
      - postgres
      - ollama

volumes:
  postgres_data:
  ollama_data:
```

### Terraform (Managed Hosting)

**Sydney Region** (ap-southeast-2):
```hcl
# terraform/variables.tf
variable "aws_region" {
  default = "ap-southeast-2"  # Sydney for Australian users
}

# Multi-tenant support
variable "enable_multi_tenancy" {
  default = false  # Enterprise only
}

variable "enable_sso" {
  default = false  # Enterprise only
}
```

**Feature Flags via Terraform**:
- Free/self-hosted users: All flags disabled (but code is open source)
- Managed tier: Basic features only
- Enterprise tier: All features enabled (SSO, audit logs, multi-tenancy)

---

## LLM Provider Implementation Roadmap

### MVP (Week 1-2): API Key Support

**Providers**:
1. ✅ Anthropic (Claude Sonnet 4.5 - cheapest for testing at $3/$15 per MTok)
2. ✅ OpenAI (GPT-4o)
3. ✅ Google Gemini (Gemini 1.5 Pro)
4. ✅ Grok (Grok 4)
5. ✅ Ollama (Local - llama3, mistral, etc.)

**Implementation**:
- Abstract `LLMProvider` interface
- Implement 5 adapters (one per provider)
- Configuration via environment variables
- Test with Anthropic Haiku (cheapest: $0.80/$4 per MTok)

### Phase 2 (Week 3-4): OAuth Integration

**Providers**:
1. ✅ Google Gemini OAuth (available now)
2. 🔜 OpenAI OAuth (when "Sign in with ChatGPT" launches)

**Implementation**:
- OAuth flow in PWA settings page
- Store OAuth tokens encrypted (per-user Secrets Manager or database)
- Token refresh logic
- Fallback to API key if OAuth fails

### Phase 3 (Month 2): Advanced Features

**Features**:
1. 🔜 Model selection per provider (Haiku vs Sonnet vs Opus)
2. 🔜 Cost estimation dashboard
3. 🔜 Provider failover (try Anthropic, fallback to OpenAI)
4. 🔜 Custom system prompts per provider
5. 🔜 Usage analytics (tokens, cost, latency)

---

## Database Migration Strategy

### Self-Hosted Users

**Default**: SQLite (zero config, single file)
**Upgrade**: PostgreSQL (for multi-user, better concurrency)

**Migration Script** (`scripts/migrate-db.sh`):
```bash
# Export from SQLite
sqlite3 data/zero-agent.db .dump > backup.sql

# Import to PostgreSQL
psql -U xero -d xero_agent -f backup.sql
```

### Managed Users

**Default**: DynamoDB (serverless, auto-scaling)
**Why**: No server management, pay-per-request, built-in encryption

**No migration needed**: Users don't manage database

---

## Xero OAuth Proxy Implementation

**Service**: `https://api.zero-agent.com/oauth/*`

**Endpoints**:
1. `GET /oauth/authorize` - Initiate OAuth flow
2. `GET /oauth/callback` - Xero redirects here
3. `POST /oauth/exchange` - Self-hosted app polls for tokens

**Flow**:
```
1. User clicks "Connect Xero" in self-hosted app
2. App generates state token, sends to proxy: GET /oauth/authorize?state=abc123&callback_url=http://localhost:3000
3. Proxy redirects user to Xero with our client_id
4. User authorizes Xero app
5. Xero redirects to proxy: /oauth/callback?code=xyz&state=abc123
6. Proxy exchanges code for tokens
7. Proxy stores tokens temporarily (5 min) keyed by state token
8. Self-hosted app polls: POST /oauth/exchange {state: "abc123"}
9. Proxy returns tokens, deletes from memory
10. Self-hosted app stores tokens locally
```

**Security**:
- State tokens expire in 5 minutes
- HTTPS only (TLS encryption)
- Rate limiting (10 requests/min per IP)
- No persistent storage of tokens (memory only)
- CORS restricted to known callback URLs

**Cost**: Minimal (CloudFront + API Gateway + Lambda, ~$1/month for 1000 users)

---

## Regional Deployment (Sydney)

**Decision**: Deploy to **ap-southeast-2 (Sydney)** for Australian market

**Rationale**:
- Xero is New Zealand-based, primarily APAC market
- Users likely in AU/NZ
- Reduces latency from 200-300ms (us-east-1) to 10-50ms

**Multi-Region Roadmap**:
- MVP: Sydney only
- Phase 2: Add us-east-1 (North America), eu-west-1 (Europe)
- Use Route 53 geolocation routing

**Terraform**:
```hcl
variable "aws_region" {
  default = "ap-southeast-2"
}
```

---

## Testing Strategy

### MVP Testing (API Key Model)

**Local Development**:
- Use Ollama (free, runs locally)
- Test with llama3:8b or mistral (good quality, fast)
- Zero API costs

**Integration Testing**:
- Use Anthropic Haiku (cheapest: $0.80/$4 per MTok)
- Set spending limit: $10/month in Anthropic Console
- Mock responses for CI/CD (no real API calls)

**Load Testing**:
- Cannot load test with real APIs (cost prohibitive)
- Use mock LLM provider for load tests
- Estimate costs from token counts, not actual bills

### OAuth Testing (Google Gemini)

**Approach**:
- Create test Google account
- Use Gemini free tier (60 requests/min)
- Test OAuth flow end-to-end
- Document setup process for users

---

## Success Metrics

### Open Source Community

**3 Month Goals**:
- ⭐ 500+ GitHub stars
- 🍴 50+ forks
- 💬 20+ contributors
- 📦 10+ community PRs merged

### Self-Hosted Adoption

**3 Month Goals**:
- 📥 500+ Docker pulls
- 🚀 50+ successful self-host deployments (telemetry opt-in)
- 📖 10+ community guides/tutorials
- 🐛 <5 critical bugs reported

### Managed Hosting Revenue

**3 Month Goals**:
- 👥 50 paying customers
- 💰 $1000/month MRR (Monthly Recurring Revenue)
- 📈 30% month-over-month growth
- 😊 NPS > 40 (user satisfaction)

### LLM Provider Diversity

**6 Month Goals**:
- 40% Anthropic users
- 30% OpenAI users
- 20% Local (Ollama) users
- 10% Other (Google, Grok)

**Metric**: Measure via opt-in telemetry in managed tier, surveys for self-hosted

---

## Risks & Mitigations

### Risk 1: Competitor Forks and Undercuts Pricing

**Risk**: Someone forks our code, offers cheaper managed hosting

**Mitigation**:
- This is a feature, not a bug (validates market)
- Compete on brand, support quality, Xero integration expertise
- Community contributions flow to all forks (we benefit too)
- Focus on being the "official" trusted version

**Acceptable**: Open source philosophy embraces this risk

### Risk 2: Support Burden from Self-Hosted Users

**Risk**: Free users demand support we can't afford to provide

**Mitigation**:
- Clear documentation: "Community support only for free tier"
- GitHub Discussions for peer support
- Paid support offered via consulting packages
- Monitor common issues, improve docs to reduce questions

**Boundary**: Politely redirect free users to community channels

### Risk 3: OAuth Proxy Becomes Expensive at Scale

**Risk**: If 10,000 self-hosted users use our OAuth proxy, costs increase

**Mitigation**:
- Proxy is minimal (API Gateway + Lambda, ~$0.001 per flow)
- 10,000 monthly flows = $10/month (negligible)
- If costs spike, introduce rate limits or ask heavy users to create own Xero apps
- Proxy is convenience, not requirement (users can always use Mode 1: Own App)

**Acceptable**: Proxy costs are < 1% of managed hosting revenue

### Risk 4: Xero Changes API, Breaks Self-Hosted Versions

**Risk**: Xero deprecates API endpoints, users blame us

**Mitigation**:
- Monitor Xero developer changelog
- Proactive updates to codebase
- Version pinning in docs ("Tested with Xero API v2.0")
- Community can contribute fixes (benefit of open source)

**Impact**: Manageable, Xero has stable API with deprecation notices

---

## Decision

**APPROVED**: Pivot to open source platform architecture

**Immediate Actions**:
1. ✅ Release code under MIT license (update LICENSE file)
2. ✅ Implement LLM abstraction layer
3. ✅ Add database abstraction (SQLite, PostgreSQL, DynamoDB)
4. ✅ Create Docker Compose for self-hosting
5. ✅ Update Terraform for Sydney region (ap-southeast-2)
6. ✅ Build Xero OAuth proxy service
7. ✅ Write self-hosting documentation
8. ✅ Update pricing page to reflect new tiers

**Phase 1 (Week 1-2): MVP**
- API key support for 5 LLM providers
- SQLite database for self-host
- Docker Compose setup
- Basic documentation

**Phase 2 (Week 3-4): OAuth + Managed**
- Google Gemini OAuth
- OAuth proxy for Xero
- Managed hosting tier (Sydney region)
- Billing integration (Stripe)

**Phase 3 (Month 2): Community**
- GitHub Discussions setup
- Contribution guidelines
- Community showcase page
- Marketing launch (HN, Reddit, etc.)

---

## References

- Open source inspiration: Supabase, PostHog, GitLab
- LLM OAuth research:
  - Google Gemini: https://ai.google.dev/gemini-api/docs/oauth
  - OpenAI "Sign in with ChatGPT": https://techcrunch.com/2025/05/27/openai-may-soon-let-you-sign-in-with-chatgpt-for-other-apps/
  - Grok API: https://docs.x.ai/docs/overview
- Claude Agent SDK: https://docs.claude.com/en/api/agent-sdk/overview
- Xero API: https://developer.xero.com/documentation/
- Related ADRs: ADR-003, ADR-007, ADR-010, ADR-011

---

**Next Steps**: Begin implementation of LLM abstraction layer and Sydney region Terraform updates.
