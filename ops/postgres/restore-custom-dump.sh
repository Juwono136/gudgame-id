#!/usr/bin/env bash
# Compatibility wrapper — prefer Compose profile restore.
#
#   cp /path/to/gudgame_db-backup ops/db/backups/gudgame.dump
#   FORCE_RESTORE=true docker compose --profile restore run --rm db-restore
#
# This script delegates to the same flow for local convenience.
set -euo pipefail

ROOT="$(CDPATH= cd -- "$(dirname "$0")/../.." && pwd)"
DUMP_PATH="${1:-}"

if [ -n "${DUMP_PATH}" ]; then
  mkdir -p "${ROOT}/ops/db/backups"
  cp -f "${DUMP_PATH}" "${ROOT}/ops/db/backups/gudgame.dump"
  echo "Copied dump → ops/db/backups/gudgame.dump"
fi

cd "${ROOT}"
export FORCE_RESTORE="${FORCE_RESTORE:-true}"
export SKIP_RESTORE_IF_DATA="${SKIP_RESTORE_IF_DATA:-true}"
chmod +x ops/db/restore-from-dump.sh
docker compose --profile restore run --rm db-restore
echo "Next: docker compose --profile migrate run --rm db-migrate"
