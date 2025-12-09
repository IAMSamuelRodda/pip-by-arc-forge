/**
 * Database Abstraction Types
 *
 * Supports multiple backends: SQLite, PostgreSQL
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
  projectId?: string; // Optional: isolate session to specific project
  messages: Message[];
  agentContext: Record<string, any>;
  createdAt: number; // Unix timestamp
  updatedAt: number; // Unix timestamp
  expiresAt: number; // Unix timestamp (30 days from creation)
  // Chat history fields (added for Epic 2.2)
  title?: string; // Auto-generated from first message
  previewText?: string; // Last message preview for sidebar
  isBookmarked?: boolean; // User can bookmark important chats
  // Project info (joined from projects table for UI)
  project?: {
    id: string;
    name: string;
    color?: string;
  };
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
 * OAuth Provider types
 */
export type OAuthProvider = "xero" | "gmail" | "google_drive" | "google_sheets";

/**
 * Connector types for permission management
 * Maps to tool categories in MCP server
 */
export type ConnectorType = "xero" | "gmail" | "google_sheets";

/**
 * Connector Permission
 * Per-connector permission level for granular access control
 * Allows users to set different permission levels for each integration
 */
export interface ConnectorPermission {
  userId: string;
  connector: ConnectorType;
  permissionLevel: PermissionLevel;
  createdAt: number;
  updatedAt: number;
}

/**
 * Connector permission level names
 * Each connector can have its own interpretation of levels
 */
export const CONNECTOR_PERMISSION_NAMES: Record<ConnectorType, Record<PermissionLevel, string>> = {
  xero: {
    0: "Read-Only",
    1: "Create Drafts",
    2: "Approve & Update",
    3: "Delete & Void",
  },
  gmail: {
    0: "Read-Only",
    1: "Read-Only", // Gmail doesn't have write operations yet
    2: "Read-Only",
    3: "Read-Only",
  },
  google_sheets: {
    0: "Read-Only",
    1: "Write & Create",
    2: "Delete",
    3: "Delete", // Level 3 not exposed for Sheets
  },
};

/**
 * OAuth Tokens
 * Stores OAuth credentials for API access (Xero, Gmail, etc.)
 */
export interface OAuthTokens {
  userId: string;
  provider: OAuthProvider;
  accessToken: string;
  refreshToken: string;
  tokenType: string; // Usually "Bearer"
  expiresAt: number; // Unix timestamp (Xero: 30min, Google: 1hr)
  scopes: string[]; // OAuth scopes granted
  // Provider-specific fields
  tenantId?: string; // Xero: organization ID
  tenantName?: string; // Xero: organization name
  providerUserId?: string; // Google: user ID (e.g., '108234567890123456789')
  providerEmail?: string; // Google: user's email address
  createdAt: number;
  updatedAt: number;
}

/**
 * Memory variant (legacy - kept for DB compatibility)
 * All users now use knowledge graph memory (previously Option B)
 */
export type MemoryVariant = 'a' | 'b' | 'control';

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
  memoryVariant?: MemoryVariant; // A/B testing variant assignment
  createdAt: number;
  updatedAt: number;
  lastLoginAt?: number;
}

/**
 * Project
 * Isolated context container - separate memory, sessions, and Xero org per project
 */
export interface Project {
  id: string;
  userId: string;
  name: string;
  description?: string;
  color?: string; // For UI badge (hex color)
  xeroTenantId?: string; // Optional: dedicated Xero org for this project
  instructions?: string; // System prompt for chats in this project
  createdAt: number;
  updatedAt: number;
  chatCount?: number; // Computed: number of chats in project (for UI)
}

/**
 * Invite Code
 * Controls beta access - users need a valid code to sign up
 */
export interface InviteCode {
  code: string;
  createdBy?: string;
  usedBy?: string;
  variant?: MemoryVariant; // Pre-assigned A/B testing variant
  createdAt: number;
  usedAt?: number;
  expiresAt?: number;
}

// ============================================================================
// Safety Guardrails
// ============================================================================

/**
 * Permission Level
 * Controls what operations a user can perform
 * - 0: Read-only (default) - only get_* and search_* tools
 * - 1: Create drafts - can create DRAFT invoices/contacts
 * - 2: Approve/update - can approve, update (requires confirmation)
 * - 3: Delete/void - can void/delete (requires confirmation + delay)
 */
export type PermissionLevel = 0 | 1 | 2 | 3;

export const PERMISSION_LEVEL_NAMES: Record<PermissionLevel, string> = {
  0: "Read-Only",
  1: "Create Drafts",
  2: "Approve & Update",
  3: "Delete & Void",
};

// ============================================================================
// Response Styles (Claude.ai Pattern)
// ============================================================================

/**
 * Response Style ID
 * Controls how Pip formats and delivers responses
 */
export type ResponseStyleId = "normal" | "formal" | "concise" | "explanatory" | "learning";

export const RESPONSE_STYLE_NAMES: Record<ResponseStyleId, string> = {
  normal: "Normal",
  formal: "Formal",
  concise: "Concise",
  explanatory: "Explanatory",
  learning: "Learning",
};

/**
 * Response Style Definition
 * System prompt modifier for each style
 */
export interface ResponseStyle {
  id: ResponseStyleId;
  name: string;
  description: string;
  promptModifier: string; // Injected into system prompt
}

// ============================================================================
// Personality System (Deferred - kept for future use)
// ============================================================================

/**
 * Personality ID
 * Available personality modes for Pip
 */
export type PersonalityId = "adelaide" | "pippin";

export const PERSONALITY_NAMES: Record<PersonalityId, string> = {
  adelaide: "Adelaide",
  pippin: "Pip",
};

/**
 * Personality Traits
 * Dimensions on 1-10 scale
 */
export interface PersonalityTraits {
  formality: number;    // 1=casual, 10=formal
  warmth: number;       // 1=distant, 10=warm
  playfulness: number;  // 1=serious, 10=playful
  confidence: number;   // 1=uncertain, 10=confident
  verbosity: number;    // 1=terse, 10=verbose
}

/**
 * Personality Speech Patterns
 * How the character communicates
 */
export interface PersonalitySpeech {
  sentenceStyle: string;      // "short and direct" | "flowing and detailed"
  vocabularyLevel: string;    // "simple" | "professional" | "technical"
  verbalTics: string[];       // Unique phrases or habits
  greetings: string[];        // How they say hello
  signOffs: string[];         // How they end conversations
}

/**
 * Personality Behavioral Anchors
 * How the character acts in specific situations
 */
export interface PersonalityBehavior {
  underPressure: string;      // How they act when user is stressed
  withErrors: string;         // How they handle mistakes
  withUncertainty: string;    // How they express "I don't know"
}

/**
 * Personality Example Exchange
 * Example user/assistant interactions for multishot prompting
 */
export interface PersonalityExample {
  user: string;
  assistant: string;
}

/**
 * Personality
 * Complete personality definition for Pip
 */
export interface Personality {
  id: PersonalityId;
  name: string;
  description: string;

  identity: {
    role: string;
    background: string;
    expertise: string[];
  };

  traits: PersonalityTraits;
  speech: PersonalitySpeech;
  behavior: PersonalityBehavior;

  never: string[];              // Things this character would never say/do
  examples: PersonalityExample[]; // Multishot prompting examples
}

/**
 * User Settings
 * Stores user preferences including safety settings
 */
export interface UserSettings {
  userId: string;
  permissionLevel: PermissionLevel;
  responseStyle: ResponseStyleId;
  personality: PersonalityId; // Deferred feature - kept for future use
  requireConfirmation: boolean;
  dailyEmailSummary: boolean;
  require2FA: boolean;
  vacationModeUntil?: number;
  createdAt: number;
  updatedAt: number;
}

/**
 * Operation Snapshot
 * Captures state before write operations for audit trail
 */
export interface OperationSnapshot {
  id: string;
  userId: string;
  operationType: string;
  permissionLevel: PermissionLevel;
  entityType: string;
  entityId?: string;
  beforeState?: Record<string, unknown>;
  afterState?: Record<string, unknown>;
  requestedBy: "agent" | "user";
  status: "pending" | "confirmed" | "executed" | "failed" | "cancelled";
  errorMessage?: string;
  createdAt: number;
  confirmedAt?: number;
  executedAt?: number;
}

// ============================================================================
// Query Filters
// ============================================================================

export interface SessionFilter {
  userId: string;
  sessionId?: string;
  projectId?: string; // Filter by project (Epic 2.3)
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

export type DatabaseProviderName = "sqlite" | "postgresql";

export interface DatabaseConfig {
  provider: DatabaseProviderName;
  connection: ConnectionConfig;
}

export type ConnectionConfig =
  | SQLiteConnectionConfig
  | PostgreSQLConnectionConfig;

export interface SQLiteConnectionConfig {
  type: "sqlite";
  filename: string; // Path to SQLite database file
  readonly?: boolean;
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
  createUser(user: { email: string; passwordHash: string; name?: string; isAdmin?: boolean; memoryVariant?: MemoryVariant }): Promise<User>;
  getUserByEmail(email: string): Promise<User | null>;
  getUserById(id: string): Promise<User | null>;
  updateUser(id: string, updates: Partial<User>): Promise<User>;

  // Invite code operations
  createInviteCode(code: string, createdBy?: string, expiresAt?: number, variant?: MemoryVariant): Promise<void>;
  getInviteCode(code: string): Promise<InviteCode | null>;
  useInviteCode(code: string, userId: string): Promise<void>;
  listInviteCodes(): Promise<InviteCode[]>;

  // Safety settings operations (global)
  getUserSettings(userId: string): Promise<UserSettings | null>;
  upsertUserSettings(settings: Partial<UserSettings> & { userId: string }): Promise<UserSettings>;

  // Connector permission operations (per-connector)
  getConnectorPermission(userId: string, connector: ConnectorType): Promise<ConnectorPermission | null>;
  upsertConnectorPermission(userId: string, connector: ConnectorType, permissionLevel: PermissionLevel): Promise<ConnectorPermission>;
  listConnectorPermissions(userId: string): Promise<ConnectorPermission[]>;
  deleteConnectorPermission(userId: string, connector: ConnectorType): Promise<void>;

  // Project operations
  createProject(project: Omit<Project, "id" | "createdAt" | "updatedAt">): Promise<Project>;
  getProject(userId: string, projectId: string): Promise<Project | null>;
  listProjects(userId: string): Promise<Project[]>;
  updateProject(userId: string, projectId: string, updates: Partial<Project>): Promise<Project>;
  deleteProject(userId: string, projectId: string): Promise<void>;

  // Business context operations (document upload)
  createBusinessContext(context: {
    userId: string;
    docType: string;
    docName: string;
    chunkIndex: number;
    content: string;
    metadata?: Record<string, any>;
  }): Promise<{ id: string }>;
  getBusinessContext(userId: string, options?: {
    docType?: string;
    docName?: string;
  }): Promise<Array<{
    id: string;
    docType: string;
    docName: string;
    chunkIndex: number;
    content: string;
    metadata?: Record<string, any>;
  }>>;
  deleteBusinessContext(userId: string, docName?: string): Promise<void>;
  listBusinessDocuments(userId: string): Promise<Array<{
    docName: string;
    docType: string;
    chunkCount: number;
    createdAt: number;
  }>>;

  // Operation snapshot operations (audit trail)
  createOperationSnapshot(snapshot: Omit<OperationSnapshot, "id" | "createdAt">): Promise<OperationSnapshot>;
  getOperationSnapshot(id: string): Promise<OperationSnapshot | null>;
  updateOperationSnapshot(id: string, updates: Partial<OperationSnapshot>): Promise<OperationSnapshot>;
  listOperationSnapshots(userId: string, options?: { limit?: number; status?: OperationSnapshot["status"] }): Promise<OperationSnapshot[]>;
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
