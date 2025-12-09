/**
 * Provider-Aware Tool Types
 *
 * Defines the type system for namespaced, provider-aware MCP tools.
 * Supports multiple providers of the same type (e.g., Xero + MYOB for accounting).
 */

import type { Tool } from "@modelcontextprotocol/sdk/types.js";

/**
 * Provider type categories - groups similar services
 */
export type ProviderType = "accounting" | "spreadsheet" | "email" | "tasks" | "system";

/**
 * Provider information
 */
export interface ProviderInfo {
  /** Unique provider ID (e.g., "xero", "myob", "google_sheets") */
  id: string;
  /** Provider type category */
  type: ProviderType;
  /** Human-readable name (e.g., "Xero", "MYOB", "Google Sheets") */
  displayName: string;
  /** Key used in oauth_tokens table */
  connectorKey: string;
  /** Whether this provider is currently implemented */
  implemented: boolean;
}

/**
 * Extended tool definition with provider awareness
 */
export interface ProviderToolDefinition {
  /** Provider ID (e.g., "xero", "google_sheets", "system") */
  provider: string;
  /** Provider type category */
  providerType: ProviderType;
  /** Tool category within provider (e.g., "invoices", "data", "help") */
  category: string;
  /**
   * Full namespaced name (e.g., "xero:get_invoices")
   * System tools don't have namespace (e.g., "get_pip_guide")
   */
  name: string;
  /** Short name without provider prefix (e.g., "get_invoices") */
  shortName: string;
  /** Tool description for LLM */
  description: string;
  /** JSON Schema for input parameters */
  inputSchema: Tool["inputSchema"];
}

/**
 * Tool resolution result
 */
export interface ToolResolutionResult {
  /** Whether the tool was resolved successfully */
  resolved: boolean;
  /** The resolved tool (if found) */
  tool?: ProviderToolDefinition;
  /** Error message if not resolved */
  error?: string;
  /** Candidate tools if ambiguous */
  candidates?: ProviderToolDefinition[];
}

/**
 * Category info for meta-tool response
 */
export interface CategoryInfo {
  /** Category name (may be namespaced like "xero:invoices") */
  name: string;
  /** Provider ID (if provider-specific) */
  provider?: string;
  /** Provider display name */
  providerDisplayName?: string;
  /** Number of tools in category */
  toolCount: number;
}

/**
 * Helper to create a provider-namespaced tool name
 */
export function makeToolName(provider: string, shortName: string): string {
  if (provider === "system") {
    return shortName;
  }
  return `${provider}:${shortName}`;
}

/**
 * Helper to parse a potentially namespaced tool name
 */
export function parseToolName(name: string): { provider?: string; shortName: string } {
  const colonIndex = name.indexOf(":");
  if (colonIndex === -1) {
    return { shortName: name };
  }
  return {
    provider: name.substring(0, colonIndex),
    shortName: name.substring(colonIndex + 1),
  };
}

/**
 * Convert ProviderToolDefinition to MCP Tool format
 */
export function toMcpTool(def: ProviderToolDefinition): Tool {
  return {
    name: def.name,
    description: def.description,
    inputSchema: def.inputSchema,
  };
}
