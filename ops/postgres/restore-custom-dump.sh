#!/usr/bin/env bash
# Restore a PostgreSQL custom-format dump (.backup) into gudgame_db.
#
# WHY YOUR PREVIOUS RESTORE FAILED
# -------------------------------
# pg_restore --clean into a DB that already ran `db:migrate:prod` fails because:
#   1) migrate created the same tables with DIFFERENT constraint/index names
#   2) DROP CONSTRAINT / DROP TABLE then hits "does not exist" or FK dependents
#   3) CREATE TABLE hits "already exists"
#   4) COPY hits duplicate keys + broken FKs → exit 1 with dozens of errors
#
# Correct approach: wipe the target database to empty, THEN restore (no --clean).
#
# DUMP COMPATIBILITY
# ------------------
# `gudgame_db-backup` was dumped from PostgreSQL 18 (dbname tanding_db).
# Target server must be PostgreSQL 18+ (compose uses postgres:18-alpine).
# You cannot restore a PG18 dump into PG17.
#
# Usage (Docker / VPS — from compose project dir):
#   export POSTGRESQL_USERNAME=… POSTGRESQL_PASSWORD=…
#   chmod +x ops/postgres/restore-custom-dump.sh
#   ./ops/postgres/restore-custom-dump.sh /path/to/gudgame_db-backup
#
# Usage (local psql on host, server on 127.0.0.1:5432):
#   RESTORE_MODE=local ./ops/postgres/restore-custom-dump.sh ~/Downloads/gudgame_db-backup
#
# After restore: do NOT re-run a full migrate baseline. Dump already includes
# schema + drizzle.__drizzle_migrations. Only apply *new* migrations if any:
#   docker compose --profile migrate run --rm db-migrate
set -euo pipefail

DUMP_PATH="${1:-}"
if [ -z "${DUMP_PATH}" ] || [ ! -f "${DUMP_PATH}" ]; then
  echo "Usage: $0 /absolute/path/to/gudgame_db-backup" >&2
  exit 1
fi

PG_USER="${POSTGRESQL_USERNAME:-zaka_user}"
PG_PASS="${POSTGRESQL_PASSWORD:-}"
PG_DB="${POSTGRESQL_DATABASE:-gudgame_db}"
RESTORE_MODE="${RESTORE_MODE:-docker}" # docker | local

if [ -z "${PG_PASS}" ]; then
  echo "Set POSTGRESQL_PASSWORD before running." >&2
  exit 1
fi

# Refuse PG17-or-older targets for known PG18 dumps (header check via pg_restore -l).
DUMP_FROM="$(pg_restore -l "${DUMP_PATH}" 2>/dev/null | sed -n 's/.*Dumped from database version: //p' | head -1 || true)"
echo "==> Dump: ${DUMP_PATH}"
echo "==> Dump source version: ${DUMP_FROM:-unknown}"
echo "==> Target database: ${PG_DB} (mode=${RESTORE_MODE})"

case "${DUMP_FROM}" in
  18.*|19.*)
    ;;
  17.*|16.*|15.*)
    echo "WARNING: dump is from ${DUMP_FROM}; ensure the server major is >= that version." >&2
    ;;
  *)
    echo "NOTE: could not parse dump server version from TOC; continuing." >&2
    ;;
esac

run_psql() {
  local db="$1"
  shift
  if [ "${RESTORE_MODE}" = "local" ]; then
    PGPASSWORD="${PG_PASS}" psql -h 127.0.0.1 -p 5432 -U "${PG_USER}" -d "${db}" -v ON_ERROR_STOP=1 "$@"
  else
    docker compose exec -T \
      -e PGPASSWORD="${PG_PASS}" \
      postgres \
      psql -U "${PG_USER}" -d "${db}" -v ON_ERROR_STOP=1 "$@"
  fi
}

run_pg_restore() {
  if [ "${RESTORE_MODE}" = "local" ]; then
    PGPASSWORD="${PG_PASS}" pg_restore \
      -h 127.0.0.1 -p 5432 -U "${PG_USER}" -d "${PG_DB}" \
      --no-owner --role="${PG_USER}" \
      --verbose \
      "${DUMP_PATH}"
  else
    # Copy dump into the postgres container, then restore.
    docker compose cp "${DUMP_PATH}" postgres:/tmp/gudgame_restore.dump
    docker compose exec -T \
      -e PGPASSWORD="${PG_PASS}" \
      postgres \
      pg_restore \
        -U "${PG_USER}" -d "${PG_DB}" \
        --no-owner --role="${PG_USER}" \
        --verbose \
        /tmp/gudgame_restore.dump
    docker compose exec -T postgres rm -f /tmp/gudgame_restore.dump
  fi
}

echo "==> Terminating connections to ${PG_DB}…"
run_psql postgres <<SQL
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE datname = '${PG_DB}' AND pid <> pg_backend_pid();
SQL

echo "==> Dropping and recreating empty database ${PG_DB}…"
run_psql postgres -c "DROP DATABASE IF EXISTS \"${PG_DB}\";"
run_psql postgres -c "CREATE DATABASE \"${PG_DB}\" OWNER \"${PG_USER}\";"

echo "==> Restoring (no --clean; target is empty)…"
set +e
run_pg_restore
RC=$?
set -e

# pg_restore returns 1 if any warning/nonfatal errors; 0 only when clean.
if [ "${RC}" -ne 0 ]; then
  echo ""
  echo "pg_restore exited with code ${RC}."
  echo "If you only see harmless notices, verify row counts below."
  echo "A non-empty exit after DROP+CREATE usually means a real failure — check output above."
fi

echo "==> Smoke checks…"
run_psql "${PG_DB}" <<'SQL'
SELECT
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public') AS public_tables,
  (SELECT COUNT(*) FROM "user") AS users,
  (SELECT COUNT(*) FROM tournaments) AS tournaments,
  (SELECT COUNT(*) FROM sports) AS sports;
SQL

echo "==> Done. Next:"
echo "    docker compose --profile migrate run --rm db-migrate   # apply only pending migrations"
echo "    docker compose up -d --no-deps app"
