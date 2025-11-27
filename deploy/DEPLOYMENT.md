# Zero Agent - VPS Deployment Guide

Deploy Zero Agent to a DigitalOcean Droplet (or any VPS) in under 15 minutes.

## Prerequisites

- VPS with Ubuntu 22.04+ (recommended: 1GB RAM, 1 vCPU minimum)
- Domain name (optional, for HTTPS)
- API keys:
  - `ANTHROPIC_API_KEY` - Get from [Anthropic Console](https://console.anthropic.com/)
  - `XERO_CLIENT_ID` and `XERO_CLIENT_SECRET` - Get from [Xero Developer Portal](https://developer.xero.com/)

## Quick Start (Docker)

### 1. Connect to your VPS

```bash
ssh root@your-vps-ip
```

### 2. Install Docker

```bash
curl -fsSL https://get.docker.com | sh
```

### 3. Clone the repository

```bash
cd /opt
git clone https://github.com/IAMSamuelRodda/zero-agent.git
cd zero-agent
```

### 4. Configure environment

```bash
cp .env.example .env
nano .env
```

Add your credentials:
```env
ANTHROPIC_API_KEY=sk-ant-...
XERO_CLIENT_ID=your-client-id
XERO_CLIENT_SECRET=your-client-secret
BASE_URL=https://your-domain.com
FRONTEND_URL=https://your-domain.com
```

### 5. Start the server

**Without HTTPS (development/testing):**
```bash
docker compose up -d
```

**With HTTPS via Caddy (production):**
```bash
DOMAIN=your-domain.com docker compose --profile with-caddy up -d
```

### 6. Verify it's running

```bash
curl http://localhost:3000/health
# Should return: {"status":"ok",...}
```

---

## Manual Deployment (Without Docker)

### 1. Install Node.js 20

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### 2. Install pnpm

```bash
corepack enable
corepack prepare pnpm@9.15.0 --activate
```

### 3. Create application user

```bash
sudo useradd -r -s /bin/false zero-agent
sudo mkdir -p /opt/zero-agent
sudo chown zero-agent:zero-agent /opt/zero-agent
```

### 4. Clone and build

```bash
cd /opt/zero-agent
sudo -u zero-agent git clone https://github.com/IAMSamuelRodda/zero-agent.git .
sudo -u zero-agent pnpm install
sudo -u zero-agent pnpm --filter @zero-agent/core run build
sudo -u zero-agent pnpm --filter @zero-agent/agent-core run build
sudo -u zero-agent pnpm --filter @zero-agent/server run build
```

### 5. Configure environment

```bash
sudo -u zero-agent cp .env.example .env
sudo -u zero-agent nano .env
# Add your credentials

# Secure the file
sudo chmod 600 /opt/zero-agent/.env
```

### 6. Create data directory

```bash
sudo mkdir -p /opt/zero-agent/data
sudo chown zero-agent:zero-agent /opt/zero-agent/data
```

### 7. Install systemd service

```bash
sudo cp deploy/zero-agent.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable zero-agent
sudo systemctl start zero-agent
```

### 8. Check status

```bash
sudo systemctl status zero-agent
sudo journalctl -u zero-agent -f  # View logs
```

---

## Setting Up HTTPS with Caddy

### Option A: Caddy with Docker (Recommended)

Already included in docker-compose.yml. Just use:
```bash
DOMAIN=your-domain.com docker compose --profile with-caddy up -d
```

### Option B: Standalone Caddy

1. **Install Caddy:**
```bash
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update
sudo apt install caddy
```

2. **Configure Caddy:**
```bash
sudo nano /etc/caddy/Caddyfile
```

Add:
```
your-domain.com {
    reverse_proxy localhost:3000
}
```

3. **Start Caddy:**
```bash
sudo systemctl enable caddy
sudo systemctl start caddy
```

---

## Xero OAuth Setup

1. Go to [Xero Developer Portal](https://developer.xero.com/app/manage)
2. Create a new app or use existing
3. Add your redirect URI:
   - Development: `http://localhost:3000/auth/callback`
   - Production: `https://your-domain.com/auth/callback`
4. Copy Client ID and Client Secret to your `.env` file

---

## Updating

### Docker
```bash
cd /opt/zero-agent
git pull
docker compose down
docker compose build --no-cache
docker compose up -d
```

### Manual
```bash
cd /opt/zero-agent
git pull
pnpm install
pnpm --filter @zero-agent/core run build
pnpm --filter @zero-agent/agent-core run build
pnpm --filter @zero-agent/server run build
sudo systemctl restart zero-agent
```

---

## Backup & Restore

### Backup SQLite Database

```bash
# Docker
docker compose exec zero-agent cp /app/data/zero-agent.db /app/data/backup-$(date +%Y%m%d).db
docker cp zero-agent:/app/data/backup-*.db ./backups/

# Manual
cp /opt/zero-agent/data/zero-agent.db ~/backups/zero-agent-$(date +%Y%m%d).db
```

### Automated Backups (cron)

```bash
# Add to crontab: crontab -e
0 2 * * * cp /opt/zero-agent/data/zero-agent.db /opt/zero-agent/backups/zero-agent-$(date +\%Y\%m\%d).db
```

---

## Monitoring

### Health Checks

```bash
# Basic health
curl http://localhost:3000/health

# Readiness (checks DB, Xero config, Anthropic config)
curl http://localhost:3000/health/ready

# Liveness (process info)
curl http://localhost:3000/health/live
```

### Logs

```bash
# Docker
docker compose logs -f zero-agent

# systemd
sudo journalctl -u zero-agent -f

# Caddy (if using)
sudo journalctl -u caddy -f
```

---

## Troubleshooting

### Server won't start

1. Check logs:
   ```bash
   docker compose logs zero-agent
   # or
   sudo journalctl -u zero-agent -n 50
   ```

2. Verify environment variables:
   ```bash
   curl http://localhost:3000/health/ready
   ```

3. Check port availability:
   ```bash
   sudo lsof -i :3000
   ```

### OAuth callback fails

1. Verify `BASE_URL` matches your domain exactly
2. Check redirect URI in Xero Developer Portal matches
3. Ensure HTTPS is working if using production URLs

### Database errors

1. Check file permissions:
   ```bash
   ls -la /opt/zero-agent/data/
   ```

2. Reset database (warning: deletes all data):
   ```bash
   rm /opt/zero-agent/data/zero-agent.db
   sudo systemctl restart zero-agent
   ```

---

## Security Checklist

- [ ] `.env` file has restricted permissions (chmod 600)
- [ ] Running as non-root user
- [ ] HTTPS enabled in production
- [ ] Firewall configured (only 80/443 open)
- [ ] Regular backups configured
- [ ] Automatic security updates enabled

### Firewall Setup (UFW)

```bash
sudo ufw allow 22/tcp   # SSH
sudo ufw allow 80/tcp   # HTTP
sudo ufw allow 443/tcp  # HTTPS
sudo ufw enable
```

---

## Resource Requirements

| Tier | RAM | CPU | Storage | Users |
|------|-----|-----|---------|-------|
| Minimum | 1GB | 1 vCPU | 10GB | 1-5 |
| Recommended | 2GB | 2 vCPU | 20GB | 5-20 |
| Production | 4GB | 2 vCPU | 50GB | 20+ |

**DigitalOcean Droplet Recommendations:**
- Development: Basic $6/month (1GB RAM, 1 vCPU)
- Production: Basic $12/month (2GB RAM, 1 vCPU)
