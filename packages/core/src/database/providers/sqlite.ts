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
  UserRole,
  SubscriptionTier,
  FeatureFlag,
  InviteCode,
  MemoryVariant,
  UserSettings,
  OperationSnapshot,
  PermissionLevel,
  PersonalityId,
  ResponseStyleId,
  Project,
  ConnectorType,
  ConnectorPermission,
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
        expires_at INTEGER NOT NULL,
        title TEXT, -- Auto-generated chat title
        preview_text TEXT -- Last message preview
      );
      CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
      CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
      CREATE INDEX IF NOT EXISTS idx_sessions_updated_at ON sessions(updated_at);
    `);

    // Migration: Add title and preview_text columns to sessions if they don't exist
    try {
      this.db.exec(`ALTER TABLE sessions ADD COLUMN title TEXT`);
    } catch {
      // Column already exists, ignore
    }
    try {
      this.db.exec(`ALTER TABLE sessions ADD COLUMN preview_text TEXT`);
    } catch {
      // Column already exists, ignore
    }
    try {
      this.db.exec(`ALTER TABLE sessions ADD COLUMN is_bookmarked INTEGER DEFAULT 0`);
    } catch {
      // Column already exists, ignore
    }
    try {
      this.db.exec(`ALTER TABLE sessions ADD COLUMN project_id TEXT`);
    } catch {
      // Column already exists, ignore
    }

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
        provider_user_id TEXT,  -- Google: user ID
        provider_email TEXT,    -- Google: user's email
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        PRIMARY KEY (user_id, provider)
      );
      CREATE INDEX IF NOT EXISTS idx_oauth_tokens_expires_at ON oauth_tokens(expires_at);
    `);

    // Migration: Add Google-specific columns if they don't exist
    try {
      this.db.exec(`ALTER TABLE oauth_tokens ADD COLUMN provider_user_id TEXT`);
    } catch {
      // Column already exists
    }
    try {
      this.db.exec(`ALTER TABLE oauth_tokens ADD COLUMN provider_email TEXT`);
    } catch {
      // Column already exists
    }

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
        role TEXT DEFAULT 'user',           -- superadmin, admin, user
        subscription_tier TEXT DEFAULT 'free', -- free, starter, pro, enterprise
        feature_flags TEXT DEFAULT '[]',    -- JSON array of feature flags
        memory_variant TEXT DEFAULT 'a',    -- A/B testing: 'a', 'b', or 'control'
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        last_login_at INTEGER
      );
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    `);

    // Migration: Add memory_variant column if it doesn't exist
    try {
      this.db.exec(`ALTER TABLE users ADD COLUMN memory_variant TEXT DEFAULT 'a'`);
    } catch {
      // Column already exists, ignore
    }

    // Migration: Add role column (issue_052-055 - authorization system)
    try {
      this.db.exec(`ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user'`);
    } catch {
      // Column already exists, ignore
    }

    // Migration: Add subscription_tier column
    try {
      this.db.exec(`ALTER TABLE users ADD COLUMN subscription_tier TEXT DEFAULT 'free'`);
    } catch {
      // Column already exists, ignore
    }

    // Migration: Add feature_flags column (JSON array)
    try {
      this.db.exec(`ALTER TABLE users ADD COLUMN feature_flags TEXT DEFAULT '[]'`);
    } catch {
      // Column already exists, ignore
    }

    // Migration: Migrate is_admin=1 users to role='superadmin'
    try {
      this.db.exec(`UPDATE users SET role = 'superadmin' WHERE is_admin = 1 AND (role IS NULL OR role = 'user')`);
    } catch {
      // Migration already applied or no matching users
    }

    // Invite codes table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS invite_codes (
        code TEXT PRIMARY KEY,
        created_by TEXT,
        used_by TEXT,
        variant TEXT DEFAULT 'a',  -- Pre-assigned A/B testing variant
        created_at INTEGER NOT NULL,
        used_at INTEGER,
        expires_at INTEGER
      );
      CREATE INDEX IF NOT EXISTS idx_invite_codes_used_by ON invite_codes(used_by);
    `);

    // Migration: Add variant column to invite_codes if it doesn't exist
    try {
      this.db.exec(`ALTER TABLE invite_codes ADD COLUMN variant TEXT DEFAULT 'a'`);
    } catch {
      // Column already exists, ignore
    }

    // User settings table (for safety/permissions)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS user_settings (
        user_id TEXT PRIMARY KEY,
        permission_level TEXT NOT NULL DEFAULT 'read_only',
        personality TEXT NOT NULL DEFAULT 'adelaide',
        require_confirmation INTEGER NOT NULL DEFAULT 0,
        daily_email_summary INTEGER NOT NULL DEFAULT 0,
        require_2fa INTEGER NOT NULL DEFAULT 0,
        vacation_mode_until TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);

    // Migration: Add personality column if it doesn't exist
    try {
      this.db.exec(`ALTER TABLE user_settings ADD COLUMN personality TEXT DEFAULT 'adelaide'`);
    } catch {
      // Column already exists, ignore
    }

    // Migration: Add response_style column if it doesn't exist
    try {
      this.db.exec(`ALTER TABLE user_settings ADD COLUMN response_style TEXT DEFAULT 'normal'`);
    } catch {
      // Column already exists, ignore
    }

    // Connector permissions table (per-connector permission levels)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS connector_permissions (
        user_id TEXT NOT NULL,
        connector TEXT NOT NULL,
        permission_level INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        PRIMARY KEY (user_id, connector)
      );
      CREATE INDEX IF NOT EXISTS idx_connector_perms_user ON connector_permissions(user_id);
    `);

    // MCP-Native Memory tables (Option B)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS memory_entities (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        entity_type TEXT NOT NULL,  -- person, business, concept, event, other
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        UNIQUE(user_id, name)
      );
      CREATE INDEX IF NOT EXISTS idx_entities_user ON memory_entities(user_id);
      CREATE INDEX IF NOT EXISTS idx_entities_name ON memory_entities(user_id, name);
    `);

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS memory_observations (
        id TEXT PRIMARY KEY,
        entity_id TEXT NOT NULL,
        observation TEXT NOT NULL,
        importance TEXT DEFAULT 'normal',  -- critical, important, normal, temporary
        embedding BLOB,  -- Vector for semantic search
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        FOREIGN KEY (entity_id) REFERENCES memory_entities(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_observations_entity ON memory_observations(entity_id);
    `);

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS memory_relations (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        from_entity_id TEXT NOT NULL,
        to_entity_id TEXT NOT NULL,
        relation_type TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        FOREIGN KEY (from_entity_id) REFERENCES memory_entities(id) ON DELETE CASCADE,
        FOREIGN KEY (to_entity_id) REFERENCES memory_entities(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_relations_user ON memory_relations(user_id);
      CREATE INDEX IF NOT EXISTS idx_relations_from ON memory_relations(from_entity_id);
      CREATE INDEX IF NOT EXISTS idx_relations_to ON memory_relations(to_entity_id);
    `);

    // Projects table (Epic 2.3)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        color TEXT,
        xero_tenant_id TEXT,
        is_default INTEGER DEFAULT 0,
        instructions TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_projects_user ON projects(user_id);
      CREATE INDEX IF NOT EXISTS idx_projects_default ON projects(user_id, is_default);
    `);

    // Migration: Add project_id column to sessions if it doesn't exist
    try {
      this.db.exec(`ALTER TABLE sessions ADD COLUMN project_id TEXT`);
    } catch {
      // Column already exists, ignore
    }

    // Create index for project_id on sessions
    try {
      this.db.exec(`CREATE INDEX idx_sessions_project ON sessions(user_id, project_id)`);
    } catch {
      // Index already exists, ignore
    }

    // Migration: Add instructions column to projects if it doesn't exist
    try {
      this.db.exec(`ALTER TABLE projects ADD COLUMN instructions TEXT`);
    } catch {
      // Column already exists, ignore
    }

    // Operation snapshots table (if not exists)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS operation_snapshots (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        operation_type TEXT NOT NULL,
        permission_level INTEGER NOT NULL,
        entity_type TEXT NOT NULL,
        entity_id TEXT,
        before_state TEXT,
        after_state TEXT,
        requested_by TEXT NOT NULL,
        status TEXT NOT NULL,
        error_message TEXT,
        created_at INTEGER NOT NULL,
        confirmed_at INTEGER,
        executed_at INTEGER
      );
      CREATE INDEX IF NOT EXISTS idx_snapshots_user ON operation_snapshots(user_id);
      CREATE INDEX IF NOT EXISTS idx_snapshots_status ON operation_snapshots(user_id, status);
    `);

    // Token usage tracking table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS token_usage (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        model_id TEXT NOT NULL,
        tokens_used INTEGER NOT NULL,
        request_timestamp INTEGER NOT NULL,
        date_bucket TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_token_usage_user_date ON token_usage(user_id, date_bucket);
      CREATE INDEX IF NOT EXISTS idx_token_usage_user_model_date ON token_usage(user_id, model_id, date_bucket);
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
        INSERT INTO sessions (session_id, user_id, project_id, messages, agent_context, created_at, updated_at, expires_at, title, preview_text)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        fullSession.sessionId,
        fullSession.userId,
        fullSession.projectId || null,
        JSON.stringify(fullSession.messages),
        JSON.stringify(fullSession.agentContext),
        fullSession.createdAt,
        fullSession.updatedAt,
        fullSession.expiresAt,
        fullSession.title || null,
        fullSession.previewText || null
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
        projectId: row.project_id || undefined,
        messages: JSON.parse(row.messages),
        agentContext: JSON.parse(row.agent_context),
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        expiresAt: row.expires_at,
        title: row.title || undefined,
        previewText: row.preview_text || undefined,
        isBookmarked: row.is_bookmarked === 1,
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
        SET messages = ?, agent_context = ?, updated_at = ?, expires_at = ?, title = ?, preview_text = ?, project_id = ?, is_bookmarked = ?
        WHERE user_id = ? AND session_id = ?
      `);

      stmt.run(
        JSON.stringify(updated.messages),
        JSON.stringify(updated.agentContext),
        updated.updatedAt,
        updated.expiresAt,
        updated.title || null,
        updated.previewText || null,
        updated.projectId || null,
        updated.isBookmarked ? 1 : 0,
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

      // Filter by project (null means unassigned/default project)
      if (filter.projectId !== undefined) {
        if (filter.projectId === null) {
          query += ` AND project_id IS NULL`;
        } else {
          query += ` AND project_id = ?`;
          params.push(filter.projectId);
        }
      }

      // Sort by updated_at for chat history (most recently active first)
      query += ` ORDER BY updated_at ${filter.sortOrder === "asc" ? "ASC" : "DESC"}`;

      if (filter.limit) {
        query += ` LIMIT ?`;
        params.push(filter.limit);
      }

      const stmt = this.db.prepare(query);
      const rows = stmt.all(...params) as any[];

      return rows.map((row) => ({
        sessionId: row.session_id,
        userId: row.user_id,
        projectId: row.project_id || undefined,
        messages: JSON.parse(row.messages),
        agentContext: JSON.parse(row.agent_context),
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        expiresAt: row.expires_at,
        title: row.title || undefined,
        previewText: row.preview_text || undefined,
        isBookmarked: row.is_bookmarked === 1,
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
        (user_id, provider, access_token, refresh_token, token_type, expires_at, scopes, tenant_id, tenant_name, provider_user_id, provider_email, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
        tokens.providerUserId || null,
        tokens.providerEmail || null,
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
        providerUserId: row.provider_user_id,
        providerEmail: row.provider_email,
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
    role?: UserRole;
    subscriptionTier?: SubscriptionTier;
    featureFlags?: FeatureFlag[];
    memoryVariant?: MemoryVariant;
  }): Promise<User> {
    if (!this.db) throw new DatabaseError("Database not connected", this.name);

    try {
      const id = crypto.randomUUID();
      const now = Date.now();

      // Derive role from isAdmin for backwards compatibility
      const role: UserRole = user.role || (user.isAdmin ? 'superadmin' : 'user');
      const subscriptionTier: SubscriptionTier = user.subscriptionTier || 'free';
      const featureFlags: FeatureFlag[] = user.featureFlags || [];

      const stmt = this.db.prepare(`
        INSERT INTO users (id, email, password_hash, name, is_admin, role, subscription_tier, feature_flags, memory_variant, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        id,
        user.email.toLowerCase(),
        user.passwordHash,
        user.name || null,
        user.isAdmin ? 1 : 0,
        role,
        subscriptionTier,
        JSON.stringify(featureFlags),
        user.memoryVariant || 'b',
        now,
        now
      );

      return {
        id,
        email: user.email.toLowerCase(),
        passwordHash: user.passwordHash,
        name: user.name,
        isAdmin: user.isAdmin || false,
        role,
        subscriptionTier,
        featureFlags,
        memoryVariant: user.memoryVariant || 'a',
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

      // Parse feature_flags JSON, default to empty array
      let featureFlags: FeatureFlag[] = [];
      try {
        featureFlags = row.feature_flags ? JSON.parse(row.feature_flags) : [];
      } catch {
        featureFlags = [];
      }

      return {
        id: row.id,
        email: row.email,
        passwordHash: row.password_hash,
        name: row.name,
        isAdmin: row.is_admin === 1,
        role: (row.role as UserRole) || (row.is_admin === 1 ? 'superadmin' : 'user'),
        subscriptionTier: (row.subscription_tier as SubscriptionTier) || 'free',
        featureFlags,
        memoryVariant: (row.memory_variant as MemoryVariant) || 'a',
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

      // Parse feature_flags JSON, default to empty array
      let featureFlags: FeatureFlag[] = [];
      try {
        featureFlags = row.feature_flags ? JSON.parse(row.feature_flags) : [];
      } catch {
        featureFlags = [];
      }

      return {
        id: row.id,
        email: row.email,
        passwordHash: row.password_hash,
        name: row.name,
        isAdmin: row.is_admin === 1,
        role: (row.role as UserRole) || (row.is_admin === 1 ? 'superadmin' : 'user'),
        subscriptionTier: (row.subscription_tier as SubscriptionTier) || 'free',
        featureFlags,
        memoryVariant: (row.memory_variant as MemoryVariant) || 'a',
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
        SET name = ?, is_admin = ?, role = ?, subscription_tier = ?, feature_flags = ?, memory_variant = ?, updated_at = ?, last_login_at = ?
        WHERE id = ?
      `);

      const newRole = updates.role ?? existing.role;
      const newTier = updates.subscriptionTier ?? existing.subscriptionTier;
      const newFlags = updates.featureFlags ?? existing.featureFlags;

      stmt.run(
        updates.name ?? existing.name ?? null,
        updates.isAdmin !== undefined ? (updates.isAdmin ? 1 : 0) : (existing.isAdmin ? 1 : 0),
        newRole,
        newTier,
        JSON.stringify(newFlags),
        updates.memoryVariant ?? existing.memoryVariant ?? 'a',
        now,
        updates.lastLoginAt ?? existing.lastLoginAt ?? null,
        id
      );

      return {
        ...existing,
        ...updates,
        role: newRole,
        subscriptionTier: newTier,
        featureFlags: newFlags,
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
    expiresAt?: number,
    variant?: MemoryVariant
  ): Promise<void> {
    if (!this.db) throw new DatabaseError("Database not connected", this.name);

    try {
      const stmt = this.db.prepare(`
        INSERT INTO invite_codes (code, created_by, variant, created_at, expires_at)
        VALUES (?, ?, ?, ?, ?)
      `);

      stmt.run(code, createdBy || null, variant || 'a', Date.now(), expiresAt || null);
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
        variant: (row.variant as MemoryVariant) || 'a',
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
        variant: (row.variant as MemoryVariant) || 'a',
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

  // ============================================================================
  // User Settings Operations (Safety Guardrails)
  // ============================================================================

  async getUserSettings(userId: string): Promise<UserSettings | null> {
    if (!this.db) throw new DatabaseError("Database not connected", this.name);

    try {
      const stmt = this.db.prepare(`
        SELECT * FROM user_settings WHERE user_id = ?
      `);

      const row = stmt.get(userId) as any;

      if (!row) return null;

      return {
        userId: row.user_id,
        permissionLevel: row.permission_level as PermissionLevel,
        responseStyle: (row.response_style || 'normal') as ResponseStyleId,
        personality: (row.personality || 'adelaide') as PersonalityId,
        requireConfirmation: row.require_confirmation === 1,
        dailyEmailSummary: row.daily_email_summary === 1,
        require2FA: row.require_2fa === 1,
        vacationModeUntil: row.vacation_mode_until || undefined,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    } catch (error) {
      throw new DatabaseError(
        `Failed to get user settings for: ${userId}`,
        this.name,
        error as Error
      );
    }
  }

  async upsertUserSettings(
    settings: Partial<UserSettings> & { userId: string }
  ): Promise<UserSettings> {
    if (!this.db) throw new DatabaseError("Database not connected", this.name);

    try {
      const existing = await this.getUserSettings(settings.userId);
      const now = Date.now();

      const fullSettings: UserSettings = {
        userId: settings.userId,
        permissionLevel: settings.permissionLevel ?? existing?.permissionLevel ?? 0,
        responseStyle: settings.responseStyle ?? existing?.responseStyle ?? 'normal',
        personality: settings.personality ?? existing?.personality ?? 'adelaide',
        requireConfirmation: settings.requireConfirmation ?? existing?.requireConfirmation ?? true,
        dailyEmailSummary: settings.dailyEmailSummary ?? existing?.dailyEmailSummary ?? true,
        require2FA: settings.require2FA ?? existing?.require2FA ?? false,
        vacationModeUntil: settings.vacationModeUntil ?? existing?.vacationModeUntil,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      };

      const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO user_settings
        (user_id, permission_level, response_style, personality, require_confirmation, daily_email_summary, require_2fa, vacation_mode_until, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        fullSettings.userId,
        fullSettings.permissionLevel,
        fullSettings.responseStyle,
        fullSettings.personality,
        fullSettings.requireConfirmation ? 1 : 0,
        fullSettings.dailyEmailSummary ? 1 : 0,
        fullSettings.require2FA ? 1 : 0,
        fullSettings.vacationModeUntil || null,
        fullSettings.createdAt,
        fullSettings.updatedAt
      );

      return fullSettings;
    } catch (error) {
      throw new DatabaseError(
        `Failed to upsert user settings for: ${settings.userId}`,
        this.name,
        error as Error
      );
    }
  }

  // ============================================================================
  // Connector Permission Operations
  // ============================================================================

  async getConnectorPermission(
    userId: string,
    connector: ConnectorType
  ): Promise<ConnectorPermission | null> {
    if (!this.db) throw new DatabaseError("Database not connected", this.name);

    try {
      const stmt = this.db.prepare(`
        SELECT * FROM connector_permissions WHERE user_id = ? AND connector = ?
      `);

      const row = stmt.get(userId, connector) as {
        user_id: string;
        connector: string;
        permission_level: number;
        created_at: number;
        updated_at: number;
      } | undefined;

      if (!row) return null;

      return {
        userId: row.user_id,
        connector: row.connector as ConnectorType,
        permissionLevel: row.permission_level as PermissionLevel,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    } catch (error) {
      throw new DatabaseError(
        `Failed to get connector permission for user ${userId}, connector ${connector}`,
        this.name,
        error as Error
      );
    }
  }

  async upsertConnectorPermission(
    userId: string,
    connector: ConnectorType,
    permissionLevel: PermissionLevel
  ): Promise<ConnectorPermission> {
    if (!this.db) throw new DatabaseError("Database not connected", this.name);

    try {
      const existing = await this.getConnectorPermission(userId, connector);
      const now = Date.now();

      const permission: ConnectorPermission = {
        userId,
        connector,
        permissionLevel,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      };

      const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO connector_permissions
        (user_id, connector, permission_level, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?)
      `);

      stmt.run(
        permission.userId,
        permission.connector,
        permission.permissionLevel,
        permission.createdAt,
        permission.updatedAt
      );

      return permission;
    } catch (error) {
      throw new DatabaseError(
        `Failed to upsert connector permission for user ${userId}, connector ${connector}`,
        this.name,
        error as Error
      );
    }
  }

  async listConnectorPermissions(userId: string): Promise<ConnectorPermission[]> {
    if (!this.db) throw new DatabaseError("Database not connected", this.name);

    try {
      const stmt = this.db.prepare(`
        SELECT * FROM connector_permissions WHERE user_id = ? ORDER BY connector ASC
      `);

      const rows = stmt.all(userId) as Array<{
        user_id: string;
        connector: string;
        permission_level: number;
        created_at: number;
        updated_at: number;
      }>;

      return rows.map((row) => ({
        userId: row.user_id,
        connector: row.connector as ConnectorType,
        permissionLevel: row.permission_level as PermissionLevel,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));
    } catch (error) {
      throw new DatabaseError(
        `Failed to list connector permissions for user ${userId}`,
        this.name,
        error as Error
      );
    }
  }

  async deleteConnectorPermission(userId: string, connector: ConnectorType): Promise<void> {
    if (!this.db) throw new DatabaseError("Database not connected", this.name);

    try {
      const stmt = this.db.prepare(`
        DELETE FROM connector_permissions WHERE user_id = ? AND connector = ?
      `);

      stmt.run(userId, connector);
    } catch (error) {
      throw new DatabaseError(
        `Failed to delete connector permission for user ${userId}, connector ${connector}`,
        this.name,
        error as Error
      );
    }
  }

  // ============================================================================
  // Project Operations (Epic 2.3)
  // ============================================================================

  async createProject(
    project: Omit<Project, "id" | "createdAt" | "updatedAt">
  ): Promise<Project> {
    if (!this.db) throw new DatabaseError("Database not connected", this.name);

    try {
      const id = crypto.randomUUID();
      const now = Date.now();

      const fullProject: Project = {
        id,
        ...project,
        createdAt: now,
        updatedAt: now,
      };

      const stmt = this.db.prepare(`
        INSERT INTO projects (id, user_id, name, description, color, xero_tenant_id, is_default, instructions, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        fullProject.id,
        fullProject.userId,
        fullProject.name,
        fullProject.description || null,
        fullProject.color || null,
        fullProject.xeroTenantId || null,
        0, // is_default no longer used (kept for backward compat)
        fullProject.instructions || null,
        fullProject.createdAt,
        fullProject.updatedAt
      );

      return fullProject;
    } catch (error) {
      throw new DatabaseError(
        `Failed to create project: ${project.name}`,
        this.name,
        error as Error
      );
    }
  }

  async getProject(userId: string, projectId: string): Promise<Project | null> {
    if (!this.db) throw new DatabaseError("Database not connected", this.name);

    try {
      const stmt = this.db.prepare(`
        SELECT * FROM projects WHERE user_id = ? AND id = ?
      `);

      const row = stmt.get(userId, projectId) as any;

      if (!row) return null;

      return {
        id: row.id,
        userId: row.user_id,
        name: row.name,
        description: row.description || undefined,
        color: row.color || undefined,
        xeroTenantId: row.xero_tenant_id || undefined,
        instructions: row.instructions || undefined,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    } catch (error) {
      throw new DatabaseError(
        `Failed to get project: ${projectId}`,
        this.name,
        error as Error
      );
    }
  }

  async listProjects(userId: string): Promise<Project[]> {
    if (!this.db) throw new DatabaseError("Database not connected", this.name);

    try {
      const stmt = this.db.prepare(`
        SELECT * FROM projects WHERE user_id = ? ORDER BY created_at ASC
      `);

      const rows = stmt.all(userId) as any[];

      return rows.map((row) => ({
        id: row.id,
        userId: row.user_id,
        name: row.name,
        description: row.description || undefined,
        color: row.color || undefined,
        xeroTenantId: row.xero_tenant_id || undefined,
        instructions: row.instructions || undefined,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));
    } catch (error) {
      throw new DatabaseError(
        `Failed to list projects for user: ${userId}`,
        this.name,
        error as Error
      );
    }
  }

  async updateProject(
    userId: string,
    projectId: string,
    updates: Partial<Project>
  ): Promise<Project> {
    if (!this.db) throw new DatabaseError("Database not connected", this.name);

    try {
      const existing = await this.getProject(userId, projectId);
      if (!existing) {
        throw new RecordNotFoundError(this.name, "Project", projectId);
      }

      const updated: Project = {
        ...existing,
        ...updates,
        updatedAt: Date.now(),
      };

      const stmt = this.db.prepare(`
        UPDATE projects
        SET name = ?, description = ?, color = ?, xero_tenant_id = ?, is_default = ?, instructions = ?, updated_at = ?
        WHERE user_id = ? AND id = ?
      `);

      stmt.run(
        updated.name,
        updated.description || null,
        updated.color || null,
        updated.xeroTenantId || null,
        0, // is_default no longer used (kept for backward compat)
        updated.instructions || null,
        updated.updatedAt,
        userId,
        projectId
      );

      return updated;
    } catch (error) {
      if (error instanceof RecordNotFoundError) throw error;
      throw new DatabaseError(
        `Failed to update project: ${projectId}`,
        this.name,
        error as Error
      );
    }
  }

  async deleteProject(userId: string, projectId: string): Promise<void> {
    if (!this.db) throw new DatabaseError("Database not connected", this.name);

    try {
      const stmt = this.db.prepare(`
        DELETE FROM projects WHERE user_id = ? AND id = ?
      `);

      stmt.run(userId, projectId);
    } catch (error) {
      throw new DatabaseError(
        `Failed to delete project: ${projectId}`,
        this.name,
        error as Error
      );
    }
  }

  // ============================================================================
  // Operation Snapshot Operations (Audit Trail)
  // ============================================================================

  async createOperationSnapshot(
    snapshot: Omit<OperationSnapshot, "id" | "createdAt">
  ): Promise<OperationSnapshot> {
    if (!this.db) throw new DatabaseError("Database not connected", this.name);

    try {
      const id = crypto.randomUUID();
      const now = Date.now();

      const fullSnapshot: OperationSnapshot = {
        id,
        ...snapshot,
        createdAt: now,
      };

      const stmt = this.db.prepare(`
        INSERT INTO operation_snapshots
        (id, user_id, operation_type, permission_level, entity_type, entity_id, before_state, after_state, requested_by, status, error_message, created_at, confirmed_at, executed_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        fullSnapshot.id,
        fullSnapshot.userId,
        fullSnapshot.operationType,
        fullSnapshot.permissionLevel,
        fullSnapshot.entityType,
        fullSnapshot.entityId || null,
        fullSnapshot.beforeState ? JSON.stringify(fullSnapshot.beforeState) : null,
        fullSnapshot.afterState ? JSON.stringify(fullSnapshot.afterState) : null,
        fullSnapshot.requestedBy,
        fullSnapshot.status,
        fullSnapshot.errorMessage || null,
        fullSnapshot.createdAt,
        fullSnapshot.confirmedAt || null,
        fullSnapshot.executedAt || null
      );

      return fullSnapshot;
    } catch (error) {
      throw new DatabaseError(
        "Failed to create operation snapshot",
        this.name,
        error as Error
      );
    }
  }

  async getOperationSnapshot(id: string): Promise<OperationSnapshot | null> {
    if (!this.db) throw new DatabaseError("Database not connected", this.name);

    try {
      const stmt = this.db.prepare(`
        SELECT * FROM operation_snapshots WHERE id = ?
      `);

      const row = stmt.get(id) as any;

      if (!row) return null;

      return {
        id: row.id,
        userId: row.user_id,
        operationType: row.operation_type,
        permissionLevel: row.permission_level as PermissionLevel,
        entityType: row.entity_type,
        entityId: row.entity_id || undefined,
        beforeState: row.before_state ? JSON.parse(row.before_state) : undefined,
        afterState: row.after_state ? JSON.parse(row.after_state) : undefined,
        requestedBy: row.requested_by,
        status: row.status,
        errorMessage: row.error_message || undefined,
        createdAt: row.created_at,
        confirmedAt: row.confirmed_at || undefined,
        executedAt: row.executed_at || undefined,
      };
    } catch (error) {
      throw new DatabaseError(
        `Failed to get operation snapshot: ${id}`,
        this.name,
        error as Error
      );
    }
  }

  async updateOperationSnapshot(
    id: string,
    updates: Partial<OperationSnapshot>
  ): Promise<OperationSnapshot> {
    if (!this.db) throw new DatabaseError("Database not connected", this.name);

    try {
      const existing = await this.getOperationSnapshot(id);
      if (!existing) {
        throw new RecordNotFoundError(this.name, "OperationSnapshot", id);
      }

      const updated: OperationSnapshot = {
        ...existing,
        ...updates,
      };

      const stmt = this.db.prepare(`
        UPDATE operation_snapshots
        SET status = ?, error_message = ?, after_state = ?, confirmed_at = ?, executed_at = ?
        WHERE id = ?
      `);

      stmt.run(
        updated.status,
        updated.errorMessage || null,
        updated.afterState ? JSON.stringify(updated.afterState) : null,
        updated.confirmedAt || null,
        updated.executedAt || null,
        id
      );

      return updated;
    } catch (error) {
      if (error instanceof RecordNotFoundError) throw error;
      throw new DatabaseError(
        `Failed to update operation snapshot: ${id}`,
        this.name,
        error as Error
      );
    }
  }

  async listOperationSnapshots(
    userId: string,
    options?: { limit?: number; status?: OperationSnapshot["status"] }
  ): Promise<OperationSnapshot[]> {
    if (!this.db) throw new DatabaseError("Database not connected", this.name);

    try {
      let query = `SELECT * FROM operation_snapshots WHERE user_id = ?`;
      const params: any[] = [userId];

      if (options?.status) {
        query += ` AND status = ?`;
        params.push(options.status);
      }

      query += ` ORDER BY created_at DESC`;

      if (options?.limit) {
        query += ` LIMIT ?`;
        params.push(options.limit);
      }

      const stmt = this.db.prepare(query);
      const rows = stmt.all(...params) as any[];

      return rows.map((row) => ({
        id: row.id,
        userId: row.user_id,
        operationType: row.operation_type,
        permissionLevel: row.permission_level as PermissionLevel,
        entityType: row.entity_type,
        entityId: row.entity_id || undefined,
        beforeState: row.before_state ? JSON.parse(row.before_state) : undefined,
        afterState: row.after_state ? JSON.parse(row.after_state) : undefined,
        requestedBy: row.requested_by,
        status: row.status,
        errorMessage: row.error_message || undefined,
        createdAt: row.created_at,
        confirmedAt: row.confirmed_at || undefined,
        executedAt: row.executed_at || undefined,
      }));
    } catch (error) {
      throw new DatabaseError(
        `Failed to list operation snapshots for user: ${userId}`,
        this.name,
        error as Error
      );
    }
  }

  // ============================================================================
  // Token Usage Operations (Rate Limiting)
  // ============================================================================

  async recordTokenUsage(usage: Omit<import("../types.js").TokenUsage, "id">): Promise<void> {
    if (!this.db) throw new DatabaseError("Database not connected", this.name);

    try {
      const stmt = this.db.prepare(`
        INSERT INTO token_usage (user_id, model_id, tokens_used, request_timestamp, date_bucket)
        VALUES (?, ?, ?, ?, ?)
      `);

      stmt.run(
        usage.userId,
        usage.modelId,
        usage.tokensUsed,
        usage.requestTimestamp,
        usage.dateBucket
      );
    } catch (error) {
      throw new DatabaseError(
        `Failed to record token usage for user: ${usage.userId}`,
        this.name,
        error as Error
      );
    }
  }

  async getTokenUsage(
    userId: string,
    modelId: string,
    dateBucket: string
  ): Promise<import("../types.js").TokenUsageSummary> {
    if (!this.db) throw new DatabaseError("Database not connected", this.name);

    try {
      const row = this.db.prepare(`
        SELECT
          user_id,
          model_id,
          date_bucket,
          SUM(tokens_used) as total_tokens,
          COUNT(*) as request_count
        FROM token_usage
        WHERE user_id = ? AND model_id = ? AND date_bucket = ?
        GROUP BY user_id, model_id, date_bucket
      `).get(userId, modelId, dateBucket) as any;

      if (!row) {
        return {
          userId,
          modelId,
          dateBucket,
          totalTokens: 0,
          requestCount: 0,
        };
      }

      return {
        userId: row.user_id,
        modelId: row.model_id,
        dateBucket: row.date_bucket,
        totalTokens: row.total_tokens,
        requestCount: row.request_count,
      };
    } catch (error) {
      throw new DatabaseError(
        `Failed to get token usage for user: ${userId}`,
        this.name,
        error as Error
      );
    }
  }

  async getDailyTokenUsage(userId: string, date: string): Promise<import("../types.js").TokenUsageSummary[]> {
    if (!this.db) throw new DatabaseError("Database not connected", this.name);

    try {
      const rows = this.db.prepare(`
        SELECT
          user_id,
          model_id,
          date_bucket,
          SUM(tokens_used) as total_tokens,
          COUNT(*) as request_count
        FROM token_usage
        WHERE user_id = ? AND date_bucket = ?
        GROUP BY user_id, model_id, date_bucket
        ORDER BY total_tokens DESC
      `).all(userId, date) as any[];

      return rows.map((row) => ({
        userId: row.user_id,
        modelId: row.model_id,
        dateBucket: row.date_bucket,
        totalTokens: row.total_tokens,
        requestCount: row.request_count,
      }));
    } catch (error) {
      throw new DatabaseError(
        `Failed to get daily token usage for user: ${userId}`,
        this.name,
        error as Error
      );
    }
  }
}
