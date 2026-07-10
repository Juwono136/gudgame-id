# Gud Game

Modern, community-driven sports encyclopedia (padel-first MVP). Built with Next.js, PostgreSQL, Redis, and SeaweedFS object storage.

## Stack

- **Framework:** Next.js 16 (App Router), TypeScript, Tailwind CSS, shadcn/ui
- **Data:** PostgreSQL + Drizzle ORM
- **Cache:** Redis (ioredis)
- **Media:** SeaweedFS (filer HTTP / optional S3)
- **Deploy target:** Google Cloud Platform (Cloud Run) — see [docs/DEPLOYMENT-GCP.md](./docs/DEPLOYMENT-GCP.md)

## Project structure

```
app/                 # Routes, layouts, API handlers
components/          # UI (layout, sections, shadcn)
db/                  # Drizzle schema, client, seeds
lib/
  config/            # Env validation (Zod), site metadata
  server/            # Server-only helpers (health access)
  storage/           # Object storage adapters
  health/            # Infrastructure health checks
  api/               # API response helpers
  core patterns      # errors, logger, utils
scripts/             # CLI: infra check, env validation
docs/                # Architecture, setup, GCP deployment
```

## Local development

```bash
cp .env.example .env
npm install
npm run db:push:prod
npm run db:seed
npm run infra:check
npm run dev
```

Details: [docs/SETUP.md](./docs/SETUP.md)

## Scripts

| Command                | Description                                              |
| ---------------------- | -------------------------------------------------------- |
| `npm run dev`          | Development server                                       |
| `npm run build`        | Production build                                         |
| `npm run start`        | Production server                                        |
| `npm run typecheck`    | TypeScript check                                         |
| `npm run lint`         | ESLint                                                   |
| `npm run validate:env` | Validate `.env` (use `STRICT_PRODUCTION_ENV=true` in CI) |
| `npm run infra:check`  | PostgreSQL, Redis, SeaweedFS health                      |
| `npm run db:seed`      | Seed MVP sport (padel)                                   |

## Production checklist

- Set `NODE_ENV=production`
- `BETTER_AUTH_SECRET` (≥32 chars) and `BETTER_AUTH_URL`
- `HEALTH_CHECK_TOKEN` for `/api/health` (recommended on GCP)
- `LOG_LEVEL=info`
- Use managed PostgreSQL (Cloud SQL) and Redis (Memorystore) URLs — no localhost endpoints
- Store secrets in **GCP Secret Manager**, not in the image

## Documentation

- [Analisis Aplikasi](./docs/TANDINGBASE_ANALYSIS.md)
- [Architecture](./docs/ARCHITECTURE.md)
- [GCP deployment](./docs/DEPLOYMENT-GCP.md)
