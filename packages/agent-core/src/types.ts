/**
 * Type definitions for agent core
 */

// Re-export database types from @zero-agent/core
export type {
  Session,
  Message,
  CoreMemory,
  ExtendedMemory,
  Milestone,
  OAuthTokens,
} from '@zero-agent/core';

// Agent-specific request/response types
export interface AgentRequest {
  userId: string;
  sessionId: string;
  message: string;
  context?: Record<string, any>;
}

export interface AgentResponse {
  message: string;
  sessionId: string;
  metadata?: {
    toolsUsed?: string[];
    subAgentCalled?: string;
    tokensUsed?: number;
  };
}
