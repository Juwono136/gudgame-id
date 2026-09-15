-- Restore gen_random_uuid() defaults on UUID PKs that lost them during
-- integer→UUID migrations (0004/0005). Without this, Drizzle inserts that
-- rely on DEFAULT (wiki player profiles, etc.) fail with NOT NULL on id.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'wiki_entities',
    'wiki_entity_relations',
    'wiki_entity_media',
    'tournament_teams',
    'tournament_team_members',
    'tournament_registrations',
    'tournament_payments',
    'tournament_reclub_matches',
    'tournament_bracket_matches',
    'sports',
    'notifications',
    'host_bank_accounts',
    'tournaments'
  ]
  LOOP
    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = t
        AND column_name = 'id'
        AND data_type = 'uuid'
    ) THEN
      EXECUTE format(
        'ALTER TABLE %I ALTER COLUMN id SET DEFAULT gen_random_uuid()',
        t
      );
    END IF;
  END LOOP;
END $$;
