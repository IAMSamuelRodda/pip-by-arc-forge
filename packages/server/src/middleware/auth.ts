/**
 * Authentication Middleware
 *
 * Protects routes that require a logged-in user
 */

import type { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../services/auth.js';

// Extend Express Request type to include userId
declare global {
  namespace Express {
    interface Request {
      userId?: string;
      userEmail?: string;
    }
  }
}

/**
 * Middleware that requires a valid JWT token
 * Sets req.userId and req.userEmail if valid
 */
export function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  const token = authHeader.replace('Bearer ', '');

  if (!token) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  const decoded = verifyToken(token);

  if (!decoded) {
    res.status(401).json({ error: 'Invalid or expired token' });
    return;
  }

  // Attach user info to request
  req.userId = decoded.userId;
  req.userEmail = decoded.email;

  next();
}

/**
 * Optional auth middleware - sets userId if token present, but doesn't require it
 * Useful for routes that work differently for logged-in vs anonymous users
 */
export function optionalAuth(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;

  if (authHeader) {
    const token = authHeader.replace('Bearer ', '');
    const decoded = verifyToken(token);

    if (decoded) {
      req.userId = decoded.userId;
      req.userEmail = decoded.email;
    }
  }

  next();
}
