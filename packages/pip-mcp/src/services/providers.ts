/**
 * Provider Registry and Resolution Service
 *
 * Manages provider definitions, connection status, and tool name resolution.
 * Supports smart shorthand (unqualified names when unambiguous).
 */

import type {
  ProviderInfo,
  ProviderType,
  ProviderToolDefinition,
  ToolResolutionResult,
} from "../types/tools.js";
import { parseToolName } from "../types/tools.js";
import { createDatabaseProvider, type DatabaseProvider } from "@pip/core";

// Database initialization
const dbPath = process.env.DATABASE_PATH || "./data/pip.db";
let db: DatabaseProvider;

async function getDb(): Promise<DatabaseProvider> {
  if (!db) {
    db = await createDatabaseProvider({
      provider: "sqlite",
      connection: { type: "sqlite", filename: dbPath },
    });
  }
  return db;
}

/**
 * Static provider definitions
 * Add new providers here as they're implemented
 */
export const PROVIDERS: Record<string, ProviderInfo> = {
  // Accounting providers
  xero: {
    id: "xero",
    type: "accounting",
    displayName: "Xero",
    connectorKey: "xero",
    implemented: true,
  },
  myob: {
    id: "myob",
    type: "accounting",
    displayName: "MYOB",
    connectorKey: "myob",
    implemented: false,
  },
  quickbooks: {
    id: "quickbooks",
    type: "accounting",
    displayName: "QuickBooks",
    connectorKey: "quickbooks",
    implemented: false,
  },

  // Spreadsheet providers
  google_sheets: {
    id: "google_sheets",
    type: "spreadsheet",
    displayName: "Google Sheets",
    connectorKey: "google_sheets",
    implemented: true,
  },
  nextcloud: {
    id: "nextcloud",
    type: "spreadsheet",
    displayName: "Nextcloud",
    connectorKey: "nextcloud",
    implemented: false,
  },

  // Email providers
  gmail: {
    id: "gmail",
    type: "email",
    displayName: "Gmail",
    connectorKey: "gmail",
    implemented: true,
  },
  outlook: {
    id: "outlook",
    type: "email",
    displayName: "Outlook",
    connectorKey: "outlook",
    implemented: false,
  },

  // Task providers
  todoist: {
    id: "todoist",
    type: "tasks",
    displayName: "Todoist",
    connectorKey: "todoist",
    implemented: false,
  },
  joplin: {
    id: "joplin",
    type: "tasks",
    displayName: "Joplin",
    connectorKey: "joplin",
    implemented: false,
  },
};

/**
 * System provider (for help, memory tools)
 */
export const SYSTEM_PROVIDER: ProviderInfo = {
  id: "system",
  type: "system",
  displayName: "System",
  connectorKey: "system",
  implemented: true,
};

/**
 * Get all implemented providers
 */
export function getImplementedProviders(): ProviderInfo[] {
  return Object.values(PROVIDERS).filter((p) => p.implemented);
}

/**
 * Get providers by type
 */
export function getProvidersByType(type: ProviderType): ProviderInfo[] {
  return Object.values(PROVIDERS).filter((p) => p.type === type);
}

/**
 * Get connected providers for a user
 * Returns list of provider IDs that have valid OAuth tokens
 */
export async function getConnectedProviders(userId: string): Promise<string[]> {
  const database = await getDb();
  const connected: string[] = [];

  for (const provider of getImplementedProviders()) {
    const tokens = await database.getOAuthTokens(userId, provider.connectorKey);
    if (tokens) {
      connected.push(provider.id);
    }
  }

  return connected;
}

/**
 * Check if a specific provider is connected for a user
 */
export async function isProviderConnected(
  userId: string,
  providerId: string
): Promise<boolean> {
  const provider = PROVIDERS[providerId];
  if (!provider || !provider.implemented) {
    return false;
  }

  const database = await getDb();
  const tokens = await database.getOAuthTokens(userId, provider.connectorKey);
  return tokens !== null;
}

/**
 * Get provider info by ID
 */
export function getProviderInfo(providerId: string): ProviderInfo | undefined {
  if (providerId === "system") {
    return SYSTEM_PROVIDER;
  }
  return PROVIDERS[providerId];
}

/**
 * Build tool index for fast lookup
 */
export interface ToolIndex {
  byFullName: Map<string, ProviderToolDefinition>;
  byShortName: Map<string, ProviderToolDefinition[]>;
  byProvider: Map<string, ProviderToolDefinition[]>;
  byCategory: Map<string, ProviderToolDefinition[]>;
}

export function buildToolIndex(tools: ProviderToolDefinition[]): ToolIndex {
  const index: ToolIndex = {
    byFullName: new Map(),
    byShortName: new Map(),
    byProvider: new Map(),
    byCategory: new Map(),
  };

  for (const tool of tools) {
    // Index by full name
    index.byFullName.set(tool.name, tool);

    // Index by short name (may have multiple with same short name)
    const shortNameTools = index.byShortName.get(tool.shortName) || [];
    shortNameTools.push(tool);
    index.byShortName.set(tool.shortName, shortNameTools);

    // Index by provider
    const providerTools = index.byProvider.get(tool.provider) || [];
    providerTools.push(tool);
    index.byProvider.set(tool.provider, providerTools);

    // Index by category (namespaced: "xero:invoices")
    const categoryKey =
      tool.provider === "system"
        ? tool.category
        : `${tool.provider}:${tool.category}`;
    const categoryTools = index.byCategory.get(categoryKey) || [];
    categoryTools.push(tool);
    index.byCategory.set(categoryKey, categoryTools);
  }

  return index;
}

/**
 * Resolve a tool name (may be short or full) to a specific tool
 * Uses smart shorthand: if only one provider has a tool with this name, resolve to it
 */
export function resolveToolName(
  name: string,
  allTools: ProviderToolDefinition[],
  connectedProviders: string[]
): ToolResolutionResult {
  const index = buildToolIndex(allTools);
  const { provider, shortName } = parseToolName(name);

  // If provider specified, look for exact match
  if (provider) {
    const fullName = `${provider}:${shortName}`;
    const tool = index.byFullName.get(fullName);

    if (!tool) {
      return {
        resolved: false,
        error: `Tool not found: ${fullName}`,
      };
    }

    // Check if provider is connected
    if (tool.provider !== "system" && !connectedProviders.includes(tool.provider)) {
      const providerInfo = getProviderInfo(tool.provider);
      return {
        resolved: false,
        error: `${providerInfo?.displayName || tool.provider} is not connected. Connect it in Settings → Connectors.`,
      };
    }

    return { resolved: true, tool };
  }

  // No provider specified - try to resolve by short name
  // First check if it's a system tool (exact match without namespace)
  const systemTool = index.byFullName.get(shortName);
  if (systemTool && systemTool.provider === "system") {
    return { resolved: true, tool: systemTool };
  }

  // Look for tools with this short name from connected providers
  const candidates = (index.byShortName.get(shortName) || []).filter(
    (t) => t.provider === "system" || connectedProviders.includes(t.provider)
  );

  if (candidates.length === 0) {
    // Check if the tool exists but provider isn't connected
    const allCandidates = index.byShortName.get(shortName) || [];
    if (allCandidates.length > 0) {
      const providers = allCandidates.map((t) => {
        const info = getProviderInfo(t.provider);
        return info?.displayName || t.provider;
      });
      return {
        resolved: false,
        error: `Tool "${shortName}" requires connecting: ${providers.join(" or ")}`,
      };
    }
    return {
      resolved: false,
      error: `Unknown tool: ${shortName}`,
    };
  }

  if (candidates.length === 1) {
    return { resolved: true, tool: candidates[0] };
  }

  // Multiple candidates - ambiguous
  return {
    resolved: false,
    error: `Ambiguous tool name "${shortName}". Please specify provider:`,
    candidates,
  };
}

/**
 * Filter tools to only those from connected providers
 * System tools are always included
 */
export function filterToolsByConnection(
  allTools: ProviderToolDefinition[],
  connectedProviders: string[]
): ProviderToolDefinition[] {
  return allTools.filter(
    (tool) =>
      tool.provider === "system" || connectedProviders.includes(tool.provider)
  );
}

/**
 * Get unique categories from a list of tools
 * Categories are namespaced for provider tools: "xero:invoices"
 * System categories are not namespaced: "help", "memory"
 */
export function getCategories(
  tools: ProviderToolDefinition[]
): Array<{ category: string; provider?: string; displayName: string; toolCount: number }> {
  const categoryMap = new Map<
    string,
    { provider?: string; displayName: string; tools: ProviderToolDefinition[] }
  >();

  for (const tool of tools) {
    const categoryKey =
      tool.provider === "system"
        ? tool.category
        : `${tool.provider}:${tool.category}`;

    if (!categoryMap.has(categoryKey)) {
      const providerInfo = getProviderInfo(tool.provider);
      const displayName =
        tool.provider === "system"
          ? tool.category.charAt(0).toUpperCase() + tool.category.slice(1)
          : `${providerInfo?.displayName || tool.provider} ${tool.category}`;

      categoryMap.set(categoryKey, {
        provider: tool.provider === "system" ? undefined : tool.provider,
        displayName,
        tools: [],
      });
    }

    categoryMap.get(categoryKey)!.tools.push(tool);
  }

  return Array.from(categoryMap.entries()).map(([category, info]) => ({
    category,
    provider: info.provider,
    displayName: info.displayName,
    toolCount: info.tools.length,
  }));
}

/**
 * Format a list of candidate tools for display in an error message
 */
export function formatCandidateTools(candidates: ProviderToolDefinition[]): string {
  return candidates
    .map((c) => {
      const providerInfo = getProviderInfo(c.provider);
      return `- ${c.name} (${providerInfo?.displayName || c.provider})`;
    })
    .join("\n");
}
