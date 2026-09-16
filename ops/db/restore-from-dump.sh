#!/usr/bin/env sh
# Restore a PostgreSQL custom-format dump into gudgame_db (Docker network `tunnel`).
#
# Handles:
#   - Source dump DB name `tanding_db` → target `gudgame_db` (no --create)
#   - Ownership/ACL noise from another host (--no-owner --no-acl)
#   - Empty target DB (CREATE DATABASE if missing)
#
# Requires Postgres server major version >= dump major version
# (this stack uses postgres:18 — dump was taken from 18.6).
#
# Usage (Compose profile):
#   GUDGAME_RESTORE_DUMP=/path/to/gudgame_db-backup \
#     docker compose --profile restore run --rm db-restore
#
# Env:
#   PGHOST, PGUSER, PGPASSWORD, PGDATABASE (target, default gudgame_db)
#   RESTORE_DUMP_PATH (default /backup/gudgame.dump)
#   FORCE_RESTORE=true  — drop+recreate target DB before restore
#   SKIP_RESTORE_IF_DATA=true (default) — abort if public.user already exists
set -eu

TARGET_DB="${PGDATABASE:-gudgame_db}"
DUMP="${RESTORE_DUMP_PATH:-/backup/gudgame.dump}"
HOST="${PGHOST:-postgres}"
USER_NAME="${PGUSER:-zaka_user}"
FORCE="${FORCE_RESTORE:-false}"
SKIP_IF_DATA="${SKIP_RESTORE_IF_DATA:-true}"

export PGPASSWORD="${PGPASSWORD:?PGPASSWORD is required}"
export PGUSER="${USER_NAME}"
export PGHOST="${HOST}"

echo "[db-restore] Target host=${HOST} db=${TARGET_DB} dump=${DUMP}"

if [ ! -f "${DUMP}" ]; then
  echo "[db-restore] Dump file not found: ${DUMP}" >&2
  echo "  Copy your backup to ops/db/backups/gudgame.dump (or set GUDGAME_RESTORE_DUMP)." >&2
  exit 1
fi

# Detect custom-format dump (PGDMP magic)
MAGIC="$(dd if="${DUMP}" bs=5 count=1 2>/dev/null || true)"
if [ "${MAGIC}" != "PGDMP" ]; then
  echo "[db-restore] Expected PostgreSQL custom-format dump (PGDMP). Got: ${MAGIC:-unknown}" >&2
  exit 1
fi

echo "[db-restore] Waiting for Postgres…"
i=0
until pg_isready -h "${HOST}" -U "${USER_NAME}" -q; do
  i=$((i + 1))
  if [ "${i}" -gt 60 ]; then
    echo "[db-restore] Postgres not ready after 60s" >&2
    exit 1
  fi
  sleep 1
done

# Ensure we can talk to the maintenance DB
psql -d postgres -v ON_ERROR_STOP=1 -c "SELECT version();" >/dev/null

exists="$(psql -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='${TARGET_DB}'" | tr -d '[:space:]')"

if [ "${FORCE}" = "true" ] && [ "${exists}" = "1" ]; then
  echo "[db-restore] FORCE_RESTORE=true — terminating sessions and dropping ${TARGET_DB}"
  psql -d postgres -v ON_ERROR_STOP=1 <<SQL
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE datname = '${TARGET_DB}' AND pid <> pg_backend_pid();
DROP DATABASE "${TARGET_DB}";
SQL
  exists=""
fi

if [ "${exists}" != "1" ]; then
  echo "[db-restore] Creating empty database ${TARGET_DB}"
  psql -d postgres -v ON_ERROR_STOP=1 -c "CREATE DATABASE \"${TARGET_DB}\";"
else
  echo "[db-restore] Database ${TARGET_DB} already exists"
fi

if [ "${SKIP_IF_DATA}" = "true" ] && [ "${FORCE}" != "true" ]; then
  has_user="$(psql -d "${TARGET_DB}" -tAc \
    "SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='user'" \
    | tr -d '[:space:]' || true)"
  if [ "${has_user}" = "1" ]; then
    echo "[db-restore] Refusing restore: public.user already exists in ${TARGET_DB}." >&2
    echo "  Set FORCE_RESTORE=true to drop+recreate, or SKIP_RESTORE_IF_DATA=false to merge (unsafe)." >&2
    exit 1
  fi
fi

echo "[db-restore] Listing dump TOC (first lines)…"
pg_restore -l "${DUMP}" 2>/dev/null | head -n 25 || true

echo "[db-restore] Restoring into ${TARGET_DB} (source dump may say tanding_db — ignored without --create)…"
# --no-owner/--no-acl: ignore roles from the old server
# Do NOT pass --create: that would recreate database named tanding_db
set +e
pg_restore \
  --verbose \
  --no-owner \
  --no-acl \
  --dbname="${TARGET_DB}" \
  "${DUMP}"
RC=$?
set -e

# pg_restore exits 1 on non-fatal warnings (missing roles, etc.). Exit 2+ is hard failure.
if [ "${RC}" -ge 2 ]; then
  echo "[db-restore] pg_restore failed with exit ${RC}" >&2
  exit "${RC}"
fi
if [ "${RC}" -eq 1 ]; then
  echo "[db-restore] pg_restore finished with warnings (exit 1) — verifying schema…"
fi

# Sanity checks
psql -d "${TARGET_DB}" -v ON_ERROR_STOP=1 <<'SQL'
SELECT
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public') AS public_tables,
  EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'user'
  ) AS has_user_table,
  EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'drizzle' AND table_name = '__drizzle_migrations'
  ) AS has_drizzle_journal;
SQL

echo "[db-restore] Restore complete into ${TARGET_DB}."
echo "[db-restore] Next: run migrations to apply schema newer than the dump:"
echo "  docker compose --profile migrate run --rm db-migrate"
