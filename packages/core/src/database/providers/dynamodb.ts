/**
 * DynamoDB Database Provider
 *
 * Single-table design for AWS managed deployments
 * Features:
 * - Serverless, auto-scaling
 * - Global tables for multi-region
 * - Built-in TTL for extended memory
 * - GSI for secondary access patterns
 */

import {
  DynamoDBClient,
  CreateTableCommand,
  DescribeTableCommand,
} from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  QueryCommand,
  UpdateCommand,
  DeleteCommand,
} from "@aws-sdk/lib-dynamodb";
import type {
  DatabaseProvider,
  DynamoDBConnectionConfig,
  Session,
  CoreMemory,
  ExtendedMemory,
  OAuthTokens,
  SessionFilter,
  MemoryFilter,
} from "../types.js";
import {
  ConnectionError,
  RecordNotFoundError,
  DatabaseError,
} from "../types.js";

/**
 * Single-table design key patterns:
 *
 * Sessions:
 *   PK: USER#<userId>
 *   SK: SESSION#<sessionId>
 *
 * Core Memory:
 *   PK: USER#<userId>
 *   SK: MEMORY#CORE
 *
 * Extended Memory:
 *   PK: USER#<userId>
 *   SK: MEMORY#CONVERSATION#<timestamp>#<memoryId>
 *
 * OAuth Tokens:
 *   PK: USER#<userId>
 *   SK: OAUTH#<provider>
 */

export class DynamoDBProvider implements DatabaseProvider {
  readonly name = "dynamodb" as const;

  private client: DynamoDBClient | null = null;
  private docClient: DynamoDBDocumentClient | null = null;
  private config: DynamoDBConnectionConfig;

  constructor(config: DynamoDBConnectionConfig) {
    this.config = config;
  }

  // ============================================================================
  // Connection Management
  // ============================================================================

  async connect(): Promise<void> {
    try {
      this.client = new DynamoDBClient({
        region: this.config.region,
        endpoint: this.config.endpoint, // For local DynamoDB
      });

      this.docClient = DynamoDBDocumentClient.from(this.client, {
        marshallOptions: {
          removeUndefinedValues: true,
          convertEmptyValues: false,
        },
      });

      // Verify table exists
      await this.verifyTable();

      console.log(`✓ DynamoDB connected: ${this.config.tableName} (${this.config.region})`);
    } catch (error) {
      throw new ConnectionError(
        this.name,
        `Failed to connect to DynamoDB table: ${this.config.tableName}`,
        error as Error
      );
    }
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      this.client.destroy();
      this.client = null;
      this.docClient = null;
    }
  }

  isConnected(): boolean {
    return this.client !== null && this.docClient !== null;
  }

  /**
   * Verify that the DynamoDB table exists
   */
  private async verifyTable(): Promise<void> {
    if (!this.client) throw new Error("Client not initialized");

    try {
      const command = new DescribeTableCommand({
        TableName: this.config.tableName,
      });
      await this.client.send(command);
    } catch (error: any) {
      if (error.name === "ResourceNotFoundException") {
        throw new ConnectionError(
          this.name,
          `Table does not exist: ${this.config.tableName}. Run terraform apply to create it.`,
          error
        );
      }
      throw error;
    }
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  private ensureConnected(): void {
    if (!this.docClient) {
      throw new DatabaseError("Database not connected", this.name);
    }
  }

  // ============================================================================
  // Session Operations
  // ============================================================================

  async createSession(
    session: Omit<Session, "createdAt" | "updatedAt">
  ): Promise<Session> {
    this.ensureConnected();

    const now = Date.now();
    const fullSession: Session = {
      ...session,
      createdAt: now,
      updatedAt: now,
    };

    try {
      await this.docClient!.send(
        new PutCommand({
          TableName: this.config.tableName,
          Item: {
            PK: `USER#${fullSession.userId}`,
            SK: `SESSION#${fullSession.sessionId}`,
            EntityType: "Session",
            sessionId: fullSession.sessionId,
            userId: fullSession.userId,
            messages: fullSession.messages,
            agentContext: fullSession.agentContext,
            createdAt: fullSession.createdAt,
            updatedAt: fullSession.updatedAt,
            expiresAt: fullSession.expiresAt,
            TTL: Math.floor(fullSession.expiresAt / 1000), // DynamoDB TTL expects seconds
          },
        })
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
    this.ensureConnected();

    try {
      const result = await this.docClient!.send(
        new GetCommand({
          TableName: this.config.tableName,
          Key: {
            PK: `USER#${userId}`,
            SK: `SESSION#${sessionId}`,
          },
        })
      );

      if (!result.Item) return null;

      return {
        sessionId: result.Item.sessionId,
        userId: result.Item.userId,
        messages: result.Item.messages,
        agentContext: result.Item.agentContext,
        createdAt: result.Item.createdAt,
        updatedAt: result.Item.updatedAt,
        expiresAt: result.Item.expiresAt,
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
    this.ensureConnected();

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

      await this.docClient!.send(
        new UpdateCommand({
          TableName: this.config.tableName,
          Key: {
            PK: `USER#${userId}`,
            SK: `SESSION#${sessionId}`,
          },
          UpdateExpression:
            "SET messages = :messages, agentContext = :agentContext, updatedAt = :updatedAt, expiresAt = :expiresAt, #ttl = :ttl",
          ExpressionAttributeNames: {
            "#ttl": "TTL",
          },
          ExpressionAttributeValues: {
            ":messages": updated.messages,
            ":agentContext": updated.agentContext,
            ":updatedAt": updated.updatedAt,
            ":expiresAt": updated.expiresAt,
            ":ttl": Math.floor(updated.expiresAt / 1000),
          },
        })
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
    this.ensureConnected();

    try {
      await this.docClient!.send(
        new DeleteCommand({
          TableName: this.config.tableName,
          Key: {
            PK: `USER#${userId}`,
            SK: `SESSION#${sessionId}`,
          },
        })
      );
    } catch (error) {
      throw new DatabaseError(
        `Failed to delete session: ${sessionId}`,
        this.name,
        error as Error
      );
    }
  }

  async listSessions(filter: SessionFilter): Promise<Session[]> {
    this.ensureConnected();

    try {
      const result = await this.docClient!.send(
        new QueryCommand({
          TableName: this.config.tableName,
          KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
          ExpressionAttributeValues: {
            ":pk": `USER#${filter.userId}`,
            ":sk": "SESSION#",
          },
          ScanIndexForward: filter.sortOrder === "asc",
          Limit: filter.limit,
        })
      );

      return (result.Items || []).map((item) => ({
        sessionId: item.sessionId,
        userId: item.userId,
        messages: item.messages,
        agentContext: item.agentContext,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
        expiresAt: item.expiresAt,
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
    this.ensureConnected();

    try {
      const result = await this.docClient!.send(
        new GetCommand({
          TableName: this.config.tableName,
          Key: {
            PK: `USER#${userId}`,
            SK: "MEMORY#CORE",
          },
        })
      );

      if (!result.Item) return null;

      return {
        userId: result.Item.userId,
        preferences: result.Item.preferences,
        relationshipStage: result.Item.relationshipStage,
        relationshipStartDate: result.Item.relationshipStartDate,
        keyMilestones: result.Item.keyMilestones,
        criticalContext: result.Item.criticalContext,
        createdAt: result.Item.createdAt,
        updatedAt: result.Item.updatedAt,
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
    this.ensureConnected();

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

      await this.docClient!.send(
        new PutCommand({
          TableName: this.config.tableName,
          Item: {
            PK: `USER#${fullMemory.userId}`,
            SK: "MEMORY#CORE",
            EntityType: "CoreMemory",
            userId: fullMemory.userId,
            preferences: fullMemory.preferences,
            relationshipStage: fullMemory.relationshipStage,
            relationshipStartDate: fullMemory.relationshipStartDate,
            keyMilestones: fullMemory.keyMilestones,
            criticalContext: fullMemory.criticalContext,
            createdAt: fullMemory.createdAt,
            updatedAt: fullMemory.updatedAt,
          },
        })
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
    this.ensureConnected();

    try {
      await this.docClient!.send(
        new DeleteCommand({
          TableName: this.config.tableName,
          Key: {
            PK: `USER#${userId}`,
            SK: "MEMORY#CORE",
          },
        })
      );
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
    this.ensureConnected();

    try {
      const memoryId = crypto.randomUUID();
      const now = Date.now();

      const fullMemory: ExtendedMemory = {
        memoryId,
        ...memory,
        createdAt: now,
      };

      await this.docClient!.send(
        new PutCommand({
          TableName: this.config.tableName,
          Item: {
            PK: `USER#${fullMemory.userId}`,
            SK: `MEMORY#CONVERSATION#${now}#${memoryId}`,
            EntityType: "ExtendedMemory",
            memoryId: fullMemory.memoryId,
            userId: fullMemory.userId,
            conversationSummary: fullMemory.conversationSummary,
            embedding: fullMemory.embedding,
            learnedPatterns: fullMemory.learnedPatterns,
            emotionalContext: fullMemory.emotionalContext,
            topics: fullMemory.topics,
            createdAt: fullMemory.createdAt,
            ...(fullMemory.ttl && { TTL: Math.floor(fullMemory.ttl / 1000) }),
          },
        })
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
    this.ensureConnected();

    try {
      // Need to query by memoryId since we don't know the timestamp
      const result = await this.docClient!.send(
        new QueryCommand({
          TableName: this.config.tableName,
          KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
          FilterExpression: "memoryId = :memoryId",
          ExpressionAttributeValues: {
            ":pk": `USER#${userId}`,
            ":sk": "MEMORY#CONVERSATION#",
            ":memoryId": memoryId,
          },
          Limit: 1,
        })
      );

      if (!result.Items || result.Items.length === 0) return null;

      const item = result.Items[0];

      return {
        memoryId: item.memoryId,
        userId: item.userId,
        conversationSummary: item.conversationSummary,
        embedding: item.embedding,
        learnedPatterns: item.learnedPatterns,
        emotionalContext: item.emotionalContext,
        topics: item.topics,
        createdAt: item.createdAt,
        ttl: item.TTL ? item.TTL * 1000 : undefined, // Convert back to milliseconds
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
    this.ensureConnected();

    try {
      const params: any = {
        TableName: this.config.tableName,
        KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
        ExpressionAttributeValues: {
          ":pk": `USER#${filter.userId}`,
          ":sk": "MEMORY#CONVERSATION#",
        },
        ScanIndexForward: filter.sortOrder === "asc",
        Limit: filter.limit,
      };

      // Add topic filter if specified
      if (filter.topics && filter.topics.length > 0) {
        params.FilterExpression = filter.topics
          .map((_, i) => `contains(topics, :topic${i})`)
          .join(" OR ");
        filter.topics.forEach((topic, i) => {
          params.ExpressionAttributeValues[`:topic${i}`] = topic;
        });
      }

      const result = await this.docClient!.send(new QueryCommand(params));

      return (result.Items || []).map((item) => ({
        memoryId: item.memoryId,
        userId: item.userId,
        conversationSummary: item.conversationSummary,
        embedding: item.embedding,
        learnedPatterns: item.learnedPatterns,
        emotionalContext: item.emotionalContext,
        topics: item.topics,
        createdAt: item.createdAt,
        ttl: item.TTL ? item.TTL * 1000 : undefined,
      }));
    } catch (error) {
      throw new DatabaseError(
        `Failed to list extended memories for user: ${filter.userId}`,
        this.name,
        error as Error
      );
    }
  }

  async deleteExtendedMemory(userId: string, memoryId: string): Promise<void> {
    this.ensureConnected();

    try {
      // Need to get the item first to know the exact SK
      const memory = await this.getExtendedMemory(userId, memoryId);
      if (!memory) {
        throw new RecordNotFoundError(this.name, "ExtendedMemory", memoryId);
      }

      // SK format: MEMORY#CONVERSATION#<timestamp>#<memoryId>
      const sk = `MEMORY#CONVERSATION#${memory.createdAt}#${memoryId}`;

      await this.docClient!.send(
        new DeleteCommand({
          TableName: this.config.tableName,
          Key: {
            PK: `USER#${userId}`,
            SK: sk,
          },
        })
      );
    } catch (error) {
      if (error instanceof RecordNotFoundError) throw error;
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
    this.ensureConnected();

    // Note: DynamoDB doesn't have native vector similarity search
    // For production, consider:
    // 1. OpenSearch Serverless with vector engine
    // 2. External vector database (Pinecone, Weaviate)
    // 3. Storing embedding hash and doing approximate nearest neighbor
    //
    // For now, we'll retrieve all memories and compute similarity in-memory

    try {
      const memories = await this.listExtendedMemories({
        userId,
        limit: 100, // Get more for better results
      });

      // Calculate cosine similarity
      const memoriesWithScores = memories
        .filter((m) => m.embedding && m.embedding.length > 0)
        .map((memory) => {
          const score = this.cosineSimilarity(embedding, memory.embedding!);
          return { memory, score };
        })
        .sort((a, b) => b.score - a.score)
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
    this.ensureConnected();

    try {
      await this.docClient!.send(
        new PutCommand({
          TableName: this.config.tableName,
          Item: {
            PK: `USER#${tokens.userId}`,
            SK: `OAUTH#${tokens.provider}`,
            EntityType: "OAuthTokens",
            userId: tokens.userId,
            provider: tokens.provider,
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            tokenType: tokens.tokenType,
            expiresAt: tokens.expiresAt,
            scopes: tokens.scopes,
            tenantId: tokens.tenantId,
            tenantName: tokens.tenantName,
            createdAt: tokens.createdAt,
            updatedAt: tokens.updatedAt,
          },
        })
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
    this.ensureConnected();

    try {
      const result = await this.docClient!.send(
        new GetCommand({
          TableName: this.config.tableName,
          Key: {
            PK: `USER#${userId}`,
            SK: `OAUTH#${provider}`,
          },
        })
      );

      if (!result.Item) return null;

      return {
        userId: result.Item.userId,
        provider: result.Item.provider,
        accessToken: result.Item.accessToken,
        refreshToken: result.Item.refreshToken,
        tokenType: result.Item.tokenType,
        expiresAt: result.Item.expiresAt,
        scopes: result.Item.scopes,
        tenantId: result.Item.tenantId,
        tenantName: result.Item.tenantName,
        createdAt: result.Item.createdAt,
        updatedAt: result.Item.updatedAt,
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
    this.ensureConnected();

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
    this.ensureConnected();

    try {
      await this.docClient!.send(
        new DeleteCommand({
          TableName: this.config.tableName,
          Key: {
            PK: `USER#${userId}`,
            SK: `OAUTH#${provider}`,
          },
        })
      );
    } catch (error) {
      throw new DatabaseError(
        `Failed to delete OAuth tokens for user: ${userId}`,
        this.name,
        error as Error
      );
    }
  }

  // ============================================================================
  // User Operations (Not implemented - use SQLite for now)
  // ============================================================================

  async createUser(_user: { email: string; passwordHash: string; name?: string; isAdmin?: boolean }): Promise<any> {
    throw new Error("User operations not implemented in DynamoDB provider. Use SQLite.");
  }

  async getUserByEmail(_email: string): Promise<any> {
    throw new Error("User operations not implemented in DynamoDB provider. Use SQLite.");
  }

  async getUserById(_id: string): Promise<any> {
    throw new Error("User operations not implemented in DynamoDB provider. Use SQLite.");
  }

  async updateUser(_id: string, _updates: any): Promise<any> {
    throw new Error("User operations not implemented in DynamoDB provider. Use SQLite.");
  }

  // ============================================================================
  // Invite Code Operations (Not implemented - use SQLite for now)
  // ============================================================================

  async createInviteCode(_code: string, _createdBy?: string, _expiresAt?: number): Promise<void> {
    throw new Error("Invite code operations not implemented in DynamoDB provider. Use SQLite.");
  }

  async getInviteCode(_code: string): Promise<any> {
    throw new Error("Invite code operations not implemented in DynamoDB provider. Use SQLite.");
  }

  async useInviteCode(_code: string, _userId: string): Promise<void> {
    throw new Error("Invite code operations not implemented in DynamoDB provider. Use SQLite.");
  }

  async listInviteCodes(): Promise<any[]> {
    throw new Error("Invite code operations not implemented in DynamoDB provider. Use SQLite.");
  }

  // ============================================================================
  // Safety Settings Operations (Not implemented - use SQLite for now)
  // ============================================================================

  async getUserSettings(_userId: string): Promise<any> {
    throw new Error("Safety settings not implemented in DynamoDB provider. Use SQLite.");
  }

  async upsertUserSettings(_settings: any): Promise<any> {
    throw new Error("Safety settings not implemented in DynamoDB provider. Use SQLite.");
  }

  // ============================================================================
  // Operation Snapshot Operations (Not implemented - use SQLite for now)
  // ============================================================================

  async createOperationSnapshot(_snapshot: any): Promise<any> {
    throw new Error("Operation snapshot not implemented in DynamoDB provider. Use SQLite.");
  }

  async getOperationSnapshot(_id: string): Promise<any> {
    throw new Error("Operation snapshot not implemented in DynamoDB provider. Use SQLite.");
  }

  async updateOperationSnapshot(_id: string, _updates: any): Promise<any> {
    throw new Error("Operation snapshot not implemented in DynamoDB provider. Use SQLite.");
  }

  async listOperationSnapshots(_userId: string, _options?: any): Promise<any[]> {
    throw new Error("Operation snapshot not implemented in DynamoDB provider. Use SQLite.");
  }
}
