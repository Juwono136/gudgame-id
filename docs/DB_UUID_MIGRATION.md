# Database UUID migration plan

## Current state

- **Auth tables** (`user`, `session`, etc.) use `text` IDs (Better Auth).
- **Domain tables** (tournaments, wiki, matches, …) use `serial` integer primary keys.

## Target state

All domain entity primary keys and foreign keys use PostgreSQL `uuid` with `gen_random_uuid()` defaults.

Helper: `db/schema/uuid.ts` exports `uuidPrimaryKey()` and `uuidFk()`.

## Migration steps (production)

1. **Backup** the database before any schema change.
2. Run the SQL migration script (to be generated per environment) that:
   - Adds `uuid` columns alongside existing integer IDs
   - Backfills UUIDs and updates all FK references
   - Drops old integer columns and renames UUID columns to `id`
3. Apply updated Drizzle schema via `npm run db:push` or checked-in migrations.
4. Deploy application code that expects `string` UUIDs for entity IDs.

## Development (empty / seed data only)

If you can reset dev data:

```bash
# Stop dev server, then:
rm -rf .next
npm run db:push
npm run db:seed   # if applicable
npm run dev
```

## Application code impact

After migration, TypeScript types change from `number` to `string` for:

- `tournamentId`, `sportId`, `wikiEntityId`, match IDs, team IDs, etc.
- Zod schemas: `z.string().uuid()` instead of `z.coerce.number().int()`
- API route params `[id]` remain dynamic segments but hold UUID strings

This is a **breaking change** requiring a coordinated schema + code deploy.
