# Database backups (local / VPS only — never commit real dumps)

Put a PostgreSQL **custom-format** dump here as `gudgame.dump`:

```bash
cp /path/to/gudgame_db-backup ops/db/backups/gudgame.dump
```

Your known dump (`gudgame_db-backup`) is **PostgreSQL 18.6** / original name
`tanding_db`. The stack must run **`postgres:18-alpine`**.

Restore into Docker Postgres (`gudgame_db`):

```bash
FORCE_RESTORE=true \
  docker compose --profile restore run --rm db-restore
docker compose --profile migrate run --rm db-migrate
```

pgAdmin UI: file appears inside the container as **`/backups/gudgame.dump`**.

Full guide: [docs/DATABASE-RESTORE.md](../../docs/DATABASE-RESTORE.md).
