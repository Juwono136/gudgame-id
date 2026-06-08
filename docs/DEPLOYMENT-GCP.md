# Deploying Court Pedia on Google Cloud Platform

This guide describes a production-ready target architecture **without Docker files in the repo** (Cloud Build can use the official Node buildpack or a Dockerfile you add later).

## Recommended GCP services

| Concern | Service |
|---------|---------|
| App hosting | **Cloud Run** (serverless, scales to zero) |
| PostgreSQL | **Cloud SQL for PostgreSQL** |
| Redis | **Memorystore for Redis** |
| Secrets | **Secret Manager** |
| Media (future) | SeaweedFS on GCE/GKE, or migrate to **Cloud Storage** |
| CI/CD | **Cloud Build** → deploy to Cloud Run |
| HTTPS / CDN | Cloud Run managed TLS + optional **Cloud CDN** |

## Environment variables (Cloud Run)

Map secrets from Secret Manager to env vars:

| Variable | Notes |
|----------|--------|
| `NODE_ENV` | `production` |
| `DATABASE_URL` | Cloud SQL socket or private IP connection string |
| `REDIS_URL` | `redis://<memorystore-host>:6379` |
| `BETTER_AUTH_SECRET` | ≥32 random bytes |
| `BETTER_AUTH_URL` | Public app URL (`https://your-domain.com`) |
| `NEXT_PUBLIC_APP_URL` | Same public URL |
| `NEXT_PUBLIC_SITE_URL` | Same public URL |
| `STORAGE_*` | Production filer/S3 endpoint (not localhost) |
| `HEALTH_CHECK_TOKEN` | Long random string; send as `X-Health-Token` to `/api/health` |
| `LOG_LEVEL` | `info` or `warn` |

## Build pipeline (example)

```bash
npm ci
STRICT_PRODUCTION_ENV=true npm run validate:env
npm run typecheck
npm run build
```

`STRICT_PRODUCTION_ENV=true` enforces production rules (auth secrets, no localhost storage, etc.).

## Cloud SQL connection

From Cloud Run, use the **Cloud SQL Auth Proxy** connector:

```
DATABASE_URL=postgresql://user:pass@/courtpedia_db?host=/cloudsql/PROJECT:REGION:INSTANCE
```

Attach the Cloud SQL instance to the Cloud Run service.

## Health checks

- **Liveness:** `GET /api/health` with header `X-Health-Token: <HEALTH_CHECK_TOKEN>`
- Configure Cloud Run health check path accordingly.
- For internal-only checks, restrict ingress or use IAM + VPC.

## Security defaults in this codebase

- Security headers via `proxy.ts`
- `poweredByHeader: false` in `next.config.ts`
- Server-only boundaries (`server-only` package) on DB, Redis, storage
- Zod-validated environment (`lib/config/env.server.ts`)
- Production boot validation via `instrumentation.ts`
- Health endpoint optional token in production

## Object storage on GCP

Current code supports SeaweedFS (`STORAGE_AUTH_MODE=nginx-basic` or `s3`). For GCP you may:

1. Run SeaweedFS on a VM/GKE cluster and set `STORAGE_ENDPOINT` to the internal URL, or
2. Add a `gcs` adapter later and set `STORAGE_AUTH_MODE=gcs` (not implemented yet).

## Next steps when you add Docker

- Multi-stage build: `deps` → `build` → `runner` with `NODE_ENV=production`
- Non-root user, minimal image (distroless or alpine)
- Do not copy `.env` into the image — inject at runtime from Secret Manager
