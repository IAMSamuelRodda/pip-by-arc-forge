/**
 * Session Manager - Database-backed session persistence
 *
 * Uses the database abstraction layer (SQLite, DynamoDB, or PostgreSQL)
 */

import type { DatabaseProvider } from '@pip/core';
import type { Session } from '../types.js';

export class SessionManager {
  private db: DatabaseProvider;

  constructor(db: DatabaseProvider) {
    this.db = db;
  }

  /**
   * Create a new session
   */
  async createSession(userId: string, projectId?: string): Promise<string> {
    const sessionId = crypto.randomUUID();
    const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000; // 30 days

    await this.db.createSession({
      sessionId,
      userId,
      projectId,
      messages: [],
      agentContext: {},
      expiresAt,
    });

    return sessionId;
  }

  /**
   * Get existing session
   */
  async getSession(userId: string, sessionId: string): Promise<Session | null> {
    return await this.db.getSession(userId, sessionId);
  }

  /**
   * Update session with new messages
   */
  async updateSession(
    userId: string,
    sessionId: string,
    updates: Partial<Session>
  ): Promise<void> {
    await this.db.updateSession(userId, sessionId, updates);
  }

  /**
   * Delete session
   */
  async deleteSession(userId: string, sessionId: string): Promise<void> {
    await this.db.deleteSession(userId, sessionId);
  }

  /**
   * List user sessions
   */
  async listSessions(userId: string, limit: number = 10): Promise<Session[]> {
    return await this.db.listSessions({
      userId,
      limit,
      sortOrder: "desc", // Most recent first
    });
  }
}
