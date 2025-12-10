/**
 * Rate Limiting Service
 *
 * Enforces token usage limits per user/tier to prevent API abuse
 * Integrates with access-control.ts for tier-based limits
 */

import type { User } from '../database/types.js';
import type { DatabaseProvider } from '../database/types.js';
import { getRateLimits } from './access-control.js';

export interface RateLimitResult {
  allowed: boolean;
  tokensUsed: number;
  tokensLimit: number;
  tokensRemaining: number;
  resetAt?: Date;
  message?: string;
}

export class RateLimiter {
  constructor(private dbProvider: DatabaseProvider) {}

  /**
   * Check if a user can make a request with the given token count
   * Returns whether the request is allowed and usage information
   */
  async checkRateLimit(
    user: User,
    modelId: string,
    estimatedTokens: number
  ): Promise<RateLimitResult> {
    // Get rate limits for user's tier
    const limits = getRateLimits(user);

    // If rate limiting is not enforced (unlimited users), allow
    if (!limits.enforced) {
      return {
        allowed: true,
        tokensUsed: 0,
        tokensLimit: Infinity,
        tokensRemaining: Infinity,
      };
    }

    // Get current date bucket (YYYY-MM-DD)
    const dateBucket = new Date().toISOString().split('T')[0];

    // Get current usage for today
    const usage = await this.dbProvider.getTokenUsage(user.id, modelId, dateBucket);

    // Calculate remaining tokens
    const tokensUsed = usage.totalTokens;
    const tokensLimit = limits.dailyTokenLimit;
    const tokensRemaining = tokensLimit - tokensUsed;

    // Check if user would exceed limit
    if (tokensUsed + estimatedTokens > tokensLimit) {
      // Calculate reset time (midnight UTC tomorrow)
      const now = new Date();
      const resetAt = new Date(now);
      resetAt.setUTCDate(resetAt.getUTCDate() + 1);
      resetAt.setUTCHours(0, 0, 0, 0);

      return {
        allowed: false,
        tokensUsed,
        tokensLimit,
        tokensRemaining,
        resetAt,
        message: `Daily token limit exceeded for ${modelId}. Limit resets at ${resetAt.toISOString()}. Upgrade your plan for higher limits.`,
      };
    }

    return {
      allowed: true,
      tokensUsed,
      tokensLimit,
      tokensRemaining: tokensRemaining - estimatedTokens,
    };
  }

  /**
   * Record actual token usage after a successful API call
   */
  async recordUsage(
    userId: string,
    modelId: string,
    tokensUsed: number
  ): Promise<void> {
    const dateBucket = new Date().toISOString().split('T')[0];
    const requestTimestamp = Date.now();

    await this.dbProvider.recordTokenUsage({
      userId,
      modelId,
      tokensUsed,
      requestTimestamp,
      dateBucket,
    });
  }

  /**
   * Get current usage summary for a user
   * Returns usage per model for today
   */
  async getDailyUsage(userId: string): Promise<Array<{
    modelId: string;
    tokensUsed: number;
    requestCount: number;
  }>> {
    const dateBucket = new Date().toISOString().split('T')[0];
    const summaries = await this.dbProvider.getDailyTokenUsage(userId, dateBucket);

    return summaries.map((summary) => ({
      modelId: summary.modelId,
      tokensUsed: summary.totalTokens,
      requestCount: summary.requestCount,
    }));
  }
}
