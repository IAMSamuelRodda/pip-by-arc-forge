/**
 * Connectors API Routes
 *
 * Unified endpoint for connector status and management.
 * Aggregates status from all OAuth providers (Xero, Gmail, Google Sheets).
 */

import { Router } from 'express';
import type { DatabaseProvider } from '@pip/core';
import { requireAuth } from '../middleware/auth.js';

export interface ConnectorStatus {
  connected: boolean;
  expired?: boolean;
  details?: string;  // tenantName for Xero, email for Google services
  expiresAt?: number;
}

export interface AllConnectorStatuses {
  xero: ConnectorStatus;
  gmail: ConnectorStatus;
  google_sheets: ConnectorStatus;
}

export function createConnectorRoutes(db: DatabaseProvider): Router {
  const router = Router();

  /**
   * GET /api/connectors/status
   * Get status of all connectors for the authenticated user
   */
  router.get('/status', requireAuth, async (req, res, next) => {
    try {
      const userId = req.userId!;

      // Fetch all OAuth tokens in parallel
      const [xeroTokens, gmailTokens, sheetsTokens] = await Promise.all([
        db.getOAuthTokens(userId, 'xero'),
        db.getOAuthTokens(userId, 'gmail'),
        db.getOAuthTokens(userId, 'google_sheets'),
      ]);

      const now = Date.now();

      const statuses: AllConnectorStatuses = {
        xero: xeroTokens
          ? {
              connected: true,
              expired: xeroTokens.expiresAt < now,
              details: xeroTokens.tenantName,
              expiresAt: xeroTokens.expiresAt,
            }
          : { connected: false },

        gmail: gmailTokens
          ? {
              connected: true,
              expired: gmailTokens.expiresAt < now,
              details: gmailTokens.providerEmail,
              expiresAt: gmailTokens.expiresAt,
            }
          : { connected: false },

        google_sheets: sheetsTokens
          ? {
              connected: true,
              expired: sheetsTokens.expiresAt < now,
              details: sheetsTokens.providerEmail,
              expiresAt: sheetsTokens.expiresAt,
            }
          : { connected: false },
      };

      res.json(statuses);
    } catch (error) {
      next(error);
    }
  });

  return router;
}
