/**
 * Memory MCP Tool Handlers
 *
 * Aligned with Anthropic's MCP Memory Server tool naming.
 * 9 tools: create/delete entities/relations/observations, read_graph, search_nodes, open_nodes
 */

import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { ProviderToolDefinition } from "../types/tools.js";
import { getMemoryManager, type Entity, type Relation, type KnowledgeGraph } from "../services/memory.js";

// ============================================================================
// Tool Definitions
// ============================================================================

export const memoryToolDefinitions: ProviderToolDefinition[] = [
  {
    provider: "system",
    providerType: "system",
    category: "memory",
    name: "create_entities",
    shortName: "create_entities",
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
    provider: "system",
    providerType: "system",
    category: "memory",
    name: "create_relations",
    shortName: "create_relations",
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
    provider: "system",
    providerType: "system",
    category: "memory",
    name: "add_observations",
    shortName: "add_observations",
    description: `Add facts/observations to existing entities.
Use when the user shares new information about something Pip already knows.
Set isUserEdit=true when user explicitly asks to remember something ("remember that...", "note that...").`,
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
        isUserEdit: {
          type: "boolean",
          description: "True if user explicitly requested this memory (e.g., 'remember that...'). Default: false",
        },
      },
      required: ["observations"],
    },
  },
  {
    provider: "system",
    providerType: "system",
    category: "memory",
    name: "delete_entities",
    shortName: "delete_entities",
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
    provider: "system",
    providerType: "system",
    category: "memory",
    name: "delete_observations",
    shortName: "delete_observations",
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
    provider: "system",
    providerType: "system",
    category: "memory",
    name: "delete_relations",
    shortName: "delete_relations",
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
    provider: "system",
    providerType: "system",
    category: "memory",
    name: "read_graph",
    shortName: "read_graph",
    description: `Read the entire knowledge graph for this user.
Use to get an overview of everything Pip remembers.`,
    inputSchema: {
      type: "object" as const,
      properties: {},
    },
  },
  {
    provider: "system",
    providerType: "system",
    category: "memory",
    name: "search_nodes",
    shortName: "search_nodes",
    description: `Search for entities by name or observation content.
ALWAYS call this before answering questions about the user's business, team, or goals.
Optionally search across multiple projects for comparison (user must own all projects).`,
    inputSchema: {
      type: "object" as const,
      properties: {
        query: { type: "string", description: "Search query" },
        limit: { type: "number", description: "Max results per project (default: 10)" },
        projectIds: {
          type: "array",
          items: { type: "string" },
          description: "Optional: Search across these projects (user must own all). Omit for current project only. Max 5 projects.",
        },
      },
      required: ["query"],
    },
  },
  {
    provider: "system",
    providerType: "system",
    category: "memory",
    name: "open_nodes",
    shortName: "open_nodes",
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
  {
    provider: "system",
    providerType: "system",
    category: "memory",
    name: "get_memory_summary",
    shortName: "get_memory_summary",
    description: `Get a prose summary of what Pip remembers about the user.
Returns cached summary if available, or indicates if regeneration is needed.
Use when user asks "what do you remember about me?" or opens memory settings.`,
    inputSchema: {
      type: "object" as const,
      properties: {},
    },
  },
  {
    provider: "system",
    providerType: "system",
    category: "memory",
    name: "save_memory_summary",
    shortName: "save_memory_summary",
    description: `Save a prose summary of the user's memory graph.
Call this after generating a summary from read_graph to cache it for the UI.
The summary should be a readable narrative about the user/business.`,
    inputSchema: {
      type: "object" as const,
      properties: {
        summary: {
          type: "string",
          description: "Prose summary of the memory graph (2-5 paragraphs)",
        },
      },
      required: ["summary"],
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
        const { observations, isUserEdit } = args as {
          observations: { entityName: string; contents: string[] }[];
          isUserEdit?: boolean;
        };
        const results = manager.addObservations(observations, isUserEdit || false);
        if (results.length === 0) {
          return {
            content: [{ type: "text", text: "No observations added (entities not found or already exist)." }],
          };
        }
        const editLabel = isUserEdit ? " (user edit)" : "";
        const output = results.map(r => `**${r.entityName}**: ${r.added.length} added${editLabel}`).join("\n");
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
        const { query, limit, projectIds } = args as {
          query: string;
          limit?: number;
          projectIds?: string[];
        };

        // Single project search (default behavior)
        if (!projectIds || projectIds.length === 0) {
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

        // Cross-project search (POC)
        // Validation: max 5 projects
        if (projectIds.length > 5) {
          return {
            content: [{
              type: "text",
              text: `Error: Maximum 5 projects per cross-project query. You requested ${projectIds.length}.`,
            }],
            isError: true,
          };
        }

        // TODO: Validate user owns all projectIds (requires DB access to projects table)
        // For POC, we proceed with the search - ownership validation will be added
        // when projects feature is implemented (Epic 2.3)

        // Search across all specified projects
        const crossProjectResults: {
          projectId: string;
          entities: Entity[];
        }[] = [];
        let totalResults = 0;

        for (const projId of projectIds) {
          const projManager = getMemoryManager(userId, projId);
          const entities = projManager.searchNodes(query, limit || 10);
          crossProjectResults.push({
            projectId: projId,
            entities,
          });
          totalResults += entities.length;
        }

        // Format cross-project results
        if (totalResults === 0) {
          return {
            content: [{
              type: "text",
              text: `No memories found matching "${query}" across ${projectIds.length} projects.`,
            }],
          };
        }

        let output = `**Cross-Project Search: "${query}"**\n`;
        output += `_Searched ${projectIds.length} projects, found ${totalResults} results_\n\n`;

        for (const result of crossProjectResults) {
          output += `### Project: ${result.projectId}\n`;
          if (result.entities.length === 0) {
            output += `_No matches_\n\n`;
          } else {
            output += result.entities.map(formatEntity).join("\n") + "\n\n";
          }
        }

        return {
          content: [{ type: "text", text: output }],
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

      case "get_memory_summary": {
        const cached = manager.getSummary();
        const isStale = manager.isSummaryStale();
        const userEditCount = manager.getUserEditCount();

        if (!cached) {
          const graph = manager.readGraph();
          if (graph.entities.length === 0) {
            return {
              content: [{
                type: "text",
                text: "No memories stored yet. I haven't learned anything about you.",
              }],
            };
          }
          return {
            content: [{
              type: "text",
              text: `**Summary not yet generated.**\n\nI have ${graph.entities.length} entities with ${graph.entities.reduce((s, e) => s + e.observations.length, 0)} observations stored.\n\nTo generate a summary, call \`read_graph\` to see the full memory, then call \`save_memory_summary\` with a prose summary.`,
            }],
          };
        }

        const staleNote = isStale
          ? "\n\n_Note: Memory has changed since this summary was generated. Consider regenerating._"
          : "";
        const editNote = userEditCount > 0
          ? `\n\n_${userEditCount} user edit(s) tracked._`
          : "";

        return {
          content: [{
            type: "text",
            text: `**Memory Summary**\n\n${cached.summary}${editNote}${staleNote}\n\n_Last updated: ${new Date(cached.generatedAt).toLocaleString()}_`,
          }],
        };
      }

      case "save_memory_summary": {
        const { summary } = args as { summary: string };
        if (!summary || summary.trim().length < 10) {
          return {
            content: [{
              type: "text",
              text: "Error: Summary must be at least 10 characters.",
            }],
            isError: true,
          };
        }
        manager.saveSummary(summary.trim());
        return {
          content: [{
            type: "text",
            text: "Memory summary saved successfully.",
          }],
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
