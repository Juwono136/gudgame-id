# Gud Game — database restore (tanding_db dump → gudgame_db)

> **Docs hub:** [README.md](./README.md) · Deploy: [DEPLOYMENT-VPS.md](./DEPLOYMENT-VPS.md) · CI/CD: [cicd-and-ops.md](./cicd-and-ops.md)

Professional runbook for restoring a **PostgreSQL custom-format** dump
(file magic `PGDMP`, e.g. `Downloads/gudgame_db-backup`) into the Docker
database **`gudgame_db`**.

Your dump was verified as:

- Format: PostgreSQL **custom** (`PGDMP`)
- Source: **PostgreSQL 18.6** (Ubuntu)
- Original DB name inside dump: **`tanding_db`**

## Why restores failed before

| Issue | Cause | Fix in this stack |
| --- | --- | --- |
| Dump DB name `tanding_db` | `pg_restore --create` recreates that name | Restore **into** `gudgame_db` **without** `--create` |
| Version mismatch | Dump from **PG 18.6**; container was **16** | Compose uses **`postgres:18-alpine`** |
| Owner / role errors | Dump roles don’t exist on new VPS | `--no-owner --no-acl` |
| Restore into DB that already ran migrate | Duplicate tables / constraint name clashes | **Empty** target DB first (`FORCE_RESTORE=true`) |
| Schema newer than dump | App migrations after the backup | Run `db:migrate:prod` **after** restore |
| Accidental overwrite | Restore on every deploy | Restore is **opt-in** only (Compose profile / workflow_dispatch) |

**pgAdmin version** does not need to match the dump. Only the **Postgres server**
must be ≥ dump major version (here: **18+**).

---

## Recommended path (CLI on the VPS) — preferred

Safer and more repeatable than pgAdmin for custom-format dumps.

### 0. Copy the dump onto the VPS

```bash
# From your laptop (example)
scp "/c/Users/asus/Downloads/gudgame_db-backup" asus@gudgame-vm:~/gudgame.dump

# On the VPS — into the compose project directory (Actions runner workdir)
cd ~/path/to/court-pedia   # or the runner checkout
mkdir -p ops/db/backups
cp ~/gudgame.dump ops/db/backups/gudgame.dump
```

### 1. Switch Postgres to 18 (required once)

Postgres **cannot** open a data directory initialized by PG16.

Because `gudgame_db` is already empty/dropped, wipe the old volume and start PG18:

```bash
docker compose stop postgres pgadmin
docker compose rm -f postgres
# Optional: remove legacy PG16 volume if it still exists
docker volume rm gudgame-app_gudgame_postgres_data 2>/dev/null || true
# If a previous PG18 attempt failed (wrong mount .../data), wipe and recreate:
docker volume rm gudgame-app_gudgame_postgres18_data 2>/dev/null || true

# Pull + start PG18 (volume: gudgame_postgres18_data → /var/lib/postgresql)
docker compose pull postgres
docker compose up -d postgres
docker compose up -d --wait --wait-timeout 120 postgres

docker compose exec postgres psql -U zaka_user -d postgres -c "SHOW server_version;"
# expect 18.x
```

> **Postgres 18 Docker note:** mount the volume at `/var/lib/postgresql`, not
> `/var/lib/postgresql/data`. Mounting the old path makes the container exit /
> stay **unhealthy** (official image layout change).

### 2. Restore dump → `gudgame_db`

```bash
FORCE_RESTORE=true \
  docker compose --profile restore run --rm db-restore
```

What the script does:

1. Verifies server is PostgreSQL 18+  
2. Creates / recreates empty `gudgame_db`  
3. Runs `pg_restore --no-owner --no-acl -d gudgame_db` (**no** `--create`)  
4. Ignores dump’s original name `tanding_db`  
5. Prints sanity counts (`user` table, drizzle journal)

### 3. Apply newer app migrations

```bash
docker compose --profile migrate run --rm db-migrate
```

Applies any SQL in `db/migrations/` that is newer than the dump
(e.g. `0027_uuid_pk_defaults`).

### 4. Restart app

```bash
docker compose up -d pgadmin
docker compose up -d --no-deps app payout-cron
```

### 5. Smoke check

```bash
curl -sS -H "X-Health-Token: $HEALTH_CHECK_TOKEN" http://127.0.0.1:3000/api/health | jq .
docker compose exec postgres psql -U zaka_user -d gudgame_db -c 'SELECT COUNT(*) FROM "user";'
```

---

## Optional: GitHub Actions one-shot restore

Workflow: **Actions → “Gud Game DB Restore” → Run workflow**  
(`.github/workflows/db-restore.yml`, `workflow_dispatch` only).

1. Copy dump to the self-hosted runner: `ops/db/backups/gudgame.dump`  
2. Run workflow with:
   - `force_restore` = true  
   - `run_migrate_after` = true  

Normal **push CI does not restore** (avoids wiping production).

---

## pgAdmin restore (step-by-step)

Use this when you want the UI. The server must already be **Postgres 18**.

### A. Prepare the dump for the pgAdmin container

pgAdmin runs **inside Docker** and cannot see Windows `Downloads`.
Compose mounts `ops/db/backups` → **`/backups`** (read-only).

```bash
# On VPS
mkdir -p ops/db/backups
cp ~/gudgame.dump ops/db/backups/gudgame.dump
docker compose up -d pgadmin
```

### B. Open pgAdmin

1. Open `http://127.0.0.1:5050` (or your Cloudflare route).  
2. Login with `PGADMIN_EMAIL` / `PGADMIN_PASSWORD`.  
3. Open server **Gud Game PostgreSQL**  
   - Host: `postgres`  
   - Port: `5432`  
   - Username: `zaka_user`  
   - Password: `POSTGRESQL_PASSWORD`  
   - Maintenance DB: `postgres`

### C. Create empty target database

1. Right-click **Databases** → **Create** → **Database…**  
2. **Database**: `gudgame_db` (exactly this name)  
3. **Owner**: `zaka_user`  
4. Save.  
5. Do **not** create `tanding_db`.

If `gudgame_db` already has tables from a failed restore, **drop it first**:

1. Disconnect sessions (right-click DB → Disconnect)  
2. Right-click `gudgame_db` → **Delete/Drop**  
3. Recreate empty `gudgame_db` as above  

### D. Restore in pgAdmin

1. Right-click **`gudgame_db`** → **Restore…**  
2. **Format**: `Custom or tar`  
3. **Filename**: `/backups/gudgame.dump`  
   (browse under `/backups` — this is the mounted folder)  
4. Open the **Data options** / **Options** / **Restore options** tabs and set:

| Option | Value |
| --- | --- |
| **No owner** | ✅ ON |
| **No privileges** / No ACL | ✅ ON |
| **Create database** | ❌ OFF (critical) |
| **Clean before restore** | ❌ OFF (target must already be empty) |

5. Click **Restore**.  
6. Watch the messages panel:
   - Warnings about missing roles → usually OK with No owner  
   - Errors about “unsupported version” / archive format → server is still not PG18  
   - Errors about “already exists” → DB was not empty — drop & recreate, then retry  

### E. After pgAdmin restore (required)

```bash
docker compose --profile migrate run --rm db-migrate
docker compose up -d --no-deps app
```

### F. Common pgAdmin mistakes

| Mistake | Result |
| --- | --- |
| “Create database” checked | Creates `tanding_db`; app still uses empty `gudgame_db` |
| Restore into maintenance DB `postgres` | Pollutes system DB |
| Server still on Postgres 16 | Version / format errors |
| Restore into DB that already ran migrate | Dozens of “already exists” / FK errors |
| Skipping migrate after restore | Missing newer columns (e.g. UUID defaults) |
| Looking for the file under Windows path in pgAdmin | Use `/backups/gudgame.dump` inside the container |

---

## Mapping `tanding_db` → `gudgame_db`

You do **not** edit or rename the dump file.

- Dump metadata may still say `tanding_db`.  
- `pg_restore -d gudgame_db` (without `--create`) loads **objects** into `gudgame_db`.  
- App `DATABASE_URL` stays: `postgres://…@postgres:5432/gudgame_db`.

---

## Related files

| Path | Role |
| --- | --- |
| `ops/db/restore-from-dump.sh` | Restore script (used by Compose) |
| `ops/db/backups/` | Dump drop folder (gitignored) |
| `docker-compose.yml` → `postgres:18-alpine`, `db-restore` | Server + restore profile |
| `.github/workflows/db-restore.yml` | Manual CI restore |
| `docs/DEPLOYMENT-VPS.md` | Full VPS deploy |
