#!/usr/bin/env bash
# Install PostgreSQL 16 + pgAdmin (Docker) on the VPS host
set -euo pipefail

DB_NAME="${DB_NAME:-tandingbase_db}"
DB_USER="${DB_USER:-tandingbase}"
DB_PASS="${DB_PASS:-}" # set via env or prompt

if [[ -z "${DB_PASS}" ]]; then
  read -rsp "PostgreSQL password for ${DB_USER}: " DB_PASS
  echo
fi

echo "==> Installing PostgreSQL 16"
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y postgresql-common
/usr/share/postgresql-common/pgdg/apt.postgresql.org.sh -y
apt-get install -y postgresql-16 postgresql-client-16

echo "==> Configuring PostgreSQL (localhost only)"
PG_CONF="/etc/postgresql/16/main/postgresql.conf"
PG_HBA="/etc/postgresql/16/main/pg_hba.conf"

sed -i "s/#listen_addresses = 'localhost'/listen_addresses = '127.0.0.1'/" "${PG_CONF}" || true

sudo -u postgres psql -v ON_ERROR_STOP=1 <<SQL
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '${DB_USER}') THEN
    CREATE ROLE ${DB_USER} LOGIN PASSWORD '${DB_PASS}';
  END IF;
END
\$\$;
SELECT 'CREATE DATABASE ${DB_NAME} OWNER ${DB_USER}'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '${DB_NAME}')\gexec
GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};
SQL

systemctl enable postgresql
systemctl restart postgresql

echo "==> pgAdmin via Docker (localhost:5050 only)"
mkdir -p /opt/tandingbase/pgadmin
cat > /opt/tandingbase/pgadmin/docker-compose.yml <<'YAML'
services:
  pgadmin:
    image: dpage/pgadmin4:8
    container_name: tandingbase-pgadmin
    restart: unless-stopped
    environment:
      PGADMIN_DEFAULT_EMAIL: ${PGADMIN_EMAIL:-admin@tandingbase.local}
      PGADMIN_DEFAULT_PASSWORD: ${PGADMIN_PASSWORD:-changeme}
      PGADMIN_LISTEN_PORT: 5050
    ports:
      - "127.0.0.1:5050:5050"
    volumes:
      - pgadmin-data:/var/lib/pgadmin
volumes:
  pgadmin-data:
YAML

echo ""
echo "PostgreSQL ready."
echo "  DATABASE_URL=postgresql://${DB_USER}:****@127.0.0.1:5432/${DB_NAME}"
echo "  pgAdmin: http://127.0.0.1:5050 (SSH tunnel or Cloudflare private hostname)"
echo "  Start pgAdmin: cd /opt/tandingbase/pgadmin && docker compose up -d"
