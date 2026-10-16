# Gud Game

Modern, community-driven court-sports platform (padel-first MVP): tournaments, live scores, TV venue displays, player profiles, wiki, partner white-label, and Xendit payments.

Built with Next.js, PostgreSQL, Redis, and SeaweedFS object storage.

> Full documentation lives in **[docs/](./docs/README.md)** — start with [overview](./docs/overview.md) or the [portfolio brief](./docs/portfolio.md).

## Stack

- **Framework:** Next.js 16 (App Router), TypeScript, Tailwind CSS, shadcn/ui
- **Data:** PostgreSQL 18 + Drizzle ORM
- **Cache:** Redis (ioredis)
- **Auth:** better-auth + Firebase Google
- **Payments:** Xendit (+ XenPlatform)
- **Media:** SeaweedFS (filer via nginx `storage_gateway`)
- **Deploy:** VPS + Docker Compose + Cloudflare Tunnel

## Project structure

```
app/                 # Routes, layouts, API handlers
components/          # UI (layout, sections, shadcn, tournament display)
db/                  # Drizzle schema, migrations, seeds
lib/                 # Domain: auth, tournaments, payments, wiki, storage
ops/                 # Cron, storage gateway, pgAdmin, DB restore
scripts/             # CLI: infra check, env validation, seeds
docs/                # Product, architecture, ops (portfolio-ready)
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

| Command | Description |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` / `start` | Production build & server |
| `npm run typecheck` / `lint` / `test` | Quality gates |
| `npm run validate:env` | Validate `.env` (`STRICT_PRODUCTION_ENV=true` in CI) |
| `npm run infra:check` | PostgreSQL, Redis, SeaweedFS health |
| `npm run db:migrate:prod` | Apply SQL migrations (production path) |
| `npm run db:seed` | Seed MVP sport (padel) |

## Production checklist

- `NODE_ENV=production`
- `BETTER_AUTH_SECRET` (≥32 chars) and `BETTER_AUTH_URL=https://gudgame.id`
- `DATABASE_URL` → host `postgres`, database **`gudgame_db`**
- `HEALTH_CHECK_TOKEN` for `/api/health`; `CRON_SECRET` for cron routes
- Docker network `tunnel` with Postgres 18, Redis, SeaweedFS, `storage_gateway`, app, `payout-cron`
- `NEXT_PUBLIC_STORAGE_URL=https://storage.gudgame.id`
- Secrets in **GitHub Actions Secrets** — never baked into the image

## Documentation

| Doc | Description |
| --- | --- |
| [docs/README.md](./docs/README.md) | **Documentation hub** |
| [docs/USER-MANUAL.md](./docs/USER-MANUAL.md) | **User manual (end-user, English)** |
| [docs/DEVELOPER-HANDOVER.md](./docs/DEVELOPER-HANDOVER.md) | **Developer handover (Attentive IT, English)** |
| [docs/overview.md](./docs/overview.md) | Product overview |
| [docs/portfolio.md](./docs/portfolio.md) | Portfolio narrative |
| [docs/architecture.md](./docs/architecture.md) | System architecture |
| [docs/features.md](./docs/features.md) | Feature catalog |
| [docs/SETUP.md](./docs/SETUP.md) | Local setup |
| [docs/DEPLOYMENT-VPS.md](./docs/DEPLOYMENT-VPS.md) | VPS deployment |
| [docs/DATABASE-RESTORE.md](./docs/DATABASE-RESTORE.md) | DB restore (PG18) |
| [docs/tournament-guide.md](./docs/tournament-guide.md) | Tournament ops (ID) |
| [docs/partner-auth.md](./docs/partner-auth.md) | Partner member auth |
| [docs/bestie-cup-guide.md](./docs/bestie-cup-guide.md) | Bestie Cup playbook |

**Naming:** product is **Gud Game**; production DB is **`gudgame_db`**. The repo folder may still be named `court-pedia` locally — that is legacy path naming only.
