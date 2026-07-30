#!/bin/sh
# Trigger timed-match hard-stop finalization (every minute).
set -eu

if [ -z "${CRON_SECRET:-}" ]; then
  echo "[timed-matches] CRON_SECRET is not set — aborting." >&2
  exit 1
fi

APP_URL="${APP_INTERNAL_URL:-http://app:3000}"
TIMESTAMP="$(date -Iseconds)"

echo "[${TIMESTAMP}] Triggering timed matches job at ${APP_URL}/api/cron/timed-matches"

HTTP_CODE="$(curl -sS -o /tmp/timed-matches-body.txt -w "%{http_code}" \
  -X POST \
  -H "Authorization: Bearer ${CRON_SECRET}" \
  -H "Content-Type: application/json" \
  "${APP_URL}/api/cron/timed-matches")"

BODY="$(cat /tmp/timed-matches-body.txt 2>/dev/null || true)"
echo "[${TIMESTAMP}] HTTP ${HTTP_CODE}: ${BODY}"

case "${HTTP_CODE}" in
  2*) exit 0 ;;
  *) exit 1 ;;
esac
