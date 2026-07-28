# Production Readiness Checklist

## Pre-Deployment

### Code Quality
- [x] TypeScript compilation passes (client + server)
- [x] Vite production build succeeds
- [x] No linting errors
- [x] All API types match between frontend and backend

### Security
- [ ] `.env` files are NOT in git (verified via .gitignore)
- [ ] `ENCRYPTION_KEY` is randomly generated (64 hex chars)
- [ ] HTTPS certificate is configured (Let's Encrypt or similar)
- [ ] Firewall rules are set (ports 80, 443, SSH only)
- [ ] Docker images use non-root user
- [ ] Docker images are scanned for vulnerabilities
- [ ] API keys are stored encrypted in database
- [ ] CORS is restricted to known domains
- [ ] Rate limiting is enabled on `/api/refresh` endpoints

### Database
- [ ] SQLite WAL mode is enabled (`PRAGMA journal_mode = WAL`)
- [ ] Database backups are automated (cron job or script)
- [ ] Migration strategy is defined (Prisma migrations)
- [ ] Database file is on persistent volume

### Monitoring
- [ ] Health checks are configured (Docker + Kubernetes)
- [ ] Prometheus is scraping backend metrics
- [ ] Grafana dashboard is configured
- [ ] Alerting is set up (email/PagerDuty/Discord)
- [ ] Log aggregation is configured (ELK/Loki)

## Deployment

### Docker Compose
- [ ] `docker-compose.yml` validates (`docker compose config`)
- [ ] `.env` file is configured on target server
- [ ] Volumes are mounted correctly
- [ ] Network isolation is configured
- [ ] Restart policies are set (`unless-stopped`)

### Kubernetes
- [ ] `k8s/backend.yml` is reviewed
- [ ] Ingress controller is installed
- [ ] TLS is configured on Ingress
- [ ] PersistentVolume is provisioned
- [ ] Resource limits are tuned
- [ ] HorizontalPodAutoscaler is configured (optional)

### CI/CD
- [ ] GitHub Actions workflow passes
- [ ] Docker images are pushed to GHCR
- [ ] SSH access to production server is configured
- [ ] Deployment script/test is automated

## Post-Deployment

### Verification
- [ ] `curl http://localhost/api/health` returns 200
- [ ] Frontend loads at `http://localhost/`
- [ ] API endpoints respond correctly
- [ ] Database is accessible
- [ ] Monitoring dashboard is accessible

### Performance
- [ ] Response times are acceptable (< 200ms for API)
- [ ] Static assets are cached (nginx config)
- [ ] Gzip compression is enabled
- [ ] Database queries are optimized

### Operations
- [ ] Backup script is tested
- [ ] Rollback procedure is documented
- [ ] Team knows how to deploy updates
- [ ] Incident response plan is ready

## Rollback Plan

If deployment fails:

```bash
# Docker Compose
docker compose down
# Restore database from backup
docker compose up -d

# Kubernetes
kubectl rollout undo deployment/free-models-backend
kubectl rollout undo deployment/free-models-frontend

# PM2
pm2 rollback
pm2 restart all
```

## Emergency Contacts

| Role | Contact |
|---|---|
| DevOps | [TBD] |
| Backend | [TBD] |
| Frontend | [TBD] |
| Database | [TBD] |

## Monitoring URLs

| Service | URL | Credentials |
|---|---|---|
| Frontend | `http://<server>/` | — |
| Backend API | `http://<server>/api/health` | — |
| Grafana | `http://<server>:3001` | admin / [set in .env] |
| Prometheus | `http://<server>:9090` | — |
