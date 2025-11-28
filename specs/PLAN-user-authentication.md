# User Authentication Implementation Plan

> **Purpose**: Add user authentication with email/password and invite codes for beta access
> **Scope**: 25 beta users with individual accounts, data isolation, and Xero connections

## Overview

The current system uses a hardcoded `'default-user'` for all operations. This plan adds:
1. User accounts with email/password authentication
2. Invite codes for controlled beta access
3. JWT-based session management
4. Per-user data isolation (already supported by database schema)

## Current State

**What already works:**
- Database schema keys all data by `userId` (sessions, core_memory, oauth_tokens, business_context)
- SQLite provider has all CRUD operations ready
- API routes accept `x-user-id` header (unused)

**What needs to be added:**
- Users table in SQLite
- Invite codes table
- Auth routes (signup, login, logout)
- JWT middleware for protected routes
- Frontend auth flow (login/signup pages)

---

## Implementation Plan

### Phase 1: Database Schema (Backend)

**File**: `packages/core/src/database/providers/sqlite.ts`

Add two new tables:

```sql
-- Users table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,              -- UUID
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  last_login_at INTEGER
);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Invite codes table
CREATE TABLE IF NOT EXISTS invite_codes (
  code TEXT PRIMARY KEY,            -- 8-char alphanumeric
  created_by TEXT,                  -- Admin who created it
  used_by TEXT REFERENCES users(id),
  created_at INTEGER NOT NULL,
  used_at INTEGER,
  expires_at INTEGER                -- Optional expiry
);
CREATE INDEX IF NOT EXISTS idx_invite_codes_used_by ON invite_codes(used_by);
```

**Add to DatabaseProvider interface:**
```typescript
// User operations
createUser(user: { email: string; passwordHash: string; name?: string }): Promise<User>;
getUserByEmail(email: string): Promise<User | null>;
getUserById(id: string): Promise<User | null>;
updateUser(id: string, updates: Partial<User>): Promise<User>;

// Invite code operations
createInviteCode(code: string, createdBy?: string, expiresAt?: number): Promise<void>;
getInviteCode(code: string): Promise<InviteCode | null>;
useInviteCode(code: string, userId: string): Promise<void>;
listInviteCodes(): Promise<InviteCode[]>;
```

---

### Phase 2: Auth Service (Backend)

**New file**: `packages/server/src/services/auth.ts`

```typescript
// Dependencies
import bcrypt from 'bcryptjs';      // Password hashing
import jwt from 'jsonwebtoken';      // JWT tokens

// Functions needed:
- hashPassword(password: string): Promise<string>
- verifyPassword(password: string, hash: string): Promise<boolean>
- generateToken(userId: string): string
- verifyToken(token: string): { userId: string } | null
```

**Environment variables:**
- `JWT_SECRET`: Secret key for signing JWTs (generate with `openssl rand -base64 32`)
- `JWT_EXPIRY`: Token expiry (default: `7d`)

---

### Phase 3: Auth Routes (Backend)

**New file**: `packages/server/src/routes/user-auth.ts`

| Endpoint | Method | Description | Auth Required |
|----------|--------|-------------|---------------|
| `/auth/signup` | POST | Create account with invite code | No |
| `/auth/login` | POST | Login with email/password | No |
| `/auth/logout` | POST | Invalidate session | Yes |
| `/auth/me` | GET | Get current user info | Yes |
| `/auth/invite-codes` | GET | List invite codes (admin) | Yes |
| `/auth/invite-codes` | POST | Create invite code (admin) | Yes |

**Signup flow:**
1. Validate invite code exists and not used
2. Validate email not already registered
3. Hash password with bcrypt
4. Create user record
5. Mark invite code as used
6. Return JWT token

**Login flow:**
1. Find user by email
2. Verify password
3. Update last_login_at
4. Return JWT token

---

### Phase 4: Auth Middleware (Backend)

**New file**: `packages/server/src/middleware/auth.ts`

```typescript
export function requireAuth(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  req.userId = decoded.userId;
  next();
}
```

**Apply to protected routes:**
- `POST /api/chat`
- `GET/POST /api/sessions`
- `GET/POST/DELETE /api/documents`
- `GET/POST /auth/xero` (link to logged-in user)
- `GET /auth/status`

---

### Phase 5: Frontend Auth (PWA)

**New files:**
- `packages/pwa-app/src/pages/LoginPage.tsx`
- `packages/pwa-app/src/pages/SignupPage.tsx`
- `packages/pwa-app/src/store/authStore.ts`
- `packages/pwa-app/src/components/ProtectedRoute.tsx`

**Auth store (Zustand):**
```typescript
interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, inviteCode: string) => Promise<void>;
  logout: () => void;
}
```

**Token storage:**
- Store JWT in `localStorage` (or secure httpOnly cookie for production)
- Include in all API requests via `Authorization: Bearer <token>`

**Routes:**
- `/login` - Login page
- `/signup` - Signup page (requires invite code)
- `/` - Chat page (protected, redirects to login if not authenticated)

---

### Phase 6: Xero OAuth Integration

**Update**: `packages/server/src/routes/auth.ts`

The Xero OAuth callback currently saves tokens for `'default-user'`. Update to:

1. Before `/auth/xero`: Check user is logged in, store `userId` in OAuth state
2. In `/auth/callback`: Extract `userId` from state, save tokens for that user
3. Each user gets their own Xero connection

---

### Phase 7: Admin CLI for Invite Codes

**New file**: `examples/admin.ts`

Simple CLI script to manage invite codes:

```bash
# Generate 10 invite codes
pnpm admin generate-codes 10

# List all invite codes
pnpm admin list-codes

# Output:
# CODE        STATUS      USED BY         CREATED
# ABCD1234    Available   -               2025-11-28
# EFGH5678    Used        user@email.com  2025-11-28
```

---

## Dependencies to Add

```bash
pnpm add bcryptjs jsonwebtoken
pnpm add -D @types/bcryptjs @types/jsonwebtoken
```

---

## Task Breakdown

| # | Task | Complexity | Status |
|---|------|------------|--------|
| 1 | Add users + invite_codes tables to SQLite | Low | Pending |
| 2 | Add user/invite operations to DatabaseProvider | Low | Pending |
| 3 | Create auth service (bcrypt, JWT) | Low | Pending |
| 4 | Create auth routes (signup, login, me) | Medium | Pending |
| 5 | Create auth middleware | Low | Pending |
| 6 | Protect existing API routes | Low | Pending |
| 7 | Create frontend auth store (Zustand) | Low | Pending |
| 8 | Create LoginPage component | Medium | Pending |
| 9 | Create SignupPage component | Medium | Pending |
| 10 | Add ProtectedRoute wrapper | Low | Pending |
| 11 | Update API client with auth headers | Low | Pending |
| 12 | Update Xero OAuth for per-user tokens | Medium | Pending |
| 13 | Create admin CLI for invite codes | Low | Pending |
| 14 | Test end-to-end auth flow | Medium | Pending |
| 15 | Deploy and verify | Low | Pending |

**Estimated total**: 2-3 days of focused work

---

## Security Considerations

1. **Password hashing**: bcrypt with cost factor 12 (balance security/performance)
2. **JWT secret**: Minimum 256-bit, stored in environment variable
3. **Token expiry**: 7 days for beta convenience (shorten for production)
4. **Rate limiting**: Already have 100 req/min on `/api/*`, add to auth routes
5. **HTTPS**: Already enforced via Caddy
6. **Invite codes**: 8-char alphanumeric, single-use, optional expiry

---

## Migration Path

For existing data (if any):
1. Existing `'default-user'` data stays in place
2. New users get fresh UUIDs
3. No migration needed - old data is orphaned but doesn't conflict

---

## Success Criteria

- [ ] User can sign up with valid invite code
- [ ] User can log in with email/password
- [ ] Logged-out users redirected to login page
- [ ] Each user has isolated: sessions, documents, Xero connection
- [ ] Admin can generate and manage invite codes
- [ ] 25 beta users can be onboarded independently
