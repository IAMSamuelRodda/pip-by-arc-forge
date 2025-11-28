/**
 * Session Management Routes
 *
 * Handles conversation session CRUD operations
 */

import { Router } from 'express';
import { AgentOrchestrator } from '@zero-agent/agent-core';
import type { DatabaseProvider } from '@zero-agent/core';

export function createSessionRoutes(db: DatabaseProvider): Router {
  const router = Router();
  const orchestrator = new AgentOrchestrator();

  /**
   * POST /api/sessions
   * Create a new conversation session
   */
  router.post('/', async (req, res, next) => {
    try {
      const userId = req.userId!;
      const sessionId = await orchestrator.createSession(userId);

      res.status(201).json({
        sessionId,
        createdAt: Date.now(),
      });
    } catch (error) {
      next(error);
    }
  });

  /**
   * GET /api/sessions
   * List all sessions for a user
   */
  router.get('/', async (req, res, next) => {
    try {
      const userId = req.userId!;
      const limit = parseInt(req.query.limit as string) || 20;

      const sessions = await db.listSessions({
        userId,
        limit,
        sortOrder: 'desc',
      });

      res.json({
        sessions: sessions.map(s => ({
          sessionId: s.sessionId,
          messageCount: s.messages.length,
          createdAt: s.createdAt,
          updatedAt: s.updatedAt,
          // Include first message as preview
          preview: s.messages[0]?.content?.substring(0, 100) || null,
        })),
      });
    } catch (error) {
      next(error);
    }
  });

  /**
   * GET /api/sessions/:id
   * Get conversation history for a session
   */
  router.get('/:id', async (req, res, next) => {
    try {
      const userId = req.userId!;
      const { id: sessionId } = req.params;

      const history = await orchestrator.getHistory(userId, sessionId);

      res.json({
        sessionId,
        messages: history,
      });
    } catch (error) {
      next(error);
    }
  });

  /**
   * DELETE /api/sessions/:id
   * Delete a conversation session
   */
  router.delete('/:id', async (req, res, next) => {
    try {
      const userId = req.userId!;
      const { id: sessionId } = req.params;

      await db.deleteSession(userId, sessionId);

      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
