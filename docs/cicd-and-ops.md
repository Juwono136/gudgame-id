# CI/CD & Operations

How Gud Game is built, migrated, and run in production. Full VPS runbook: [DEPLOYMENT-VPS.md](./DEPLOYMENT-VPS.md).

---

## Pipeline overview

| Workflow | Trigger | Purpose |
| --- | --- | --- |
| `.github/workflows/cicd.yml` | Push / main deploy path | Build image, start infra, migrate, roll app |
| `.github/workflows/db-restore.yml` | `workflow_dispatch` only | Opt-in restore of `ops/db/backups/gudgame.dump` |

Normal CI **never** auto-restores dumps (prevents wiping production).

Runner: **self-hosted** on the VPS (Docker + Compose available).

---

## Deploy flow (conceptual)

```text
checkout
  → ensure Docker network `tunnel`
  → resolve DATABASE_URL from POSTGRESQL_* (always gudgame_db)
  → docker compose up infra (postgres 18, redis, seaweedfs, gateway, pgadmin)
  → verify Postgres major ≥ 18
  → build/pull app image
  → compose profile migrate → db:migrate:prod
  → up app + payout-cron
  → health check
```

Infra must use Postgres volume mount **`/var/lib/postgresql`** (PG18 official image). Wrong `.../data` mount → unhealthy container.

---

## Secrets (categories)

Store in **GitHub Actions Secrets** (and optional server `.env`):

| Category | Examples |
| --- | --- |
| App URLs | `NEXT_PUBLIC_APP_URL`, `BETTER_AUTH_URL` |
| Auth | `BETTER_AUTH_SECRET`, Firebase keys |
| Data | `POSTGRESQL_*`, `REDIS_PASSWORD`, derived `DATABASE_URL` |
| Storage | `USERNAME_STORAGE`, `PASSWORD_STORAGE`, bucket/URL |
| Payments | `XENDIT_*` |
| Ops | `HEALTH_CHECK_TOKEN`, `CRON_SECRET`, `PGADMIN_*` |
| Bootstrap | `BOOTSTRAP_ADMIN_*` (optional) |

Never bake secrets into the Docker image.

---

## Day-2 operations

| Task | Doc / command |
| --- | --- |
| Full stack bring-up | [DEPLOYMENT-VPS.md](./DEPLOYMENT-VPS.md) |
| Restore legacy dump | [DATABASE-RESTORE.md](./DATABASE-RESTORE.md) |
| Tournament match day | [tournament-guide.md](./tournament-guide.md) |
| Partner event | [bestie-cup-guide.md](./bestie-cup-guide.md) |
| Health | `curl` `/api/health` with token; `npm run infra:check` locally |
| Logs | `docker compose logs -f app postgres payout-cron` |

---

## Cron sidecar

`payout-cron` periodically calls:

- `/api/cron/host-payouts`
- `/api/cron/timed-matches`

Requires app reachable at `APP_INTERNAL_URL` (Compose default `http://app:3000`) and valid `CRON_SECRET`.

---

## Database policy

| Action | When |
| --- | --- |
| `db:migrate:prod` | Every deploy |
| `db:restore` profile | Manual / workflow_dispatch only |
| `drizzle-kit push` | Local spikes only — not CI prod |

Production database name: **`gudgame_db`**.

---

## Related

- [architecture.md](./architecture.md)
- [SETUP.md](./SETUP.md)
- [payments-and-payouts.md](./payments-and-payouts.md)
