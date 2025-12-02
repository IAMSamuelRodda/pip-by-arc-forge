/**
 * Gmail Service for MCP Remote Server
 *
 * Handles Gmail API interactions with token management.
 * Uses gmail.readonly scope (RESTRICTED - Testing Mode with 100 user limit)
 * Refresh tokens expire after 7 days in Testing Mode.
 */

import { google, gmail_v1 } from "googleapis";
import { createDatabaseProvider, type OAuthTokens, type DatabaseProvider } from "@pip/core";

// Google OAuth configuration
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";

// Initialize database provider (SQLite by default)
const dbPath = process.env.DATABASE_PATH || "./data/pip.db";
let db: DatabaseProvider;

// Initialize database (called at startup)
async function initDatabase(): Promise<void> {
  if (!db) {
    db = await createDatabaseProvider({
      provider: "sqlite",
      connection: { type: "sqlite", filename: dbPath },
    });
  }
}

// Ensure database is initialized before use
async function getDb(): Promise<DatabaseProvider> {
  if (!db) {
    await initDatabase();
  }
  return db;
}

export interface GmailClient {
  gmail: gmail_v1.Gmail;
  email: string;
}

/**
 * Get Gmail client with valid tokens for a user
 */
export async function getGmailClient(userId: string): Promise<GmailClient | null> {
  try {
    const database = await getDb();
    // Get tokens from database
    let tokens = await database.getOAuthTokens(userId, "gmail");

    if (!tokens) {
      return null;
    }

    // Check if token needs refresh (5-minute buffer)
    if (tokens.expiresAt < Date.now() + 5 * 60 * 1000) {
      tokens = await refreshGmailTokens(tokens);
      if (!tokens) {
        return null;
      }
    }

    // Initialize Gmail client with OAuth2
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );

    oauth2Client.setCredentials({
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
    });

    const gmail = google.gmail({ version: "v1", auth: oauth2Client });

    return {
      gmail,
      email: tokens.providerEmail || "unknown",
    };
  } catch (error) {
    console.error("Error getting Gmail client:", error);
    return null;
  }
}

/**
 * Refresh expired Gmail tokens
 * Note: In Testing Mode, refresh tokens expire after 7 days
 */
async function refreshGmailTokens(tokens: OAuthTokens): Promise<OAuthTokens | null> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.error("Google OAuth not configured");
    return null;
  }

  try {
    const response = await fetch(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: tokens.refreshToken,
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      // Check for expired refresh token (Testing Mode: 7 days)
      if (response.status === 400 && errorText.includes("invalid_grant")) {
        console.error("Gmail refresh token expired (Testing Mode: 7-day limit). User needs to reconnect.");
        return null;
      }
      console.error("Gmail token refresh failed:", errorText);
      return null;
    }

    const data = await response.json() as {
      access_token: string;
      refresh_token?: string;
      expires_in: number;
    };

    const updatedTokens: OAuthTokens = {
      ...tokens,
      accessToken: data.access_token,
      // Google may return a new refresh token
      refreshToken: data.refresh_token || tokens.refreshToken,
      expiresAt: Date.now() + data.expires_in * 1000,
      updatedAt: Date.now(),
    };

    const database = await getDb();
    await database.saveOAuthTokens(updatedTokens);
    console.log(`Gmail tokens refreshed for user ${tokens.userId}`);

    return updatedTokens;
  } catch (error) {
    console.error("Error refreshing Gmail tokens:", error);
    return null;
  }
}

/**
 * Check if a user has Gmail connected
 */
export async function isGmailConnected(userId: string): Promise<boolean> {
  const database = await getDb();
  const tokens = await database.getOAuthTokens(userId, "gmail");
  return tokens !== null;
}

/**
 * Get Gmail connection status for a user
 */
export async function getGmailStatus(userId: string): Promise<{
  connected: boolean;
  email?: string;
  expired?: boolean;
}> {
  const database = await getDb();
  const tokens = await database.getOAuthTokens(userId, "gmail");

  if (!tokens) {
    return { connected: false };
  }

  return {
    connected: true,
    email: tokens.providerEmail,
    expired: tokens.expiresAt < Date.now(),
  };
}

// ============================================================================
// Gmail API Helper Functions
// ============================================================================

export interface EmailMessage {
  id: string;
  threadId: string;
  subject: string;
  from: string;
  to: string;
  date: string;
  snippet: string;
  hasAttachments: boolean;
}

export interface EmailContent {
  id: string;
  threadId: string;
  labelIds: string[];
  subject: string;
  from: string;
  to: string;
  cc?: string;
  date: string;
  bodyText?: string;
  bodyHtml?: string;
  attachments: AttachmentInfo[];
}

export interface AttachmentInfo {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
}

export interface AttachmentData {
  filename: string;
  mimeType: string;
  size: number;
  data: string; // base64 encoded
}

/**
 * Search Gmail messages
 * Uses Gmail query syntax: https://support.google.com/mail/answer/7190
 */
export async function searchGmail(
  client: GmailClient,
  query: string,
  maxResults: number = 20
): Promise<EmailMessage[]> {
  const response = await client.gmail.users.messages.list({
    userId: "me",
    q: query,
    maxResults,
  });

  const messages = response.data.messages || [];
  const results: EmailMessage[] = [];

  // Fetch details for each message (in parallel with limit)
  const batchSize = 10;
  for (let i = 0; i < messages.length; i += batchSize) {
    const batch = messages.slice(i, i + batchSize);
    const details = await Promise.all(
      batch.map(async (msg) => {
        const detail = await client.gmail.users.messages.get({
          userId: "me",
          id: msg.id!,
          format: "metadata",
          metadataHeaders: ["From", "To", "Subject", "Date"],
        });
        return detail.data;
      })
    );

    for (const msg of details) {
      const headers = msg.payload?.headers || [];
      const getHeader = (name: string) =>
        headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value || "";

      results.push({
        id: msg.id!,
        threadId: msg.threadId!,
        subject: getHeader("Subject"),
        from: getHeader("From"),
        to: getHeader("To"),
        date: getHeader("Date"),
        snippet: msg.snippet || "",
        hasAttachments: (msg.payload?.parts || []).some(
          (p) => p.filename && p.filename.length > 0
        ),
      });
    }
  }

  return results;
}

/**
 * Get full email content including body and attachment metadata
 */
export async function getEmailContent(
  client: GmailClient,
  messageId: string
): Promise<EmailContent | null> {
  const response = await client.gmail.users.messages.get({
    userId: "me",
    id: messageId,
    format: "full",
  });

  const msg = response.data;
  if (!msg) return null;

  const headers = msg.payload?.headers || [];
  const getHeader = (name: string) =>
    headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value || "";

  // Extract body
  let bodyText: string | undefined;
  let bodyHtml: string | undefined;

  const extractBody = (parts: gmail_v1.Schema$MessagePart[] | undefined) => {
    if (!parts) return;
    for (const part of parts) {
      if (part.mimeType === "text/plain" && part.body?.data) {
        bodyText = Buffer.from(part.body.data, "base64").toString("utf-8");
      } else if (part.mimeType === "text/html" && part.body?.data) {
        bodyHtml = Buffer.from(part.body.data, "base64").toString("utf-8");
      } else if (part.parts) {
        extractBody(part.parts);
      }
    }
  };

  // Check single-part messages
  if (msg.payload?.body?.data) {
    const decoded = Buffer.from(msg.payload.body.data, "base64").toString("utf-8");
    if (msg.payload.mimeType === "text/plain") {
      bodyText = decoded;
    } else if (msg.payload.mimeType === "text/html") {
      bodyHtml = decoded;
    }
  }

  // Check multipart messages
  extractBody(msg.payload?.parts);

  // Extract attachment metadata
  const attachments: AttachmentInfo[] = [];
  const extractAttachments = (parts: gmail_v1.Schema$MessagePart[] | undefined) => {
    if (!parts) return;
    for (const part of parts) {
      if (part.filename && part.filename.length > 0 && part.body?.attachmentId) {
        attachments.push({
          id: part.body.attachmentId,
          filename: part.filename,
          mimeType: part.mimeType || "application/octet-stream",
          size: part.body.size || 0,
        });
      }
      if (part.parts) {
        extractAttachments(part.parts);
      }
    }
  };
  extractAttachments(msg.payload?.parts);

  return {
    id: msg.id!,
    threadId: msg.threadId!,
    labelIds: msg.labelIds || [],
    subject: getHeader("Subject"),
    from: getHeader("From"),
    to: getHeader("To"),
    cc: getHeader("Cc") || undefined,
    date: getHeader("Date"),
    bodyText,
    bodyHtml,
    attachments,
  };
}

/**
 * Download an attachment
 */
export async function downloadAttachment(
  client: GmailClient,
  messageId: string,
  attachmentId: string
): Promise<AttachmentData | null> {
  // First get the message to find attachment metadata
  const msgResponse = await client.gmail.users.messages.get({
    userId: "me",
    id: messageId,
    format: "full",
  });

  // Find attachment info recursively
  const findAttachment = (parts: gmail_v1.Schema$MessagePart[] | undefined): AttachmentInfo | null => {
    if (!parts) return null;
    for (const part of parts) {
      if (part.body?.attachmentId === attachmentId) {
        return {
          id: attachmentId,
          filename: part.filename || "attachment",
          mimeType: part.mimeType || "application/octet-stream",
          size: part.body.size || 0,
        };
      }
      if (part.parts) {
        const found = findAttachment(part.parts);
        if (found) return found;
      }
    }
    return null;
  };

  const attachmentInfo = findAttachment(msgResponse.data.payload?.parts);

  if (!attachmentInfo) {
    return null;
  }

  // Download the attachment data
  const attachmentResponse = await client.gmail.users.messages.attachments.get({
    userId: "me",
    messageId,
    id: attachmentId,
  });

  if (!attachmentResponse.data.data) {
    return null;
  }

  return {
    filename: attachmentInfo.filename,
    mimeType: attachmentInfo.mimeType,
    size: attachmentInfo.size,
    data: attachmentResponse.data.data, // Already base64 encoded
  };
}

/**
 * List attachments from emails matching a query
 */
export async function listEmailAttachments(
  client: GmailClient,
  query: string = "has:attachment",
  maxResults: number = 20
): Promise<Array<AttachmentInfo & { messageId: string; emailSubject: string; emailFrom: string; emailDate: string }>> {
  // Add has:attachment to query if not present
  const fullQuery = query.includes("has:attachment") ? query : `${query} has:attachment`;

  const response = await client.gmail.users.messages.list({
    userId: "me",
    q: fullQuery,
    maxResults,
  });

  const messages = response.data.messages || [];
  const results: Array<AttachmentInfo & { messageId: string; emailSubject: string; emailFrom: string; emailDate: string }> = [];

  // Fetch details for each message
  for (const msg of messages) {
    const detail = await client.gmail.users.messages.get({
      userId: "me",
      id: msg.id!,
      format: "full",
    });

    const headers = detail.data.payload?.headers || [];
    const getHeader = (name: string) =>
      headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value || "";

    // Extract attachments
    const extractAttachments = (parts: gmail_v1.Schema$MessagePart[] | undefined) => {
      if (!parts) return;
      for (const part of parts) {
        if (part.filename && part.filename.length > 0 && part.body?.attachmentId) {
          results.push({
            id: part.body.attachmentId,
            filename: part.filename,
            mimeType: part.mimeType || "application/octet-stream",
            size: part.body.size || 0,
            messageId: msg.id!,
            emailSubject: getHeader("Subject"),
            emailFrom: getHeader("From"),
            emailDate: getHeader("Date"),
          });
        }
        if (part.parts) {
          extractAttachments(part.parts);
        }
      }
    };
    extractAttachments(detail.data.payload?.parts);
  }

  return results;
}
