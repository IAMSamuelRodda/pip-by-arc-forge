# Pip - Production Dockerfile
# Multi-stage build for minimal image size

# ============================================
# Stage 1: Build
# ============================================
FROM node:20-alpine AS builder

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

WORKDIR /app

# Copy package files first (better layer caching)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/core/package.json ./packages/core/
COPY packages/agent-core/package.json ./packages/agent-core/
COPY packages/server/package.json ./packages/server/
COPY packages/pwa-app/package.json ./packages/pwa-app/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY tsconfig.json ./
COPY packages/core/ ./packages/core/
COPY packages/agent-core/ ./packages/agent-core/
COPY packages/server/ ./packages/server/
COPY packages/pwa-app/ ./packages/pwa-app/

# Build all packages (including PWA)
RUN pnpm --filter @pip/core run build && \
    pnpm --filter @pip/agent-core run build && \
    pnpm --filter @pip/server run build && \
    pnpm --filter @pip/pwa-app run build

# ============================================
# Stage 2: Production
# ============================================
FROM node:20-alpine AS production

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S pip-app -u 1001 -G nodejs

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/core/package.json ./packages/core/
COPY packages/agent-core/package.json ./packages/agent-core/
COPY packages/server/package.json ./packages/server/

# Install production dependencies only
RUN pnpm install --frozen-lockfile --prod

# Copy built files from builder
COPY --from=builder /app/packages/core/dist ./packages/core/dist
COPY --from=builder /app/packages/agent-core/dist ./packages/agent-core/dist
COPY --from=builder /app/packages/server/dist ./packages/server/dist
COPY --from=builder /app/packages/pwa-app/dist ./packages/pwa-app/dist

# Create data directory for SQLite
RUN mkdir -p /app/data && chown -R pip-app:nodejs /app/data

# Switch to non-root user
USER pip-app

# Environment variables
ENV NODE_ENV=production
ENV PORT=3000
ENV DATABASE_PROVIDER=sqlite
ENV DATABASE_PATH=/app/data/pip.db

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# Start server
CMD ["node", "packages/server/dist/index.js"]
