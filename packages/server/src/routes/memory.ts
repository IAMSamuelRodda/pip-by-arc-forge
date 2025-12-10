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
const DB_PATH = process.env.DATABASE_PATH || './data/pip.db';

interface UserEdit {
  entityName: string;
  observation: string;
  createdAt: number;
}

function getDb(): Database.Database {
  return new Database(DB_PATH);
}

// Run schema migrations on module load
function runMigrations(): void {
  const db = getDb();
  try {
    // Add project_id to memory_entities if missing
    try {
      db.exec('ALTER TABLE memory_entities ADD COLUMN project_id TEXT');
      console.log('✅ Added project_id to memory_entities');
    } catch {
      // Column already exists
    }

    // Add project_id to memory_relations if missing
    try {
      db.exec('ALTER TABLE memory_relations ADD COLUMN project_id TEXT');
      console.log('✅ Added project_id to memory_relations');
    } catch {
      // Column already exists
    }

    // Create memory_summaries table if missing
    db.exec(`
      CREATE TABLE IF NOT EXISTS memory_summaries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        project_id TEXT,
        summary TEXT NOT NULL,
        entity_count INTEGER NOT NULL,
        observation_count INTEGER NOT NULL,
        generated_at INTEGER NOT NULL,
        UNIQUE(user_id, project_id)
      )
    `);

    // Add is_user_edit to memory_observations if missing
    try {
      db.exec('ALTER TABLE memory_observations ADD COLUMN is_user_edit INTEGER DEFAULT 0');
      console.log('✅ Added is_user_edit to memory_observations');
    } catch {
      // Column already exists
    }
  } finally {
    db.close();
  }
}

// Run migrations when module loads
runMigrations();

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

      // Build scope clause for project isolation
      const scopeClause = projectId
        ? 'AND me.project_id = ?'
        : 'AND me.project_id IS NULL';
      const scopeParams = projectId ? [userId, projectId] : [userId];

      // Get summary (if exists)
      const summaryRow = db.prepare(`
        SELECT summary, entity_count, observation_count, generated_at as generatedAt
        FROM memory_summaries
        WHERE user_id = ? AND ${projectId ? 'project_id = ?' : 'project_id IS NULL'}
      `).get(...scopeParams) as { summary: string; entity_count: number; observation_count: number; generatedAt: number } | undefined;

      // Get edit count (user edits only)
      const editCountRow = db.prepare(`
        SELECT COUNT(*) as count
        FROM memory_observations mo
        JOIN memory_entities me ON mo.entity_id = me.id
        WHERE me.user_id = ? AND mo.is_user_edit = 1 ${scopeClause}
      `).get(...scopeParams) as { count: number };

      // Get entity count
      const entityCountRow = db.prepare(`
        SELECT COUNT(*) as count FROM memory_entities me
        WHERE me.user_id = ? ${scopeClause}
      `).get(...scopeParams) as { count: number };

      // Get observation count
      const obsCountRow = db.prepare(`
        SELECT COUNT(*) as count
        FROM memory_observations mo
        JOIN memory_entities me ON mo.entity_id = me.id
        WHERE me.user_id = ? ${scopeClause}
      `).get(...scopeParams) as { count: number };

      // Check if summary is stale
      const isStale = summaryRow
        ? summaryRow.entity_count !== entityCountRow.count ||
          summaryRow.observation_count !== obsCountRow.count
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
          INSERT INTO memory_entities (id, user_id, project_id, name, entity_type, created_at, updated_at)
          VALUES (?, ?, ?, ?, 'concept', ?, ?)
        `).run(entityId, userId, projId, entityName, now, now);
      }

      // Check if observation already exists
      const existingObs = db.prepare(`
        SELECT id FROM memory_observations
        WHERE entity_id = ? AND LOWER(observation) = LOWER(?)
      `).get(entityId, content);

      if (existingObs) {
        return res.status(400).json({ error: 'This memory already exists' });
      }

      // Add observation as user edit
      db.prepare(`
        INSERT INTO memory_observations (id, entity_id, observation, created_at, updated_at, is_user_edit)
        VALUES (?, ?, ?, ?, ?, 1)
      `).run(crypto.randomUUID(), entityId, content, now, now);

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
        SELECT me.name as entityName, mo.observation as observation, mo.created_at as createdAt
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
        WHERE entity_id = ? AND LOWER(observation) = LOWER(?) AND is_user_edit = 1
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

  /**
   * POST /api/memory/summary/generate - Generate a new summary using Claude
   */
  router.post('/summary/generate', requireAuth, async (req, res) => {
    const db = getDb();
    try {
      const userId = req.userId!;
      const projectId = (req.body.projectId as string) || null;

      // Build scope clause for project isolation
      const scopeClause = projectId
        ? 'AND me.project_id = ?'
        : 'AND me.project_id IS NULL';
      const scopeParams = projectId ? [userId, projectId] : [userId];

      // Get all entities with observations
      const entities = db.prepare(`
        SELECT me.name, me.entity_type, GROUP_CONCAT(mo.observation, '||') as observations
        FROM memory_entities me
        LEFT JOIN memory_observations mo ON me.id = mo.entity_id
        WHERE me.user_id = ? ${scopeClause}
        GROUP BY me.id
        ORDER BY me.created_at DESC
      `).all(...scopeParams) as { name: string; entity_type: string; observations: string | null }[];

      // Get relations
      const relations = db.prepare(`
        SELECT e1.name as from_name, mr.relation_type, e2.name as to_name
        FROM memory_relations mr
        JOIN memory_entities e1 ON mr.from_entity_id = e1.id
        JOIN memory_entities e2 ON mr.to_entity_id = e2.id
        WHERE mr.user_id = ? ${scopeClause.replace(/me\./g, 'mr.')}
      `).all(...scopeParams) as { from_name: string; relation_type: string; to_name: string }[];

      if (entities.length === 0) {
        return res.status(400).json({ error: 'No memories to summarise' });
      }

      // Build knowledge graph text for Claude
      let graphText = 'ENTITIES:\n';
      let totalObservations = 0;
      for (const e of entities) {
        const obs = e.observations ? e.observations.split('||') : [];
        totalObservations += obs.length;
        graphText += `\n${e.name} (${e.entity_type}):\n`;
        for (const o of obs) {
          graphText += `  - ${o}\n`;
        }
      }

      if (relations.length > 0) {
        graphText += '\nRELATIONS:\n';
        for (const r of relations) {
          graphText += `  ${r.from_name} → ${r.relation_type} → ${r.to_name}\n`;
        }
      }

      // Call Claude to generate summary
      const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
      if (!anthropicApiKey) {
        return res.status(500).json({ error: 'Anthropic API key not configured' });
      }

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': anthropicApiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-3-5-haiku-20241022',
          max_tokens: 500,
          messages: [
            {
              role: 'user',
              content: `You are Pip, a friendly AI bookkeeping assistant. Below is a knowledge graph of what you remember about a user. Write a brief, friendly summary (2-4 sentences) of what you know about them. Use second person ("You..."). Be warm but concise. Don't list everything - just capture the key facts.

${graphText}

Write only the summary, nothing else.`,
            },
          ],
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('Claude API error:', error);
        return res.status(500).json({ error: 'Failed to generate summary' });
      }

      const result = await response.json() as { content: Array<{ type: string; text: string }> };
      const summary = result.content[0]?.text?.trim();

      if (!summary) {
        return res.status(500).json({ error: 'Empty summary generated' });
      }

      // Save summary to database
      const now = Date.now();
      const existingSummary = db.prepare(`
        SELECT id FROM memory_summaries
        WHERE user_id = ? AND ${projectId ? 'project_id = ?' : 'project_id IS NULL'}
      `).get(...scopeParams) as { id: number } | undefined;

      if (existingSummary) {
        db.prepare(`
          UPDATE memory_summaries
          SET summary = ?, entity_count = ?, observation_count = ?, generated_at = ?
          WHERE id = ?
        `).run(summary, entities.length, totalObservations, now, existingSummary.id);
      } else {
        db.prepare(`
          INSERT INTO memory_summaries (user_id, project_id, summary, entity_count, observation_count, generated_at)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(userId, projectId, summary, entities.length, totalObservations, now);
      }

      res.json({
        success: true,
        summary,
        entityCount: entities.length,
        observationCount: totalObservations,
        generatedAt: now,
      });
    } catch (error) {
      console.error('Summary generation error:', error);
      res.status(500).json({ error: 'Failed to generate summary' });
    } finally {
      db.close();
    }
  });

  return router;
}
