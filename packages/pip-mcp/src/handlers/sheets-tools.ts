/**
 * Google Sheets MCP Tools
 *
 * Provides Google Sheets integration tools for reading, writing, and managing spreadsheets.
 * Uses spreadsheets scope (full read/write) and drive.readonly scope (for search).
 */

import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { ProviderToolDefinition } from "../types/tools.js";
import {
  getSheetsClient,
  isSheetsConnected,
  searchSpreadsheets,
  getSpreadsheetMetadata,
  readRange,
  writeRange,
  appendRows,
  updateCell,
  createSpreadsheet,
  addSheet,
  deleteSheet,
  clearRange,
  deleteRows,
  deleteColumns,
  trashSpreadsheet,
  listSheets,
  getSpreadsheetRevisions,
} from "../services/sheets.js";

// Tool definitions for the registry
export const sheetsToolDefinitions: ProviderToolDefinition[] = [
  // ==========================================================================
  // Level 0: Read-only tools
  // ==========================================================================
  {
    provider: "google_sheets",
    providerType: "spreadsheet",
    category: "data",
    name: "google_sheets:read_sheet_range",
    shortName: "read_sheet_range",
    description: `Read data from a Google Sheets range. Returns cell values as a 2D array.
Examples:
- "Sheet1!A1:D10" - Read cells A1 to D10 from Sheet1
- "Sheet1!A:A" - Read entire column A
- "Sheet1!1:1" - Read entire row 1
- "Data!B2:E" - Read from B2 to the last row in column E`,
    inputSchema: {
      type: "object" as const,
      properties: {
        spreadsheetId: {
          type: "string",
          description: "The spreadsheet ID (from the URL or search results)",
        },
        range: {
          type: "string",
          description: "The A1 notation range to read (e.g., 'Sheet1!A1:D10')",
        },
      },
      required: ["spreadsheetId", "range"],
    },
  },
  {
    provider: "google_sheets",
    providerType: "spreadsheet",
    category: "data",
    name: "google_sheets:get_sheet_metadata",
    shortName: "get_sheet_metadata",
    description: "Get metadata about a spreadsheet including its title, URL, and list of sheets (tabs)",
    inputSchema: {
      type: "object" as const,
      properties: {
        spreadsheetId: {
          type: "string",
          description: "The spreadsheet ID",
        },
      },
      required: ["spreadsheetId"],
    },
  },
  {
    provider: "google_sheets",
    providerType: "spreadsheet",
    category: "files",
    name: "google_sheets:search_spreadsheets",
    shortName: "search_spreadsheets",
    description: "Search for spreadsheets by name in Google Drive",
    inputSchema: {
      type: "object" as const,
      properties: {
        query: {
          type: "string",
          description: "Search query (matches spreadsheet names)",
        },
        maxResults: {
          type: "number",
          description: "Maximum number of results (default: 20, max: 50)",
        },
      },
      required: ["query"],
    },
  },
  {
    provider: "google_sheets",
    providerType: "spreadsheet",
    category: "data",
    name: "google_sheets:list_sheets",
    shortName: "list_sheets",
    description: "List all sheets (tabs) in a spreadsheet with their properties",
    inputSchema: {
      type: "object" as const,
      properties: {
        spreadsheetId: {
          type: "string",
          description: "The spreadsheet ID",
        },
      },
      required: ["spreadsheetId"],
    },
  },
  {
    provider: "google_sheets",
    providerType: "spreadsheet",
    category: "files",
    name: "google_sheets:get_spreadsheet_revisions",
    shortName: "get_spreadsheet_revisions",
    description: "Get revision history for a spreadsheet (who modified it and when)",
    inputSchema: {
      type: "object" as const,
      properties: {
        spreadsheetId: {
          type: "string",
          description: "The spreadsheet ID",
        },
        maxResults: {
          type: "number",
          description: "Maximum number of revisions to return (default: 10)",
        },
      },
      required: ["spreadsheetId"],
    },
  },

  // ==========================================================================
  // Level 1: Write/Create tools (reversible via version history)
  // ==========================================================================
  {
    provider: "google_sheets",
    providerType: "spreadsheet",
    category: "data",
    name: "google_sheets:write_sheet_range",
    shortName: "write_sheet_range",
    description: `Write data to a Google Sheets range. Overwrites existing data.
Values should be a 2D array matching the target range dimensions.
Example: [["Name", "Age"], ["Alice", 30], ["Bob", 25]]`,
    inputSchema: {
      type: "object" as const,
      properties: {
        spreadsheetId: {
          type: "string",
          description: "The spreadsheet ID",
        },
        range: {
          type: "string",
          description: "The A1 notation range to write to (e.g., 'Sheet1!A1:B3')",
        },
        values: {
          type: "array",
          items: {
            type: "array",
            items: {
              oneOf: [
                { type: "string" },
                { type: "number" },
                { type: "boolean" },
                { type: "null" },
              ],
            },
          },
          description: "2D array of values to write",
        },
      },
      required: ["spreadsheetId", "range", "values"],
    },
  },
  {
    provider: "google_sheets",
    providerType: "spreadsheet",
    category: "data",
    name: "google_sheets:append_sheet_rows",
    shortName: "append_sheet_rows",
    description: `Append rows to the end of a sheet's data. Automatically finds the last row.
Values should be a 2D array of rows to append.`,
    inputSchema: {
      type: "object" as const,
      properties: {
        spreadsheetId: {
          type: "string",
          description: "The spreadsheet ID",
        },
        range: {
          type: "string",
          description: "The sheet name or range to append to (e.g., 'Sheet1' or 'Sheet1!A:D')",
        },
        values: {
          type: "array",
          items: {
            type: "array",
            items: {
              oneOf: [
                { type: "string" },
                { type: "number" },
                { type: "boolean" },
                { type: "null" },
              ],
            },
          },
          description: "2D array of rows to append",
        },
      },
      required: ["spreadsheetId", "range", "values"],
    },
  },
  {
    provider: "google_sheets",
    providerType: "spreadsheet",
    category: "data",
    name: "google_sheets:update_cell",
    shortName: "update_cell",
    description: "Update a single cell value",
    inputSchema: {
      type: "object" as const,
      properties: {
        spreadsheetId: {
          type: "string",
          description: "The spreadsheet ID",
        },
        cell: {
          type: "string",
          description: "The cell in A1 notation (e.g., 'Sheet1!B5')",
        },
        value: {
          oneOf: [
            { type: "string" },
            { type: "number" },
            { type: "boolean" },
            { type: "null" },
          ],
          description: "The value to set",
        },
      },
      required: ["spreadsheetId", "cell", "value"],
    },
  },
  {
    provider: "google_sheets",
    providerType: "spreadsheet",
    category: "files",
    name: "google_sheets:create_spreadsheet",
    shortName: "create_spreadsheet",
    description: "Create a new Google Spreadsheet",
    inputSchema: {
      type: "object" as const,
      properties: {
        title: {
          type: "string",
          description: "The title for the new spreadsheet",
        },
        sheetTitles: {
          type: "array",
          items: { type: "string" },
          description: "Optional list of sheet (tab) names to create (default: ['Sheet1'])",
        },
      },
      required: ["title"],
    },
  },
  {
    provider: "google_sheets",
    providerType: "spreadsheet",
    category: "data",
    name: "google_sheets:add_sheet",
    shortName: "add_sheet",
    description: "Add a new sheet (tab) to an existing spreadsheet",
    inputSchema: {
      type: "object" as const,
      properties: {
        spreadsheetId: {
          type: "string",
          description: "The spreadsheet ID",
        },
        title: {
          type: "string",
          description: "The title for the new sheet",
        },
      },
      required: ["spreadsheetId", "title"],
    },
  },
  {
    provider: "google_sheets",
    providerType: "spreadsheet",
    category: "data",
    name: "google_sheets:clear_range",
    shortName: "clear_range",
    description: "Clear all values from a range (keeps formatting)",
    inputSchema: {
      type: "object" as const,
      properties: {
        spreadsheetId: {
          type: "string",
          description: "The spreadsheet ID",
        },
        range: {
          type: "string",
          description: "The A1 notation range to clear (e.g., 'Sheet1!A1:D10')",
        },
      },
      required: ["spreadsheetId", "range"],
    },
  },

  // ==========================================================================
  // Level 2: Delete tools (recoverable via trash/version history)
  // ==========================================================================
  {
    provider: "google_sheets",
    providerType: "spreadsheet",
    category: "data",
    name: "google_sheets:delete_sheet",
    shortName: "delete_sheet",
    description: "Delete a sheet (tab) from a spreadsheet. Cannot be undone directly.",
    inputSchema: {
      type: "object" as const,
      properties: {
        spreadsheetId: {
          type: "string",
          description: "The spreadsheet ID",
        },
        sheetId: {
          type: "number",
          description: "The sheet ID (not the name - get from list_sheets)",
        },
      },
      required: ["spreadsheetId", "sheetId"],
    },
  },
  {
    provider: "google_sheets",
    providerType: "spreadsheet",
    category: "data",
    name: "google_sheets:delete_rows",
    shortName: "delete_rows",
    description: "Delete rows from a sheet. Uses 0-based indexing.",
    inputSchema: {
      type: "object" as const,
      properties: {
        spreadsheetId: {
          type: "string",
          description: "The spreadsheet ID",
        },
        sheetId: {
          type: "number",
          description: "The sheet ID (get from list_sheets)",
        },
        startIndex: {
          type: "number",
          description: "Start row index (0-based, inclusive)",
        },
        endIndex: {
          type: "number",
          description: "End row index (0-based, exclusive)",
        },
      },
      required: ["spreadsheetId", "sheetId", "startIndex", "endIndex"],
    },
  },
  {
    provider: "google_sheets",
    providerType: "spreadsheet",
    category: "data",
    name: "google_sheets:delete_columns",
    shortName: "delete_columns",
    description: "Delete columns from a sheet. Uses 0-based indexing.",
    inputSchema: {
      type: "object" as const,
      properties: {
        spreadsheetId: {
          type: "string",
          description: "The spreadsheet ID",
        },
        sheetId: {
          type: "number",
          description: "The sheet ID (get from list_sheets)",
        },
        startIndex: {
          type: "number",
          description: "Start column index (0-based, inclusive)",
        },
        endIndex: {
          type: "number",
          description: "End column index (0-based, exclusive)",
        },
      },
      required: ["spreadsheetId", "sheetId", "startIndex", "endIndex"],
    },
  },
  {
    provider: "google_sheets",
    providerType: "spreadsheet",
    category: "files",
    name: "google_sheets:trash_spreadsheet",
    shortName: "trash_spreadsheet",
    description: "Move a spreadsheet to trash. Can be recovered from Drive trash within 30 days.",
    inputSchema: {
      type: "object" as const,
      properties: {
        spreadsheetId: {
          type: "string",
          description: "The spreadsheet ID to trash",
        },
      },
      required: ["spreadsheetId"],
    },
  },
];

/**
 * Execute a Sheets tool by name
 */
export async function executeSheetsTools(
  userId: string,
  toolName: string,
  args: Record<string, unknown>
): Promise<CallToolResult> {
  // Check if Sheets is connected
  const connected = await isSheetsConnected(userId);
  if (!connected) {
    return {
      content: [
        {
          type: "text",
          text: "Google Sheets is not connected. Please connect your Google account in Pip settings first.",
        },
      ],
      isError: true,
    };
  }

  // Get Sheets client
  const client = await getSheetsClient(userId);
  if (!client) {
    return {
      content: [
        {
          type: "text",
          text: "Failed to get Google Sheets client. Your connection may have expired (tokens expire after 7 days in testing mode). Please reconnect in Pip settings.",
        },
      ],
      isError: true,
    };
  }

  switch (toolName) {
    // ==========================================================================
    // Read-only tools (Level 0)
    // ==========================================================================
    case "read_sheet_range": {
      const { spreadsheetId, range } = args as { spreadsheetId: string; range: string };
      const result = await readRange(client, spreadsheetId, range);

      if (!result) {
        return {
          content: [
            {
              type: "text",
              text: `Failed to read range: ${range}. Check that the spreadsheet ID and range are correct.`,
            },
          ],
          isError: true,
        };
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                range: result.range,
                rowCount: result.rowCount,
                columnCount: result.columnCount,
                values: result.values.map((row) => row.map((cell) => cell.value)),
              },
              null,
              2
            ),
          },
        ],
      };
    }

    case "get_sheet_metadata": {
      const { spreadsheetId } = args as { spreadsheetId: string };
      const metadata = await getSpreadsheetMetadata(client, spreadsheetId);

      if (!metadata) {
        return {
          content: [
            {
              type: "text",
              text: `Spreadsheet not found: ${spreadsheetId}`,
            },
          ],
          isError: true,
        };
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(metadata, null, 2),
          },
        ],
      };
    }

    case "search_spreadsheets": {
      const { query, maxResults } = args as { query: string; maxResults?: number };
      const results = await searchSpreadsheets(client, query, Math.min(maxResults || 20, 50));

      if (results.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: `No spreadsheets found matching: "${query}"`,
            },
          ],
        };
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                query,
                count: results.length,
                spreadsheets: results,
              },
              null,
              2
            ),
          },
        ],
      };
    }

    case "list_sheets": {
      const { spreadsheetId } = args as { spreadsheetId: string };
      const sheets = await listSheets(client, spreadsheetId);

      if (sheets.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: `No sheets found or spreadsheet not accessible: ${spreadsheetId}`,
            },
          ],
          isError: true,
        };
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ sheets }, null, 2),
          },
        ],
      };
    }

    case "get_spreadsheet_revisions": {
      const { spreadsheetId, maxResults } = args as { spreadsheetId: string; maxResults?: number };
      const revisions = await getSpreadsheetRevisions(client, spreadsheetId, maxResults || 10);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                count: revisions.length,
                revisions,
              },
              null,
              2
            ),
          },
        ],
      };
    }

    // ==========================================================================
    // Write/Create tools (Level 1)
    // ==========================================================================
    case "write_sheet_range": {
      const { spreadsheetId, range, values } = args as {
        spreadsheetId: string;
        range: string;
        values: (string | number | boolean | null)[][];
      };
      const result = await writeRange(client, spreadsheetId, range, values);

      if (!result) {
        return {
          content: [
            {
              type: "text",
              text: `Failed to write to range: ${range}`,
            },
          ],
          isError: true,
        };
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                success: true,
                updatedRange: result.updatedRange,
                updatedRows: result.updatedRows,
                updatedColumns: result.updatedColumns,
              },
              null,
              2
            ),
          },
        ],
      };
    }

    case "append_sheet_rows": {
      const { spreadsheetId, range, values } = args as {
        spreadsheetId: string;
        range: string;
        values: (string | number | boolean | null)[][];
      };
      const result = await appendRows(client, spreadsheetId, range, values);

      if (!result) {
        return {
          content: [
            {
              type: "text",
              text: `Failed to append rows to: ${range}`,
            },
          ],
          isError: true,
        };
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                success: true,
                updatedRange: result.updatedRange,
                rowsAppended: result.updatedRows,
              },
              null,
              2
            ),
          },
        ],
      };
    }

    case "update_cell": {
      const { spreadsheetId, cell, value } = args as {
        spreadsheetId: string;
        cell: string;
        value: string | number | boolean | null;
      };
      const success = await updateCell(client, spreadsheetId, cell, value);

      if (!success) {
        return {
          content: [
            {
              type: "text",
              text: `Failed to update cell: ${cell}`,
            },
          ],
          isError: true,
        };
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                success: true,
                cell,
                newValue: value,
              },
              null,
              2
            ),
          },
        ],
      };
    }

    case "create_spreadsheet": {
      const { title, sheetTitles } = args as { title: string; sheetTitles?: string[] };
      const result = await createSpreadsheet(client, title, sheetTitles);

      if (!result) {
        return {
          content: [
            {
              type: "text",
              text: `Failed to create spreadsheet: ${title}`,
            },
          ],
          isError: true,
        };
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                success: true,
                spreadsheet: result,
              },
              null,
              2
            ),
          },
        ],
      };
    }

    case "add_sheet": {
      const { spreadsheetId, title } = args as { spreadsheetId: string; title: string };
      const result = await addSheet(client, spreadsheetId, title);

      if (!result) {
        return {
          content: [
            {
              type: "text",
              text: `Failed to add sheet: ${title}`,
            },
          ],
          isError: true,
        };
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                success: true,
                sheet: result,
              },
              null,
              2
            ),
          },
        ],
      };
    }

    case "clear_range": {
      const { spreadsheetId, range } = args as { spreadsheetId: string; range: string };
      const success = await clearRange(client, spreadsheetId, range);

      if (!success) {
        return {
          content: [
            {
              type: "text",
              text: `Failed to clear range: ${range}`,
            },
          ],
          isError: true,
        };
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                success: true,
                clearedRange: range,
              },
              null,
              2
            ),
          },
        ],
      };
    }

    // ==========================================================================
    // Delete tools (Level 2)
    // ==========================================================================
    case "delete_sheet": {
      const { spreadsheetId, sheetId } = args as { spreadsheetId: string; sheetId: number };
      const success = await deleteSheet(client, spreadsheetId, sheetId);

      if (!success) {
        return {
          content: [
            {
              type: "text",
              text: `Failed to delete sheet: ${sheetId}`,
            },
          ],
          isError: true,
        };
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                success: true,
                deletedSheetId: sheetId,
              },
              null,
              2
            ),
          },
        ],
      };
    }

    case "delete_rows": {
      const { spreadsheetId, sheetId, startIndex, endIndex } = args as {
        spreadsheetId: string;
        sheetId: number;
        startIndex: number;
        endIndex: number;
      };
      const success = await deleteRows(client, spreadsheetId, sheetId, startIndex, endIndex);

      if (!success) {
        return {
          content: [
            {
              type: "text",
              text: `Failed to delete rows ${startIndex}-${endIndex}`,
            },
          ],
          isError: true,
        };
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                success: true,
                deletedRows: endIndex - startIndex,
                startIndex,
                endIndex,
              },
              null,
              2
            ),
          },
        ],
      };
    }

    case "delete_columns": {
      const { spreadsheetId, sheetId, startIndex, endIndex } = args as {
        spreadsheetId: string;
        sheetId: number;
        startIndex: number;
        endIndex: number;
      };
      const success = await deleteColumns(client, spreadsheetId, sheetId, startIndex, endIndex);

      if (!success) {
        return {
          content: [
            {
              type: "text",
              text: `Failed to delete columns ${startIndex}-${endIndex}`,
            },
          ],
          isError: true,
        };
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                success: true,
                deletedColumns: endIndex - startIndex,
                startIndex,
                endIndex,
              },
              null,
              2
            ),
          },
        ],
      };
    }

    case "trash_spreadsheet": {
      const { spreadsheetId } = args as { spreadsheetId: string };
      const success = await trashSpreadsheet(client, spreadsheetId);

      if (!success) {
        return {
          content: [
            {
              type: "text",
              text: `Failed to trash spreadsheet: ${spreadsheetId}`,
            },
          ],
          isError: true,
        };
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                success: true,
                trashedSpreadsheetId: spreadsheetId,
                note: "Spreadsheet moved to trash. Can be recovered from Google Drive trash within 30 days.",
              },
              null,
              2
            ),
          },
        ],
      };
    }

    default:
      return {
        content: [
          {
            type: "text",
            text: `Unknown Sheets tool: ${toolName}`,
          },
        ],
        isError: true,
      };
  }
}
