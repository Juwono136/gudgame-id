#!/usr/bin/env sh
# Ensure gudgame-postgres becomes healthy on Docker network `tunnel`.
#
# Handles Postgres major upgrades (e.g. 16 → 18): data directories are not
# compatible across majors. When PG_VERSION on the volume differs from the
# image major, optionally wipe the named volume (empty VPS / intentional reset).
#
# Env:
#   POSTGRES_WIPE_ON_MAJOR_UPGRADE=true  — remove volume & recreate (DESTRUCTIVE)
#   POSTGRESQL_* — passed through to compose
set -eu

COMPOSE="${COMPOSE_CMD:-docker compose}"
WIPE="${POSTGRES_WIPE_ON_MAJOR_UPGRADE:-false}"
EXPECTED_MAJOR="${POSTGRES_EXPECTED_MAJOR:-18}"

echo "[postgres] Starting postgres (expected major ${EXPECTED_MAJOR})…"
${COMPOSE} up -d postgres

# Give the engine a moment to crash-loop on incompatible data dirs
sleep 3

STATUS="$(docker inspect -f '{{.State.Status}}' gudgame-postgres 2>/dev/null || echo missing)"
HEALTH="$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' gudgame-postgres 2>/dev/null || echo missing)"
echo "[postgres] status=${STATUS} health=${HEALTH}"

# Detect data-dir major from the volume (works even if container is restarting).
# PG18+ mounts /var/lib/postgresql; older layouts used .../data with PG_VERSION at root.
VOL_NAME="$(docker inspect -f '{{range .Mounts}}{{if eq .Destination "/var/lib/postgresql"}}{{.Name}}{{end}}{{if eq .Destination "/var/lib/postgresql/data"}}{{.Name}}{{end}}{{end}}' gudgame-postgres 2>/dev/null || true)"
DATA_MAJOR=""
if [ -n "${VOL_NAME}" ]; then
  DATA_MAJOR="$(
    docker run --rm -v "${VOL_NAME}:/data:ro" alpine:3.20 \
      sh -c '
        if [ -f "/data/'"${EXPECTED_MAJOR}"'/docker/PG_VERSION" ]; then
          cat "/data/'"${EXPECTED_MAJOR}"'/docker/PG_VERSION"
        elif [ -f /data/PG_VERSION ]; then
          cat /data/PG_VERSION
        elif [ -f /data/data/PG_VERSION ]; then
          cat /data/data/PG_VERSION
        fi
      ' 2>/dev/null || true
  )"
  DATA_MAJOR="$(printf '%s' "${DATA_MAJOR}" | tr -d '[:space:]')"
fi
echo "[postgres] volume=${VOL_NAME:-unknown} data_dir_major=${DATA_MAJOR:-unknown}"

needs_wipe=false
if [ -n "${DATA_MAJOR}" ] && [ "${DATA_MAJOR}" != "${EXPECTED_MAJOR}" ]; then
  echo "[postgres] Major mismatch: volume is PG${DATA_MAJOR}, image expects PG${EXPECTED_MAJOR}."
  needs_wipe=true
fi

# Also detect classic / PG18 mount-layout failure lines
if docker logs gudgame-postgres --tail 120 2>&1 | grep -qiE \
  'database files are incompatible with server|incompatible with server|PG_VERSION|unused mount/volume|configured to store database data in a format'; then
  echo "[postgres] Detected incompatible data directory / mount layout in container logs."
  needs_wipe=true
fi

if [ "${needs_wipe}" = "true" ]; then
  if [ "${WIPE}" != "true" ]; then
    echo "[postgres] ERROR: Postgres cannot start on this volume." >&2
    echo "  Dump restore needs PostgreSQL ${EXPECTED_MAJOR}+; old volume is PG${DATA_MAJOR:-?}." >&2
    echo "  Because a major upgrade cannot reuse the data directory, wipe once on the VPS:" >&2
    echo "    docker compose stop postgres pgadmin" >&2
    echo "    docker compose rm -f postgres" >&2
    echo "    docker volume rm ${VOL_NAME:-gudgame-app_gudgame_postgres_data}" >&2
    echo "    docker compose up -d postgres" >&2
    echo "  Or re-run deploy with workflow input / secret POSTGRES_WIPE_ON_MAJOR_UPGRADE=true" >&2
    echo "  (only when the DB is empty or you have a dump to restore)." >&2
    docker logs gudgame-postgres --tail 40 2>&1 || true
    exit 1
  fi

  echo "[postgres] POSTGRES_WIPE_ON_MAJOR_UPGRADE=true — recreating empty PG${EXPECTED_MAJOR} volume…"
  ${COMPOSE} stop postgres pgadmin || true
  ${COMPOSE} rm -f postgres || true
  if [ -n "${VOL_NAME}" ]; then
    docker volume rm "${VOL_NAME}" || true
  else
    docker volume ls -q | grep -E 'gudgame_postgres_data$' | while read -r v; do
      docker volume rm "${v}" || true
    done
  fi
  ${COMPOSE} up -d postgres
fi

echo "[postgres] Waiting until healthy…"
${COMPOSE} up -d --wait --wait-timeout 180 postgres

VER="$(docker exec gudgame-postgres psql -U "${POSTGRESQL_USERNAME:-zaka_user}" -d postgres -tAc 'SHOW server_version;' 2>/dev/null | tr -d '[:space:]' || true)"
echo "[postgres] Ready — server_version=${VER:-unknown}"
