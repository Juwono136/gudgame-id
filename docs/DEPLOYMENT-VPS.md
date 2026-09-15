# Gud Game — VPS deployment (Docker Compose + Cloudflare Tunnel)

Professional runbook for deploying **Gud Game** on a blank VPS. Public HTTPS
(`https://gudgame.id`, `https://storage.gudgame.id`) is terminated by
**Cloudflare Zero Trust / cloudflared** (you configure that separately). This
document covers the Docker stack that cloudflared attaches to.

## Architecture

All services join the same Docker network named **`tunnel`** so they resolve
each other by Compose **service name** (and so cloudflared can reach them).

| Service (Compose) | Container name | Role | Host ports (localhost only) |
| --- | --- | --- | --- |
| `postgres` | `gudgame-postgres` | PostgreSQL 16 | `127.0.0.1:5432` |
| `redis` | `gudgame-redis` | Redis 7 (AOF + password) | `127.0.0.1:6379` |
| `pgadmin` | `gudgame-pgadmin` | pgAdmin 4 | `127.0.0.1:5050` |
| `seaweedfs` | `seaweed_core` | SeaweedFS master+volume+filer | *(none — internal)* |
| `storage_gateway` | `storage_gateway` | nginx basic-auth gateway | `127.0.0.1:8333`, `9333` |
| `app` | `gudgame-app` | Next.js app | `3000` |
| `payout-cron` | `gudgame-payout-cron` | Cron → `/api/cron/*` | *(none)* |
| `db-migrate` | *(ephemeral)* | `npm run db:migrate:prod` (SQL migrator) | profile `migrate` |

**App connection strings (inside Docker):**

```text
DATABASE_URL=postgres://USER:PASS@postgres:5432/gudgame_db
REDIS_URL=redis://:PASS@redis:6379
STORAGE_ENDPOINT=http://storage_gateway:8333
NEXT_PUBLIC_APP_URL=https://gudgame.id
NEXT_PUBLIC_STORAGE_URL=https://storage.gudgame.id
```

SeaweedFS is **not** exposed on the public internet. Uploads go through
`storage_gateway` (nginx + `.htpasswd`). Browsers use
`https://storage.gudgame.id` (Cloudflare → `storage_gateway:8333`).

## First-time setup (empty VPS)

1. Install Docker Engine + Compose plugin and the GitHub Actions **self-hosted** runner.
2. Clone this repo (or let the workflow check it out).
3. Create the shared network (idempotent — CI also does this):

   ```bash
   docker network create tunnel
   ```

4. Generate nginx basic-auth for storage (same values as GitHub Secrets
   `USERNAME_STORAGE` / `PASSWORD_STORAGE`):

   ```bash
   USERNAME_STORAGE=admin PASSWORD_STORAGE='…' ./ops/storage/generate-htpasswd.sh
   ```

5. Export / place production env (must match GitHub Secrets). Minimum infra vars:

   - `POSTGRESQL_USERNAME`, `POSTGRESQL_PASSWORD`, `POSTGRESQL_DATABASE`
   - `REDIS_PASSWORD`
   - `PGADMIN_EMAIL`, `PGADMIN_PASSWORD`
   - `DATABASE_URL`, `REDIS_URL`, `STORAGE_ENDPOINT`
   - `DOCKER_USERNAME`, app secrets (auth, Firebase, SMTP, Xendit, …)

6. Start the full stack:

   ```bash
   docker compose up -d
   docker compose --profile migrate run --rm db-migrate
   # runs: npm run db:migrate:prod → scripts/run-db-migrate.ts
   # (applies SQL under db/migrations — do NOT use drizzle-kit push in CI)
   ```

7. Attach **cloudflared** to network `tunnel` and route:
   - `gudgame.id` → `http://app:3000` (or `http://gudgame-app:3000`)
   - `storage.gudgame.id` → `http://storage_gateway:8333`

## Database migrations (CI)

Deploy runs **`npm run db:migrate:prod`** inside the `migrator` image (Compose service
`db-migrate`). That script:

1. Validates `DATABASE_URL` (rejects `localhost` inside Docker)
2. Probes Postgres connectivity with a clear error
3. Applies committed SQL under `db/migrations/` (or baselines a legacy push-created schema)

**Do not** use `drizzle-kit push` in CI — it often fails mid-“Pulling schema…” with little
output and is unsafe for production deploys.

`DATABASE_URL` must use Docker DNS, e.g.
`postgres://USER:PASS@postgres:5432/gudgame_db`.

## CI/CD (`.github/workflows/cicd.yml`)

On push to `master` (self-hosted runner):

1. Create network `tunnel` if missing  
2. Generate `ops/storage/.htpasswd` from secrets  
3. `docker compose up -d` infra (`postgres`, `redis`, `seaweedfs`, `storage_gateway`, `pgadmin`)  
4. Wait for Postgres + Redis healthy  
5. Migrate → seed → bootstrap admin → purge QA fixtures  
6. Recreate **only** `app` + `payout-cron` (`--no-deps`)  
7. Smoke-test `/api/health` and container status  

**Do not** run `docker compose down --remove-orphans` on a shared VPS.

## GitHub Secrets checklist

Keep values **identical** to `.env.production` / server env.

### Public / build-time

| Secret | Example |
| --- | --- |
| `NEXT_PUBLIC_APP_URL` | `https://gudgame.id` |
| `NEXT_PUBLIC_SITE_URL` | `https://gudgame.id` |
| `NEXT_PUBLIC_STORAGE_URL` | `https://storage.gudgame.id` |
| `BETTER_AUTH_URL` | `https://gudgame.id` |
| `NEXT_PUBLIC_FIREBASE_*` | (Firebase web config) |

### Runtime app

| Secret | Notes |
| --- | --- |
| `DATABASE_URL` | Host **`postgres`**, not localhost |
| `REDIS_URL` | Host **`redis`**, include password |
| `STORAGE_ENDPOINT` | `http://storage_gateway:8333` |
| `STORAGE_AUTH_MODE` | `nginx-basic` |
| `USERNAME_STORAGE` / `PASSWORD_STORAGE` | Same as htpasswd |
| `HEALTH_CHECK_TOKEN`, `CRON_SECRET`, … | As today. If a secret contains `$`, store the **literal** value in GitHub Secrets; when using Compose `env_file`, escape as `$$`. |

### Infra (compose)

| Secret | Used by |
| --- | --- |
| `TUNNEL_NAME` | Default `tunnel` |
| `POSTGRESQL_USERNAME` | `gudgame-postgres` |
| `POSTGRESQL_PASSWORD` | `gudgame-postgres` |
| `POSTGRESQL_DATABASE` | e.g. `gudgame_db` |
| `REDIS_PASSWORD` | `gudgame-redis` |
| `PGADMIN_EMAIL` / `PGADMIN_PASSWORD` | `gudgame-pgadmin` |
| `DOCKER_USERNAME` / `DOCKER_PASSWORD` | Image pull/push |

## Storage gateway files

| Path | Purpose |
| --- | --- |
| `ops/storage/nginx.conf` | Proxy to `seaweedfs:8333` / `:9333` + basic auth |
| `ops/storage/generate-htpasswd.sh` | Build `.htpasswd` from env |
| `ops/storage/.htpasswd` | Runtime secret (gitignored; CI generates) |
| `ops/pgadmin/servers.json` | Pre-registers host `postgres` |

## Images / Dockerfiles

| File | Image / target |
| --- | --- |
| `Dockerfile` | `${DOCKER_USERNAME}/gudgame:latest` (+ `migrator` stage) |
| `ops/cron/Dockerfile` | `gudgame-payout-cron:local` → calls `http://app:3000` |

Baked defaults: `NEXT_PUBLIC_*` and storage URL point at **gudgame.id** /
**storage.gudgame.id**. Override at build via CI build-args.

## Operations

```bash
# Status
docker compose ps
docker network inspect tunnel

# Logs
docker logs gudgame-app --tail 100 -f
docker logs storage_gateway --tail 50
docker logs seaweed_core --tail 50

# Migrate only
docker compose --profile migrate run --rm db-migrate

# Restart app without touching DB/storage
docker compose up -d --no-deps app payout-cron
```

## Troubleshooting

| Symptom | Check |
| --- | --- |
| App cannot reach DB | `DATABASE_URL` host must be `postgres`; both on `tunnel` |
| Migrate fails at “Pulling schema…” | Old `drizzle-kit push` path — redeploy with `db:migrate:prod`; check secret host is `postgres` and DB is `gudgame_db` |
| Redis auth errors | `REDIS_URL` password = `REDIS_PASSWORD` |
| Upload 401 | Regenerate `.htpasswd`; secrets match `USERNAME_STORAGE` / `PASSWORD_STORAGE` |
| `network tunnel not found` | `docker network create tunnel` |
| Health 503 | `docker logs gudgame-app`; Postgres/Redis healthy? |
| pgAdmin blank servers | Open UI at `127.0.0.1:5050`, password = `PGADMIN_PASSWORD`; host `postgres` |

## Related

- Compose: `docker-compose.yml`
- Workflow: `.github/workflows/cicd.yml`
- Env template: `.env.example` / `.env.production`
- Tournament / product docs: `docs/tournament-guide.md`, `docs/partner-auth.md`
