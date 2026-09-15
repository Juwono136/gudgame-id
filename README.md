# Gud Game

Modern, community-driven sports encyclopedia (padel-first MVP). Built with Next.js, PostgreSQL, Redis, and SeaweedFS object storage.

## Stack

- **Framework:** Next.js 16 (App Router), TypeScript, Tailwind CSS, shadcn/ui
- **Data:** PostgreSQL + Drizzle ORM
- **Cache:** Redis (ioredis)
- **Media:** SeaweedFS (filer via nginx `storage_gateway`)
- **Deploy target:** VPS + Docker Compose + Cloudflare Tunnel — see [docs/DEPLOYMENT-VPS.md](./docs/DEPLOYMENT-VPS.md)

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
ops/
  cron/              # Payout / timed-match cron sidecar
  storage/           # SeaweedFS nginx gateway config
  pgadmin/           # pgAdmin server registry
scripts/             # CLI: infra check, env validation
docs/                # Architecture, setup, VPS deployment
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

Details: [docs/SETUP.md](./docs/SETUP.md) (if present) or [docs/DEPLOYMENT-VPS.md](./docs/DEPLOYMENT-VPS.md)

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
- `BETTER_AUTH_SECRET` (≥32 chars) and `BETTER_AUTH_URL=https://gudgame.id`
- `HEALTH_CHECK_TOKEN` for `/api/health`
- `LOG_LEVEL=info`
- Docker network `tunnel` with Postgres, Redis, SeaweedFS, `storage_gateway`, app
- `DATABASE_URL` / `REDIS_URL` / `STORAGE_ENDPOINT` use Docker DNS (`postgres`, `redis`, `storage_gateway`)
- `NEXT_PUBLIC_STORAGE_URL=https://storage.gudgame.id`
- Store secrets in **GitHub Actions Secrets** (and optional server `.env`); never bake into the image

## Documentation

- [VPS deployment](./docs/DEPLOYMENT-VPS.md)
- [Tournament guide](./docs/tournament-guide.md)
- [Partner auth](./docs/partner-auth.md)
- [Bestie Cup guide](./docs/bestie-cup-guide.md)
