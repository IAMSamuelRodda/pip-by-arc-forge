/**
 * SQLite Database Provider
 *
 * File-based database for self-hosted deployments
 * Features:
 * - Zero configuration
 * - Fast local queries
 * - No external dependencies
 * - Perfect for single-user or small deployments
 */

import Database from "better-sqlite3";
import type {
  DatabaseProvider,
  SQLiteConnectionConfig,
  Session,
  CoreMemory,
  ExtendedMemory,
  OAuthTokens,
  SessionFilter,
  MemoryFilter,
  User,
  InviteCode,
} from "../types.js";
import {
  ConnectionError,
  RecordNotFoundError,
  DatabaseError,
} from "../types.js";

export class SQLiteProvider implements DatabaseProvider {
  readonly name = "sqlite" as const;

  private db: Database.Database | null = null;
  private config: SQLiteConnectionConfig;

  constructor(config: SQLiteConnectionConfig) {
    this.config = config;
  }

  // ============================================================================
  // Connection Management
  // ============================================================================

  async connect(): Promise<void> {
    try {
      this.db = new Database(this.config.filename, {
        readonly: this.config.readonly || false,
        fileMustExist: false,
      });

      // Enable WAL mode for better concurrency
      this.db.pragma("journal_mode = WAL");

      // Initialize schema
      this.initializeSchema();

      console.log(`✓ SQLite connected: ${this.config.filename}`);
    } catch (error) {
      throw new ConnectionError(
        this.name,
        `Failed to connect to SQLite database: ${this.config.filename}`,
        error as Error
      );
    }
  }

  async disconnect(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }

  isConnected(): boolean {
    return this.db !== null && this.db.open;
  }

  /**
   * Initialize database schema
   * Creates tables if they don't exist
   */
  private initializeSchema(): void {
    if (!this.db) throw new Error("Database not connected");

    // Sessions table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        session_id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        messages TEXT NOT NULL, -- JSON array
        agent_context TEXT NOT NULL, -- JSON object
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        expires_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
      CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
    `);

    // Core Memory table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS core_memory (
        user_id TEXT PRIMARY KEY,
        preferences TEXT NOT NULL, -- JSON object
        relationship_stage TEXT NOT NULL,
        relationship_start_date INTEGER NOT NULL,
        key_milestones TEXT NOT NULL, -- JSON array
        critical_context TEXT NOT NULL, -- JSON array
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
    `);

    // Extended Memory table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS extended_memory (
        memory_id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        conversation_summary TEXT NOT NULL,
        embedding BLOB, -- Vector as binary blob
        learned_patterns TEXT NOT NULL, -- JSON object
        emotional_context TEXT,
        topics TEXT NOT NULL, -- JSON array
        created_at INTEGER NOT NULL,
        ttl INTEGER -- Time-to-live (unix timestamp)
      );
      CREATE INDEX IF NOT EXISTS idx_extended_memory_user_id ON extended_memory(user_id);
      CREATE INDEX IF NOT EXISTS idx_extended_memory_ttl ON extended_memory(ttl);
    `);

    // OAuth Tokens table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS oauth_tokens (
        user_id TEXT NOT NULL,
        provider TEXT NOT NULL,
        access_token TEXT NOT NULL,
        refresh_token TEXT NOT NULL,
        token_type TEXT NOT NULL,
        expires_at INTEGER NOT NULL,
        scopes TEXT NOT NULL, -- JSON array
        tenant_id TEXT,
        tenant_name TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        PRIMARY KEY (user_id, provider)
      );
      CREATE INDEX IF NOT EXISTS idx_oauth_tokens_expires_at ON oauth_tokens(expires_at);
    `);

    // Business Context table (RAG-ready schema)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS business_context (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        doc_type TEXT NOT NULL,           -- 'business_plan', 'kpi', 'strategy', 'notes'
        doc_name TEXT NOT NULL,
        chunk_index INTEGER NOT NULL,
        content TEXT NOT NULL,            -- Chunk text (max 2000 chars)
        summary TEXT,                     -- LLM-generated summary (Phase 2)
        embedding BLOB,                   -- Vector as binary (Phase 2 - nullable for now)
        metadata TEXT,                    -- JSON: headings, source page, etc.
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_context_user ON business_context(user_id);
      CREATE INDEX IF NOT EXISTS idx_context_type ON business_context(user_id, doc_type);
    `);

    // Users table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        name TEXT,
        is_admin INTEGER DEFAULT 0,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        last_login_at INTEGER
      );
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    `);

    // Invite codes table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS invite_codes (
        code TEXT PRIMARY KEY,
        created_by TEXT,
        used_by TEXT,
        created_at INTEGER NOT NULL,
        used_at INTEGER,
        expires_at INTEGER
      );
      CREATE INDEX IF NOT EXISTS idx_invite_codes_used_by ON invite_codes(used_by);
    `);
  }

  // ============================================================================
  // Session Operations
  // ============================================================================

  async createSession(
    session: Omit<Session, "createdAt" | "updatedAt">
  ): Promise<Session> {
    if (!this.db) throw new DatabaseError("Database not connected", this.name);

    const now = Date.now();
    const fullSession: Session = {
      ...session,
      createdAt: now,
      updatedAt: now,
    };

    try {
      const stmt = this.db.prepare(`
        INSERT INTO sessions (session_id, user_id, messages, agent_context, created_at, updated_at, expires_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        fullSession.sessionId,
        fullSession.userId,
        JSON.stringify(fullSession.messages),
        JSON.stringify(fullSession.agentContext),
        fullSession.createdAt,
        fullSession.updatedAt,
        fullSession.expiresAt
      );

      return fullSession;
    } catch (error) {
      throw new DatabaseError(
        `Failed to create session: ${session.sessionId}`,
        this.name,
        error as Error
      );
    }
  }

  async getSession(userId: string, sessionId: string): Promise<Session | null> {
    if (!this.db) throw new DatabaseError("Database not connected", this.name);

    try {
      const stmt = this.db.prepare(`
        SELECT * FROM sessions WHERE user_id = ? AND session_id = ?
      `);

      const row = stmt.get(userId, sessionId) as any;

      if (!row) return null;

      return {
        sessionId: row.session_id,
        userId: row.user_id,
        messages: JSON.parse(row.messages),
        agentContext: JSON.parse(row.agent_context),
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        expiresAt: row.expires_at,
      };
    } catch (error) {
      throw new DatabaseError(
        `Failed to get session: ${sessionId}`,
        this.name,
        error as Error
      );
    }
  }

  async updateSession(
    userId: string,
    sessionId: string,
    updates: Partial<Session>
  ): Promise<Session> {
    if (!this.db) throw new DatabaseError("Database not connected", this.name);

    try {
      const existing = await this.getSession(userId, sessionId);
      if (!existing) {
        throw new RecordNotFoundError(this.name, "Session", sessionId);
      }

      const updated: Session = {
        ...existing,
        ...updates,
        updatedAt: Date.now(),
      };

      const stmt = this.db.prepare(`
        UPDATE sessions
        SET messages = ?, agent_context = ?, updated_at = ?, expires_at = ?
        WHERE user_id = ? AND session_id = ?
      `);

      stmt.run(
        JSON.stringify(updated.messages),
        JSON.stringify(updated.agentContext),
        updated.updatedAt,
        updated.expiresAt,
        userId,
        sessionId
      );

      return updated;
    } catch (error) {
      if (error instanceof RecordNotFoundError) throw error;
      throw new DatabaseError(
        `Failed to update session: ${sessionId}`,
        this.name,
        error as Error
      );
    }
  }

  async deleteSession(userId: string, sessionId: string): Promise<void> {
    if (!this.db) throw new DatabaseError("Database not connected", this.name);

    try {
      const stmt = this.db.prepare(`
        DELETE FROM sessions WHERE user_id = ? AND session_id = ?
      `);

      stmt.run(userId, sessionId);
    } catch (error) {
      throw new DatabaseError(
        `Failed to delete session: ${sessionId}`,
        this.name,
        error as Error
      );
    }
  }

  async listSessions(filter: SessionFilter): Promise<Session[]> {
    if (!this.db) throw new DatabaseError("Database not connected", this.name);

    try {
      let query = `SELECT * FROM sessions WHERE user_id = ?`;
      const params: any[] = [filter.userId];

      if (filter.sessionId) {
        query += ` AND session_id = ?`;
        params.push(filter.sessionId);
      }

      query += ` ORDER BY created_at ${filter.sortOrder === "asc" ? "ASC" : "DESC"}`;

      if (filter.limit) {
        query += ` LIMIT ?`;
        params.push(filter.limit);
      }

      const stmt = this.db.prepare(query);
      const rows = stmt.all(...params) as any[];

      return rows.map((row) => ({
        sessionId: row.session_id,
        userId: row.user_id,
        messages: JSON.parse(row.messages),
        agentContext: JSON.parse(row.agent_context),
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        expiresAt: row.expires_at,
      }));
    } catch (error) {
      throw new DatabaseError(
        `Failed to list sessions for user: ${filter.userId}`,
        this.name,
        error as Error
      );
    }
  }

  // ============================================================================
  // Core Memory Operations
  // ============================================================================

  async getCoreMemory(userId: string): Promise<CoreMemory | null> {
    if (!this.db) throw new DatabaseError("Database not connected", this.name);

    try {
      const stmt = this.db.prepare(`
        SELECT * FROM core_memory WHERE user_id = ?
      `);

      const row = stmt.get(userId) as any;

      if (!row) return null;

      return {
        userId: row.user_id,
        preferences: JSON.parse(row.preferences),
        relationshipStage: row.relationship_stage,
        relationshipStartDate: row.relationship_start_date,
        keyMilestones: JSON.parse(row.key_milestones),
        criticalContext: JSON.parse(row.critical_context),
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    } catch (error) {
      throw new DatabaseError(
        `Failed to get core memory for user: ${userId}`,
        this.name,
        error as Error
      );
    }
  }

  async upsertCoreMemory(
    memory: Partial<CoreMemory> & { userId: string }
  ): Promise<CoreMemory> {
    if (!this.db) throw new DatabaseError("Database not connected", this.name);

    try {
      const existing = await this.getCoreMemory(memory.userId);
      const now = Date.now();

      const fullMemory: CoreMemory = {
        userId: memory.userId,
        preferences: memory.preferences || existing?.preferences || {},
        relationshipStage:
          memory.relationshipStage || existing?.relationshipStage || "colleague",
        relationshipStartDate:
          memory.relationshipStartDate || existing?.relationshipStartDate || now,
        keyMilestones: memory.keyMilestones || existing?.keyMilestones || [],
        criticalContext: memory.criticalContext || existing?.criticalContext || [],
        createdAt: existing?.createdAt || now,
        updatedAt: now,
      };

      const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO core_memory
        (user_id, preferences, relationship_stage, relationship_start_date, key_milestones, critical_context, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        fullMemory.userId,
        JSON.stringify(fullMemory.preferences),
        fullMemory.relationshipStage,
        fullMemory.relationshipStartDate,
        JSON.stringify(fullMemory.keyMilestones),
        JSON.stringify(fullMemory.criticalContext),
        fullMemory.createdAt,
        fullMemory.updatedAt
      );

      return fullMemory;
    } catch (error) {
      throw new DatabaseError(
        `Failed to upsert core memory for user: ${memory.userId}`,
        this.name,
        error as Error
      );
    }
  }

  async deleteCoreMemory(userId: string): Promise<void> {
    if (!this.db) throw new DatabaseError("Database not connected", this.name);

    try {
      const stmt = this.db.prepare(`
        DELETE FROM core_memory WHERE user_id = ?
      `);

      stmt.run(userId);
    } catch (error) {
      throw new DatabaseError(
        `Failed to delete core memory for user: ${userId}`,
        this.name,
        error as Error
      );
    }
  }

  // ============================================================================
  // Extended Memory Operations
  // ============================================================================

  async createExtendedMemory(
    memory: Omit<ExtendedMemory, "memoryId" | "createdAt">
  ): Promise<ExtendedMemory> {
    if (!this.db) throw new DatabaseError("Database not connected", this.name);

    try {
      const memoryId = crypto.randomUUID();
      const now = Date.now();

      const fullMemory: ExtendedMemory = {
        memoryId,
        ...memory,
        createdAt: now,
      };

      const stmt = this.db.prepare(`
        INSERT INTO extended_memory
        (memory_id, user_id, conversation_summary, embedding, learned_patterns, emotional_context, topics, created_at, ttl)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        fullMemory.memoryId,
        fullMemory.userId,
        fullMemory.conversationSummary,
        fullMemory.embedding ? Buffer.from(new Float32Array(fullMemory.embedding).buffer) : null,
        JSON.stringify(fullMemory.learnedPatterns),
        fullMemory.emotionalContext || null,
        JSON.stringify(fullMemory.topics),
        fullMemory.createdAt,
        fullMemory.ttl || null
      );

      return fullMemory;
    } catch (error) {
      throw new DatabaseError(
        `Failed to create extended memory`,
        this.name,
        error as Error
      );
    }
  }

  async getExtendedMemory(
    userId: string,
    memoryId: string
  ): Promise<ExtendedMemory | null> {
    if (!this.db) throw new DatabaseError("Database not connected", this.name);

    try {
      const stmt = this.db.prepare(`
        SELECT * FROM extended_memory WHERE user_id = ? AND memory_id = ?
      `);

      const row = stmt.get(userId, memoryId) as any;

      if (!row) return null;

      return {
        memoryId: row.memory_id,
        userId: row.user_id,
        conversationSummary: row.conversation_summary,
        embedding: row.embedding
          ? Array.from(new Float32Array(row.embedding.buffer))
          : undefined,
        learnedPatterns: JSON.parse(row.learned_patterns),
        emotionalContext: row.emotional_context,
        topics: JSON.parse(row.topics),
        createdAt: row.created_at,
        ttl: row.ttl,
      };
    } catch (error) {
      throw new DatabaseError(
        `Failed to get extended memory: ${memoryId}`,
        this.name,
        error as Error
      );
    }
  }

  async listExtendedMemories(filter: MemoryFilter): Promise<ExtendedMemory[]> {
    if (!this.db) throw new DatabaseError("Database not connected", this.name);

    try {
      let query = `SELECT * FROM extended_memory WHERE user_id = ?`;
      const params: any[] = [filter.userId];

      // Note: Topic filtering would require JSON operations (not portable across SQLite versions)
      // For simplicity, filtering by topics is done in application code

      query += ` ORDER BY created_at ${filter.sortOrder === "asc" ? "ASC" : "DESC"}`;

      if (filter.limit) {
        query += ` LIMIT ?`;
        params.push(filter.limit);
      }

      const stmt = this.db.prepare(query);
      const rows = stmt.all(...params) as any[];

      let results = rows.map((row) => ({
        memoryId: row.memory_id,
        userId: row.user_id,
        conversationSummary: row.conversation_summary,
        embedding: row.embedding
          ? Array.from(new Float32Array(row.embedding.buffer))
          : undefined,
        learnedPatterns: JSON.parse(row.learned_patterns),
        emotionalContext: row.emotional_context,
        topics: JSON.parse(row.topics),
        createdAt: row.created_at,
        ttl: row.ttl,
      }));

      // Filter by topics in application code
      if (filter.topics && filter.topics.length > 0) {
        results = results.filter((memory) =>
          filter.topics!.some((topic) => memory.topics.includes(topic))
        );
      }

      return results;
    } catch (error) {
      throw new DatabaseError(
        `Failed to list extended memories for user: ${filter.userId}`,
        this.name,
        error as Error
      );
    }
  }

  async deleteExtendedMemory(userId: string, memoryId: string): Promise<void> {
    if (!this.db) throw new DatabaseError("Database not connected", this.name);

    try {
      const stmt = this.db.prepare(`
        DELETE FROM extended_memory WHERE user_id = ? AND memory_id = ?
      `);

      stmt.run(userId, memoryId);
    } catch (error) {
      throw new DatabaseError(
        `Failed to delete extended memory: ${memoryId}`,
        this.name,
        error as Error
      );
    }
  }

  async searchMemories(
    userId: string,
    embedding: number[],
    limit: number = 5
  ): Promise<ExtendedMemory[]> {
    if (!this.db) throw new DatabaseError("Database not connected", this.name);

    // Note: SQLite doesn't have native vector similarity search
    // For production, consider using:
    // 1. sqlite-vss extension (vector similarity search)
    // 2. External vector database (Pinecone, Weaviate, Qdrant)
    // 3. PostgreSQL with pgvector extension
    //
    // For now, we'll do a simple cosine similarity in JavaScript

    try {
      const memories = await this.listExtendedMemories({
        userId,
        limit: 100, // Get more memories for better search results
      });

      // Calculate cosine similarity
      const memoriesWithScores = memories
        .filter((m) => m.embedding && m.embedding.length > 0)
        .map((memory) => {
          const score = this.cosineSimilarity(embedding, memory.embedding!);
          return { memory, score };
        })
        .sort((a, b) => b.score - a.score) // Sort by similarity (highest first)
        .slice(0, limit);

      return memoriesWithScores.map((item) => item.memory);
    } catch (error) {
      throw new DatabaseError(
        `Failed to search memories for user: ${userId}`,
        this.name,
        error as Error
      );
    }
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  // ============================================================================
  // OAuth Token Operations
  // ============================================================================

  async saveOAuthTokens(tokens: OAuthTokens): Promise<void> {
    if (!this.db) throw new DatabaseError("Database not connected", this.name);

    try {
      const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO oauth_tokens
        (user_id, provider, access_token, refresh_token, token_type, expires_at, scopes, tenant_id, tenant_name, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        tokens.userId,
        tokens.provider,
        tokens.accessToken,
        tokens.refreshToken,
        tokens.tokenType,
        tokens.expiresAt,
        JSON.stringify(tokens.scopes),
        tokens.tenantId || null,
        tokens.tenantName || null,
        tokens.createdAt,
        tokens.updatedAt
      );
    } catch (error) {
      throw new DatabaseError(
        `Failed to save OAuth tokens for user: ${tokens.userId}`,
        this.name,
        error as Error
      );
    }
  }

  async getOAuthTokens(
    userId: string,
    provider: string
  ): Promise<OAuthTokens | null> {
    if (!this.db) throw new DatabaseError("Database not connected", this.name);

    try {
      const stmt = this.db.prepare(`
        SELECT * FROM oauth_tokens WHERE user_id = ? AND provider = ?
      `);

      const row = stmt.get(userId, provider) as any;

      if (!row) return null;

      return {
        userId: row.user_id,
        provider: row.provider,
        accessToken: row.access_token,
        refreshToken: row.refresh_token,
        tokenType: row.token_type,
        expiresAt: row.expires_at,
        scopes: JSON.parse(row.scopes),
        tenantId: row.tenant_id,
        tenantName: row.tenant_name,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    } catch (error) {
      throw new DatabaseError(
        `Failed to get OAuth tokens for user: ${userId}`,
        this.name,
        error as Error
      );
    }
  }

  async updateOAuthTokens(
    userId: string,
    provider: string,
    updates: Partial<OAuthTokens>
  ): Promise<void> {
    if (!this.db) throw new DatabaseError("Database not connected", this.name);

    try {
      const existing = await this.getOAuthTokens(userId, provider);
      if (!existing) {
        throw new RecordNotFoundError(
          this.name,
          "OAuthTokens",
          `${userId}:${provider}`
        );
      }

      const updated: OAuthTokens = {
        ...existing,
        ...updates,
        updatedAt: Date.now(),
      };

      await this.saveOAuthTokens(updated);
    } catch (error) {
      if (error instanceof RecordNotFoundError) throw error;
      throw new DatabaseError(
        `Failed to update OAuth tokens for user: ${userId}`,
        this.name,
        error as Error
      );
    }
  }

  async deleteOAuthTokens(userId: string, provider: string): Promise<void> {
    if (!this.db) throw new DatabaseError("Database not connected", this.name);

    try {
      const stmt = this.db.prepare(`
        DELETE FROM oauth_tokens WHERE user_id = ? AND provider = ?
      `);

      stmt.run(userId, provider);
    } catch (error) {
      throw new DatabaseError(
        `Failed to delete OAuth tokens for user: ${userId}`,
        this.name,
        error as Error
      );
    }
  }

  // ============================================================================
  // Business Context Operations
  // ============================================================================

  async createBusinessContext(context: {
    userId: string;
    docType: string;
    docName: string;
    chunkIndex: number;
    content: string;
    summary?: string;
    embedding?: number[];
    metadata?: Record<string, any>;
  }): Promise<{ id: string }> {
    if (!this.db) throw new DatabaseError("Database not connected", this.name);

    try {
      const id = crypto.randomUUID();
      const now = Date.now();

      const stmt = this.db.prepare(`
        INSERT INTO business_context
        (id, user_id, doc_type, doc_name, chunk_index, content, summary, embedding, metadata, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        id,
        context.userId,
        context.docType,
        context.docName,
        context.chunkIndex,
        context.content,
        context.summary || null,
        context.embedding ? Buffer.from(new Float32Array(context.embedding).buffer) : null,
        context.metadata ? JSON.stringify(context.metadata) : null,
        now,
        now
      );

      return { id };
    } catch (error) {
      throw new DatabaseError(
        `Failed to create business context for user: ${context.userId}`,
        this.name,
        error as Error
      );
    }
  }

  async getBusinessContext(userId: string, options?: {
    docType?: string;
    docName?: string;
    limit?: number;
  }): Promise<Array<{
    id: string;
    userId: string;
    docType: string;
    docName: string;
    chunkIndex: number;
    content: string;
    summary?: string;
    metadata?: Record<string, any>;
    createdAt: number;
  }>> {
    if (!this.db) throw new DatabaseError("Database not connected", this.name);

    try {
      let query = `SELECT * FROM business_context WHERE user_id = ?`;
      const params: any[] = [userId];

      if (options?.docType) {
        query += ` AND doc_type = ?`;
        params.push(options.docType);
      }

      if (options?.docName) {
        query += ` AND doc_name = ?`;
        params.push(options.docName);
      }

      query += ` ORDER BY doc_name, chunk_index ASC`;

      if (options?.limit) {
        query += ` LIMIT ?`;
        params.push(options.limit);
      }

      const stmt = this.db.prepare(query);
      const rows = stmt.all(...params) as any[];

      return rows.map((row) => ({
        id: row.id,
        userId: row.user_id,
        docType: row.doc_type,
        docName: row.doc_name,
        chunkIndex: row.chunk_index,
        content: row.content,
        summary: row.summary || undefined,
        metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
        createdAt: row.created_at,
      }));
    } catch (error) {
      throw new DatabaseError(
        `Failed to get business context for user: ${userId}`,
        this.name,
        error as Error
      );
    }
  }

  async deleteBusinessContext(userId: string, docName?: string): Promise<void> {
    if (!this.db) throw new DatabaseError("Database not connected", this.name);

    try {
      let query = `DELETE FROM business_context WHERE user_id = ?`;
      const params: any[] = [userId];

      if (docName) {
        query += ` AND doc_name = ?`;
        params.push(docName);
      }

      const stmt = this.db.prepare(query);
      stmt.run(...params);
    } catch (error) {
      throw new DatabaseError(
        `Failed to delete business context for user: ${userId}`,
        this.name,
        error as Error
      );
    }
  }

  async listBusinessDocuments(userId: string): Promise<Array<{
    docName: string;
    docType: string;
    chunkCount: number;
    createdAt: number;
  }>> {
    if (!this.db) throw new DatabaseError("Database not connected", this.name);

    try {
      const stmt = this.db.prepare(`
        SELECT doc_name, doc_type, COUNT(*) as chunk_count, MIN(created_at) as created_at
        FROM business_context
        WHERE user_id = ?
        GROUP BY doc_name, doc_type
        ORDER BY created_at DESC
      `);

      const rows = stmt.all(userId) as any[];

      return rows.map((row) => ({
        docName: row.doc_name,
        docType: row.doc_type,
        chunkCount: row.chunk_count,
        createdAt: row.created_at,
      }));
    } catch (error) {
      throw new DatabaseError(
        `Failed to list business documents for user: ${userId}`,
        this.name,
        error as Error
      );
    }
  }

  // ============================================================================
  // User Operations
  // ============================================================================

  async createUser(user: {
    email: string;
    passwordHash: string;
    name?: string;
    isAdmin?: boolean;
  }): Promise<User> {
    if (!this.db) throw new DatabaseError("Database not connected", this.name);

    try {
      const id = crypto.randomUUID();
      const now = Date.now();

      const stmt = this.db.prepare(`
        INSERT INTO users (id, email, password_hash, name, is_admin, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        id,
        user.email.toLowerCase(),
        user.passwordHash,
        user.name || null,
        user.isAdmin ? 1 : 0,
        now,
        now
      );

      return {
        id,
        email: user.email.toLowerCase(),
        passwordHash: user.passwordHash,
        name: user.name,
        isAdmin: user.isAdmin || false,
        createdAt: now,
        updatedAt: now,
      };
    } catch (error: any) {
      if (error.code === "SQLITE_CONSTRAINT_UNIQUE") {
        throw new DatabaseError("Email already registered", this.name, error);
      }
      throw new DatabaseError(
        `Failed to create user: ${user.email}`,
        this.name,
        error as Error
      );
    }
  }

  async getUserByEmail(email: string): Promise<User | null> {
    if (!this.db) throw new DatabaseError("Database not connected", this.name);

    try {
      const stmt = this.db.prepare(`
        SELECT * FROM users WHERE email = ?
      `);

      const row = stmt.get(email.toLowerCase()) as any;

      if (!row) return null;

      return {
        id: row.id,
        email: row.email,
        passwordHash: row.password_hash,
        name: row.name,
        isAdmin: row.is_admin === 1,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        lastLoginAt: row.last_login_at,
      };
    } catch (error) {
      throw new DatabaseError(
        `Failed to get user by email: ${email}`,
        this.name,
        error as Error
      );
    }
  }

  async getUserById(id: string): Promise<User | null> {
    if (!this.db) throw new DatabaseError("Database not connected", this.name);

    try {
      const stmt = this.db.prepare(`
        SELECT * FROM users WHERE id = ?
      `);

      const row = stmt.get(id) as any;

      if (!row) return null;

      return {
        id: row.id,
        email: row.email,
        passwordHash: row.password_hash,
        name: row.name,
        isAdmin: row.is_admin === 1,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        lastLoginAt: row.last_login_at,
      };
    } catch (error) {
      throw new DatabaseError(
        `Failed to get user by id: ${id}`,
        this.name,
        error as Error
      );
    }
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User> {
    if (!this.db) throw new DatabaseError("Database not connected", this.name);

    try {
      const existing = await this.getUserById(id);
      if (!existing) {
        throw new RecordNotFoundError(this.name, "User", id);
      }

      const now = Date.now();
      const stmt = this.db.prepare(`
        UPDATE users
        SET name = ?, is_admin = ?, updated_at = ?, last_login_at = ?
        WHERE id = ?
      `);

      stmt.run(
        updates.name ?? existing.name ?? null,
        updates.isAdmin !== undefined ? (updates.isAdmin ? 1 : 0) : (existing.isAdmin ? 1 : 0),
        now,
        updates.lastLoginAt ?? existing.lastLoginAt ?? null,
        id
      );

      return {
        ...existing,
        ...updates,
        updatedAt: now,
      };
    } catch (error) {
      if (error instanceof RecordNotFoundError) throw error;
      throw new DatabaseError(
        `Failed to update user: ${id}`,
        this.name,
        error as Error
      );
    }
  }

  // ============================================================================
  // Invite Code Operations
  // ============================================================================

  async createInviteCode(
    code: string,
    createdBy?: string,
    expiresAt?: number
  ): Promise<void> {
    if (!this.db) throw new DatabaseError("Database not connected", this.name);

    try {
      const stmt = this.db.prepare(`
        INSERT INTO invite_codes (code, created_by, created_at, expires_at)
        VALUES (?, ?, ?, ?)
      `);

      stmt.run(code, createdBy || null, Date.now(), expiresAt || null);
    } catch (error) {
      throw new DatabaseError(
        `Failed to create invite code: ${code}`,
        this.name,
        error as Error
      );
    }
  }

  async getInviteCode(code: string): Promise<InviteCode | null> {
    if (!this.db) throw new DatabaseError("Database not connected", this.name);

    try {
      const stmt = this.db.prepare(`
        SELECT * FROM invite_codes WHERE code = ?
      `);

      const row = stmt.get(code) as any;

      if (!row) return null;

      return {
        code: row.code,
        createdBy: row.created_by,
        usedBy: row.used_by,
        createdAt: row.created_at,
        usedAt: row.used_at,
        expiresAt: row.expires_at,
      };
    } catch (error) {
      throw new DatabaseError(
        `Failed to get invite code: ${code}`,
        this.name,
        error as Error
      );
    }
  }

  async useInviteCode(code: string, userId: string): Promise<void> {
    if (!this.db) throw new DatabaseError("Database not connected", this.name);

    try {
      const stmt = this.db.prepare(`
        UPDATE invite_codes
        SET used_by = ?, used_at = ?
        WHERE code = ?
      `);

      stmt.run(userId, Date.now(), code);
    } catch (error) {
      throw new DatabaseError(
        `Failed to use invite code: ${code}`,
        this.name,
        error as Error
      );
    }
  }

  async listInviteCodes(): Promise<InviteCode[]> {
    if (!this.db) throw new DatabaseError("Database not connected", this.name);

    try {
      const stmt = this.db.prepare(`
        SELECT * FROM invite_codes ORDER BY created_at DESC
      `);

      const rows = stmt.all() as any[];

      return rows.map((row) => ({
        code: row.code,
        createdBy: row.created_by,
        usedBy: row.used_by,
        createdAt: row.created_at,
        usedAt: row.used_at,
        expiresAt: row.expires_at,
      }));
    } catch (error) {
      throw new DatabaseError(
        "Failed to list invite codes",
        this.name,
        error as Error
      );
    }
  }
}
