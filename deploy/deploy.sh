#!/bin/bash
# Pip Deployment Script
# Run from /opt/pip on VPS: ./deploy/deploy.sh
#
# This ensures all containers are rebuilt and restarted consistently.

set -e  # Exit on error

echo "🚀 Starting Pip deployment..."
echo ""

# Load environment variables
if [ -f .env ]; then
  echo "📋 Loading environment variables from .env..."
  set -a  # Export all variables
  source .env
  set +a
  echo ""
else
  echo "⚠️  No .env file found. Using existing environment variables."
  echo ""
fi

# Pull latest code
echo "📥 Pulling latest code..."
git pull origin main
echo ""

# Build all images
echo "🔨 Building Docker images..."

echo "  → Building pip-app..."
docker build -t pip-app:latest . --quiet

echo "  → Building pip-mcp..."
docker build -t pip-mcp:latest -f packages/mcp-remote-server/Dockerfile . --quiet

echo ""

# Stop and remove old containers
echo "🛑 Stopping old containers..."
docker stop pip-app pip-mcp 2>/dev/null || true
docker rm pip-app pip-mcp 2>/dev/null || true
echo ""

# Start pip-app
# Note: Host networking required for Tailscale access to local Ollama (100.64.0.2)
# Caddy must use localhost:3000 instead of pip-app:3000
echo "▶️  Starting pip-app..."
docker run -d --name pip-app \
  --restart unless-stopped \
  --network host \
  -v pip-data:/app/data \
  -e NODE_ENV=production \
  -e PORT=3000 \
  -e DATABASE_PATH=/app/data/pip.db \
  -e ANTHROPIC_API_KEY="$ANTHROPIC_API_KEY" \
  -e XERO_CLIENT_ID="$XERO_CLIENT_ID" \
  -e XERO_CLIENT_SECRET="$XERO_CLIENT_SECRET" \
  -e BASE_URL=https://app.pip.arcforge.au \
  -e FRONTEND_URL=https://app.pip.arcforge.au \
  -e JWT_SECRET="$JWT_SECRET" \
  -e OLLAMA_ENDPOINT="${OLLAMA_ENDPOINT:-http://100.64.0.2:11434}" \
  -e OLLAMA_MODEL="${OLLAMA_MODEL:-deepseek-coder:33b}" \
  pip-app:latest

# Start pip-mcp
echo "▶️  Starting pip-mcp..."
docker run -d --name pip-mcp \
  --restart unless-stopped \
  --network droplet_frontend \
  -v pip-data:/app/data \
  -e NODE_ENV=production \
  -e MCP_PORT=3001 \
  -e DATABASE_PATH=/app/data/pip.db \
  -e XERO_CLIENT_ID="$XERO_CLIENT_ID" \
  -e XERO_CLIENT_SECRET="$XERO_CLIENT_SECRET" \
  -e JWT_SECRET="$JWT_SECRET" \
  -e BASE_URL=https://mcp.pip.arcforge.au \
  -e MCP_OAUTH_CLIENT_ID="${MCP_OAUTH_CLIENT_ID:-pip-mcp-client}" \
  -e MCP_OAUTH_CLIENT_SECRET="$MCP_OAUTH_CLIENT_SECRET" \
  pip-mcp:latest

echo ""

# Wait for containers to start
echo "⏳ Waiting for containers to start..."
sleep 5

# Health checks
echo ""
echo "🏥 Running health checks..."

APP_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/health || echo "000")
MCP_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/health || echo "000")

if [ "$APP_HEALTH" = "200" ]; then
  echo "  ✅ pip-app: healthy"
else
  echo "  ❌ pip-app: unhealthy (HTTP $APP_HEALTH)"
  docker logs pip-app --tail 20
fi

if [ "$MCP_HEALTH" = "200" ]; then
  echo "  ✅ pip-mcp: healthy"
else
  echo "  ❌ pip-mcp: unhealthy (HTTP $MCP_HEALTH)"
  docker logs pip-mcp --tail 20
fi

echo ""
echo "📊 Container status:"
docker ps --filter name=pip --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

echo ""
echo "🎉 Deployment complete!"
