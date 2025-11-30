/**
 * Safety Service for MCP Remote Server
 *
 * Implements tiered permission model for Xero operations.
 * See specs/SAFETY-ARCHITECTURE.md for full design.
 *
 * Permission Levels:
 * - Level 0: Read-only (default) - get_*, search_* tools
 * - Level 1: Create drafts - create_*_draft, create_contact
 * - Level 2: Approve/Update - approve_*, update_*, record_payment
 * - Level 3: Delete/Void - void_*, delete_*
 */

import {
  type PermissionLevel,
  type UserSettings,
  PERMISSION_LEVEL_NAMES,
} from "@pip/core";
import { getDb } from "./xero.js";

/**
 * Tool permission requirements
 * Maps tool names to minimum required permission level
 */
export const TOOL_PERMISSION_LEVELS: Record<string, PermissionLevel> = {
  // Level 0: Read-only (all current tools)
  get_invoices: 0,
  get_aged_receivables: 0,
  get_aged_payables: 0,
  get_profit_and_loss: 0,
  get_balance_sheet: 0,
  get_bank_accounts: 0,
  get_bank_transactions: 0,
  get_contacts: 0,
  search_contacts: 0,
  get_organisation: 0,

  // Level 1: Create drafts (future tools)
  create_invoice_draft: 1,
  create_contact: 1,
  create_credit_note_draft: 1,

  // Level 2: Approve/Update (future tools)
  approve_invoice: 2,
  update_invoice: 2,
  update_contact: 2,
  record_payment: 2,

  // Level 3: Delete/Void (future tools)
  void_invoice: 3,
  delete_draft_invoice: 3,
  delete_contact: 3,
};

/**
 * Tool categories for display purposes
 */
export const TOOL_CATEGORIES: Record<string, string> = {
  get_invoices: "invoices",
  get_aged_receivables: "invoices",
  get_aged_payables: "invoices",
  get_profit_and_loss: "reports",
  get_balance_sheet: "reports",
  get_bank_accounts: "banking",
  get_bank_transactions: "banking",
  get_contacts: "contacts",
  search_contacts: "contacts",
  get_organisation: "organisation",
  create_invoice_draft: "invoices",
  create_contact: "contacts",
  create_credit_note_draft: "invoices",
  approve_invoice: "invoices",
  update_invoice: "invoices",
  update_contact: "contacts",
  record_payment: "payments",
  void_invoice: "invoices",
  delete_draft_invoice: "invoices",
  delete_contact: "contacts",
};

/**
 * Entity types for snapshots
 */
export const TOOL_ENTITY_TYPES: Record<string, string> = {
  create_invoice_draft: "invoice",
  create_contact: "contact",
  create_credit_note_draft: "credit_note",
  approve_invoice: "invoice",
  update_invoice: "invoice",
  update_contact: "contact",
  record_payment: "payment",
  void_invoice: "invoice",
  delete_draft_invoice: "invoice",
  delete_contact: "contact",
};

export interface PermissionCheckResult {
  allowed: boolean;
  reason?: string;
  requiredLevel?: PermissionLevel;
  currentLevel?: PermissionLevel;
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
 * Check if a user has permission to execute a tool
 */
export async function checkToolPermission(
  userId: string,
  toolName: string
): Promise<PermissionCheckResult> {
  const settings = await getUserSettingsOrDefault(userId);
  const requiredLevel = TOOL_PERMISSION_LEVELS[toolName];

  // Unknown tool - allow by default (meta-tools, memory tools)
  if (requiredLevel === undefined) {
    return { allowed: true };
  }

  // Check vacation mode
  if (settings.vacationModeUntil && settings.vacationModeUntil > Date.now()) {
    if (requiredLevel > 0) {
      const vacationEnd = new Date(settings.vacationModeUntil).toLocaleDateString("en-AU");
      return {
        allowed: false,
        reason: `Vacation mode is active until ${vacationEnd}. Only read-only operations are allowed.`,
        requiredLevel,
        currentLevel: 0, // Effective level during vacation
        isVacationMode: true,
      };
    }
  }

  // Check permission level
  if (settings.permissionLevel < requiredLevel) {
    return {
      allowed: false,
      reason: `This operation requires "${PERMISSION_LEVEL_NAMES[requiredLevel]}" permission. ` +
        `Your current level is "${PERMISSION_LEVEL_NAMES[settings.permissionLevel]}". ` +
        `Enable higher permissions in Pip settings if you want to allow this.`,
      requiredLevel,
      currentLevel: settings.permissionLevel,
    };
  }

  return {
    allowed: true,
    currentLevel: settings.permissionLevel,
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
 * Get tools visible to a user based on their permission level
 * This is used to filter the tool list shown to the agent
 */
export async function getVisibleTools(
  userId: string,
  allTools: string[]
): Promise<string[]> {
  const settings = await getUserSettingsOrDefault(userId);
  const effectiveLevel = settings.vacationModeUntil && settings.vacationModeUntil > Date.now()
    ? 0
    : settings.permissionLevel;

  return allTools.filter((toolName) => {
    const requiredLevel = TOOL_PERMISSION_LEVELS[toolName];
    // Allow unknown tools (meta-tools, memory tools)
    if (requiredLevel === undefined) return true;
    return requiredLevel <= effectiveLevel;
  });
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
 */
export async function getSafetyRulesForPrompt(userId: string): Promise<string> {
  const settings = await getUserSettingsOrDefault(userId);
  const levelName = PERMISSION_LEVEL_NAMES[settings.permissionLevel];

  const rules: string[] = [
    `SAFETY RULES:`,
    `- User permission level: ${levelName.toUpperCase()}`,
  ];

  if (settings.permissionLevel === 0) {
    rules.push(`- You CANNOT modify any Xero data`);
    rules.push(`- Do not suggest creating, updating, or deleting anything`);
    rules.push(`- If user asks you to make changes, explain they need to enable write permissions in Pip settings first`);
  } else if (settings.permissionLevel === 1) {
    rules.push(`- You can create DRAFT invoices and contacts only`);
    rules.push(`- Drafts must be manually approved in Xero`);
    rules.push(`- You CANNOT approve, update, or delete anything`);
  } else if (settings.permissionLevel === 2) {
    rules.push(`- You can create, approve, and update items`);
    rules.push(`- Each modification requires user confirmation`);
    rules.push(`- You CANNOT void or delete items`);
  } else {
    rules.push(`- Full access enabled - user has authorized all operations`);
    rules.push(`- Destructive operations require explicit confirmation`);
    rules.push(`- Always explain what will be changed before proceeding`);
  }

  if (settings.vacationModeUntil && settings.vacationModeUntil > Date.now()) {
    const vacationEnd = new Date(settings.vacationModeUntil).toLocaleDateString("en-AU");
    rules.push(`- VACATION MODE ACTIVE until ${vacationEnd} - READ-ONLY only`);
  }

  return rules.join("\n");
}
