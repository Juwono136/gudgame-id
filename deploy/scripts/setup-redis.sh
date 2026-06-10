#!/usr/bin/env bash
# Install Redis on VPS — bound to localhost with password
set -euo pipefail

REDIS_PASS="${REDIS_PASS:-}"
if [[ -z "${REDIS_PASS}" ]]; then
  read -rsp "Redis password: " REDIS_PASS
  echo
fi

export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y redis-server

REDIS_CONF="/etc/redis/redis.conf"
sed -i 's/^supervised no/supervised systemd/' "${REDIS_CONF}"
sed -i 's/^bind .*/bind 127.0.0.1 ::1/' "${REDIS_CONF}"
sed -i 's/^# requirepass .*/requirepass '"${REDIS_PASS}"'/' "${REDIS_CONF}" || \
  echo "requirepass ${REDIS_PASS}" >> "${REDIS_CONF}"
sed -i 's/^protected-mode yes/protected-mode yes/' "${REDIS_CONF}"

systemctl enable redis-server
systemctl restart redis-server

echo ""
echo "Redis ready."
echo "  REDIS_URL=redis://:${REDIS_PASS}@127.0.0.1:6379"
