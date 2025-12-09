/**
 * Pip - Unified VPS Server
 *
 * Single Express server that handles:
 * - Chat API (POST /api/chat)
 * - Session management (GET/POST /api/sessions)
 * - Xero OAuth flow (/auth/*)
 * - PWA static file serving
 *
 * Replaces AWS Lambda + API Gateway architecture
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import { createDatabaseProviderFromEnv } from '@pip/core';
import type { DatabaseProvider } from '@pip/core';

import { createChatRoutes } from './routes/chat.js';
import { createAuthRoutes } from './routes/auth.js';
import { createGmailAuthRoutes } from './routes/auth-gmail.js';
import { createSheetsAuthRoutes } from './routes/auth-sheets.js';
import { createUserAuthRoutes } from './routes/user-auth.js';
import { createConnectorRoutes } from './routes/connectors.js';
import { createSessionRoutes } from './routes/sessions.js';
import { createHealthRoutes } from './routes/health.js';
import { createDocumentRoutes } from './routes/documents.js';
import { createSettingsRoutes } from './routes/settings.js';
import { createMemoryRoutes } from './routes/memory.js';
import { createProjectRoutes } from './routes/projects.js';
import { createModelsRoutes } from './routes/models.js';
import { errorHandler } from './middleware/errorHandler.js';
import { requireAuth } from './middleware/auth.js';

// Load environment variables
config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const PORT = parseInt(process.env.PORT || '3000', 10);
const NODE_ENV = process.env.NODE_ENV || 'development';
const PWA_DIST_PATH = process.env.PWA_DIST_PATH || path.join(__dirname, '../../pwa-app/dist');

// Rate limiting configuration
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: NODE_ENV === 'production' ? 100 : 1000, // requests per minute
  message: { error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Create and configure Express application
 */
async function createApp(db: DatabaseProvider): Promise<express.Application> {
  const app = express();

  // Security middleware
  app.use(helmet({
    contentSecurityPolicy: NODE_ENV === 'production' ? {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "blob:"],
        connectSrc: ["'self'", "https://api.anthropic.com", "https://generativelanguage.googleapis.com", "https://openrouter.ai"],
      },
    } : false, // Disable CSP in dev
  }));

  // CORS configuration
  app.use(cors({
    origin: NODE_ENV === 'production'
      ? process.env.CORS_ORIGIN || true
      : true,
    credentials: true,
  }));

  // Compression
  app.use(compression());

  // Rate limiting on API routes
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  app.use('/api', limiter as any);

  // Body parsing
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Request logging in development
  if (NODE_ENV === 'development') {
    app.use((req, res, next) => {
      console.log(`${req.method} ${req.path}`);
      next();
    });
  }

  // API Routes (protected by auth)
  app.use('/api/chat', requireAuth, createChatRoutes(db));
  app.use('/api/sessions', requireAuth, createSessionRoutes(db));
  app.use('/api/documents', requireAuth, createDocumentRoutes(db));
  app.use('/api/settings', createSettingsRoutes(db));
  app.use('/api/memory', createMemoryRoutes());
  app.use('/api/projects', requireAuth, createProjectRoutes(db));
  app.use('/api/models', createModelsRoutes()); // Public - for Ollama warmup

  // Connectors status (protected)
  app.use('/api/connectors', createConnectorRoutes(db));

  // Auth routes (public)
  app.use('/auth', createUserAuthRoutes(db)); // signup, login, me
  app.use('/auth', createAuthRoutes(db)); // Xero OAuth
  app.use('/auth/google/gmail', createGmailAuthRoutes(db)); // Gmail OAuth
  app.use('/auth/google/sheets', createSheetsAuthRoutes(db)); // Google Sheets OAuth

  // Health check (public)
  app.use('/health', createHealthRoutes(db));

  // Serve PWA static files (production)
  if (NODE_ENV === 'production') {
    app.use(express.static(PWA_DIST_PATH));

    // SPA fallback - serve index.html for all non-API routes
    app.get('*', (req, res) => {
      if (!req.path.startsWith('/api') && !req.path.startsWith('/auth')) {
        res.sendFile(path.join(PWA_DIST_PATH, 'index.html'));
      }
    });
  }

  // Error handling
  app.use(errorHandler);

  return app;
}

/**
 * Start the server
 */
async function start(): Promise<void> {
  console.log('\n🚀 Starting Pip Server...\n');

  try {
    // Initialize database
    console.log('📦 Initializing database...');
    const db = await createDatabaseProviderFromEnv();
    console.log(`   ✅ Database: ${db.name}`);

    // Create Express app
    const app = await createApp(db);

    // Start listening
    app.listen(PORT, () => {
      console.log(`\n✨ Pip Server running!`);
      console.log(`   Environment: ${NODE_ENV}`);
      console.log(`   Port: ${PORT}`);
      console.log(`   Database: ${db.name}`);
      console.log(`\n📍 Endpoints:`);
      console.log(`   Chat:      POST http://localhost:${PORT}/api/chat`);
      console.log(`   Sessions:  GET  http://localhost:${PORT}/api/sessions`);
      console.log(`   Projects:  GET  http://localhost:${PORT}/api/projects`);
      console.log(`   Documents: POST http://localhost:${PORT}/api/documents/upload`);
      console.log(`   Auth:      GET  http://localhost:${PORT}/auth/xero`);
      console.log(`   Health:    GET  http://localhost:${PORT}/health`);
      if (NODE_ENV === 'production') {
        console.log(`   PWA:      GET  http://localhost:${PORT}/`);
      }
      console.log('');
    });

    // Graceful shutdown
    const shutdown = async () => {
      console.log('\n🛑 Shutting down gracefully...');
      await db.disconnect();
      process.exit(0);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
start();
