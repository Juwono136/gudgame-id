# Gud Game — database restore (tanding_db dump → gudgame_db)

Professional runbook for restoring a **PostgreSQL custom-format** dump
(file magic `PGDMP`, e.g. `gudgame_db-backup` from Downloads) into the Docker
database **`gudgame_db`**.

## Why restores failed before

| Issue | Cause | Fix in this stack |
| --- | --- | --- |
| Dump DB name `tanding_db` | `pg_restore --create` recreates that name | Restore **into** existing `gudgame_db` **without** `--create` |
| Version mismatch | Dump from **PostgreSQL 18.6**; container was **16** | Compose uses **`postgres:18-alpine`** (server ≥ dump) |
| Owner / role errors | Dump roles don’t exist on new VPS | `--no-owner --no-acl` |
| Schema newer than dump | App migrations after the backup | Run `db:migrate:prod` **after** restore |
| Accidental overwrite | Restore on every deploy | Restore is **opt-in** (`profile: restore`), never on normal CI push |

**pgAdmin version** does not need to match the dump. Only the **Postgres server**
must be ≥ dump major version. pgAdmin is only a UI client.

---

## Recommended path (CLI on the VPS) — preferred

Safer and more repeatable than pgAdmin for custom-format dumps.

### 0. Prerequisites

- Stack running: `docker compose up -d postgres` (image **18**)
- Empty / dropped `gudgame_db` is OK — the script creates it
- Dump file on the VPS (copy from your laptop):

```bash
# On laptop (example)
scp "/c/Users/asus/Downloads/gudgame_db-backup" user@gudgame-vm:~/gudgame.dump

# On VPS — into the repo checkout used by the runner
mkdir -p ops/db/backups
cp ~/gudgame.dump ops/db/backups/gudgame.dump
# or: export GUDGAME_RESTORE_DUMP=$HOME/gudgame.dump
```

### 1. Upgrade / recreate Postgres 18 volume (if you still have PG 16 data dir)

Postgres major upgrades **cannot** reuse an old data directory.

If the volume was initialized with Postgres 16 and you already dropped DBs:

```bash
docker compose stop postgres pgadmin
docker compose rm -f postgres
# ONLY if you accept wiping local Postgres files (you said gudgame_db is already empty):
docker volume rm gudgame-app_gudgame_postgres_data
docker compose up -d postgres
docker compose up -d --wait --wait-timeout 120 postgres
```

Confirm version:

```bash
docker compose exec postgres psql -U zaka_user -d postgres -c "SHOW server_version;"
# expect 18.x
```

### 2. Restore dump → `gudgame_db`

```bash
# Drop+recreate target DB, then restore (safe on empty VPS)
FORCE_RESTORE=true \
  docker compose --profile restore run --rm db-restore
```

What the script does:

1. Creates `gudgame_db` if missing  
2. Runs `pg_restore --no-owner --no-acl -d gudgame_db` (**no** `--create`)  
3. Ignores dump’s original name `tanding_db`  
4. Prints table counts / presence of `user` + drizzle journal  

### 3. Apply newer app migrations

```bash
docker compose --profile migrate run --rm db-migrate
```

This applies any SQL in `db/migrations/` that is newer than the dump
(e.g. `0027_uuid_pk_defaults`).

### 4. Restart app

```bash
docker compose up -d --no-deps app payout-cron
```

### 5. Smoke check

```bash
curl -sS -H "X-Health-Token: $HEALTH_CHECK_TOKEN" http://127.0.0.1:3000/api/health | jq .
docker compose exec postgres psql -U zaka_user -d gudgame_db -c '\dt public.*' | head
```

---

## Optional: GitHub Actions one-shot restore

Workflow: `.github/workflows/db-restore.yml` (`workflow_dispatch` only).

Inputs:

- `force_restore` — drop+recreate `gudgame_db` before restore  
- `run_migrate_after` — run `db:migrate:prod` after restore  

**Requirement:** dump must already exist on the self-hosted runner at  
`ops/db/backups/gudgame.dump` (or set secret/path `GUDGAME_RESTORE_DUMP`).  
Do **not** upload production dumps into the git repo.

---

## pgAdmin restore (step-by-step)

Use this only if you prefer the UI. Custom-format files work in pgAdmin 4 when
the **server** is Postgres 18.

### A. Open pgAdmin

1. On the VPS (or via Cloudflare tunnel to `127.0.0.1:5050`): open pgAdmin.  
2. Login with `PGADMIN_EMAIL` / `PGADMIN_PASSWORD`.  
3. Register / open server **Gud Game PostgreSQL** (host `postgres`, port `5432`,
   user `zaka_user`, password = `POSTGRESQL_PASSWORD`, maintenance DB `postgres`).

### B. Create empty target database

1. Right-click **Databases** → **Create** → **Database…**  
2. **Database**: `gudgame_db`  
3. **Owner**: `zaka_user`  
4. Save.  
5. Do **not** create a database named `tanding_db`.

### C. Upload / place the dump where the restore job can read it

pgAdmin running **inside Docker** cannot see your Windows `Downloads` folder.
Prefer the CLI restore above, **or**:

1. Copy dump onto the VPS host.  
2. Temporarily mount it into pgAdmin (advanced), **or** use CLI `db-restore`.

If you insist on pgAdmin UI restore from a file already on the server:

1. Right-click database **`gudgame_db`** → **Restore…**  
2. **Format**: `Custom or tar`  
3. **Filename**: path **inside** the pgAdmin container to the dump (only if you
   mounted it). Otherwise cancel and use CLI.  
4. **Options** tab — enable:
   - ✅ **No owner**  
   - ✅ **No privileges** (no ACL)  
   - ❌ **Do not** check “Create database”  
5. **Restore**.  
6. If you see role-missing warnings only, usually OK. Hard errors about version
   mean the server is still PG 16 — upgrade to 18 and recreate the volume.

### D. After pgAdmin restore

Still run migrations from the VPS shell:

```bash
docker compose --profile migrate run --rm db-migrate
docker compose up -d --no-deps app
```

### E. Common pgAdmin mistakes to avoid

| Mistake | Result |
| --- | --- |
| Restore with “Create database” | Creates `tanding_db`; app still points at empty `gudgame_db` |
| Restore into `postgres` maintenance DB | Pollutes system DB — don’t |
| Server still on Postgres 16 | Version error / failed restore |
| Skipping migrate after restore | Missing columns/defaults (e.g. UUID PK defaults) |
| Committing dump to git | Security risk (PII) |

---

## Mapping `tanding_db` → `gudgame_db`

You do **not** rename the database inside the dump file.

- Dump metadata may still say `tanding_db`.  
- `pg_restore -d gudgame_db` (without `--create`) loads **objects** into
  `gudgame_db`.  
- App `DATABASE_URL` stays: `postgres://…@postgres:5432/gudgame_db`.

---

## Related files

| Path | Role |
| --- | --- |
| `ops/db/restore-from-dump.sh` | Restore script |
| `ops/db/backups/` | Local dump drop folder (gitignored) |
| `docker-compose.yml` → `db-restore` | Compose profile `restore` |
| `.github/workflows/db-restore.yml` | Manual CI restore |
| `docs/DEPLOYMENT-VPS.md` | Full VPS deploy |
