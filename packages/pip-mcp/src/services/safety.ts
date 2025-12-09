/**
 * Safety Service for MCP Remote Server
 *
 * Implements tiered permission model with per-connector granularity.
 * See specs/SAFETY-ARCHITECTURE.md for full design.
 *
 * Permission Levels:
 * - Level 0: Read-only (default) - get_*, search_*, read_* tools
 * - Level 1: Create/Write - create_*, write_*, append_*
 * - Level 2: Update/Delete - approve_*, update_*, delete_*
 * - Level 3: Destructive - void_*, permanent_delete_* (Xero only)
 *
 * Per-Connector Permissions:
 * - Each connector (xero, gmail, google_sheets) has its own permission level
 * - Users can grant read-only to Xero but write access to Sheets
 * - Default is Level 0 (read-only) for all connectors
 */

import {
  type PermissionLevel,
  type UserSettings,
  type ConnectorType,
  type ConnectorPermission,
  PERMISSION_LEVEL_NAMES,
  CONNECTOR_PERMISSION_NAMES,
} from "@pip/core";
import { getDb } from "./xero.js";

/**
 * Tool to connector mapping
 * Determines which connector a tool belongs to for permission checking
 * Uses namespaced tool names (provider:tool_name) for provider-aware architecture
 */
export const TOOL_CONNECTOR_MAP: Record<string, ConnectorType> = {
  // Xero tools (namespaced)
  "xero:get_invoices": "xero",
  "xero:get_aged_receivables": "xero",
  "xero:get_aged_payables": "xero",
  "xero:get_profit_and_loss": "xero",
  "xero:get_balance_sheet": "xero",
  "xero:get_bank_accounts": "xero",
  "xero:get_bank_transactions": "xero",
  "xero:get_contacts": "xero",
  "xero:search_contacts": "xero",
  "xero:get_organisation": "xero",
  "xero:list_accounts": "xero",
  "xero:create_invoice_draft": "xero",
  "xero:create_contact": "xero",
  "xero:create_credit_note_draft": "xero",
  "xero:approve_invoice": "xero",
  "xero:update_invoice": "xero",
  "xero:update_contact": "xero",
  "xero:record_payment": "xero",
  "xero:void_invoice": "xero",
  "xero:delete_draft_invoice": "xero",
  "xero:delete_contact": "xero",

  // Gmail tools (namespaced)
  "gmail:search_gmail": "gmail",
  "gmail:get_email_content": "gmail",
  "gmail:download_attachment": "gmail",
  "gmail:list_email_attachments": "gmail",

  // Google Sheets tools (namespaced)
  "google_sheets:read_sheet_range": "google_sheets",
  "google_sheets:get_sheet_metadata": "google_sheets",
  "google_sheets:search_spreadsheets": "google_sheets",
  "google_sheets:list_sheets": "google_sheets",
  "google_sheets:get_spreadsheet_revisions": "google_sheets",
  "google_sheets:write_sheet_range": "google_sheets",
  "google_sheets:append_sheet_rows": "google_sheets",
  "google_sheets:update_cell": "google_sheets",
  "google_sheets:create_spreadsheet": "google_sheets",
  "google_sheets:add_sheet": "google_sheets",
  "google_sheets:clear_range": "google_sheets",
  "google_sheets:delete_sheet": "google_sheets",
  "google_sheets:delete_rows": "google_sheets",
  "google_sheets:delete_columns": "google_sheets",
  "google_sheets:trash_spreadsheet": "google_sheets",
};

/**
 * Tool permission requirements
 * Maps namespaced tool names to minimum required permission level
 */
export const TOOL_PERMISSION_LEVELS: Record<string, PermissionLevel> = {
  // ==========================================================================
  // Xero Tools (namespaced)
  // ==========================================================================

  // Level 0: Read-only
  "xero:get_invoices": 0,
  "xero:get_aged_receivables": 0,
  "xero:get_aged_payables": 0,
  "xero:get_profit_and_loss": 0,
  "xero:get_balance_sheet": 0,
  "xero:get_bank_accounts": 0,
  "xero:get_bank_transactions": 0,
  "xero:get_contacts": 0,
  "xero:search_contacts": 0,
  "xero:get_organisation": 0,
  "xero:list_accounts": 0,

  // Level 1: Create drafts
  "xero:create_invoice_draft": 1,
  "xero:create_contact": 1,
  "xero:create_credit_note_draft": 1,

  // Level 2: Approve/Update
  "xero:approve_invoice": 2,
  "xero:update_invoice": 2,
  "xero:update_contact": 2,
  "xero:record_payment": 2,

  // Level 3: Delete/Void (IRREVERSIBLE in Xero)
  "xero:void_invoice": 3,
  "xero:delete_draft_invoice": 3,
  "xero:delete_contact": 3,

  // ==========================================================================
  // Gmail Tools (read-only for now, namespaced)
  // ==========================================================================

  "gmail:search_gmail": 0,
  "gmail:get_email_content": 0,
  "gmail:download_attachment": 0,
  "gmail:list_email_attachments": 0,

  // ==========================================================================
  // Google Sheets Tools (namespaced)
  // ==========================================================================

  // Level 0: Read-only
  "google_sheets:read_sheet_range": 0,
  "google_sheets:get_sheet_metadata": 0,
  "google_sheets:search_spreadsheets": 0,
  "google_sheets:list_sheets": 0,
  "google_sheets:get_spreadsheet_revisions": 0,

  // Level 1: Write/Create (reversible via version history)
  "google_sheets:write_sheet_range": 1,
  "google_sheets:append_sheet_rows": 1,
  "google_sheets:update_cell": 1,
  "google_sheets:create_spreadsheet": 1,
  "google_sheets:add_sheet": 1,
  "google_sheets:clear_range": 1,

  // Level 2: Delete (recoverable via trash/version history)
  "google_sheets:delete_sheet": 2,
  "google_sheets:delete_rows": 2,
  "google_sheets:delete_columns": 2,
  "google_sheets:trash_spreadsheet": 2,

  // NOTE: Level 3 not exposed for Google Sheets (no permanent_delete tools)
};

/**
 * Tool categories for display purposes (namespaced)
 */
export const TOOL_CATEGORIES: Record<string, string> = {
  // Xero (namespaced)
  "xero:get_invoices": "xero:invoices",
  "xero:get_aged_receivables": "xero:invoices",
  "xero:get_aged_payables": "xero:invoices",
  "xero:get_profit_and_loss": "xero:reports",
  "xero:get_balance_sheet": "xero:reports",
  "xero:get_bank_accounts": "xero:banking",
  "xero:get_bank_transactions": "xero:banking",
  "xero:get_contacts": "xero:contacts",
  "xero:search_contacts": "xero:contacts",
  "xero:get_organisation": "xero:organisation",
  "xero:list_accounts": "xero:accounts",
  "xero:create_invoice_draft": "xero:invoices",
  "xero:create_contact": "xero:contacts",
  "xero:create_credit_note_draft": "xero:invoices",
  "xero:approve_invoice": "xero:invoices",
  "xero:update_invoice": "xero:invoices",
  "xero:update_contact": "xero:contacts",
  "xero:record_payment": "xero:payments",
  "xero:void_invoice": "xero:invoices",
  "xero:delete_draft_invoice": "xero:invoices",
  "xero:delete_contact": "xero:contacts",

  // Gmail (namespaced)
  "gmail:search_gmail": "gmail:search",
  "gmail:get_email_content": "gmail:search",
  "gmail:download_attachment": "gmail:attachments",
  "gmail:list_email_attachments": "gmail:attachments",

  // Google Sheets (namespaced)
  "google_sheets:read_sheet_range": "google_sheets:data",
  "google_sheets:get_sheet_metadata": "google_sheets:data",
  "google_sheets:search_spreadsheets": "google_sheets:files",
  "google_sheets:list_sheets": "google_sheets:data",
  "google_sheets:get_spreadsheet_revisions": "google_sheets:files",
  "google_sheets:write_sheet_range": "google_sheets:data",
  "google_sheets:append_sheet_rows": "google_sheets:data",
  "google_sheets:update_cell": "google_sheets:data",
  "google_sheets:create_spreadsheet": "google_sheets:files",
  "google_sheets:add_sheet": "google_sheets:data",
  "google_sheets:clear_range": "google_sheets:data",
  "google_sheets:delete_sheet": "google_sheets:data",
  "google_sheets:delete_rows": "google_sheets:data",
  "google_sheets:delete_columns": "google_sheets:data",
  "google_sheets:trash_spreadsheet": "google_sheets:files",
};

/**
 * Entity types for snapshots (namespaced)
 */
export const TOOL_ENTITY_TYPES: Record<string, string> = {
  // Xero (namespaced)
  "xero:create_invoice_draft": "invoice",
  "xero:create_contact": "contact",
  "xero:create_credit_note_draft": "credit_note",
  "xero:approve_invoice": "invoice",
  "xero:update_invoice": "invoice",
  "xero:update_contact": "contact",
  "xero:record_payment": "payment",
  "xero:void_invoice": "invoice",
  "xero:delete_draft_invoice": "invoice",
  "xero:delete_contact": "contact",

  // Google Sheets (namespaced)
  "google_sheets:write_sheet_range": "spreadsheet",
  "google_sheets:append_sheet_rows": "spreadsheet",
  "google_sheets:update_cell": "spreadsheet",
  "google_sheets:create_spreadsheet": "spreadsheet",
  "google_sheets:add_sheet": "sheet",
  "google_sheets:clear_range": "spreadsheet",
  "google_sheets:delete_sheet": "sheet",
  "google_sheets:delete_rows": "spreadsheet",
  "google_sheets:delete_columns": "spreadsheet",
  "google_sheets:trash_spreadsheet": "spreadsheet",
};

export interface PermissionCheckResult {
  allowed: boolean;
  reason?: string;
  requiredLevel?: PermissionLevel;
  currentLevel?: PermissionLevel;
  connector?: ConnectorType;
  isVacationMode?: boolean;
}

/**
 * Get user settings, or create default settings if none exist
 */
export async function getUserSettingsOrDefault(userId: string): Promise<UserSettings> {
  const db = await getDb();
  const settings = await db.getUserSettings(userId);

  if (settings) {
    return settings;
  }

  // Create default settings (read-only)
  return db.upsertUserSettings({
    userId,
    permissionLevel: 0,
    requireConfirmation: true,
    dailyEmailSummary: true,
    require2FA: false,
  });
}

/**
 * Get permission level for a specific connector
 * Returns the connector-specific permission, or defaults to global user setting
 */
export async function getConnectorPermissionLevel(
  userId: string,
  connector: ConnectorType
): Promise<PermissionLevel> {
  const db = await getDb();

  // First check for connector-specific permission
  const connectorPerm = await db.getConnectorPermission(userId, connector);
  if (connectorPerm) {
    return connectorPerm.permissionLevel;
  }

  // Fall back to global user settings (for backwards compatibility)
  const settings = await getUserSettingsOrDefault(userId);
  return settings.permissionLevel;
}

/**
 * Get or create connector permission with default read-only level
 */
export async function getConnectorPermissionOrDefault(
  userId: string,
  connector: ConnectorType
): Promise<ConnectorPermission> {
  const db = await getDb();

  const existing = await db.getConnectorPermission(userId, connector);
  if (existing) {
    return existing;
  }

  // Create default permission (read-only)
  return db.upsertConnectorPermission(userId, connector, 0);
}

/**
 * Check if a user has permission to execute a tool
 * Uses per-connector permissions when available
 */
export async function checkToolPermission(
  userId: string,
  toolName: string
): Promise<PermissionCheckResult> {
  const requiredLevel = TOOL_PERMISSION_LEVELS[toolName];

  // Unknown tool - allow by default (meta-tools, memory tools)
  if (requiredLevel === undefined) {
    return { allowed: true };
  }

  // Get the connector for this tool
  const connector = TOOL_CONNECTOR_MAP[toolName];
  if (!connector) {
    // Unknown connector - use global settings
    const settings = await getUserSettingsOrDefault(userId);
    return checkPermissionLevel(settings.permissionLevel, requiredLevel, userId);
  }

  // Get connector-specific permission level
  const currentLevel = await getConnectorPermissionLevel(userId, connector);

  // Check vacation mode (applies globally)
  const settings = await getUserSettingsOrDefault(userId);
  if (settings.vacationModeUntil && settings.vacationModeUntil > Date.now()) {
    if (requiredLevel > 0) {
      const vacationEnd = new Date(settings.vacationModeUntil).toLocaleDateString("en-AU");
      return {
        allowed: false,
        reason: `Vacation mode is active until ${vacationEnd}. Only read-only operations are allowed.`,
        requiredLevel,
        currentLevel: 0,
        connector,
        isVacationMode: true,
      };
    }
  }

  // Check permission level
  if (currentLevel < requiredLevel) {
    const connectorName = connector.replace("_", " ");
    const levelNames = CONNECTOR_PERMISSION_NAMES[connector];

    return {
      allowed: false,
      reason: `This ${connectorName} operation requires "${levelNames[requiredLevel]}" permission. ` +
        `Your current ${connectorName} level is "${levelNames[currentLevel]}". ` +
        `Enable higher permissions in Pip settings if you want to allow this.`,
      requiredLevel,
      currentLevel,
      connector,
    };
  }

  return {
    allowed: true,
    currentLevel,
    connector,
  };
}

/**
 * Helper function to check permission level
 */
async function checkPermissionLevel(
  currentLevel: PermissionLevel,
  requiredLevel: PermissionLevel,
  userId: string
): Promise<PermissionCheckResult> {
  const settings = await getUserSettingsOrDefault(userId);

  // Check vacation mode
  if (settings.vacationModeUntil && settings.vacationModeUntil > Date.now()) {
    if (requiredLevel > 0) {
      const vacationEnd = new Date(settings.vacationModeUntil).toLocaleDateString("en-AU");
      return {
        allowed: false,
        reason: `Vacation mode is active until ${vacationEnd}. Only read-only operations are allowed.`,
        requiredLevel,
        currentLevel: 0,
        isVacationMode: true,
      };
    }
  }

  if (currentLevel < requiredLevel) {
    return {
      allowed: false,
      reason: `This operation requires "${PERMISSION_LEVEL_NAMES[requiredLevel]}" permission. ` +
        `Your current level is "${PERMISSION_LEVEL_NAMES[currentLevel]}". ` +
        `Enable higher permissions in Pip settings if you want to allow this.`,
      requiredLevel,
      currentLevel,
    };
  }

  return {
    allowed: true,
    currentLevel,
  };
}

/**
 * Check if a tool is a write operation (Level 1+)
 */
export function isWriteOperation(toolName: string): boolean {
  const level = TOOL_PERMISSION_LEVELS[toolName];
  return level !== undefined && level > 0;
}

/**
 * Check if a tool requires confirmation (Level 2+)
 */
export function requiresConfirmation(toolName: string): boolean {
  const level = TOOL_PERMISSION_LEVELS[toolName];
  return level !== undefined && level >= 2;
}

/**
 * Check if a tool is destructive (Level 3)
 */
export function isDestructiveOperation(toolName: string): boolean {
  const level = TOOL_PERMISSION_LEVELS[toolName];
  return level !== undefined && level >= 3;
}

/**
 * Get tools visible to a user based on their connector permission levels
 * This is used to filter the tool list shown to the agent
 */
export async function getVisibleTools(
  userId: string,
  allTools: string[]
): Promise<string[]> {
  const settings = await getUserSettingsOrDefault(userId);
  const isVacationMode = settings.vacationModeUntil && settings.vacationModeUntil > Date.now();

  // Cache connector permissions to avoid repeated DB calls
  const connectorLevels: Partial<Record<ConnectorType, PermissionLevel>> = {};

  const visibleTools: string[] = [];

  for (const toolName of allTools) {
    const requiredLevel = TOOL_PERMISSION_LEVELS[toolName];

    // Allow unknown tools (meta-tools, memory tools)
    if (requiredLevel === undefined) {
      visibleTools.push(toolName);
      continue;
    }

    // If vacation mode is active, only allow read-only tools
    if (isVacationMode && requiredLevel > 0) {
      continue;
    }

    // Get connector for this tool
    const connector = TOOL_CONNECTOR_MAP[toolName];
    if (!connector) {
      // Unknown connector - use global settings
      if (settings.permissionLevel >= requiredLevel) {
        visibleTools.push(toolName);
      }
      continue;
    }

    // Get or cache connector permission level
    if (connectorLevels[connector] === undefined) {
      connectorLevels[connector] = await getConnectorPermissionLevel(userId, connector);
    }

    const currentLevel = connectorLevels[connector]!;
    if (currentLevel >= requiredLevel) {
      visibleTools.push(toolName);
    }
  }

  return visibleTools;
}

/**
 * Get all connector permissions for a user
 * Returns permissions for all connectors, using defaults where not set
 */
export async function getAllConnectorPermissions(
  userId: string
): Promise<Record<ConnectorType, PermissionLevel>> {
  const connectors: ConnectorType[] = ["xero", "gmail", "google_sheets"];
  const permissions: Record<ConnectorType, PermissionLevel> = {
    xero: 0,
    gmail: 0,
    google_sheets: 0,
  };

  for (const connector of connectors) {
    permissions[connector] = await getConnectorPermissionLevel(userId, connector);
  }

  return permissions;
}

/**
 * Set permission level for a specific connector
 */
export async function setConnectorPermission(
  userId: string,
  connector: ConnectorType,
  permissionLevel: PermissionLevel
): Promise<ConnectorPermission> {
  const db = await getDb();
  return db.upsertConnectorPermission(userId, connector, permissionLevel);
}

/**
 * Format permission error message for agent response
 */
export function formatPermissionError(result: PermissionCheckResult): string {
  if (result.isVacationMode) {
    return result.reason || "Vacation mode is active. Only read-only operations are allowed.";
  }

  return result.reason || "Permission denied for this operation.";
}

/**
 * Get safety rules text for agent system prompt
 * Includes per-connector permission information
 */
export async function getSafetyRulesForPrompt(userId: string): Promise<string> {
  const settings = await getUserSettingsOrDefault(userId);
  const connectorPermissions = await getAllConnectorPermissions(userId);

  const rules: string[] = [
    `SAFETY RULES:`,
  ];

  // Add per-connector permission info
  for (const [connector, level] of Object.entries(connectorPermissions)) {
    const connectorName = connector.replace("_", " ").toUpperCase();
    const levelNames = CONNECTOR_PERMISSION_NAMES[connector as ConnectorType];
    rules.push(`- ${connectorName}: ${levelNames[level as PermissionLevel]}`);
  }

  // Add general guidance
  const hasAnyWriteAccess = Object.values(connectorPermissions).some(level => level > 0);

  if (!hasAnyWriteAccess) {
    rules.push(`- You CANNOT modify any data in connected services`);
    rules.push(`- If user asks you to make changes, explain they need to enable write permissions in Pip settings first`);
  } else {
    rules.push(`- Check permission level for each connector before attempting write operations`);
    rules.push(`- Each modification may require user confirmation depending on the connector`);
  }

  // Vacation mode
  if (settings.vacationModeUntil && settings.vacationModeUntil > Date.now()) {
    const vacationEnd = new Date(settings.vacationModeUntil).toLocaleDateString("en-AU");
    rules.push(`- VACATION MODE ACTIVE until ${vacationEnd} - READ-ONLY only for ALL connectors`);
  }

  return rules.join("\n");
}
