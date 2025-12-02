/**
 * Memory Tools for Agent
 *
 * Tool definitions that the LLM can call to interact with user memory
 */

import Database from 'better-sqlite3';
import type { Tool } from './xero-tools.js';

// Database path for knowledge graph access
const DB_PATH = process.env.DATABASE_PATH || './data/pip.db';

export function createMemoryTools(): Tool[] {
  return [
    {
      name: "read_memory",
      description:
        "Read what you remember about this user from previous conversations. Use this when the user asks 'what do you know about me?', 'what have you remembered?', or wants to see their stored information. Returns entities, observations, and relationships from the knowledge graph.",
      parameters: {
        type: "object",
        properties: {
          projectId: {
            type: "string",
            description: "Optional project ID to scope the memory query",
          },
        },
      },
      execute: async (params, userId) => {
        const db = new Database(DB_PATH);
        try {
          const projectId = params.projectId || null;
          const scopeClause = projectId
            ? 'AND e.project_id = ?'
            : 'AND e.project_id IS NULL';
          const scopeParams = projectId ? [userId, projectId] : [userId];

          // Get entities with their observations
          const entities = db.prepare(`
            SELECT e.name, e.entity_type, GROUP_CONCAT(o.observation, '||') as observations
            FROM memory_entities e
            LEFT JOIN memory_observations o ON e.id = o.entity_id
            WHERE e.user_id = ? ${scopeClause}
            GROUP BY e.id
            ORDER BY e.created_at DESC
          `).all(...scopeParams) as { name: string; entity_type: string; observations: string | null }[];

          // Get relations
          const relations = db.prepare(`
            SELECT e1.name as from_name, r.relation_type, e2.name as to_name
            FROM memory_relations r
            JOIN memory_entities e1 ON r.from_entity_id = e1.id
            JOIN memory_entities e2 ON r.to_entity_id = e2.id
            WHERE r.user_id = ? ${scopeClause.replace(/e\./g, 'r.')}
            ORDER BY r.created_at DESC
          `).all(...scopeParams) as { from_name: string; relation_type: string; to_name: string }[];

          // Format response
          const formattedEntities = entities.map(e => ({
            name: e.name,
            type: e.entity_type,
            observations: e.observations ? e.observations.split('||') : [],
          }));

          const formattedRelations = relations.map(r => ({
            from: r.from_name,
            relationship: r.relation_type,
            to: r.to_name,
          }));

          return {
            entityCount: entities.length,
            relationCount: relations.length,
            entities: formattedEntities,
            relationships: formattedRelations,
            summary: entities.length === 0
              ? "I don't have any stored memories about you yet."
              : `I remember ${entities.length} things about you with ${relations.length} connections between them.`,
          };
        } finally {
          db.close();
        }
      },
    },
    {
      name: "search_memory",
      description:
        "Search your memory for specific information about the user. Use this when looking for particular facts, preferences, or context from previous conversations.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Search query to find relevant memories",
          },
          projectId: {
            type: "string",
            description: "Optional project ID to scope the search",
          },
        },
        required: ["query"],
      },
      execute: async (params, userId) => {
        const db = new Database(DB_PATH);
        try {
          const { query, projectId } = params;
          const searchTerm = `%${query.toLowerCase()}%`;
          const projId = projectId || null;

          const scopeClause = projId
            ? 'AND e.project_id = ?'
            : 'AND e.project_id IS NULL';
          const scopeParams = projId
            ? [userId, searchTerm, searchTerm, searchTerm, projId]
            : [userId, searchTerm, searchTerm, searchTerm];

          // Search entities and observations
          const results = db.prepare(`
            SELECT DISTINCT e.name, e.entity_type, o.observation
            FROM memory_entities e
            LEFT JOIN memory_observations o ON e.id = o.entity_id
            WHERE e.user_id = ?
            AND (LOWER(e.name) LIKE ? OR LOWER(e.entity_type) LIKE ? OR LOWER(o.observation) LIKE ?)
            ${scopeClause}
            ORDER BY e.created_at DESC
            LIMIT 20
          `).all(...scopeParams) as { name: string; entity_type: string; observation: string | null }[];

          // Group by entity
          const grouped = new Map<string, { type: string; observations: string[] }>();
          for (const r of results) {
            if (!grouped.has(r.name)) {
              grouped.set(r.name, { type: r.entity_type, observations: [] });
            }
            if (r.observation) {
              grouped.get(r.name)!.observations.push(r.observation);
            }
          }

          const matches = Array.from(grouped.entries()).map(([name, data]) => ({
            name,
            type: data.type,
            observations: data.observations,
          }));

          return {
            query,
            matchCount: matches.length,
            matches,
            summary: matches.length === 0
              ? `I couldn't find any memories matching "${query}".`
              : `Found ${matches.length} relevant memories for "${query}".`,
          };
        } finally {
          db.close();
        }
      },
    },
  ];
}
