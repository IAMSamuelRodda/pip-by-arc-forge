/**
 * Chat API Routes
 *
 * Handles conversation with the AI agent
 * Replaces: Agent Lambda (functions/agent/)
 */

import { Router } from 'express';
import { AgentOrchestrator } from '@pip/agent-core';
import type { DatabaseProvider } from '@pip/core';

export function createChatRoutes(db: DatabaseProvider): Router {
  const router = Router();

  // Orchestrator with lazy initialization - only initializes on first chat request
  const orchestrator = new AgentOrchestrator();

  /**
   * POST /api/chat
   * Send a message and get AI response
   */
  router.post('/', async (req, res, next) => {
    try {
      const { message, sessionId, projectId, model } = req.body;

      if (!message || typeof message !== 'string') {
        return res.status(400).json({
          error: 'Missing required field: message',
        });
      }

      // Get userId from auth middleware
      const userId = req.userId!;

      // Create session if not provided (with optional project scope)
      let activeSessionId = sessionId;
      if (!activeSessionId) {
        activeSessionId = await orchestrator.createSession(userId, projectId || undefined);
      }

      // Process message through orchestrator
      const response = await orchestrator.processMessage({
        userId,
        sessionId: activeSessionId,
        message,
        projectId: projectId || undefined,
        model: model || undefined,
      });

      res.json({
        message: response.message,
        sessionId: response.sessionId,
        metadata: response.metadata,
      });

    } catch (error: any) {
      // Handle initialization errors gracefully
      if (error.name === 'AuthenticationError' || error.message?.includes('API key')) {
        return res.status(503).json({
          error: 'AI service not configured',
          details: 'ANTHROPIC_API_KEY is not set. Please configure the API key.',
        });
      }
      next(error);
    }
  });

  /**
   * POST /api/chat/stream (future)
   * Stream AI response for real-time updates
   */
  router.post('/stream', async (req, res, next) => {
    // TODO: Implement streaming response using Server-Sent Events
    res.status(501).json({
      error: 'Streaming not yet implemented',
    });
  });

  return router;
}
