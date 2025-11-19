# Zero Agent - Architecture Documentation

## System Architecture

### High-Level Overview

Zero Agent follows a multi-tier architecture with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────────┐
│                     Presentation Layer                       │
│  ┌──────────────────────────────────────────────────────┐  │
│  │        Progressive Web App (React + Vite)             │  │
│  │  - Mobile-first responsive UI                         │  │
│  │  - Service workers for offline support                │  │
│  │  - IndexedDB for local storage                        │  │
│  └────────────────────┬─────────────────────────────────┘  │
└─────────────────────────┼──────────────────────────────────┘
                          │ WebSocket/HTTP
┌─────────────────────────┼──────────────────────────────────┐
│                  Application Layer                          │
│  ┌────────────────────▼─────────────────────────────────┐  │
│  │         Agent Orchestrator (Claude Agent SDK)        │  │
│  │  - Main agent coordinates sub-agents                 │  │
│  │  - Context management and conversation history       │  │
│  │  - Tool permission management                        │  │
│  └────────────────────┬─────────────────────────────────┘  │
│                       │ MCP Protocol (JSON-RPC)            │
│  ┌────────────────────▼─────────────────────────────────┐  │
│  │     Model Context Protocol (MCP) Server              │  │
│  │  - Tool definitions for Xero operations              │  │
│  │  - API client management                             │  │
│  │  - OAuth token handling                              │  │
│  └────────────────────┬─────────────────────────────────┘  │
└─────────────────────────┼──────────────────────────────────┘
                          │ REST API (HTTPS)
┌─────────────────────────┼──────────────────────────────────┐
│                   Integration Layer                         │
│  ┌────────────────────▼─────────────────────────────────┐  │
│  │          Xero API (xero-node SDK)                    │  │
│  │  - Official Xero API client                          │  │
│  │  - OAuth 2.0 authentication                          │  │
│  │  - Rate limiting and error handling                  │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    Data & Services Layer                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │  Firestore   │  │   Firebase   │  │  Firebase    │     │
│  │   Database   │  │     Auth     │  │  Functions   │     │
│  │              │  │              │  │              │     │
│  │ - Sessions   │  │ - Users      │  │ - Webhooks   │     │
│  │ - Tokens     │  │ - OAuth      │  │ - Scheduled  │     │
│  │ - Cache      │  │              │  │   jobs       │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

## Component Architecture

### 1. Progressive Web App (PWA)

**Technology:** React + Vite + TypeScript

**Responsibilities:**
- User interface and interaction
- Offline data management
- Service worker coordination
- Real-time updates via WebSocket

**Key Features:**
- **App Shell Architecture**: Minimal HTML/CSS/JS cached for instant loading
- **Service Worker**: Background sync, caching, and offline support
- **IndexedDB**: Local storage for drafts and cached data
- **Web App Manifest**: Installability and native-like experience

**Directory Structure:**
```
pwa-app/
├── public/
│   ├── manifest.json          # PWA configuration
│   ├── service-worker.js      # Caching and offline logic
│   └── icons/                 # App icons (multiple sizes)
├── src/
│   ├── components/            # React components
│   │   ├── chat/              # Chat interface
│   │   ├── invoices/          # Invoice management
│   │   ├── dashboard/         # Dashboard widgets
│   │   └── reports/           # Report visualization
│   ├── services/              # API clients
│   │   ├── api.ts             # Backend API
│   │   ├── auth.ts            # Authentication
│   │   └── cache.ts           # IndexedDB wrapper
│   ├── stores/                # State management (Zustand/Redux)
│   └── hooks/                 # React hooks
└── vite.config.ts             # Build configuration
```

**State Management:**
- **Global State**: User session, authentication, organization data
- **Local State**: Component-specific UI state
- **Cache State**: Offline data synchronized with server

**Performance Optimizations:**
- Code splitting by route
- Lazy loading for heavy components
- Image optimization (WebP, AVIF)
- Tree shaking unused code

### 2. Agent Core (Claude Agent SDK)

**Technology:** Claude Agent SDK + TypeScript

**Responsibilities:**
- Conversation orchestration
- Task decomposition
- Sub-agent coordination
- Context management
- Tool permission enforcement

**Architecture Pattern:** Orchestrator-Worker

**Main Agent (Orchestrator):**
- Maintains conversation history
- Decomposes user requests into tasks
- Delegates to specialized sub-agents
- Aggregates results and responds

**Sub-Agents (Workers):**
1. **Invoice Agent** - Create, update, retrieve invoices
2. **Reconciliation Agent** - Bank reconciliation tasks
3. **Reporting Agent** - Financial report generation
4. **Expense Agent** - Expense tracking and categorization

**Directory Structure:**
```
agent-core/
└── src/
    ├── agent.ts               # Main orchestrator
    ├── session.ts             # Session management
    ├── context.ts             # Context tracking
    ├── permissions.ts         # Tool allowlist/denylist
    └── subagents/             # Sub-agent definitions
        ├── invoice.ts
        ├── reconciliation.ts
        ├── reporting.ts
        └── expense.ts
```

**Context Management:**
- Automatic context compaction to prevent overflow
- Relevant history extraction for sub-agents
- User preferences and organization settings
- Session state persistence

**Permission Model:**
- Deny-all default with explicit allowlist
- Tool-specific permissions per user role
- Audit logging for sensitive operations

### 3. MCP Server (Model Context Protocol)

**Technology:** @modelcontextprotocol/sdk + xero-node

**Responsibilities:**
- Xero API integration
- Tool definitions for agent
- OAuth token management
- Request/response transformation

**Tool Categories:**

**Invoicing Tools:**
```typescript
- create_invoice(data: InvoiceInput): Invoice
- get_invoice(invoiceId: string): Invoice
- update_invoice(invoiceId: string, data: InvoiceUpdate): Invoice
- list_invoices(filters: InvoiceFilters): Invoice[]
- send_invoice(invoiceId: string): void
```

**Bank Transaction Tools:**
```typescript
- get_bank_transactions(accountId: string, filters: TransactionFilters): Transaction[]
- create_bank_transaction(data: TransactionInput): Transaction
- reconcile_transaction(transactionId: string, invoiceId: string): void
```

**Reporting Tools:**
```typescript
- generate_profit_loss(dateRange: DateRange): ProfitLossReport
- generate_balance_sheet(date: Date): BalanceSheetReport
- generate_bank_summary(accountId: string, dateRange: DateRange): BankSummaryReport
```

**Expense Tools:**
```typescript
- create_expense(data: ExpenseInput): Expense
- categorize_expense(expenseId: string, category: string): void
- list_expenses(filters: ExpenseFilters): Expense[]
```

**Directory Structure:**
```
mcp-xero-server/
└── src/
    ├── server.ts              # MCP server entry point
    ├── tools/                 # Tool implementations
    │   ├── invoices.ts
    │   ├── bills.ts
    │   ├── expenses.ts
    │   ├── reports.ts
    │   └── reconciliation.ts
    ├── clients/
    │   └── xero-client.ts     # Xero API wrapper
    ├── auth/
    │   ├── oauth.ts           # OAuth flow
    │   └── token-store.ts     # Token persistence
    └── schemas/
        └── xero-schemas.ts    # Zod validation schemas
```

**Authentication Flow:**

1. **Initial OAuth:**
   ```
   User → PWA → OAuth Provider → Xero Authorization
   Xero → Callback → Exchange Code → Access + Refresh Tokens
   Tokens → Firestore (encrypted)
   ```

2. **API Request:**
   ```
   Agent → MCP Server → Retrieve Token from Firestore
   Check Expiration → Refresh if needed → Xero API Call
   Response → Transform → Return to Agent
   ```

3. **Token Refresh:**
   ```
   Detect Expiration (30 minutes) → Use Refresh Token
   Request New Access Token → Update Firestore
   Retry Original Request
   ```

**Error Handling:**
- Automatic retry with exponential backoff
- Token refresh on 401 Unauthorized
- Rate limit detection and queuing
- Detailed error messages for debugging

### 4. Backend Services (Firebase Functions)

**Technology:** Firebase Functions + TypeScript

**Responsibilities:**
- Authentication endpoints
- Webhook handlers
- Scheduled tasks
- Data processing

**Function Categories:**

**Authentication Functions:**
```
auth/login.ts          - Initiate OAuth flow
auth/callback.ts       - Handle OAuth callback
auth/refresh.ts        - Manual token refresh endpoint
```

**Agent Functions:**
```
agent/chat.ts          - Chat API endpoint
agent/session.ts       - Session management
agent/webhook.ts       - Xero webhook receiver
```

**Scheduled Functions:**
```
scheduled/token-cleanup.ts     - Remove expired tokens
scheduled/session-cleanup.ts   - Clean old sessions
scheduled/cache-refresh.ts     - Refresh cached data
```

**Directory Structure:**
```
backend/
├── functions/
│   ├── agent/
│   │   ├── chat.ts
│   │   ├── session.ts
│   │   └── webhook.ts
│   └── auth/
│       ├── login.ts
│       ├── callback.ts
│       └── refresh.ts
└── shared/
    ├── db/
    │   └── firestore.ts       # Firestore helpers
    └── types/
        └── models.ts          # Shared TypeScript types
```

### 5. Data Layer (Firestore)

**Database Schema:**

**Collections:**

1. **users**
   ```typescript
   {
     uid: string;
     email: string;
     displayName: string;
     organizationId: string;
     createdAt: Timestamp;
     lastLoginAt: Timestamp;
   }
   ```

2. **organizations**
   ```typescript
   {
     id: string;
     name: string;
     xeroTenantId: string;
     settings: object;
     createdAt: Timestamp;
   }
   ```

3. **sessions**
   ```typescript
   {
     id: string;
     userId: string;
     agentContext: object;
     conversationHistory: Message[];
     createdAt: Timestamp;
     updatedAt: Timestamp;
     expiresAt: Timestamp;
   }
   ```

4. **tokens**
   ```typescript
   {
     userId: string;
     organizationId: string;
     accessToken: string;        // Encrypted
     refreshToken: string;       // Encrypted
     expiresAt: Timestamp;
     scopes: string[];
     createdAt: Timestamp;
   }
   ```

5. **cache**
   ```typescript
   {
     key: string;
     data: object;
     ttl: number;
     createdAt: Timestamp;
   }
   ```

**Security Rules:**

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only read/write their own data
    match /users/{userId} {
      allow read, write: if request.auth.uid == userId;
    }

    // Organization members can read organization data
    match /organizations/{orgId} {
      allow read: if request.auth.uid != null &&
                     exists(/databases/$(database)/documents/users/$(request.auth.uid)) &&
                     get(/databases/$(database)/documents/users/$(request.auth.uid)).data.organizationId == orgId;
    }

    // Sessions are private to owner
    match /sessions/{sessionId} {
      allow read, write: if request.auth.uid != null &&
                            resource.data.userId == request.auth.uid;
    }

    // Tokens are only accessible by Cloud Functions
    match /tokens/{tokenId} {
      allow read, write: if false; // Only Cloud Functions can access
    }
  }
}
```

## Data Flow

### Invoice Creation Flow

```
1. User: "Create an invoice for Acme Corp for $5,000"
   ↓
2. PWA: Send message to Agent API
   ↓
3. Agent Core: Parse intent, identify "create invoice" task
   ↓
4. Agent Core: Delegate to Invoice Agent sub-agent
   ↓
5. Invoice Agent: Extract entities (customer, amount, description)
   ↓
6. Invoice Agent: Call MCP tool "create_invoice"
   ↓
7. MCP Server: Retrieve OAuth token from Firestore
   ↓
8. MCP Server: Refresh token if expired
   ↓
9. MCP Server: Call Xero API via xero-node SDK
   ↓
10. Xero API: Create invoice, return invoice object
    ↓
11. MCP Server: Transform response, return to Agent
    ↓
12. Invoice Agent: Format response for user
    ↓
13. Agent Core: Send response to PWA
    ↓
14. PWA: Display result to user
```

### Reconciliation Flow

```
1. User: "Reconcile my bank transactions from last week"
   ↓
2. Agent Core: Delegate to Reconciliation Agent
   ↓
3. Reconciliation Agent: Call "get_bank_transactions" tool
   ↓
4. MCP Server: Retrieve transactions from Xero (last 7 days)
   ↓
5. Reconciliation Agent: Call "list_invoices" tool (pending/paid)
   ↓
6. MCP Server: Retrieve invoices from Xero
   ↓
7. Reconciliation Agent: Analyze and match transactions to invoices
   ↓
8. Reconciliation Agent: Auto-match based on amount, date, reference
   ↓
9. For matches: Call "reconcile_transaction" tool
   ↓
10. For unmatched: Present to user for manual review
    ↓
11. Agent Core: Send summary and unmatched list to PWA
    ↓
12. PWA: Display reconciliation results
```

## Security Architecture

### Authentication & Authorization

**Firebase Authentication:**
- Email/password authentication
- Social providers (Google, Microsoft)
- Multi-factor authentication support
- Session token management

**Xero OAuth 2.0:**
- Authorization code flow
- Refresh token rotation
- Scope-based access control
- Webhook signature verification

### Token Security

**Storage:**
- Tokens encrypted using Firebase KMS
- Stored in Firestore with restricted access
- Firestore security rules deny direct client access
- Only Cloud Functions can retrieve tokens

**Rotation:**
- Access tokens refreshed every 30 minutes
- Refresh tokens rotated on each use
- Old refresh tokens invalidated
- Expired tokens automatically cleaned up

### Data Protection

**Encryption:**
- Data in transit: TLS 1.3
- Data at rest: Firestore automatic encryption
- Sensitive fields: Additional application-level encryption

**Access Control:**
- Role-based access control (RBAC)
- Organization-based isolation
- Audit logging for all sensitive operations
- IP allowlisting for admin functions

### PWA Security

**Content Security Policy:**
```
Content-Security-Policy:
  default-src 'self';
  script-src 'self' 'unsafe-inline';
  style-src 'self' 'unsafe-inline';
  connect-src 'self' https://api.xero.com;
  img-src 'self' data: https:;
```

**Service Worker:**
- Only cache authenticated responses with user consent
- Clear cache on logout
- Validate cached data integrity

## Scalability

### Horizontal Scaling

**Firebase Functions:**
- Auto-scales based on request volume
- Individual functions scale independently
- Cold start optimization with min instances

**Firestore:**
- Automatic scaling and sharding
- No manual capacity planning required
- Supports millions of concurrent connections

**MCP Server:**
- Stateless design enables horizontal scaling
- Deploy multiple instances behind load balancer
- Session affinity not required

### Performance Optimization

**Caching Strategy:**
- Static data (tax rates, chart of accounts): Cache in Firestore
- TTL-based cache invalidation
- Background refresh of frequently accessed data

**Request Optimization:**
- Batch API requests where possible
- Use Xero pagination for large datasets
- GraphQL-style field selection (when supported)

### Monitoring

**Metrics:**
- Request latency (p50, p95, p99)
- Error rates by endpoint
- Token refresh failures
- Cache hit rates
- User session duration

**Logging:**
- Structured JSON logs
- Correlation IDs across services
- Error stack traces
- Audit trail for sensitive operations

**Alerting:**
- High error rates
- Slow response times
- OAuth failures
- Token expiration spikes

## Deployment Architecture

### Firebase Hosting

**Static Assets:**
- PWA served from Firebase Hosting
- Global CDN distribution
- HTTP/2 and brotli compression
- Custom domain with SSL

**Configuration:**
```json
{
  "hosting": {
    "public": "packages/pwa-app/dist",
    "rewrites": [
      {
        "source": "/api/**",
        "function": "api"
      },
      {
        "source": "**",
        "destination": "/index.html"
      }
    ],
    "headers": [
      {
        "source": "**/*.@(js|css)",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "public, max-age=31536000, immutable"
          }
        ]
      }
    ]
  }
}
```

### Firebase Functions Deployment

**Regions:**
- Primary: us-central1
- Secondary: europe-west1 (for EU customers)

**Resource Allocation:**
- Memory: 512MB (default), 1GB for heavy operations
- Timeout: 60s (default), 300s for batch operations
- Min instances: 1 for critical paths (reduce cold starts)

### CI/CD Pipeline

```
GitHub Push → GitHub Actions
  ↓
Build & Test
  ├── TypeScript compilation
  ├── Unit tests
  ├── Integration tests
  └── Linting
  ↓
Security Scan
  ├── Dependency audit
  └── Secret scanning
  ↓
Deploy to Staging
  ├── Firebase Hosting (staging)
  ├── Firebase Functions (staging)
  └── Firestore rules (staging)
  ↓
E2E Tests (staging)
  ↓
Manual Approval
  ↓
Deploy to Production
  ├── Firebase Hosting
  ├── Firebase Functions
  └── Firestore rules
```

## Future Enhancements

### Planned Features

1. **Multi-Organization Support**
   - Switch between multiple Xero organizations
   - Consolidated reporting across organizations

2. **Advanced Analytics**
   - AI-powered financial insights
   - Anomaly detection
   - Predictive cash flow analysis

3. **Voice Interface**
   - Speech-to-text for commands
   - Text-to-speech for responses
   - Hands-free operation

4. **Mobile Apps**
   - Native iOS app (Swift)
   - Native Android app (Kotlin)
   - Shared logic via React Native

5. **Third-Party Integrations**
   - Stripe payment links
   - PayPal invoicing
   - Bank feed aggregators

### Technical Debt

- Migrate to GraphQL for more efficient data fetching
- Implement request batching for multiple operations
- Add Redis cache layer for high-traffic deployments
- WebSocket for real-time updates (replace polling)

## References

- [Claude Agent SDK Documentation](https://docs.claude.com/en/api/agent-sdk/overview)
- [Model Context Protocol Specification](https://modelcontextprotocol.io/)
- [Xero API Reference](https://developer.xero.com/documentation/api/accounting/overview)
- [Firebase Documentation](https://firebase.google.com/docs)
- [PWA Best Practices](https://web.dev/progressive-web-apps/)
