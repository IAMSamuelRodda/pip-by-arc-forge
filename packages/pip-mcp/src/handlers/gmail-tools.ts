/**
 * Gmail MCP Tools
 *
 * Provides Gmail integration tools for searching emails and extracting attachments.
 * Uses gmail.readonly scope (RESTRICTED - Testing Mode with 100 user limit)
 */

import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { ProviderToolDefinition } from "../types/tools.js";
import {
  getGmailClient,
  searchGmail,
  getEmailContent,
  downloadAttachment,
  listEmailAttachments,
  isGmailConnected,
} from "../services/gmail.js";

// Tool definitions for the registry
export const gmailToolDefinitions: ProviderToolDefinition[] = [
  {
    provider: "gmail",
    providerType: "email",
    category: "search",
    name: "gmail:search_gmail",
    shortName: "search_gmail",
    description: `Search Gmail for emails. Uses Gmail query syntax:
- from:sender@example.com - From specific sender
- subject:invoice - Subject contains word
- has:attachment - Has attachments
- filename:pdf - Attachment filename contains
- after:2025/01/01 - After date
- before:2025/12/31 - Before date
- is:unread - Unread only
Examples: "from:supplier@dental.com has:attachment filename:pdf after:2025/01/01"`,
    inputSchema: {
      type: "object" as const,
      properties: {
        query: {
          type: "string",
          description: "Gmail search query (same syntax as Gmail search box)",
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
    provider: "gmail",
    providerType: "email",
    category: "search",
    name: "gmail:get_email_content",
    shortName: "get_email_content",
    description: "Get full content of a specific email including body text and attachment list",
    inputSchema: {
      type: "object" as const,
      properties: {
        messageId: {
          type: "string",
          description: "The message ID from search_gmail results",
        },
      },
      required: ["messageId"],
    },
  },
  {
    provider: "gmail",
    providerType: "email",
    category: "attachments",
    name: "gmail:download_attachment",
    shortName: "download_attachment",
    description:
      "Download an email attachment. For images (PNG, JPG, GIF, WebP), returns viewable image content. For other files, returns base64-encoded data. Max size: 1MB.",
    inputSchema: {
      type: "object" as const,
      properties: {
        messageId: {
          type: "string",
          description: "The message ID containing the attachment",
        },
        attachmentId: {
          type: "string",
          description: "The attachment ID from get_email_content results",
        },
      },
      required: ["messageId", "attachmentId"],
    },
  },
  {
    provider: "gmail",
    providerType: "email",
    category: "attachments",
    name: "gmail:list_email_attachments",
    shortName: "list_email_attachments",
    description: "List all attachments from emails matching a search query",
    inputSchema: {
      type: "object" as const,
      properties: {
        query: {
          type: "string",
          description: "Gmail search query (has:attachment is added automatically)",
        },
        maxResults: {
          type: "number",
          description: "Maximum number of emails to search (default: 20)",
        },
      },
    },
  },
];

/**
 * Execute a Gmail tool by name
 */
export async function executeGmailTool(
  userId: string,
  toolName: string,
  args: Record<string, unknown>
): Promise<CallToolResult> {
  // Check if Gmail is connected
  const connected = await isGmailConnected(userId);
  if (!connected) {
    return {
      content: [
        {
          type: "text",
          text: "Gmail is not connected. Please connect your Gmail account in Pip settings first.",
        },
      ],
      isError: true,
    };
  }

  // Get Gmail client
  const client = await getGmailClient(userId);
  if (!client) {
    return {
      content: [
        {
          type: "text",
          text: "Failed to get Gmail client. Your Gmail connection may have expired (tokens expire after 7 days in testing mode). Please reconnect in Pip settings.",
        },
      ],
      isError: true,
    };
  }

  switch (toolName) {
    case "search_gmail": {
      const { query, maxResults } = args as { query: string; maxResults?: number };
      const results = await searchGmail(client, query, Math.min(maxResults || 20, 50));

      if (results.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: `No emails found matching: "${query}"`,
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
                emails: results.map((e) => ({
                  id: e.id,
                  subject: e.subject,
                  from: e.from,
                  date: e.date,
                  hasAttachments: e.hasAttachments,
                  snippet: e.snippet.substring(0, 100) + (e.snippet.length > 100 ? "..." : ""),
                })),
              },
              null,
              2
            ),
          },
        ],
      };
    }

    case "get_email_content": {
      const { messageId } = args as { messageId: string };
      const content = await getEmailContent(client, messageId);

      if (!content) {
        return {
          content: [
            {
              type: "text",
              text: `Email not found: ${messageId}`,
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
                id: content.id,
                subject: content.subject,
                from: content.from,
                to: content.to,
                cc: content.cc,
                date: content.date,
                bodyText: content.bodyText
                  ? content.bodyText.substring(0, 5000) + (content.bodyText.length > 5000 ? "... [truncated]" : "")
                  : null,
                attachments: content.attachments,
              },
              null,
              2
            ),
          },
        ],
      };
    }

    case "download_attachment": {
      const { messageId, attachmentId } = args as { messageId: string; attachmentId: string };
      const attachment = await downloadAttachment(client, messageId, attachmentId);

      if (!attachment) {
        return {
          content: [
            {
              type: "text",
              text: `Attachment not found: ${attachmentId} in message ${messageId}`,
            },
          ],
          isError: true,
        };
      }

      // Size limit: 1MB (Claude Desktop limitation)
      const MAX_SIZE = 1024 * 1024;
      if (attachment.size > MAX_SIZE) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  filename: attachment.filename,
                  mimeType: attachment.mimeType,
                  size: attachment.size,
                  sizeFormatted: `${(attachment.size / 1024 / 1024).toFixed(2)} MB`,
                  note: "Attachment exceeds 1MB limit. Cannot be displayed or processed inline.",
                  suggestion: "For large files, consider downloading via email client or automation workflow.",
                },
                null,
                2
              ),
            },
          ],
        };
      }

      // Check if this is an image type that Claude can display
      const imageTypes = ["image/png", "image/jpeg", "image/jpg", "image/gif", "image/webp"];
      const isImage = imageTypes.includes(attachment.mimeType.toLowerCase());

      if (isImage) {
        // Return ImageContent so Claude can actually see the image
        return {
          content: [
            {
              type: "text",
              text: `Image attachment: ${attachment.filename} (${(attachment.size / 1024).toFixed(1)} KB)`,
            },
            {
              type: "image",
              data: attachment.data, // base64 encoded
              mimeType: attachment.mimeType,
            },
          ],
        };
      }

      // For non-image files, return as JSON with base64 data
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                filename: attachment.filename,
                mimeType: attachment.mimeType,
                size: attachment.size,
                sizeFormatted: `${(attachment.size / 1024).toFixed(1)} KB`,
                data: attachment.data, // base64 encoded
                note: "Non-image attachment. Base64 data included for processing.",
              },
              null,
              2
            ),
          },
        ],
      };
    }

    case "list_email_attachments": {
      const { query, maxResults } = args as { query?: string; maxResults?: number };
      const attachments = await listEmailAttachments(client, query || "", maxResults || 20);

      if (attachments.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: `No attachments found${query ? ` matching: "${query}"` : ""}`,
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
                count: attachments.length,
                attachments: attachments.map((a) => ({
                  messageId: a.messageId,
                  attachmentId: a.id,
                  filename: a.filename,
                  mimeType: a.mimeType,
                  size: a.size,
                  emailSubject: a.emailSubject,
                  emailFrom: a.emailFrom,
                  emailDate: a.emailDate,
                })),
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
            text: `Unknown Gmail tool: ${toolName}`,
          },
        ],
        isError: true,
      };
  }
}
