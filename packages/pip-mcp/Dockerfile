# Pip MCP Remote Server - Production Dockerfile
# For Claude.ai and ChatGPT integration via MCP protocol

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
COPY packages/pip-mcp/package.json ./packages/pip-mcp/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY tsconfig.json ./
COPY packages/core/ ./packages/core/
COPY packages/pip-mcp/ ./packages/pip-mcp/

# Build packages
RUN pnpm --filter @pip/core run build && \
    pnpm --filter @pip/mcp-remote-server run build

# ============================================
# Stage 2: Production
# ============================================
FROM node:20-alpine AS production

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S pip-mcp -u 1001 -G nodejs

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/core/package.json ./packages/core/
COPY packages/pip-mcp/package.json ./packages/pip-mcp/

# Install production dependencies only
RUN pnpm install --frozen-lockfile --prod

# Copy built files from builder
COPY --from=builder /app/packages/core/dist ./packages/core/dist
COPY --from=builder /app/packages/pip-mcp/dist ./packages/pip-mcp/dist

# Create data directory for SQLite (shared with main server)
RUN mkdir -p /app/data && chown -R pip-mcp:nodejs /app/data

# Switch to non-root user
USER pip-mcp

# Environment variables
ENV NODE_ENV=production
ENV MCP_PORT=3001
ENV DATABASE_PATH=/app/data/pip.db

# Expose MCP server port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3001/health || exit 1

# Start MCP server
CMD ["node", "packages/pip-mcp/dist/index.js"]
