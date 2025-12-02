/**
 * Session Management Routes
 *
 * Handles conversation session CRUD operations
 * Epic 2.2: Chat History support
 */

import { Router } from 'express';
import { AgentOrchestrator } from '@pip/agent-core';
import type { DatabaseProvider } from '@pip/core';

/**
 * Generate a title from the first user message
 * Takes the first ~50 chars or first sentence, whichever is shorter
 */
function generateTitleFromMessage(content: string): string {
  // Clean up whitespace
  const cleaned = content.trim().replace(/\s+/g, ' ');

  // Find first sentence ending
  const sentenceEnd = cleaned.search(/[.!?]/);
  const firstSentence = sentenceEnd > 0 ? cleaned.substring(0, sentenceEnd + 1) : cleaned;

  // Truncate to ~50 chars if needed
  if (firstSentence.length <= 50) {
    return firstSentence;
  }

  // Find a good break point (word boundary)
  const truncated = cleaned.substring(0, 50);
  const lastSpace = truncated.lastIndexOf(' ');
  return lastSpace > 20 ? truncated.substring(0, lastSpace) + '...' : truncated + '...';
}

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
      const { projectId } = req.body;
      const sessionId = await orchestrator.createSession(userId, projectId || undefined);

      res.status(201).json({
        sessionId,
        projectId: projectId || null,
        createdAt: Date.now(),
      });
    } catch (error) {
      next(error);
    }
  });

  /**
   * GET /api/sessions
   * List all sessions for a user (chat history)
   * Query params:
   *   - limit: max sessions to return (default 50)
   *   - projectId: filter by project (optional, empty string = unassigned sessions)
   */
  router.get('/', async (req, res, next) => {
    try {
      const userId = req.userId!;
      const limit = parseInt(req.query.limit as string) || 50;
      const rawProjectId = req.query.projectId as string | undefined;

      // Convert empty string to null for "unassigned sessions" query
      // undefined means "all sessions" (no filter)
      const projectId = rawProjectId === '' ? null : rawProjectId;

      const sessions = await db.listSessions({
        userId,
        projectId,
        limit,
        sortOrder: 'desc',
      });

      res.json({
        sessions: sessions.map(s => {
          // Generate title from first user message if not set
          const firstUserMsg = s.messages.find(m => m.role === 'user');
          const title = s.title || (firstUserMsg ? generateTitleFromMessage(firstUserMsg.content) : 'New chat');

          // Get preview from last message
          const lastMsg = s.messages[s.messages.length - 1];
          const previewText = s.previewText || lastMsg?.content?.substring(0, 100) || null;

          return {
            sessionId: s.sessionId,
            projectId: s.projectId,
            title,
            previewText,
            messageCount: s.messages.length,
            createdAt: s.createdAt,
            updatedAt: s.updatedAt,
          };
        }),
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

      const session = await db.getSession(userId, sessionId);
      if (!session) {
        res.status(404).json({ error: 'Session not found' });
        return;
      }

      // Generate title if not set
      const firstUserMsg = session.messages.find(m => m.role === 'user');
      const title = session.title || (firstUserMsg ? generateTitleFromMessage(firstUserMsg.content) : 'New chat');

      res.json({
        sessionId: session.sessionId,
        projectId: session.projectId,
        title,
        messages: session.messages,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
      });
    } catch (error) {
      next(error);
    }
  });

  /**
   * PATCH /api/sessions/:id
   * Update session (rename chat)
   */
  router.patch('/:id', async (req, res, next) => {
    try {
      const userId = req.userId!;
      const { id: sessionId } = req.params;
      const { title } = req.body;

      if (typeof title !== 'string' || !title.trim()) {
        res.status(400).json({ error: 'Title is required' });
        return;
      }

      const updated = await db.updateSession(userId, sessionId, {
        title: title.trim().substring(0, 100),
      });

      res.json({
        sessionId: updated.sessionId,
        title: updated.title,
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
