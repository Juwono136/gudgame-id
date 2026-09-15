#!/usr/bin/env sh
# Generate nginx basic-auth file for storage_gateway from env secrets.
# Usage (CI / VPS):
#   USERNAME_STORAGE=admin PASSWORD_STORAGE=secret ./ops/storage/generate-htpasswd.sh
set -eu

ROOT_DIR="$(CDPATH= cd -- "$(dirname "$0")" && pwd)"
OUT_FILE="${HTPASSWD_OUT:-${ROOT_DIR}/.htpasswd}"
USER_NAME="${USERNAME_STORAGE:-}"
PASS_WORD="${PASSWORD_STORAGE:-}"

if [ -z "${USER_NAME}" ] || [ -z "${PASS_WORD}" ]; then
  echo "[storage] USERNAME_STORAGE and PASSWORD_STORAGE are required." >&2
  exit 1
fi

if command -v htpasswd >/dev/null 2>&1; then
  htpasswd -nbB "${USER_NAME}" "${PASS_WORD}" > "${OUT_FILE}"
elif command -v docker >/dev/null 2>&1; then
  docker run --rm httpd:2.4-alpine \
    htpasswd -nbB "${USER_NAME}" "${PASS_WORD}" > "${OUT_FILE}"
else
  echo "[storage] Need htpasswd or docker to generate ${OUT_FILE}" >&2
  exit 1
fi

chmod 644 "${OUT_FILE}" 2>/dev/null || true
echo "[storage] Wrote ${OUT_FILE} for user '${USER_NAME}'"
