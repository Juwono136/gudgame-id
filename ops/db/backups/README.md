# Database backups (local / VPS only)

Put a PostgreSQL **custom-format** dump here as `gudgame.dump`:

```bash
cp /path/to/gudgame_db-backup ops/db/backups/gudgame.dump
```

Then restore into Docker Postgres (`gudgame_db`):

```bash
FORCE_RESTORE=true \
  docker compose --profile restore run --rm db-restore
docker compose --profile migrate run --rm db-migrate
```

See [docs/DATABASE-RESTORE.md](../../docs/DATABASE-RESTORE.md).
