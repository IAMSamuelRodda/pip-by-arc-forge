# Self-Hosted Development Infrastructure Guide

## Overview

Run 20+ development apps on a single EC2 instance for $0-7.50/month instead of AWS serverless costs.

**Target:** $0/month (free tier) or <$10/month for unlimited apps

---

## Option 1: Single EC2 with Docker Compose (RECOMMENDED)

### Architecture

```
                    Internet
                       ↓
┌──────────────────────────────────────────────────┐
│  AWS EC2 t4g.micro (1 vCPU, 1GB RAM)            │
│  Ubuntu 24.04 LTS (ARM64)                        │
├──────────────────────────────────────────────────┤
│  Docker Compose Stack:                           │
│                                                   │
│  ┌─────────────────────────────────────────┐   │
│  │ Caddy (Reverse Proxy + Auto HTTPS)      │   │
│  │ *.yourdomain.com → Internal services    │   │
│  └─────────────────────────────────────────┘   │
│                                                   │
│  ┌─────────────────────────────────────────┐   │
│  │ PostgreSQL (Multi-tenant database)      │   │
│  │ - xero_agent_dev                         │   │
│  │ - todo_app_dev                           │   │
│  │ - ... (20 databases)                     │   │
│  └─────────────────────────────────────────┘   │
│                                                   │
│  ┌─────────────────────────────────────────┐   │
│  │ Redis (Session cache, rate limiting)    │   │
│  └─────────────────────────────────────────┘   │
│                                                   │
│  ┌─────────────────────────────────────────┐   │
│  │ App Containers (20+ Node.js apps)       │   │
│  │ - xero-agent:3001                        │   │
│  │ - todo-app:3002                          │   │
│  │ - finance-app:3003                       │   │
│  │ ... (port per app)                       │   │
│  └─────────────────────────────────────────┘   │
│                                                   │
│  ┌─────────────────────────────────────────┐   │
│  │ Shared Secrets (.env file)              │   │
│  │ ANTHROPIC_API_KEY=sk-ant-...            │   │
│  │ OPENAI_API_KEY=sk-...                   │   │
│  └─────────────────────────────────────────┘   │
└──────────────────────────────────────────────────┘
```

### docker-compose.yml

```yaml
version: '3.8'

services:
  # Reverse proxy with automatic HTTPS
  caddy:
    image: caddy:2-alpine
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile
      - caddy_data:/data
      - caddy_config:/config
    networks:
      - app_network

  # Shared PostgreSQL for all apps
  postgres:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_USER: postgres
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./init-databases.sql:/docker-entrypoint-initdb.d/init.sql
    networks:
      - app_network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Shared Redis cache
  redis:
    image: redis:7-alpine
    restart: unless-stopped
    command: redis-server --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data
    networks:
      - app_network
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Xero Agent app
  xero-agent:
    build: ./xero-agent
    restart: unless-stopped
    environment:
      NODE_ENV: development
      PORT: 3001
      DATABASE_URL: postgresql://postgres:${POSTGRES_PASSWORD}@postgres:5432/xero_agent_dev
      REDIS_URL: redis://:${REDIS_PASSWORD}@redis:6379
      ANTHROPIC_API_KEY: ${ANTHROPIC_API_KEY}
      XERO_CLIENT_ID: ${XERO_AGENT_CLIENT_ID}
      XERO_CLIENT_SECRET: ${XERO_AGENT_CLIENT_SECRET}
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    networks:
      - app_network

  # TODO App
  todo-app:
    build: ./todo-app
    restart: unless-stopped
    environment:
      NODE_ENV: development
      PORT: 3002
      DATABASE_URL: postgresql://postgres:${POSTGRES_PASSWORD}@postgres:5432/todo_app_dev
      REDIS_URL: redis://:${REDIS_PASSWORD}@redis:6379
      ANTHROPIC_API_KEY: ${ANTHROPIC_API_KEY}
      NOTION_API_KEY: ${TODO_APP_NOTION_KEY}
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    networks:
      - app_network

  # ... add more apps as needed (each gets own port + database)

volumes:
  postgres_data:
  redis_data:
  caddy_data:
  caddy_config:

networks:
  app_network:
    driver: bridge
```

### Caddyfile (Auto HTTPS)

```
xero-agent.yourdomain.com {
    reverse_proxy xero-agent:3001
}

todo-app.yourdomain.com {
    reverse_proxy todo-app:3002
}

# ... add more apps as needed
```

### .env (Shared Secrets)

```bash
# Database
POSTGRES_PASSWORD=<generate-strong-password>
REDIS_PASSWORD=<generate-strong-password>

# Shared API Keys (all apps use these)
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
STRIPE_TEST_KEY=sk_test_...

# App-specific OAuth credentials
XERO_AGENT_CLIENT_ID=...
XERO_AGENT_CLIENT_SECRET=...
TODO_APP_NOTION_KEY=...
```

### Cost Breakdown

| Resource | Free Tier | After 12 Months |
|----------|-----------|-----------------|
| **EC2 t4g.micro** | 750 hrs/month (free) | $6.13/month |
| **20GB EBS** | 30GB free | $0 |
| **Elastic IP** | $0 (if attached) | $0 |
| **Data Transfer** | 100GB free | ~$1/month |
| **Total** | **$0/month** ✅ | **$7.13/month** |

---

## Option 2: Open Source Backend-as-a-Service

### Supabase (Self-Hosted)

**What it is:** Open-source Firebase alternative (Postgres + Auth + Storage + Realtime)

```yaml
# docker-compose.yml (from Supabase repo)
services:
  postgres:
    image: supabase/postgres:15
  auth:
    image: supabase/gotrue
  rest:
    image: postgrest/postgrest
  storage:
    image: supabase/storage-api
  realtime:
    image: supabase/realtime
  # ... 8 more services
```

**Pros:**
- ✅ Complete BaaS (Auth, DB, Storage, Functions)
- ✅ Built-in Row Level Security
- ✅ Auto-generated APIs from schema
- ✅ Realtime subscriptions

**Cons:**
- ❌ Heavy (12 Docker containers)
- ❌ Requires 2GB+ RAM (need t3.small = $15/month)
- ❌ Complex to manage

**Cost:** $15-30/month (too expensive for your use case)

### Appwrite (Self-Hosted)

**What it is:** Open-source backend platform (like Firebase)

```bash
docker run -d \
  --name=appwrite \
  -p 80:80 -p 443:443 \
  -v appwrite_data:/storage \
  appwrite/appwrite:latest
```

**Pros:**
- ✅ All-in-one (Auth, DB, Storage, Functions)
- ✅ Nice web UI
- ✅ Single container (lightweight)

**Cons:**
- ❌ Less mature than Supabase
- ❌ Vendor lock-in to Appwrite APIs

**Cost:** $0-7/month (EC2 t4g.micro)

### Pocketbase (Self-Hosted)

**What it is:** Single-file backend (Go binary, SQLite)

```bash
# Download single binary
./pocketbase serve --http=0.0.0.0:8090

# That's it! Full backend running ✅
```

**Pros:**
- ✅ **LIGHTEST** option (single 20MB binary)
- ✅ Built-in admin UI
- ✅ Real-time subscriptions
- ✅ File storage
- ✅ Can run on t4g.nano (free tier)

**Cons:**
- ❌ SQLite only (fine for dev, not production scale)
- ❌ Limited to 1GB database (dev use only)

**Cost:** $0/month (runs on free tier t4g.micro easily)

---

## Option 3: Platform-as-a-Service Alternatives

### Railway.app

```bash
# Deploy with one command
railway up
```

**Cost:**
- Free: $5 credit/month (1-2 small apps)
- Paid: $5/month base + $0.000231/GB-hour

**20 apps estimate:** $20-40/month ❌ (too expensive)

### Render.com

**Cost:**
- Free: 750 hours/month (1 service)
- Paid: $7/month per service

**20 apps estimate:** $140/month ❌❌ (way too expensive)

### Fly.io

**Cost:**
- Free: 3 shared-cpu VMs + 3GB persistent storage
- Paid: $1.94/month per shared-cpu VM

**20 apps estimate:** $40/month ❌ (too expensive)

---

## Comparison Matrix

| Platform | 1 App | 20 Apps | Scale to Prod | Ops Burden |
|----------|-------|---------|---------------|------------|
| **AWS Serverless** | $1.20 | $1.20 | ✅ Easy | 🟢 Low |
| **EC2 Self-Hosted** | $0 | $0-7 | ⚠️ Manual | 🟡 Medium |
| **Supabase Cloud** | $0 | $25 | ✅ Easy | 🟢 Low |
| **Railway** | $0 | $20-40 | ✅ Easy | 🟢 Low |
| **Render** | $0 | $140 | ✅ Easy | 🟢 Low |
| **Pocketbase** | $0 | $0-7 | ❌ Hard | 🟡 Medium |

---

## My Recommendation for Your Situation

### For 1-5 Apps (Current)
**Use:** AWS Serverless (current approach)
- Cost: $0.40-1.20/month
- Reason: Best developer experience, scales automatically
- When profitable: Already production-ready

### For 5-20 Apps (Growing Portfolio)
**Use:** Single EC2 + Docker Compose
- Cost: $0/month (free tier) → $7/month after
- Reason: Unlimited apps, no cost per app
- Migration path: Copy Docker setup to new EC2 when one app succeeds

### For 20+ Apps (Power User)
**Use:** Two-tier approach
1. **EC2 for dev/staging:** All apps on one instance ($7/month)
2. **AWS Serverless for prod:** Only profitable apps (pay from revenue)

---

## Implementation Guide: Single EC2 Setup

### 1. Launch EC2 Instance

```bash
# AWS Console:
# - Instance type: t4g.micro (ARM, free tier)
# - OS: Ubuntu 24.04 LTS
# - Storage: 20GB gp3 (free tier)
# - Security Group: Allow 80, 443, 22

# SSH into instance
ssh -i keypair.pem ubuntu@<instance-ip>
```

### 2. Install Docker

```bash
# Install Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker ubuntu

# Install Docker Compose
sudo apt update
sudo apt install -y docker-compose-plugin

# Verify
docker --version
docker compose version
```

### 3. Setup Project Structure

```bash
mkdir -p ~/apps
cd ~/apps

# Create directory for each app
mkdir xero-agent todo-app finance-app

# Shared infrastructure
touch docker-compose.yml Caddyfile .env init-databases.sql
```

### 4. Configure Shared Secrets

```bash
# Generate strong passwords
POSTGRES_PW=$(openssl rand -base64 32)
REDIS_PW=$(openssl rand -base64 32)

# Create .env file
cat > .env << EOF
POSTGRES_PASSWORD=${POSTGRES_PW}
REDIS_PASSWORD=${REDIS_PW}
ANTHROPIC_API_KEY=your-key-here
EOF

chmod 600 .env  # Secure the file
```

### 5. Deploy All Apps

```bash
# Start all services
docker compose up -d

# Check status
docker compose ps

# View logs
docker compose logs -f xero-agent
```

### 6. Setup Domain (Optional)

```bash
# Point DNS to EC2 elastic IP:
# xero-agent.yourdomain.com → A → <elastic-ip>
# todo-app.yourdomain.com → A → <elastic-ip>

# Caddy will automatically provision Let's Encrypt SSL ✅
```

---

## Cost Creep Prevention Strategies

### 1. Hard Limits via AWS Budgets

```bash
# Set up billing alert
aws budgets create-budget \
  --account-id 123456789 \
  --budget file://budget.json \
  --notifications-with-subscribers file://notifications.json
```

**budget.json:**
```json
{
  "BudgetName": "DevMonthlyBudget",
  "BudgetLimit": {
    "Amount": "10",
    "Unit": "USD"
  },
  "TimeUnit": "MONTHLY",
  "BudgetType": "COST"
}
```

### 2. Auto-Shutdown for Non-Production

```bash
# Cron job to stop EC2 at night (save costs)
# Stop at 6 PM weekdays
0 18 * * 1-5 aws ec2 stop-instances --instance-ids i-xxxxx

# Start at 8 AM weekdays
0 8 * * 1-5 aws ec2 start-instances --instance-ids i-xxxxx
```

### 3. Monitoring Dashboard

```bash
# Install Prometheus + Grafana on EC2 (optional)
docker run -d -p 9090:9090 prom/prometheus
docker run -d -p 3000:3000 grafana/grafana

# Track:
# - CPU/RAM per app
# - Database size
# - API request counts
```

---

## Migration Path: Dev → Production

When an app becomes profitable:

```
┌─────────────────────────────────────────┐
│ Dev: EC2 Shared Instance                │
│ Cost: $0-7/month for ALL apps           │
└─────────────────────────────────────────┘
              ↓ (App makes $50/month)
┌─────────────────────────────────────────┐
│ Prod: Dedicated AWS Serverless          │
│ - Lambda + DynamoDB + API Gateway       │
│ - Auto-scaling                          │
│ - Cost: $5-20/month from revenue ✅     │
└─────────────────────────────────────────┘
```

**Migration is just:**
```bash
# Package app for Lambda
pnpm build:lambda

# Deploy infrastructure
cd terraform && terraform apply
```

---

## Conclusion

**For your use case (20+ apps in dev):**

✅ **Best option:** Single EC2 t4g.micro with Docker Compose
- **Cost:** $0/month (12 months free tier) → $7/month after
- **Unlimited apps** on single instance
- **No vendor lock-in** (Postgres + Redis + Docker = portable)
- **Easy migration** to AWS Serverless when app profitable

**Avoid:**
- ❌ Railway/Render (too expensive at scale)
- ❌ Supabase self-hosted (too heavy for t4g.micro)
- ❌ Per-app Secrets Manager (doesn't scale)

---

**Last Updated:** 2025-11-14
