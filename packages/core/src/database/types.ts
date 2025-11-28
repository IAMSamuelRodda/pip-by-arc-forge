/**
 * Database Abstraction Types
 *
 * Supports multiple backends: SQLite, PostgreSQL, DynamoDB
 */

import type { Message } from "../llm/types.js";

// ============================================================================
// Core Entities
// ============================================================================

/**
 * Conversation Session
 * Stores conversation history and context for a user
 */
export interface Session {
  sessionId: string;
  userId: string;
  messages: Message[];
  agentContext: Record<string, any>;
  createdAt: number; // Unix timestamp
  updatedAt: number; // Unix timestamp
  expiresAt: number; // Unix timestamp (30 days from creation)
}

/**
 * Core Memory (Free tier - always available)
 * Stores user preferences and relationship progression
 */
export interface CoreMemory {
  userId: string;
  preferences: {
    xeroOrgId?: string; // Xero organization/tenant ID
    xeroOrgName?: string; // Xero organization name
    reportingPreferences?: Record<string, any>;
    communicationStyle?: "formal" | "casual" | "technical";
    timezone?: string; // IANA timezone (e.g., "Australia/Sydney")
    currency?: string; // ISO 4217 (e.g., "AUD")
  };
  relationshipStage: "colleague" | "partner" | "friend";
  relationshipStartDate: number; // Unix timestamp
  keyMilestones: Milestone[];
  criticalContext: string[]; // Important facts about the user
  createdAt: number;
  updatedAt: number;
}

export interface Milestone {
  type: string; // e.g., "first_invoice", "100th_transaction", "year_anniversary"
  description: string;
  timestamp: number;
}

/**
 * Extended Memory (Paid tier - semantic search)
 * Stores conversation summaries with embeddings
 */
export interface ExtendedMemory {
  memoryId: string; // Unique identifier
  userId: string;
  conversationSummary: string; // Summary of conversation or learned pattern
  embedding?: number[]; // Vector embedding for semantic search
  learnedPatterns: Record<string, any>; // Patterns learned about user behavior
  emotionalContext?: string; // Emotional state or tone from conversation
  topics: string[]; // Topics discussed
  createdAt: number;
  ttl?: number; // Time-to-live (expires if subscription lapses)
}

/**
 * OAuth Tokens
 * Stores Xero OAuth credentials for API access
 */
export interface OAuthTokens {
  userId: string;
  provider: "xero"; // Future: could support other providers
  accessToken: string;
  refreshToken: string;
  tokenType: string; // Usually "Bearer"
  expiresAt: number; // Unix timestamp (30 minutes from issue)
  scopes: string[]; // OAuth scopes granted
  tenantId?: string; // Xero organization ID
  tenantName?: string; // Xero organization name
  createdAt: number;
  updatedAt: number;
}

/**
 * User Account
 * Stores user authentication and profile information
 */
export interface User {
  id: string;
  email: string;
  passwordHash: string;
  name?: string;
  isAdmin?: boolean;
  createdAt: number;
  updatedAt: number;
  lastLoginAt?: number;
}

/**
 * Invite Code
 * Controls beta access - users need a valid code to sign up
 */
export interface InviteCode {
  code: string;
  createdBy?: string;
  usedBy?: string;
  createdAt: number;
  usedAt?: number;
  expiresAt?: number;
}

// ============================================================================
// Query Filters
// ============================================================================

export interface SessionFilter {
  userId: string;
  sessionId?: string;
  limit?: number;
  sortOrder?: "asc" | "desc";
}

export interface MemoryFilter {
  userId: string;
  topics?: string[];
  limit?: number;
  sortOrder?: "asc" | "desc";
}

// ============================================================================
// Database Provider Interface
// ============================================================================

export type DatabaseProviderName = "sqlite" | "dynamodb" | "postgresql";

export interface DatabaseConfig {
  provider: DatabaseProviderName;
  connection: ConnectionConfig;
}

export type ConnectionConfig =
  | SQLiteConnectionConfig
  | DynamoDBConnectionConfig
  | PostgreSQLConnectionConfig;

export interface SQLiteConnectionConfig {
  type: "sqlite";
  filename: string; // Path to SQLite database file
  readonly?: boolean;
}

export interface DynamoDBConnectionConfig {
  type: "dynamodb";
  tableName: string;
  region: string;
  endpoint?: string; // For local DynamoDB
}

export interface PostgreSQLConnectionConfig {
  type: "postgresql";
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl?: boolean;
}

/**
 * Database Provider Interface
 *
 * All database implementations must implement this interface
 */
export interface DatabaseProvider {
  readonly name: DatabaseProviderName;

  // Connection management
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;

  // Session operations
  createSession(session: Omit<Session, "createdAt" | "updatedAt">): Promise<Session>;
  getSession(userId: string, sessionId: string): Promise<Session | null>;
  updateSession(userId: string, sessionId: string, updates: Partial<Session>): Promise<Session>;
  deleteSession(userId: string, sessionId: string): Promise<void>;
  listSessions(filter: SessionFilter): Promise<Session[]>;

  // Core Memory operations (Free tier)
  getCoreMemory(userId: string): Promise<CoreMemory | null>;
  upsertCoreMemory(memory: Partial<CoreMemory> & { userId: string }): Promise<CoreMemory>;
  deleteCoreMemory(userId: string): Promise<void>;

  // Extended Memory operations (Paid tier)
  createExtendedMemory(memory: Omit<ExtendedMemory, "memoryId" | "createdAt">): Promise<ExtendedMemory>;
  getExtendedMemory(userId: string, memoryId: string): Promise<ExtendedMemory | null>;
  listExtendedMemories(filter: MemoryFilter): Promise<ExtendedMemory[]>;
  deleteExtendedMemory(userId: string, memoryId: string): Promise<void>;
  searchMemories(userId: string, embedding: number[], limit?: number): Promise<ExtendedMemory[]>;

  // OAuth Token operations
  saveOAuthTokens(tokens: OAuthTokens): Promise<void>;
  getOAuthTokens(userId: string, provider: string): Promise<OAuthTokens | null>;
  updateOAuthTokens(userId: string, provider: string, updates: Partial<OAuthTokens>): Promise<void>;
  deleteOAuthTokens(userId: string, provider: string): Promise<void>;

  // User operations
  createUser(user: { email: string; passwordHash: string; name?: string; isAdmin?: boolean }): Promise<User>;
  getUserByEmail(email: string): Promise<User | null>;
  getUserById(id: string): Promise<User | null>;
  updateUser(id: string, updates: Partial<User>): Promise<User>;

  // Invite code operations
  createInviteCode(code: string, createdBy?: string, expiresAt?: number): Promise<void>;
  getInviteCode(code: string): Promise<InviteCode | null>;
  useInviteCode(code: string, userId: string): Promise<void>;
  listInviteCodes(): Promise<InviteCode[]>;
}

// ============================================================================
// Error Types
// ============================================================================

export class DatabaseError extends Error {
  constructor(
    message: string,
    public provider: DatabaseProviderName,
    public cause?: Error
  ) {
    super(message);
    this.name = "DatabaseError";
  }
}

export class ConnectionError extends DatabaseError {
  constructor(provider: DatabaseProviderName, message: string, cause?: Error) {
    super(`Connection failed: ${message}`, provider, cause);
    this.name = "ConnectionError";
  }
}

export class RecordNotFoundError extends DatabaseError {
  constructor(provider: DatabaseProviderName, recordType: string, identifier: string) {
    super(`${recordType} not found: ${identifier}`, provider);
    this.name = "RecordNotFoundError";
  }
}
