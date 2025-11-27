# Zero Agent - Deployment Guide

## Quick Start: Deploy to VPS

This guide will get your Zero Agent deployed and ready for use.

**Cost:** $0/month (using existing VPS) or ~$6/month (new droplet)

---

## Prerequisites

### 1. VPS with Docker

You need a VPS with:
- Docker and Docker Compose installed
- Caddy or nginx for reverse proxy
- A domain pointing to your VPS

### 2. Xero Developer Account

1. Go to https://developer.xero.com/
2. Sign up / Log in
3. Click "My Apps" → "New App"
4. Fill in:
   - **App name:** Zero Agent
   - **Integration type:** Web app
   - **Company/App URL:** https://yourdomain.com
   - **Redirect URI:** https://yourdomain.com/auth/xero/callback
5. Save your:
   - **Client ID**
   - **Client Secret** (click "Generate a secret")

### 3. Anthropic API Key

1. Go to https://console.anthropic.com/
2. Navigate to "API Keys"
3. Create new key
4. Copy the key (starts with `sk-ant-...`)

---

## Step 1: Clone Repository

```bash
ssh root@your-vps-ip

# Clone to /opt
cd /opt
git clone https://github.com/IAMSamuelRodda/zero-agent.git
cd zero-agent
```

---

## Step 2: Configure Environment

```bash
# Create .env file
cat > .env << 'EOF'
# Anthropic
ANTHROPIC_API_KEY=sk-ant-your-key-here

# Xero OAuth
XERO_CLIENT_ID=your-client-id
XERO_CLIENT_SECRET=your-client-secret
XERO_REDIRECT_URI=https://yourdomain.com/auth/xero/callback

# Server
NODE_ENV=production
PORT=3000
DATABASE_PROVIDER=sqlite
DATABASE_PATH=/app/data/zero-agent.db
EOF

# Secure the file
chmod 600 .env
```

---

## Step 3: Configure Caddy

Add to your Caddyfile (typically `/opt/docker/droplet/Caddyfile`):

```
yourdomain.com {
    reverse_proxy zero-agent:3000
}
```

---

## Step 4: Build and Deploy

```bash
# Build Docker image
docker build -t zero-agent .

# Start with docker-compose
docker compose up -d

# Check logs
docker logs zero-agent -f
```

---

## Step 5: Verify Deployment

```bash
# Health check
curl https://yourdomain.com/health

# Expected response:
# {"status":"ok","timestamp":"..."}
```

---

## Step 6: Connect Xero

1. Visit `https://yourdomain.com/auth/xero`
2. Authorize with your Xero account
3. You'll be redirected back to the app

---

## Backup Configuration

Set up daily SQLite backups:

```bash
# Create backup script
cat > /opt/backups/backup-zero-agent.sh << 'EOF'
#!/bin/bash
BACKUP_DIR=/opt/backups/zero-agent
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Copy database from container
docker cp zero-agent:/app/data/zero-agent.db "$BACKUP_DIR/zero-agent_$TIMESTAMP.db"

# Keep only last 7 days
find $BACKUP_DIR -name "zero-agent_*.db" -mtime +7 -delete

echo "Backup completed: zero-agent_$TIMESTAMP.db"
EOF

chmod +x /opt/backups/backup-zero-agent.sh

# Add to cron (daily at 3am)
echo "0 3 * * * /opt/backups/backup-zero-agent.sh" | crontab -
```

---

## Troubleshooting

### Container won't start

Check logs:
```bash
docker logs zero-agent
```

Common issues:
- Missing environment variables
- Port already in use
- Network not found

### Xero OAuth fails

1. Verify redirect URI matches exactly in Xero app settings
2. Check XERO_CLIENT_ID and XERO_CLIENT_SECRET are correct
3. Ensure no trailing slash in redirect URI

### Database errors

```bash
# Check if database directory exists
docker exec zero-agent ls -la /app/data

# Restart container
docker compose restart zero-agent
```

---

## Updating

```bash
cd /opt/zero-agent

# Pull latest changes
git pull

# Rebuild and restart
docker build -t zero-agent .
docker compose up -d
```

---

## Resource Usage

- **Memory**: ~100-200MB typical, 384MB allocated
- **CPU**: Minimal (mostly idle, spikes during LLM calls)
- **Disk**: ~50MB Docker image + database size

---

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/api/chat` | POST | Chat with agent |
| `/api/sessions` | GET | List chat sessions |
| `/auth/xero` | GET | Initiate Xero OAuth |
| `/auth/xero/callback` | GET | OAuth callback |
| `/auth/status` | GET | Check Xero connection |

---

## Security Notes

- Run container as non-root user (configured in Dockerfile)
- Store secrets in environment variables (not in code)
- Use HTTPS via Caddy auto-TLS
- Regular backups of SQLite database

---

**Last Updated:** 2025-11-27
