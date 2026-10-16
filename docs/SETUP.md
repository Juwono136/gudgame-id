# Local Development Setup

Get Gud Game running on a developer machine. Production VPS steps live in [DEPLOYMENT-VPS.md](./DEPLOYMENT-VPS.md).

---

## Prerequisites

- **Node.js 20+**
- **PostgreSQL** (16+ locally is fine for app work; production/restore uses **18**)
- **Redis 7**
- Optional: Docker (recommended for Postgres/Redis/SeaweedFS parity)

---

## Quick start

```bash
cp .env.example .env
# Edit DATABASE_URL, REDIS_URL, BETTER_AUTH_SECRET, etc.

npm install

# Schema — local convenience (production CI uses migrate:prod)
npm run db:push:prod

# Seed MVP sport (padel) and baseline data
npm run db:seed

# Optional: verify Postgres / Redis / storage
npm run infra:check

npm run dev
```

Open the URL printed by the dev server (typically `http://localhost:3000`).

---

## Environment

| File | Use |
| --- | --- |
| `.env.example` | Local template (may still show legacy `courtpedia_*` names — prefer `gudgame_db` if you align with prod) |
| `.env` | Your local secrets (gitignored) |
| `.env.production.example` | Production-oriented names (`gudgame_db`, bucket `gudgame`) |

Validate:

```bash
npm run validate:env
# CI / prod-like:
STRICT_PRODUCTION_ENV=true npm run validate:env
```

Minimum for a usable local app:

- `DATABASE_URL`
- `REDIS_URL` (or Redis without password if your local config allows)
- `BETTER_AUTH_SECRET` (≥32 chars)
- `BETTER_AUTH_URL` / `NEXT_PUBLIC_APP_URL` pointing at your local origin
- Storage vars if you exercise uploads (`STORAGE_ENDPOINT`, `STORAGE_BUCKET`, auth)

Bootstrap a super admin (after seed):

```bash
# Set BOOTSTRAP_ADMIN_* in .env then:
npm run db:bootstrap-admin
```

---

## Useful scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run typecheck` / `lint` / `test` | Quality gates |
| `npm run db:generate` | Generate Drizzle migrations |
| `npm run db:migrate:prod` | Apply SQL migrations (prod path) |
| `npm run db:seed` | Seed padel MVP |
| `npm run db:seed:fixtures` | Tournament QA fixtures |
| `npm run db:seed:double-stage` | Double-stage sample |
| `npm run db:seed:partner-bestie-cup` | Bestie Cup partner dry-run data |
| `npm run infra:check` | Health of Postgres, Redis, storage |

Purge counterparts exist for fixtures (`*:purge` scripts) — use only on disposable DBs.

---

## Docker (optional local stack)

From the repo root, with network `tunnel` created:

```bash
docker network create tunnel   # once
docker compose up -d postgres redis seaweedfs storage_gateway
```

Point `.env` `DATABASE_URL` / `REDIS_URL` / `STORAGE_ENDPOINT` at Docker DNS or `127.0.0.1` published ports.

Postgres **18** volume must mount at `/var/lib/postgresql` (not `.../data`). See [DATABASE-RESTORE.md](./DATABASE-RESTORE.md).

---

## Project layout (developer view)

```text
app/           pages + API routes
components/    UI
db/            schema, migrations, seed
lib/           domain modules
ops/           cron, storage gateway, restore
scripts/       CLI helpers
docs/          you are here
```

---

## Common issues

| Symptom | Fix |
| --- | --- |
| Auth redirects wrong host | Align `BETTER_AUTH_URL` with the browser origin |
| Storage 401 | Regenerate `ops/storage/.htpasswd`; match `USERNAME_STORAGE` / `PASSWORD_STORAGE` |
| Migrate vs push confusion | Local: `db:push` OK for spikes; prod/CI: always `db:migrate:prod` |
| Legacy DB name | Prefer `gudgame_db` to match production docs |

---

## Next

- [architecture.md](./architecture.md)  
- [auth-and-roles.md](./auth-and-roles.md)  
- [tournament-guide.md](./tournament-guide.md) for day-of ops  
