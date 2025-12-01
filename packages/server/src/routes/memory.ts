/**
 * Memory Routes for PWA
 *
 * Provides REST API access to the knowledge graph memory system.
 * Uses the same SQLite database as the MCP server.
 */

import { Router } from 'express';
import Database from 'better-sqlite3';
import { requireAuth } from '../middleware/auth.js';

// Database path (same as MCP server)
const DB_PATH = process.env.DATABASE_PATH || '/app/data/zero-agent.db';

interface MemorySummary {
  summary: string;
  entityCount: number;
  observationCount: number;
  generatedAt: number;
}

interface UserEdit {
  entityName: string;
  observation: string;
  createdAt: number;
}

function getDb(): Database.Database {
  return new Database(DB_PATH);
}

export function createMemoryRoutes(): Router {
  const router = Router();

  /**
   * GET /api/memory - Get memory summary and stats
   */
  router.get('/', requireAuth, (req, res) => {
    const db = getDb();
    try {
      const userId = req.userId!;
      const projectId = (req.query.projectId as string) || null;

      // Get summary
      const summaryRow = db.prepare(`
        SELECT summary, entity_count, observation_count, generated_at
        FROM memory_summaries
        WHERE user_id = ? AND (project_id = ? OR (project_id IS NULL AND ? IS NULL))
      `).get(userId, projectId, projectId) as MemorySummary | undefined;

      // Get edit count
      const editCountRow = db.prepare(`
        SELECT COUNT(*) as count
        FROM memory_observations mo
        JOIN memory_entities me ON mo.entity_id = me.id
        WHERE me.user_id = ? AND mo.is_user_edit = 1
        AND (me.project_id = ? OR (me.project_id IS NULL AND ? IS NULL))
      `).get(userId, projectId, projectId) as { count: number };

      // Get entity count
      const entityCountRow = db.prepare(`
        SELECT COUNT(*) as count FROM memory_entities
        WHERE user_id = ? AND (project_id = ? OR (project_id IS NULL AND ? IS NULL))
      `).get(userId, projectId, projectId) as { count: number };

      // Get observation count
      const obsCountRow = db.prepare(`
        SELECT COUNT(*) as count
        FROM memory_observations mo
        JOIN memory_entities me ON mo.entity_id = me.id
        WHERE me.user_id = ? AND (me.project_id = ? OR (me.project_id IS NULL AND ? IS NULL))
      `).get(userId, projectId, projectId) as { count: number };

      // Check if summary is stale (if entity/obs counts changed)
      const isStale = summaryRow
        ? summaryRow.entityCount !== entityCountRow.count ||
          summaryRow.observationCount !== obsCountRow.count
        : true;

      res.json({
        summary: summaryRow?.summary || null,
        summaryGeneratedAt: summaryRow?.generatedAt || null,
        isStale,
        editCount: editCountRow.count,
        entityCount: entityCountRow.count,
        observationCount: obsCountRow.count,
      });
    } finally {
      db.close();
    }
  });

  /**
   * POST /api/memory/edit - Add a user edit
   */
  router.post('/edit', requireAuth, (req, res) => {
    const db = getDb();
    try {
      const userId = req.userId!;
      const { entityName, content, projectId } = req.body as {
        entityName: string;
        content: string;
        projectId?: string;
      };

      if (!entityName || !content) {
        return res.status(400).json({ error: 'entityName and content are required' });
      }

      const projId = projectId || null;
      const now = Date.now();

      // Check if entity exists
      const existingEntity = db.prepare(`
        SELECT id FROM memory_entities
        WHERE user_id = ? AND LOWER(name) = LOWER(?)
        AND (project_id = ? OR (project_id IS NULL AND ? IS NULL))
      `).get(userId, entityName, projId, projId) as { id: string } | undefined;

      let entityId: string;
      if (existingEntity) {
        entityId = existingEntity.id;
      } else {
        // Create entity
        entityId = crypto.randomUUID();
        db.prepare(`
          INSERT INTO memory_entities (id, user_id, project_id, name, entity_type, created_at)
          VALUES (?, ?, ?, ?, 'concept', ?)
        `).run(entityId, userId, projId, entityName, now);
      }

      // Check if observation already exists
      const existingObs = db.prepare(`
        SELECT id FROM memory_observations
        WHERE entity_id = ? AND LOWER(content) = LOWER(?)
      `).get(entityId, content);

      if (existingObs) {
        return res.status(400).json({ error: 'This memory already exists' });
      }

      // Add observation as user edit
      db.prepare(`
        INSERT INTO memory_observations (id, entity_id, content, created_at, is_user_edit)
        VALUES (?, ?, ?, ?, 1)
      `).run(crypto.randomUUID(), entityId, content, now);

      res.json({ success: true, entityName, content });
    } finally {
      db.close();
    }
  });

  /**
   * GET /api/memory/edits - List all user edits
   */
  router.get('/edits', requireAuth, (req, res) => {
    const db = getDb();
    try {
      const userId = req.userId!;
      const projectId = (req.query.projectId as string) || null;

      const edits = db.prepare(`
        SELECT me.name as entityName, mo.content as observation, mo.created_at as createdAt
        FROM memory_observations mo
        JOIN memory_entities me ON mo.entity_id = me.id
        WHERE me.user_id = ? AND mo.is_user_edit = 1
        AND (me.project_id = ? OR (me.project_id IS NULL AND ? IS NULL))
        ORDER BY mo.created_at DESC
      `).all(userId, projectId, projectId) as UserEdit[];

      res.json({
        edits: edits.map(e => ({
          entityName: e.entityName,
          observation: e.observation,
          createdAt: e.createdAt,
        })),
      });
    } finally {
      db.close();
    }
  });

  /**
   * DELETE /api/memory/edits/:entityName/:observation - Delete specific edit
   */
  router.delete('/edits/:entityName/:observation', requireAuth, (req, res) => {
    const db = getDb();
    try {
      const userId = req.userId!;
      const entityName = decodeURIComponent(req.params.entityName);
      const observation = decodeURIComponent(req.params.observation);
      const projectId = (req.query.projectId as string) || null;

      // Find the entity
      const entity = db.prepare(`
        SELECT id FROM memory_entities
        WHERE user_id = ? AND LOWER(name) = LOWER(?)
        AND (project_id = ? OR (project_id IS NULL AND ? IS NULL))
      `).get(userId, entityName, projectId, projectId) as { id: string } | undefined;

      if (!entity) {
        return res.status(404).json({ error: 'Entity not found' });
      }

      // Delete the observation
      const result = db.prepare(`
        DELETE FROM memory_observations
        WHERE entity_id = ? AND LOWER(content) = LOWER(?) AND is_user_edit = 1
      `).run(entity.id, observation);

      if (result.changes === 0) {
        return res.status(404).json({ error: 'Edit not found' });
      }

      res.json({ success: true });
    } finally {
      db.close();
    }
  });

  /**
   * DELETE /api/memory/edits - Clear all user edits
   */
  router.delete('/edits', requireAuth, (req, res) => {
    const db = getDb();
    try {
      const userId = req.userId!;
      const projectId = (req.query.projectId as string) || null;

      // Get entity IDs for this user/project
      const entities = db.prepare(`
        SELECT id FROM memory_entities
        WHERE user_id = ? AND (project_id = ? OR (project_id IS NULL AND ? IS NULL))
      `).all(userId, projectId, projectId) as { id: string }[];

      if (entities.length === 0) {
        return res.json({ success: true, deleted: 0 });
      }

      const entityIds = entities.map(e => e.id);
      const placeholders = entityIds.map(() => '?').join(',');

      const result = db.prepare(`
        DELETE FROM memory_observations
        WHERE entity_id IN (${placeholders}) AND is_user_edit = 1
      `).run(...entityIds);

      res.json({ success: true, deleted: result.changes });
    } finally {
      db.close();
    }
  });

  return router;
}
