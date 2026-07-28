# Production Deployment Guide

## Architecture Overview

```
                    ┌─────────────┐
                    │   Nginx     │
                    │  (Frontend) │
                    │  Port 80    │
                    └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
              │   /api/*  │  /assets/  │  /* (SPA)
              │            │            │
              ▼            ▼            ▼
        ┌─────────┐  ┌──────────┐  ┌──────────┐
        │ Backend │  │ Static   │  │ index.   │
        │ Express │  │ Files    │  │ html     │
        │ :3000   │  │ from     │  │ fallback │
        └────┬────┘  └──────────┘  └──────────┘
             │
             │ SQLite
             ▼
        ┌─────────┐
        │  dev.db │
        │ (volume)│
        └─────────┘
```

## Deployment Options

### Option 1: Docker Compose (Recommended)

**Best for:** Single server, easy management, isolation

```bash
# 1. Clone and configure
git clone <repo>
cd Free-Models
cp .env.example server/.env
nano server/.env  # Fill in real values

# 2. Build and start
docker compose up -d --build

# 3. Verify
curl http://localhost/api/health
curl http://localhost/

# 4. Stop
docker compose down

# 5. Stop and remove volumes
docker compose down -v
```

### Option 2: PM2 (Bare Metal)

**Best for:** Direct server access, no Docker

```bash
# 1. Install dependencies
npm ci
cd server && npm ci && cd ..

# 2. Build
npm run build:client
npm run build:server

# 3. Setup PM2
npm install -g pm2
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup  # Auto-start on boot

# 4. Verify
curl http://localhost:3000/api/health
```

### Option 3: Kubernetes (Enterprise)

**Best for:** Multiple replicas, auto-scaling, high availability

```yaml
# Minimal k8s deployment (see k8s/ directory for full manifests)
apiVersion: apps/v1
kind: Deployment
metadata:
  name: free-models-backend
spec:
  replicas: 2
  selector:
    matchLabels:
      app: free-models-backend
  template:
    metadata:
      labels:
        app: free-models-backend
    spec:
      containers:
      - name: backend
        image: ghcr.io/<org>/free-models:latest
        ports:
        - containerPort: 3000
        envFrom:
        - secretRef:
            name: free-models-secrets
        readinessProbe:
          httpGet:
            path: /api/health
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 15
```

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `PORT` | Yes | Backend port (default: 3000) |
| `NODE_ENV` | Yes | `development` or `production` |
| `DATABASE_URL` | Yes | SQLite path (`file:/path/to/dev.db`) |
| `OPENROUTER_API_KEY` | No | Provider API key |
| `GROQ_API_KEY` | No | Provider API key |
| `GEMINI_API_KEY` | No | Provider API key |

## Security Checklist

- [ ] `.env` files are NOT committed to git
- [ ] Provider keys exist only in ignored `.env` or Portainer Stack variables
- [ ] HTTPS is configured (nginx reverse proxy or load balancer)
- [ ] Firewall allows only ports 80, 443, and SSH
- [ ] Database backups are automated
- [ ] Docker images are built from official base images
- [ ] Non-root user runs the container
- [ ] Health checks are configured
- [ ] Rate limiting is enabled (optional, future)
- [ ] CORS is restricted to known domains

## Monitoring Setup

### Prometheus + Grafana (Docker)

```bash
# Start monitoring stack
docker compose up -d prometheus grafana

# Access Grafana
# URL: http://localhost:3001
# Default: admin / admin (change in .env)

# Add Prometheus as data source
# URL: http://prometheus:9090
```

### PM2 Monitoring (Bare Metal)

```bash
# Start PM2 monitor
pm2 monit

# View logs
pm2 logs

# View dashboard
pm2 jlist | pm2 plus  # Or use PM2 Plus cloud
```

## Backup Strategy

### Database Backup

```bash
# Docker
docker exec free-models-backend cp /app/prisma/dev.db /tmp/dev.db
docker cp free-models-backend:/tmp/dev.db ./backups/dev-$(date +%Y%m%d).db

# Cron (add to crontab)
0 2 * * * docker exec free-models-backend cp /app/prisma/dev.db /tmp/dev.db && docker cp free-models-backend:/tmp/dev.db /backups/dev-$(date +\%Y\%m\%d).db
```

### Automated Backups (Script)

```bash
#!/bin/bash
BACKUP_DIR="/backups"
DATE=$(date +%Y%m%d_%H%M%S)
CONTAINER="free-models-backend"

# Copy database from container
docker exec $CONTAINER cp /app/prisma/dev.db /tmp/dev.db
docker cp $CONTAINER:/tmp/dev.db $BACKUP_DIR/dev_$DATE.db

# Compress
gzip $BACKUP_DIR/dev_$DATE.db

# Remove backups older than 30 days
find $BACKUP_DIR -name "dev_*.db.gz" -mtime +30 -delete

echo "Backup completed: dev_$DATE.db.gz"
```

## Update Procedure

### Docker Compose

```bash
# 1. Pull latest changes
git pull origin main

# 2. Rebuild and restart
docker compose up -d --build --remove-orphans

# 3. Verify
curl http://localhost/api/health

# 4. Check logs
docker compose logs -f backend
```

### PM2

```bash
# 1. Pull latest changes
git pull origin main

# 2. Rebuild
npm run build:client
npm run build:server

# 3. Restart
pm2 restart all

# 4. Verify
curl http://localhost:3000/api/health
```

## Troubleshooting

### Backend won't start

```bash
# Check logs
docker compose logs backend
# or
pm2 logs free-models-backend

# Verify env vars
docker exec -it free-models-backend env
# or
pm2 env free-models-backend

# Check database
docker exec -it free-models-backend ls -la /app/prisma/
```

### Frontend shows 404

```bash
# Verify nginx config
docker exec -it free-models-frontend nginx -t

# Check if dist files exist
docker exec -it free-models-frontend ls -la /usr/share/nginx/html/

# Restart nginx
docker exec -it free-models-frontend nginx -s reload
```

### Database locked

```bash
# Check for stuck processes
docker exec -it free-models-backend lsof +D /app/prisma/

# Restart container
docker compose restart backend
```

## Performance Tuning

### Nginx

```nginx
# Increase worker connections
events {
    worker_connections 1024;
}

# Enable gzip
gzip on;
gzip_types application/json text/css application/javascript;

# Cache static assets
location /assets/ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

### Express

```javascript
// Enable compression
import compression from "compression";
app.use(compression());

// Rate limiting (optional)
import rateLimit from "express-rate-limit";
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
});
app.use("/api/refresh", limiter);
```

### SQLite

```sql
-- Enable WAL mode for better concurrency
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;
PRAGMA cache_size = -64000; -- 64MB
```

## Rollback Procedure

```bash
# Docker: Rollback to previous image
docker compose pull
docker compose up -d ghcr.io/<org>/free-models:<previous-tag>

# PM2: Rollback to previous version
pm2 deploy production rollback 1
pm2 restart all
```

## Contact & Support

- **Issues:** [GitHub Issues](https://github.com/<org>/free-models/issues)
- **Documentation:** [README.md](../README.md)
- **Monitoring:** http://localhost:3001 (Grafana)
