#!/usr/bin/env sh
# Resolve Docker-network DATABASE_URL / REDIS_URL for Gud Game VPS deploy.
# Prefer POSTGRESQL_* / REDIS_PASSWORD secrets so stale DATABASE_URL values
# (host.docker.internal, tanding_db) cannot break migrate/app.
#
# Usage (GitHub Actions):
#   . ops/ci/export-docker-database-url.sh
#   # exports DATABASE_URL (+ REDIS_URL when REDIS_PASSWORD is set)
#   # and appends to $GITHUB_ENV when present
set -eu

DEFAULT_DB_NAME="gudgame_db"
LEGACY_DB_NAME="tanding_db"

PG_USER="${POSTGRESQL_USERNAME:-}"
PG_PASS="${POSTGRESQL_PASSWORD:-}"
PG_DB="${POSTGRESQL_DATABASE:-$DEFAULT_DB_NAME}"

if [ -z "${PG_USER}" ] || [ -z "${PG_PASS}" ]; then
  echo "[ci] POSTGRESQL_USERNAME and POSTGRESQL_PASSWORD are required to build DATABASE_URL." >&2
  exit 1
fi

if [ "${PG_DB}" = "${LEGACY_DB_NAME}" ]; then
  echo "[ci] Overriding legacy POSTGRESQL_DATABASE=${LEGACY_DB_NAME} → ${DEFAULT_DB_NAME}" >&2
  PG_DB="${DEFAULT_DB_NAME}"
fi

case "${PG_DB}" in
  ""|"postgres")
    PG_DB="${DEFAULT_DB_NAME}"
    ;;
esac

export POSTGRESQL_DATABASE="${PG_DB}"

# RFC 3986 unreserved — skip encoding when password/user are safe.
urlencode() {
  _raw="$1"
  if printf '%s' "${_raw}" | grep -Eq '^[A-Za-z0-9._~-]+$'; then
    printf '%s' "${_raw}"
    return 0
  fi
  if command -v python3 >/dev/null 2>&1; then
    RAW="${_raw}" python3 -c 'import os,urllib.parse; print(urllib.parse.quote(os.environ["RAW"], safe=""))'
  elif command -v python >/dev/null 2>&1; then
    RAW="${_raw}" python -c 'import os,urllib.parse; print(urllib.parse.quote(os.environ["RAW"], safe=""))'
  else
    docker run --rm -e RAW="${_raw}" python:3.12-alpine \
      python -c 'import os,urllib.parse; print(urllib.parse.quote(os.environ["RAW"], safe=""))'
  fi
}

ENC_USER="$(urlencode "${PG_USER}")"
ENC_PASS="$(urlencode "${PG_PASS}")"

# Always Docker DNS hostname `postgres` on network `tunnel`.
DATABASE_URL="postgres://${ENC_USER}:${ENC_PASS}@postgres:5432/${PG_DB}"
export DATABASE_URL

MASKED="$(printf '%s' "${DATABASE_URL}" | sed -E 's#://[^/@]+@#://***:***@#')"
echo "[ci] DATABASE_URL (masked): ${MASKED}"

if [ -n "${REDIS_PASSWORD:-}" ]; then
  ENC_REDIS_PASS="$(urlencode "${REDIS_PASSWORD}")"
  REDIS_URL="redis://:${ENC_REDIS_PASS}@redis:6379"
  export REDIS_URL
  echo "[ci] REDIS_URL (masked): redis://:***@redis:6379"
fi

if [ -n "${GITHUB_ENV:-}" ]; then
  {
    echo "DATABASE_URL=${DATABASE_URL}"
    echo "POSTGRESQL_DATABASE=${POSTGRESQL_DATABASE}"
    if [ -n "${REDIS_URL:-}" ]; then
      echo "REDIS_URL=${REDIS_URL}"
    fi
  } >> "${GITHUB_ENV}"
fi
