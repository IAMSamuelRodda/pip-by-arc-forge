/**
 * Chat API Routes
 *
 * Handles conversation with the AI agent
 * Replaces: Agent Lambda (functions/agent/)
 */

import { Router } from 'express';
import { AgentOrchestrator } from '@pip/agent-core';
import type { DatabaseProvider } from '@pip/core';
import { canAccessModel, getDefaultModel, MODEL_CONFIGS } from '@pip/core';

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
      const { message, sessionId, projectId, model: requestedModel } = req.body;

      if (!message || typeof message !== 'string') {
        return res.status(400).json({
          error: 'Missing required field: message',
        });
      }

      // Get userId from auth middleware
      const userId = req.userId!;

      // Get user for access control check
      const user = await db.getUserById(userId);
      if (!user) {
        return res.status(401).json({ error: 'User not found' });
      }

      // Access control: Check if user can use the requested model
      let model = requestedModel;
      if (model) {
        // Normalize Ollama model format for access check
        const modelId = model.startsWith('ollama:') ? model.replace('ollama:', '') : model;

        if (!canAccessModel(user, modelId)) {
          // User doesn't have access to this model - fall back to default
          const defaultModel = getDefaultModel(user);
          if (!defaultModel) {
            return res.status(403).json({
              error: 'No models available',
              details: 'Your subscription tier does not include access to any AI models. Please upgrade or use BYOM.',
            });
          }
          console.log(`Access denied for model ${modelId}, falling back to ${defaultModel.id}`);
          model = defaultModel.id;
        }
      }

      // Track if this is a new session (for title generation)
      const isNewSession = !sessionId;

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

      // Generate smart title for new sessions (async, don't block response)
      // Uses the same model that handled the conversation
      if (isNewSession) {
        orchestrator.generateTitle(message, model).then(async (title) => {
          try {
            await db.updateSession(userId, activeSessionId, { title });
          } catch (err) {
            console.error('Failed to save chat title:', err);
          }
        });
      }

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
   * GET /api/chat/models
   * Get list of models accessible to the current user
   */
  router.get('/models', async (req, res, next) => {
    try {
      const userId = req.userId!;
      const user = await db.getUserById(userId);
      if (!user) {
        return res.status(401).json({ error: 'User not found' });
      }

      // Filter models based on user access
      const accessibleModels = MODEL_CONFIGS
        .filter(model => canAccessModel(user, model.id))
        .map(model => ({
          id: model.id,
          name: model.name,
          provider: model.provider,
        }));

      // Get default model
      const defaultModel = getDefaultModel(user);

      res.json({
        models: accessibleModels,
        defaultModelId: defaultModel?.id,
        userTier: user.subscriptionTier,
        userRole: user.role,
      });
    } catch (error) {
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
