#!/usr/bin/env bash
# Bootstrap Ubuntu 22.04/24.04 VM on GCP for TandingBase
# Run as root or with sudo: bash deploy/scripts/setup-vm.sh
set -euo pipefail

DEPLOY_USER="${DEPLOY_USER:-deploy}"
APP_DIR="${APP_DIR:-/opt/tandingbase}"

echo "==> Updating system packages"
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get upgrade -y

echo "==> Installing base packages"
apt-get install -y \
  ca-certificates curl gnupg lsb-release ufw fail2ban \
  git apache2-utils unattended-upgrades

echo "==> Creating deploy user: ${DEPLOY_USER}"
if ! id "${DEPLOY_USER}" &>/dev/null; then
  useradd -m -s /bin/bash "${DEPLOY_USER}"
  usermod -aG docker "${DEPLOY_USER}" 2>/dev/null || true
fi

echo "==> Installing Docker"
if ! command -v docker &>/dev/null; then
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  chmod a+r /etc/apt/keyrings/docker.gpg
  echo \
    "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
    $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
    > /etc/apt/sources.list.d/docker.list
  apt-get update -y
  apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
  systemctl enable docker
  systemctl start docker
  usermod -aG docker "${DEPLOY_USER}"
fi

echo "==> Configuring UFW firewall"
ufw default deny incoming
ufw default allow outgoing
ufw allow OpenSSH
# HTTP/HTTPS not opened — Cloudflare Tunnel handles public access
ufw --force enable

echo "==> Configuring fail2ban for SSH"
systemctl enable fail2ban
systemctl restart fail2ban

echo "==> Creating application directory: ${APP_DIR}"
mkdir -p "${APP_DIR}"
chown -R "${DEPLOY_USER}:${DEPLOY_USER}" "${APP_DIR}"

echo "==> Enabling unattended security upgrades"
dpkg-reconfigure -plow unattended-upgrades || true

echo ""
echo "Bootstrap complete. Next steps:"
echo "  1. Add your SSH public key for user ${DEPLOY_USER}"
echo "  2. Run deploy/scripts/setup-postgres.sh"
echo "  3. Run deploy/scripts/setup-redis.sh"
echo "  4. Follow docs/DEPLOYMENT_GCP.md"
