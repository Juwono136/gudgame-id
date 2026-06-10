#!/usr/bin/env bash
# Create nginx basic-auth for SeaweedFS gateway and start stack
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
STORAGE_USER="${STORAGE_USER:-admin}"
STORAGE_PASS="${STORAGE_PASS:-}"

if [[ -z "${STORAGE_PASS}" ]]; then
  read -rsp "SeaweedFS nginx password (${STORAGE_USER}): " STORAGE_PASS
  echo
fi

mkdir -p "${REPO_ROOT}/deploy/nginx"
htpasswd -bc "${REPO_ROOT}/deploy/nginx/.htpasswd" "${STORAGE_USER}" "${STORAGE_PASS}"

docker compose -f "${REPO_ROOT}/deploy/docker-compose.seaweedfs.yml" up -d

echo ""
echo "SeaweedFS gateway: http://127.0.0.1:8333"
echo "  USERNAME_STORAGE=${STORAGE_USER}"
echo "  STORAGE_ALLOW_LOCALHOST=true"
echo "  STORAGE_ENDPOINT=http://127.0.0.1:8333"
