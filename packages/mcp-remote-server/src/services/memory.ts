/**
 * Memory Service - Knowledge Graph Implementation
 *
 * Modeled after Anthropic's MCP Memory Server (~350 lines target).
 * Uses SQLite for multi-tenant reliability with user/project isolation.
 *
 * Data Model:
 * - Entities: Named nodes with type (person, organization, project, concept, etc.)
 * - Observations: Facts/notes attached to entities
 * - Relations: Directed edges between entities (e.g., "works_at", "owns")
 */

import Database from "better-sqlite3";

// ============================================================================
// Types
// ============================================================================

export interface Entity {
  name: string;
  entityType: string;
  observations: string[];
}

export interface Relation {
  from: string;
  to: string;
  relationType: string;
}

export interface KnowledgeGraph {
  entities: Entity[];
  relations: Relation[];
}

interface DbEntity {
  id: string;
  user_id: string;
  project_id: string | null;
  name: string;
  entity_type: string;
  created_at: number;
}

interface DbRelation {
  id: string;
  user_id: string;
  project_id: string | null;
  from_entity: string;
  to_entity: string;
  relation_type: string;
  created_at: number;
}

// ============================================================================
// Knowledge Graph Manager
// ============================================================================

export class KnowledgeGraphManager {
  private db: Database.Database;
  private userId: string;
  private projectId: string | null;

  constructor(db: Database.Database, userId: string, projectId?: string) {
    this.db = db;
    this.userId = userId;
    this.projectId = projectId || null;
  }

  private scopeParams(base: unknown[]): unknown[] {
    return this.projectId ? [...base, this.projectId] : base;
  }

  private scopeClause(): string {
    return this.projectId ? "AND project_id = ?" : "AND project_id IS NULL";
  }

  // --------------------------------------------------------------------------
  // Write Operations
  // --------------------------------------------------------------------------

  createEntities(entities: Entity[]): Entity[] {
    const created: Entity[] = [];
    const now = Date.now();

    for (const entity of entities) {
      const existing = this.db.prepare(`
        SELECT id FROM memory_entities
        WHERE user_id = ? AND LOWER(name) = LOWER(?) ${this.scopeClause()}
      `).get(...this.scopeParams([this.userId, entity.name])) as { id: string } | undefined;

      let entityId: string;
      if (existing) {
        entityId = existing.id;
      } else {
        entityId = crypto.randomUUID();
        this.db.prepare(`
          INSERT INTO memory_entities (id, user_id, project_id, name, entity_type, created_at)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(entityId, this.userId, this.projectId, entity.name, entity.entityType, now);
      }

      // Add observations (skip duplicates)
      for (const obs of entity.observations || []) {
        const obsExists = this.db.prepare(
          `SELECT id FROM memory_observations WHERE entity_id = ? AND LOWER(content) = LOWER(?)`
        ).get(entityId, obs);
        if (!obsExists) {
          this.db.prepare(`
            INSERT INTO memory_observations (id, entity_id, content, created_at) VALUES (?, ?, ?, ?)
          `).run(crypto.randomUUID(), entityId, obs, now);
        }
      }
      created.push(entity);
    }
    return created;
  }

  createRelations(relations: Relation[]): Relation[] {
    const created: Relation[] = [];
    const now = Date.now();

    for (const rel of relations) {
      const existing = this.db.prepare(`
        SELECT id FROM memory_relations
        WHERE user_id = ? AND LOWER(from_entity) = LOWER(?) AND LOWER(to_entity) = LOWER(?)
        AND LOWER(relation_type) = LOWER(?) ${this.scopeClause()}
      `).get(...this.scopeParams([this.userId, rel.from, rel.to, rel.relationType]));

      if (!existing) {
        this.db.prepare(`
          INSERT INTO memory_relations (id, user_id, project_id, from_entity, to_entity, relation_type, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(crypto.randomUUID(), this.userId, this.projectId, rel.from, rel.to, rel.relationType, now);
        created.push(rel);
      }
    }
    return created;
  }

  addObservations(observations: { entityName: string; contents: string[] }[]): { entityName: string; added: string[] }[] {
    const results: { entityName: string; added: string[] }[] = [];
    const now = Date.now();

    for (const { entityName, contents } of observations) {
      const entity = this.db.prepare(`
        SELECT id FROM memory_entities WHERE user_id = ? AND LOWER(name) = LOWER(?) ${this.scopeClause()}
      `).get(...this.scopeParams([this.userId, entityName])) as { id: string } | undefined;

      if (!entity) continue;

      const added: string[] = [];
      for (const content of contents) {
        const exists = this.db.prepare(
          `SELECT id FROM memory_observations WHERE entity_id = ? AND LOWER(content) = LOWER(?)`
        ).get(entity.id, content);
        if (!exists) {
          this.db.prepare(
            `INSERT INTO memory_observations (id, entity_id, content, created_at) VALUES (?, ?, ?, ?)`
          ).run(crypto.randomUUID(), entity.id, content, now);
          added.push(content);
        }
      }
      if (added.length > 0) results.push({ entityName, added });
    }
    return results;
  }

  deleteEntities(entityNames: string[]): string[] {
    const deleted: string[] = [];
    for (const name of entityNames) {
      const result = this.db.prepare(`
        DELETE FROM memory_entities WHERE user_id = ? AND LOWER(name) = LOWER(?) ${this.scopeClause()}
      `).run(...this.scopeParams([this.userId, name]));

      if (result.changes > 0) {
        // Cascade: delete relations involving this entity
        this.db.prepare(`
          DELETE FROM memory_relations
          WHERE user_id = ? AND (LOWER(from_entity) = LOWER(?) OR LOWER(to_entity) = LOWER(?)) ${this.scopeClause()}
        `).run(...this.scopeParams([this.userId, name, name]));
        deleted.push(name);
      }
    }
    return deleted;
  }

  deleteObservations(deletions: { entityName: string; observations: string[] }[]): { entityName: string; deleted: string[] }[] {
    const results: { entityName: string; deleted: string[] }[] = [];
    for (const { entityName, observations } of deletions) {
      const entity = this.db.prepare(`
        SELECT id FROM memory_entities WHERE user_id = ? AND LOWER(name) = LOWER(?) ${this.scopeClause()}
      `).get(...this.scopeParams([this.userId, entityName])) as { id: string } | undefined;

      if (!entity) continue;

      const deleted: string[] = [];
      for (const obs of observations) {
        const result = this.db.prepare(
          `DELETE FROM memory_observations WHERE entity_id = ? AND LOWER(content) = LOWER(?)`
        ).run(entity.id, obs);
        if (result.changes > 0) deleted.push(obs);
      }
      if (deleted.length > 0) results.push({ entityName, deleted });
    }
    return results;
  }

  deleteRelations(relations: Relation[]): Relation[] {
    const deleted: Relation[] = [];
    for (const rel of relations) {
      const result = this.db.prepare(`
        DELETE FROM memory_relations
        WHERE user_id = ? AND LOWER(from_entity) = LOWER(?) AND LOWER(to_entity) = LOWER(?)
        AND LOWER(relation_type) = LOWER(?) ${this.scopeClause()}
      `).run(...this.scopeParams([this.userId, rel.from, rel.to, rel.relationType]));
      if (result.changes > 0) deleted.push(rel);
    }
    return deleted;
  }

  // --------------------------------------------------------------------------
  // Read Operations
  // --------------------------------------------------------------------------

  readGraph(): KnowledgeGraph {
    const entityRows = this.db.prepare(`
      SELECT e.*, GROUP_CONCAT(o.content, '||') as observations
      FROM memory_entities e
      LEFT JOIN memory_observations o ON e.id = o.entity_id
      WHERE e.user_id = ? ${this.scopeClause()}
      GROUP BY e.id ORDER BY e.created_at DESC
    `).all(...this.scopeParams([this.userId])) as (DbEntity & { observations: string | null })[];

    const entities: Entity[] = entityRows.map(r => ({
      name: r.name,
      entityType: r.entity_type,
      observations: r.observations ? r.observations.split("||") : [],
    }));

    const relationRows = this.db.prepare(`
      SELECT * FROM memory_relations WHERE user_id = ? ${this.scopeClause()} ORDER BY created_at DESC
    `).all(...this.scopeParams([this.userId])) as DbRelation[];

    const relations: Relation[] = relationRows.map(r => ({
      from: r.from_entity,
      to: r.to_entity,
      relationType: r.relation_type,
    }));

    return { entities, relations };
  }

  searchNodes(query: string, limit = 10): Entity[] {
    const q = query.toLowerCase();
    const words = q.split(/\s+/).filter(w => w.length > 2);

    const rows = this.db.prepare(`
      SELECT e.*, GROUP_CONCAT(o.content, '||') as observations
      FROM memory_entities e
      LEFT JOIN memory_observations o ON e.id = o.entity_id
      WHERE e.user_id = ? ${this.scopeClause()}
      GROUP BY e.id
    `).all(...this.scopeParams([this.userId])) as (DbEntity & { observations: string | null })[];

    const scored = rows.map(r => {
      const name = r.name.toLowerCase();
      const type = r.entity_type.toLowerCase();
      const obs = (r.observations || "").toLowerCase();
      let score = 0;
      if (name.includes(q)) score += 10;
      if (type.includes(q)) score += 5;
      if (obs.includes(q)) score += 8;
      for (const w of words) {
        if (name.includes(w)) score += 3;
        if (obs.includes(w)) score += 2;
      }
      return { r, score };
    });

    return scored
      .filter(s => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(s => ({
        name: s.r.name,
        entityType: s.r.entity_type,
        observations: s.r.observations ? s.r.observations.split("||") : [],
      }));
  }

  openNodes(names: string[]): KnowledgeGraph {
    const entities: Entity[] = [];
    const relSet = new Set<string>();
    const relations: Relation[] = [];

    for (const name of names) {
      const row = this.db.prepare(`
        SELECT e.*, GROUP_CONCAT(o.content, '||') as observations
        FROM memory_entities e
        LEFT JOIN memory_observations o ON e.id = o.entity_id
        WHERE e.user_id = ? AND LOWER(e.name) = LOWER(?) ${this.scopeClause()}
        GROUP BY e.id
      `).get(...this.scopeParams([this.userId, name])) as (DbEntity & { observations: string | null }) | undefined;

      if (row) {
        entities.push({
          name: row.name,
          entityType: row.entity_type,
          observations: row.observations ? row.observations.split("||") : [],
        });

        const rels = this.db.prepare(`
          SELECT * FROM memory_relations
          WHERE user_id = ? AND (LOWER(from_entity) = LOWER(?) OR LOWER(to_entity) = LOWER(?)) ${this.scopeClause()}
        `).all(...this.scopeParams([this.userId, name, name])) as DbRelation[];

        for (const rel of rels) {
          const key = `${rel.from_entity}|${rel.relation_type}|${rel.to_entity}`;
          if (!relSet.has(key)) {
            relSet.add(key);
            relations.push({ from: rel.from_entity, to: rel.to_entity, relationType: rel.relation_type });
          }
        }
      }
    }
    return { entities, relations };
  }
}

// ============================================================================
// Database Initialization
// ============================================================================

let dbInstance: Database.Database | null = null;

export function initializeMemoryDb(dbPath?: string): Database.Database {
  if (dbInstance) return dbInstance;

  const path = dbPath || process.env.DATABASE_PATH || "./data/pip.db";
  dbInstance = new Database(path);
  dbInstance.pragma("journal_mode = WAL");
  dbInstance.pragma("foreign_keys = ON");

  dbInstance.exec(`
    CREATE TABLE IF NOT EXISTS memory_entities (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      project_id TEXT,
      name TEXT NOT NULL,
      entity_type TEXT NOT NULL DEFAULT 'concept',
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_mem_ent_user ON memory_entities(user_id);
    CREATE INDEX IF NOT EXISTS idx_mem_ent_proj ON memory_entities(user_id, project_id);

    CREATE TABLE IF NOT EXISTS memory_observations (
      id TEXT PRIMARY KEY,
      entity_id TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (entity_id) REFERENCES memory_entities(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_mem_obs_ent ON memory_observations(entity_id);

    CREATE TABLE IF NOT EXISTS memory_relations (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      project_id TEXT,
      from_entity TEXT NOT NULL,
      to_entity TEXT NOT NULL,
      relation_type TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_mem_rel_user ON memory_relations(user_id);
    CREATE INDEX IF NOT EXISTS idx_mem_rel_proj ON memory_relations(user_id, project_id);
  `);

  console.log(`[Memory] Initialized: ${path}`);
  return dbInstance;
}

export function getMemoryManager(userId: string, projectId?: string): KnowledgeGraphManager {
  const db = initializeMemoryDb();
  return new KnowledgeGraphManager(db, userId, projectId);
}

export function closeMemoryDb(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}
