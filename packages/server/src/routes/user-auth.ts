/**
 * User Authentication Routes
 *
 * Handles signup, login, and user profile endpoints
 */

import { Router } from 'express';
import type { DatabaseProvider } from '@zero-agent/core';
import {
  hashPassword,
  verifyPassword,
  generateToken,
  generateInviteCode,
  validatePassword,
  validateEmail,
} from '../services/auth.js';
import { requireAuth } from '../middleware/auth.js';

export function createUserAuthRoutes(db: DatabaseProvider): Router {
  const router = Router();

  /**
   * POST /auth/signup
   * Create a new account with invite code
   */
  router.post('/signup', async (req, res, next) => {
    try {
      const { email, password, name, inviteCode } = req.body;

      // Validate required fields
      if (!email || !password || !inviteCode) {
        return res.status(400).json({
          error: 'Missing required fields: email, password, inviteCode',
        });
      }

      // Validate email format
      const emailError = validateEmail(email);
      if (emailError) {
        return res.status(400).json({ error: emailError });
      }

      // Validate password strength
      const passwordError = validatePassword(password);
      if (passwordError) {
        return res.status(400).json({ error: passwordError });
      }

      // Check invite code
      const code = await db.getInviteCode(inviteCode);
      if (!code) {
        return res.status(400).json({ error: 'Invalid invite code' });
      }

      if (code.usedBy) {
        return res.status(400).json({ error: 'Invite code already used' });
      }

      if (code.expiresAt && code.expiresAt < Date.now()) {
        return res.status(400).json({ error: 'Invite code expired' });
      }

      // Check if email already registered
      const existingUser = await db.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ error: 'Email already registered' });
      }

      // Hash password and create user
      const passwordHash = await hashPassword(password);
      const user = await db.createUser({
        email,
        passwordHash,
        name,
        isAdmin: false,
      });

      // Mark invite code as used
      await db.useInviteCode(inviteCode, user.id);

      // Generate token
      const token = generateToken(user.id, user.email);

      console.log(`✅ New user registered: ${email}`);

      res.status(201).json({
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
      });
    } catch (error) {
      next(error);
    }
  });

  /**
   * POST /auth/login
   * Login with email and password
   */
  router.post('/login', async (req, res, next) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          error: 'Missing required fields: email, password',
        });
      }

      // Find user
      const user = await db.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      // Verify password
      const isValid = await verifyPassword(password, user.passwordHash);
      if (!isValid) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      // Update last login
      await db.updateUser(user.id, { lastLoginAt: Date.now() });

      // Generate token
      const token = generateToken(user.id, user.email);

      console.log(`✅ User logged in: ${email}`);

      res.json({
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
      });
    } catch (error) {
      next(error);
    }
  });

  /**
   * GET /auth/me
   * Get current user info
   */
  router.get('/me', requireAuth, async (req, res, next) => {
    try {
      const user = await db.getUserById(req.userId!);

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          isAdmin: user.isAdmin,
          createdAt: user.createdAt,
        },
      });
    } catch (error) {
      next(error);
    }
  });

  /**
   * POST /auth/invite-codes
   * Generate new invite codes (admin only)
   */
  router.post('/invite-codes', requireAuth, async (req, res, next) => {
    try {
      const user = await db.getUserById(req.userId!);

      if (!user?.isAdmin) {
        return res.status(403).json({ error: 'Admin access required' });
      }

      const { count = 1, expiresInDays } = req.body;
      const codes: string[] = [];

      const expiresAt = expiresInDays
        ? Date.now() + expiresInDays * 24 * 60 * 60 * 1000
        : undefined;

      for (let i = 0; i < Math.min(count, 50); i++) {
        const code = generateInviteCode();
        await db.createInviteCode(code, req.userId!, expiresAt);
        codes.push(code);
      }

      console.log(`✅ Generated ${codes.length} invite codes by ${user.email}`);

      res.status(201).json({ codes });
    } catch (error) {
      next(error);
    }
  });

  /**
   * GET /auth/invite-codes
   * List all invite codes (admin only)
   */
  router.get('/invite-codes', requireAuth, async (req, res, next) => {
    try {
      const user = await db.getUserById(req.userId!);

      if (!user?.isAdmin) {
        return res.status(403).json({ error: 'Admin access required' });
      }

      const codes = await db.listInviteCodes();

      res.json({
        codes: codes.map((c) => ({
          code: c.code,
          createdAt: c.createdAt,
          expiresAt: c.expiresAt,
          used: !!c.usedBy,
          usedAt: c.usedAt,
        })),
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
