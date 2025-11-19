/**
 * Memory Manager - Core and Extended Memory
 *
 * Implements ADR-007: Memory persistence and relationship building
 * Uses the database abstraction layer (SQLite, DynamoDB, or PostgreSQL)
 */

import type { DatabaseProvider, Milestone } from '@zero-agent/core';
import type { CoreMemory, ExtendedMemory } from '../types.js';

export class MemoryManager {
  private db: DatabaseProvider;

  constructor(db: DatabaseProvider) {
    this.db = db;
  }

  /**
   * Get core memory (always available, free tier)
   */
  async getCoreMemory(userId: string): Promise<CoreMemory | null> {
    return await this.db.getCoreMemory(userId);
  }

  /**
   * Update core memory
   */
  async updateCoreMemory(
    userId: string,
    updates: Partial<CoreMemory>
  ): Promise<void> {
    await this.db.upsertCoreMemory({
      userId,
      ...updates,
    });
  }

  /**
   * Add milestone to user's relationship progression
   */
  async addMilestone(userId: string, milestone: {
    type: string;
    description: string;
  }): Promise<void> {
    const existing = await this.db.getCoreMemory(userId);
    const currentMilestones = existing?.keyMilestones || [];

    await this.db.upsertCoreMemory({
      userId,
      keyMilestones: [
        ...currentMilestones,
        {
          ...milestone,
          timestamp: Date.now(),
        } as Milestone,
      ],
    });
  }

  /**
   * Update relationship stage (colleague → partner → friend)
   */
  async updateRelationshipStage(
    userId: string,
    stage: 'colleague' | 'partner' | 'friend'
  ): Promise<void> {
    await this.db.upsertCoreMemory({
      userId,
      relationshipStage: stage,
    });
  }

  /**
   * Get extended memory (paid tier, semantic search)
   */
  async getExtendedMemory(userId: string, limit: number = 10): Promise<ExtendedMemory[]> {
    return await this.db.listExtendedMemories({
      userId,
      limit,
      sortOrder: "desc", // Most recent first
    });
  }

  /**
   * Add extended memory entry
   */
  async addExtendedMemory(
    userId: string,
    memory: Omit<ExtendedMemory, 'userId' | 'createdAt' | 'memoryId'>
  ): Promise<void> {
    await this.db.createExtendedMemory({
      userId,
      ...memory,
    });
  }

  /**
   * Semantic search across extended memory (premium feature)
   */
  async searchMemory(userId: string, embedding: number[], limit: number = 5): Promise<ExtendedMemory[]> {
    return await this.db.searchMemories(userId, embedding, limit);
  }
}
