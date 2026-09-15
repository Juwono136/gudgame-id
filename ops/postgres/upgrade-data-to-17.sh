#!/usr/bin/env bash
# Migrate an existing Docker Postgres data volume to PostgreSQL 17.
#
# Why: postgres:17 cannot open a data directory initialized by PG15/16.
# Symptom: gudgame-postgres starts then becomes unhealthy with:
#   "database files are incompatible with server"
#
# Default:
#   OLD volume:  gudgame_postgres_data   (PG15/16)
#   NEW volume:  gudgame_postgres17_data (empty → PG17)
#
# Usage (on the VPS, from the compose project directory):
#   export POSTGRESQL_USERNAME=… POSTGRESQL_PASSWORD=…
#   chmod +x ops/postgres/upgrade-data-to-17.sh
#   ./ops/postgres/upgrade-data-to-17.sh
#
# After success: docker compose up -d postgres
# Then run migrations: docker compose --profile migrate run --rm db-migrate
set -euo pipefail

OLD_IMAGE="${OLD_PG_IMAGE:-postgres:16-alpine}"
NEW_IMAGE="${NEW_PG_IMAGE:-postgres:17-alpine}"
OLD_VOLUME="${OLD_PG_VOLUME:-gudgame_postgres_data}"
NEW_VOLUME="${NEW_PG_VOLUME:-gudgame_postgres17_data}"
PROJECT_NAME="${COMPOSE_PROJECT_NAME:-gudgame-app}"

# Compose prefixes volume names: <project>_<volume>
resolve_volume() {
  local short="$1"
  if docker volume inspect "${short}" >/dev/null 2>&1; then
    printf '%s' "${short}"
    return
  fi
  if docker volume inspect "${PROJECT_NAME}_${short}" >/dev/null 2>&1; then
    printf '%s' "${PROJECT_NAME}_${short}"
    return
  fi
  return 1
}

PG_USER="${POSTGRESQL_USERNAME:-zaka_user}"
PG_PASS="${POSTGRESQL_PASSWORD:-}"
if [ -z "${PG_PASS}" ]; then
  echo "Set POSTGRESQL_PASSWORD (and usually POSTGRESQL_USERNAME) before running." >&2
  exit 1
fi

echo "==> Stopping compose postgres (if running)…"
docker compose stop postgres >/dev/null 2>&1 || true
docker compose rm -f postgres >/dev/null 2>&1 || true

OLD_VOL_FULL="$(resolve_volume "${OLD_VOLUME}" || true)"
if [ -z "${OLD_VOL_FULL}" ]; then
  echo "No old volume '${OLD_VOLUME}' (or '${PROJECT_NAME}_${OLD_VOLUME}') found."
  echo "Nothing to migrate — start postgres:17 with a fresh volume."
  exit 0
fi

echo "==> Old volume: ${OLD_VOL_FULL}"
echo "==> Dumping with ${OLD_IMAGE}…"

docker run --rm \
  --name gudgame-pg-dump-tmp \
  -e POSTGRES_USER="${PG_USER}" \
  -e POSTGRES_PASSWORD="${PG_PASS}" \
  -e POSTGRES_DB=postgres \
  -e PGUSER="${PG_USER}" \
  -e PGPASSWORD="${PG_PASS}" \
  -v "${OLD_VOL_FULL}:/var/lib/postgresql/data" \
  -v /tmp:/backup \
  "${OLD_IMAGE}" \
  bash -c '
    set -euo pipefail
    docker-entrypoint.sh postgres &
    for i in $(seq 1 60); do
      pg_isready -U "$PGUSER" && break
      sleep 1
    done
    pg_isready -U "$PGUSER"
    # --clean/--if-exists so restore is idempotent against entrypoint-created roles/DBs
    pg_dumpall -U "$PGUSER" --clean --if-exists -f /backup/gudgame-pg-upgrade.sql
    pg_ctl -D /var/lib/postgresql/data stop -m fast || true
  '

if [ ! -s /tmp/gudgame-pg-upgrade.sql ]; then
  echo "Dump failed or empty: /tmp/gudgame-pg-upgrade.sql" >&2
  exit 1
fi
echo "==> Dump OK ($(wc -c < /tmp/gudgame-pg-upgrade.sql) bytes)"

# Ensure new volume exists (compose will also create it)
docker volume create "${PROJECT_NAME}_${NEW_VOLUME}" >/dev/null 2>&1 || \
  docker volume create "${NEW_VOLUME}" >/dev/null 2>&1 || true

NEW_VOL_FULL="$(resolve_volume "${NEW_VOLUME}" || true)"
if [ -z "${NEW_VOL_FULL}" ]; then
  NEW_VOL_FULL="${PROJECT_NAME}_${NEW_VOLUME}"
  docker volume create "${NEW_VOL_FULL}"
fi

echo "==> New volume: ${NEW_VOL_FULL}"
echo "==> Initializing ${NEW_IMAGE} and restoring dump…"

docker run --rm \
  --name gudgame-pg-restore-tmp \
  -e POSTGRES_USER="${PG_USER}" \
  -e POSTGRES_PASSWORD="${PG_PASS}" \
  -e POSTGRES_DB="${POSTGRESQL_DATABASE:-gudgame_db}" \
  -e PGUSER="${PG_USER}" \
  -e PGPASSWORD="${PG_PASS}" \
  -v "${NEW_VOL_FULL}:/var/lib/postgresql/data" \
  -v /tmp/gudgame-pg-upgrade.sql:/backup/gudgame-pg-upgrade.sql:ro \
  "${NEW_IMAGE}" \
  bash -c '
    set -euo pipefail
    # Wipe accidental partial init
    if [ -f /var/lib/postgresql/data/PG_VERSION ]; then
      ver="$(cat /var/lib/postgresql/data/PG_VERSION)"
      if [ "$ver" != "17" ]; then
        echo "Refusing to overwrite non-empty data dir (PG_VERSION=$ver)" >&2
        exit 1
      fi
      echo "Volume already PG17 — restoring into existing cluster…"
    fi
    docker-entrypoint.sh postgres &
    for i in $(seq 1 90); do
      pg_isready -U "$PGUSER" && break
      sleep 1
    done
    pg_isready -U "$PGUSER"
    psql -U "$PGUSER" -d postgres -v ON_ERROR_STOP=1 -f /backup/gudgame-pg-upgrade.sql
    pg_ctl -D /var/lib/postgresql/data stop -m fast || true
  '

rm -f /tmp/gudgame-pg-upgrade.sql
echo "==> Upgrade complete. Start with: docker compose up -d postgres"
echo "    Legacy volume '${OLD_VOL_FULL}' was NOT deleted (safe rollback)."
