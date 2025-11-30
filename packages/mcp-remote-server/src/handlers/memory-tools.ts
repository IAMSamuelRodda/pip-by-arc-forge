/**
 * Memory MCP Tool Handlers
 *
 * Aligned with Anthropic's MCP Memory Server tool naming.
 * 9 tools: create/delete entities/relations/observations, read_graph, search_nodes, open_nodes
 */

import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { getMemoryManager, type Entity, type Relation, type KnowledgeGraph } from "../services/memory.js";

// ============================================================================
// Tool Definitions
// ============================================================================

export const memoryToolDefinitions = [
  {
    category: "memory",
    name: "create_entities",
    description: `Create new entities in Pip's memory (people, organizations, concepts, etc.).
Use when the user mentions something worth remembering. Supports batch creation.`,
    inputSchema: {
      type: "object" as const,
      properties: {
        entities: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string", description: "Entity name (e.g., 'Acme Corp', 'John Smith')" },
              entityType: { type: "string", description: "Type: person, organization, project, concept, event, location" },
              observations: { type: "array", items: { type: "string" }, description: "Initial facts about this entity" },
            },
            required: ["name", "entityType"],
          },
          description: "Entities to create",
        },
      },
      required: ["entities"],
    },
  },
  {
    category: "memory",
    name: "create_relations",
    description: `Create relationships between entities (e.g., "works_at", "owns", "manages").
Both entities should exist first. Use active voice for relation types.`,
    inputSchema: {
      type: "object" as const,
      properties: {
        relations: {
          type: "array",
          items: {
            type: "object",
            properties: {
              from: { type: "string", description: "Source entity name" },
              to: { type: "string", description: "Target entity name" },
              relationType: { type: "string", description: "Relationship type in active voice (e.g., 'works_at', 'manages', 'owns')" },
            },
            required: ["from", "to", "relationType"],
          },
          description: "Relations to create",
        },
      },
      required: ["relations"],
    },
  },
  {
    category: "memory",
    name: "add_observations",
    description: `Add facts/observations to existing entities.
Use when the user shares new information about something Pip already knows.`,
    inputSchema: {
      type: "object" as const,
      properties: {
        observations: {
          type: "array",
          items: {
            type: "object",
            properties: {
              entityName: { type: "string", description: "Entity to add observations to" },
              contents: { type: "array", items: { type: "string" }, description: "Facts to add" },
            },
            required: ["entityName", "contents"],
          },
          description: "Observations to add",
        },
      },
      required: ["observations"],
    },
  },
  {
    category: "memory",
    name: "delete_entities",
    description: `Remove entities and all their observations. Use with caution.`,
    inputSchema: {
      type: "object" as const,
      properties: {
        entityNames: {
          type: "array",
          items: { type: "string" },
          description: "Names of entities to delete",
        },
      },
      required: ["entityNames"],
    },
  },
  {
    category: "memory",
    name: "delete_observations",
    description: `Remove specific observations from entities.`,
    inputSchema: {
      type: "object" as const,
      properties: {
        deletions: {
          type: "array",
          items: {
            type: "object",
            properties: {
              entityName: { type: "string", description: "Entity name" },
              observations: { type: "array", items: { type: "string" }, description: "Observations to remove" },
            },
            required: ["entityName", "observations"],
          },
          description: "Observations to delete",
        },
      },
      required: ["deletions"],
    },
  },
  {
    category: "memory",
    name: "delete_relations",
    description: `Remove relationships between entities.`,
    inputSchema: {
      type: "object" as const,
      properties: {
        relations: {
          type: "array",
          items: {
            type: "object",
            properties: {
              from: { type: "string" },
              to: { type: "string" },
              relationType: { type: "string" },
            },
            required: ["from", "to", "relationType"],
          },
          description: "Relations to delete",
        },
      },
      required: ["relations"],
    },
  },
  {
    category: "memory",
    name: "read_graph",
    description: `Read the entire knowledge graph for this user.
Use to get an overview of everything Pip remembers.`,
    inputSchema: {
      type: "object" as const,
      properties: {},
    },
  },
  {
    category: "memory",
    name: "search_nodes",
    description: `Search for entities by name or observation content.
ALWAYS call this before answering questions about the user's business, team, or goals.`,
    inputSchema: {
      type: "object" as const,
      properties: {
        query: { type: "string", description: "Search query" },
        limit: { type: "number", description: "Max results (default: 10)" },
      },
      required: ["query"],
    },
  },
  {
    category: "memory",
    name: "open_nodes",
    description: `Get specific entities by name with their relations.
Use when you need complete context about known entities.`,
    inputSchema: {
      type: "object" as const,
      properties: {
        names: {
          type: "array",
          items: { type: "string" },
          description: "Entity names to retrieve",
        },
      },
      required: ["names"],
    },
  },
];

// ============================================================================
// Formatting Helpers
// ============================================================================

function formatEntity(e: Entity): string {
  const obs = e.observations.length > 0
    ? `\n  Observations:\n${e.observations.map(o => `    - ${o}`).join("\n")}`
    : "";
  return `- **${e.name}** (${e.entityType})${obs}`;
}

function formatRelation(r: Relation): string {
  return `- ${r.from} → *${r.relationType}* → ${r.to}`;
}

function formatGraph(graph: KnowledgeGraph): string {
  if (graph.entities.length === 0 && graph.relations.length === 0) {
    return "No memories stored yet.";
  }

  let output = "";
  if (graph.entities.length > 0) {
    output += `**Entities (${graph.entities.length}):**\n${graph.entities.map(formatEntity).join("\n")}\n`;
  }
  if (graph.relations.length > 0) {
    output += `\n**Relations (${graph.relations.length}):**\n${graph.relations.map(formatRelation).join("\n")}`;
  }
  return output;
}

// ============================================================================
// Tool Execution
// ============================================================================

export function executeMemoryTool(
  userId: string,
  toolName: string,
  args: Record<string, unknown>,
  projectId?: string
): CallToolResult {
  try {
    const manager = getMemoryManager(userId, projectId);

    switch (toolName) {
      case "create_entities": {
        const { entities } = args as { entities: Entity[] };
        const created = manager.createEntities(entities);
        return {
          content: [{
            type: "text",
            text: `Created ${created.length} entities:\n${created.map(formatEntity).join("\n")}`,
          }],
        };
      }

      case "create_relations": {
        const { relations } = args as { relations: Relation[] };
        const created = manager.createRelations(relations);
        if (created.length === 0) {
          return {
            content: [{ type: "text", text: "No new relations created (may already exist or entities not found)." }],
          };
        }
        return {
          content: [{
            type: "text",
            text: `Created ${created.length} relations:\n${created.map(formatRelation).join("\n")}`,
          }],
        };
      }

      case "add_observations": {
        const { observations } = args as { observations: { entityName: string; contents: string[] }[] };
        const results = manager.addObservations(observations);
        if (results.length === 0) {
          return {
            content: [{ type: "text", text: "No observations added (entities not found or already exist)." }],
          };
        }
        const output = results.map(r => `**${r.entityName}**: ${r.added.length} added`).join("\n");
        return {
          content: [{ type: "text", text: `Added observations:\n${output}` }],
        };
      }

      case "delete_entities": {
        const { entityNames } = args as { entityNames: string[] };
        const deleted = manager.deleteEntities(entityNames);
        return {
          content: [{
            type: "text",
            text: deleted.length > 0
              ? `Deleted ${deleted.length} entities: ${deleted.join(", ")}`
              : "No entities found to delete.",
          }],
        };
      }

      case "delete_observations": {
        const { deletions } = args as { deletions: { entityName: string; observations: string[] }[] };
        const results = manager.deleteObservations(deletions);
        if (results.length === 0) {
          return {
            content: [{ type: "text", text: "No observations deleted." }],
          };
        }
        const output = results.map(r => `**${r.entityName}**: ${r.deleted.length} removed`).join("\n");
        return {
          content: [{ type: "text", text: `Deleted observations:\n${output}` }],
        };
      }

      case "delete_relations": {
        const { relations } = args as { relations: Relation[] };
        const deleted = manager.deleteRelations(relations);
        return {
          content: [{
            type: "text",
            text: deleted.length > 0
              ? `Deleted ${deleted.length} relations:\n${deleted.map(formatRelation).join("\n")}`
              : "No relations found to delete.",
          }],
        };
      }

      case "read_graph": {
        const graph = manager.readGraph();
        return {
          content: [{ type: "text", text: formatGraph(graph) }],
        };
      }

      case "search_nodes": {
        const { query, limit } = args as { query: string; limit?: number };
        const entities = manager.searchNodes(query, limit || 10);
        if (entities.length === 0) {
          return {
            content: [{ type: "text", text: `No memories found matching "${query}".` }],
          };
        }
        return {
          content: [{
            type: "text",
            text: `**Search results for "${query}":**\n${entities.map(formatEntity).join("\n")}`,
          }],
        };
      }

      case "open_nodes": {
        const { names } = args as { names: string[] };
        const graph = manager.openNodes(names);
        if (graph.entities.length === 0) {
          return {
            content: [{ type: "text", text: `No entities found: ${names.join(", ")}` }],
          };
        }
        return {
          content: [{ type: "text", text: formatGraph(graph) }],
        };
      }

      default:
        return {
          content: [{ type: "text", text: `Unknown memory tool: ${toolName}` }],
          isError: true,
        };
    }
  } catch (error) {
    console.error(`Memory tool error (${toolName}):`, error);
    return {
      content: [{
        type: "text",
        text: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      }],
      isError: true,
    };
  }
}
