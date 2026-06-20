#!/bin/sh
# Triggered by payout-cron sidecar (docker-compose). Calls app over internal Docker network.
set -eu

if [ -z "${CRON_SECRET:-}" ]; then
  echo "[host-payouts] CRON_SECRET is not set — aborting." >&2
  exit 1
fi

APP_URL="${APP_INTERNAL_URL:-http://app:3000}"
TIMESTAMP="$(date -Iseconds)"

echo "[${TIMESTAMP}] Triggering scheduled host payout job at ${APP_URL}/api/cron/host-payouts"

HTTP_CODE="$(curl -sS -o /tmp/payout-cron-response.json -w "%{http_code}" \
  -H "Authorization: Bearer ${CRON_SECRET}" \
  -H "X-Cron-Source: tandingbase-payout-cron" \
  --connect-timeout 30 \
  --max-time 300 \
  "${APP_URL}/api/cron/host-payouts")"

if [ "${HTTP_CODE}" -ge 200 ] && [ "${HTTP_CODE}" -lt 300 ]; then
  echo "[${TIMESTAMP}] Host payout job OK (HTTP ${HTTP_CODE})"
  cat /tmp/payout-cron-response.json 2>/dev/null || true
  exit 0
fi

echo "[${TIMESTAMP}] Host payout job failed (HTTP ${HTTP_CODE})" >&2
cat /tmp/payout-cron-response.json 2>/dev/null || true
exit 1
