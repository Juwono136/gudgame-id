#!/usr/bin/env bash
# Install GitHub Actions self-hosted runner (run as deploy user after creating runner in GitHub UI)
# Usage:
#   export RUNNER_URL="https://github.com/YOUR_ORG/court-pedia"
#   export RUNNER_TOKEN="..."  # registration token from GitHub → Settings → Actions → Runners
#   bash deploy/scripts/install-github-runner.sh
set -euo pipefail

RUNNER_DIR="${RUNNER_DIR:-/opt/actions-runner}"
RUNNER_VERSION="${RUNNER_VERSION:-2.321.0}"

mkdir -p "${RUNNER_DIR}"
cd "${RUNNER_DIR}"

if [[ ! -f ./config.sh ]]; then
  curl -o actions-runner-linux-x64-${RUNNER_VERSION}.tar.gz -L \
    "https://github.com/actions/runner/releases/download/v${RUNNER_VERSION}/actions-runner-linux-x64-${RUNNER_VERSION}.tar.gz"
  tar xzf actions-runner-linux-x64-${RUNNER_VERSION}.tar.gz
fi

./config.sh \
  --url "${RUNNER_URL}" \
  --token "${RUNNER_TOKEN}" \
  --name "$(hostname)-tandingbase" \
  --labels "self-hosted,linux,x64,tandingbase" \
  --work _work \
  --unattended

sudo ./svc.sh install
sudo ./svc.sh start

echo "GitHub runner installed as systemd service."
