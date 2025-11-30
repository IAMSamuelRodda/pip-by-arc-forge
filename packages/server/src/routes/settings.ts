/**
 * User Settings Routes
 *
 * Handles safety settings and user preferences
 */

import { Router } from 'express';
import type { DatabaseProvider, PermissionLevel } from '@pip/core';
import { requireAuth } from '../middleware/auth.js';

export function createSettingsRoutes(db: DatabaseProvider): Router {
  const router = Router();

  /**
   * GET /api/settings
   * Get current user settings
   */
  router.get('/', requireAuth, async (req, res, next) => {
    try {
      let settings = await db.getUserSettings(req.userId!);

      // Create default settings if none exist
      if (!settings) {
        settings = await db.upsertUserSettings({
          userId: req.userId!,
          permissionLevel: 0,
          requireConfirmation: true,
          dailyEmailSummary: true,
          require2FA: false,
        });
      }

      res.json({
        settings: {
          permissionLevel: settings.permissionLevel,
          requireConfirmation: settings.requireConfirmation,
          dailyEmailSummary: settings.dailyEmailSummary,
          require2FA: settings.require2FA,
          vacationModeUntil: settings.vacationModeUntil,
        },
      });
    } catch (error) {
      next(error);
    }
  });

  /**
   * PUT /api/settings
   * Update user settings
   */
  router.put('/', requireAuth, async (req, res, next) => {
    try {
      const {
        permissionLevel,
        requireConfirmation,
        dailyEmailSummary,
        require2FA,
        vacationModeUntil,
      } = req.body;

      // Validate permission level
      if (permissionLevel !== undefined) {
        if (![0, 1, 2, 3].includes(permissionLevel)) {
          return res.status(400).json({
            error: 'Invalid permission level. Must be 0, 1, 2, or 3.',
          });
        }
      }

      // Validate vacation mode date
      if (vacationModeUntil !== undefined && vacationModeUntil !== null) {
        if (typeof vacationModeUntil !== 'number' || vacationModeUntil < Date.now()) {
          return res.status(400).json({
            error: 'Vacation mode date must be in the future.',
          });
        }
      }

      const settings = await db.upsertUserSettings({
        userId: req.userId!,
        ...(permissionLevel !== undefined && { permissionLevel: permissionLevel as PermissionLevel }),
        ...(requireConfirmation !== undefined && { requireConfirmation }),
        ...(dailyEmailSummary !== undefined && { dailyEmailSummary }),
        ...(require2FA !== undefined && { require2FA }),
        ...(vacationModeUntil !== undefined && { vacationModeUntil: vacationModeUntil || undefined }),
      });

      console.log(`✅ Settings updated for user ${req.userId}: level=${settings.permissionLevel}`);

      res.json({
        settings: {
          permissionLevel: settings.permissionLevel,
          requireConfirmation: settings.requireConfirmation,
          dailyEmailSummary: settings.dailyEmailSummary,
          require2FA: settings.require2FA,
          vacationModeUntil: settings.vacationModeUntil,
        },
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
