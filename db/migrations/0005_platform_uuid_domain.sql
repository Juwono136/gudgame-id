-- Fase 2: migrate sports, wiki, notifications, host_bank_accounts to UUID PKs
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── sports ────────────────────────────────────────────────────────────────────
ALTER TABLE "sports" ADD COLUMN IF NOT EXISTS "id_new" uuid;
UPDATE "sports" SET "id_new" = gen_random_uuid() WHERE "id_new" IS NULL;
ALTER TABLE "sports" ALTER COLUMN "id_new" SET NOT NULL;
ALTER TABLE "sports" ALTER COLUMN "id_new" SET DEFAULT gen_random_uuid();

-- sport_id FK columns (depend on sports)
ALTER TABLE "tournaments" ADD COLUMN IF NOT EXISTS "sport_id_new" uuid;
UPDATE "tournaments" t SET "sport_id_new" = s."id_new" FROM "sports" s WHERE t."sport_id" = s."id";
ALTER TABLE "tournaments" ALTER COLUMN "sport_id_new" SET NOT NULL;

ALTER TABLE "player_profiles" ADD COLUMN IF NOT EXISTS "sport_id_new" uuid;
UPDATE "player_profiles" p SET "sport_id_new" = s."id_new" FROM "sports" s WHERE p."sport_id" = s."id";
ALTER TABLE "player_profiles" ALTER COLUMN "sport_id_new" SET NOT NULL;

ALTER TABLE "equipments" ADD COLUMN IF NOT EXISTS "sport_id_new" uuid;
UPDATE "equipments" e SET "sport_id_new" = s."id_new" FROM "sports" s WHERE e."sport_id" = s."id";
ALTER TABLE "equipments" ALTER COLUMN "sport_id_new" SET NOT NULL;

ALTER TABLE "player_matches" ADD COLUMN IF NOT EXISTS "sport_id_new" uuid;
UPDATE "player_matches" pm SET "sport_id_new" = s."id_new" FROM "sports" s WHERE pm."sport_id" = s."id";

ALTER TABLE "player_tournament_results" ADD COLUMN IF NOT EXISTS "sport_id_new" uuid;
UPDATE "player_tournament_results" ptr SET "sport_id_new" = s."id_new" FROM "sports" s WHERE ptr."sport_id" = s."id";

-- ─── wiki_entities ───────────────────────────────────────────────────────────
ALTER TABLE "wiki_entities" ADD COLUMN IF NOT EXISTS "id_new" uuid;
ALTER TABLE "wiki_entities" ADD COLUMN IF NOT EXISTS "sport_id_new" uuid;
UPDATE "wiki_entities" SET "id_new" = gen_random_uuid() WHERE "id_new" IS NULL;
UPDATE "wiki_entities" w SET "sport_id_new" = s."id_new" FROM "sports" s WHERE w."sport_id" = s."id";
ALTER TABLE "wiki_entities" ALTER COLUMN "id_new" SET NOT NULL;
ALTER TABLE "wiki_entities" ALTER COLUMN "sport_id_new" SET NOT NULL;

-- ─── wiki_entity_relations ───────────────────────────────────────────────────
ALTER TABLE "wiki_entity_relations" ADD COLUMN IF NOT EXISTS "id_new" uuid;
ALTER TABLE "wiki_entity_relations" ADD COLUMN IF NOT EXISTS "from_entity_id_new" uuid;
ALTER TABLE "wiki_entity_relations" ADD COLUMN IF NOT EXISTS "to_entity_id_new" uuid;
UPDATE "wiki_entity_relations" SET "id_new" = gen_random_uuid() WHERE "id_new" IS NULL;
UPDATE "wiki_entity_relations" r SET "from_entity_id_new" = w."id_new" FROM "wiki_entities" w WHERE r."from_entity_id" = w."id";
UPDATE "wiki_entity_relations" r SET "to_entity_id_new" = w."id_new" FROM "wiki_entities" w WHERE r."to_entity_id" = w."id";
ALTER TABLE "wiki_entity_relations" ALTER COLUMN "id_new" SET NOT NULL;
ALTER TABLE "wiki_entity_relations" ALTER COLUMN "from_entity_id_new" SET NOT NULL;
ALTER TABLE "wiki_entity_relations" ALTER COLUMN "to_entity_id_new" SET NOT NULL;

-- ─── wiki_entity_media ─────────────────────────────────────────────────────────
ALTER TABLE "wiki_entity_media" ADD COLUMN IF NOT EXISTS "id_new" uuid;
ALTER TABLE "wiki_entity_media" ADD COLUMN IF NOT EXISTS "entity_id_new" uuid;
UPDATE "wiki_entity_media" SET "id_new" = gen_random_uuid() WHERE "id_new" IS NULL;
UPDATE "wiki_entity_media" m SET "entity_id_new" = w."id_new" FROM "wiki_entities" w WHERE m."entity_id" = w."id";
ALTER TABLE "wiki_entity_media" ALTER COLUMN "id_new" SET NOT NULL;
ALTER TABLE "wiki_entity_media" ALTER COLUMN "entity_id_new" SET NOT NULL;

-- wiki_entity_id FK columns
ALTER TABLE "player_matches" ADD COLUMN IF NOT EXISTS "wiki_entity_id_new" uuid;
UPDATE "player_matches" pm SET "wiki_entity_id_new" = w."id_new" FROM "wiki_entities" w WHERE pm."wiki_entity_id" = w."id";

ALTER TABLE "player_tournament_results" ADD COLUMN IF NOT EXISTS "wiki_entity_id_new" uuid;
UPDATE "player_tournament_results" ptr SET "wiki_entity_id_new" = w."id_new" FROM "wiki_entities" w WHERE ptr."wiki_entity_id" = w."id";

-- ─── notifications ─────────────────────────────────────────────────────────────
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "id_new" uuid;
UPDATE "notifications" SET "id_new" = gen_random_uuid() WHERE "id_new" IS NULL;
ALTER TABLE "notifications" ALTER COLUMN "id_new" SET NOT NULL;
ALTER TABLE "notifications" ALTER COLUMN "id_new" SET DEFAULT gen_random_uuid();

-- ─── host_bank_accounts (only when table exists with integer PK) ───────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'host_bank_accounts'
  ) THEN
    RAISE NOTICE 'host_bank_accounts absent — skipping UUID migration (created by prerequisites/0003)';
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'host_bank_accounts'
      AND column_name = 'id' AND data_type IN ('integer', 'bigint', 'smallint')
  ) THEN
    RAISE NOTICE 'host_bank_accounts.id already UUID — skipping UUID migration';
    RETURN;
  END IF;

  ALTER TABLE "host_bank_accounts" ADD COLUMN IF NOT EXISTS "id_new" uuid;
  UPDATE "host_bank_accounts" SET "id_new" = gen_random_uuid() WHERE "id_new" IS NULL;
  ALTER TABLE "host_bank_accounts" ALTER COLUMN "id_new" SET NOT NULL;
  ALTER TABLE "host_bank_accounts" ALTER COLUMN "id_new" SET DEFAULT gen_random_uuid();
END $$;

-- ─── drop foreign keys ─────────────────────────────────────────────────────────
ALTER TABLE "tournaments" DROP CONSTRAINT IF EXISTS "tournaments_sport_id_sports_id_fk";
ALTER TABLE "wiki_entities" DROP CONSTRAINT IF EXISTS "wiki_entities_sport_id_sports_id_fk";
ALTER TABLE "wiki_entity_relations" DROP CONSTRAINT IF EXISTS "wiki_entity_relations_from_entity_id_wiki_entities_id_fk";
ALTER TABLE "wiki_entity_relations" DROP CONSTRAINT IF EXISTS "wiki_entity_relations_to_entity_id_wiki_entities_id_fk";
ALTER TABLE "wiki_entity_media" DROP CONSTRAINT IF EXISTS "wiki_entity_media_entity_id_wiki_entities_id_fk";
ALTER TABLE "player_matches" DROP CONSTRAINT IF EXISTS "player_matches_wiki_entity_id_wiki_entities_id_fk";
ALTER TABLE "player_matches" DROP CONSTRAINT IF EXISTS "player_matches_sport_id_sports_id_fk";
ALTER TABLE "player_tournament_results" DROP CONSTRAINT IF EXISTS "player_tournament_results_wiki_entity_id_wiki_entities_id_fk";
ALTER TABLE "player_tournament_results" DROP CONSTRAINT IF EXISTS "player_tournament_results_sport_id_sports_id_fk";
ALTER TABLE "player_profiles" DROP CONSTRAINT IF EXISTS "player_profiles_sport_id_sports_id_fk";
ALTER TABLE "equipments" DROP CONSTRAINT IF EXISTS "equipments_sport_id_sports_id_fk";

-- ─── drop primary keys & old integer columns ───────────────────────────────────
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'host_bank_accounts'
      AND column_name = 'id_new'
  ) THEN
    ALTER TABLE "host_bank_accounts" DROP CONSTRAINT IF EXISTS "host_bank_accounts_pkey";
  END IF;
END $$;
ALTER TABLE "notifications" DROP CONSTRAINT IF EXISTS "notifications_pkey";
ALTER TABLE "wiki_entity_media" DROP CONSTRAINT IF EXISTS "wiki_entity_media_pkey";
ALTER TABLE "wiki_entity_relations" DROP CONSTRAINT IF EXISTS "wiki_entity_relations_pkey";
ALTER TABLE "wiki_entities" DROP CONSTRAINT IF EXISTS "wiki_entities_pkey";
ALTER TABLE "sports" DROP CONSTRAINT IF EXISTS "sports_pkey";

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'host_bank_accounts'
      AND column_name = 'id' AND data_type IN ('integer', 'bigint', 'smallint')
  ) THEN
    ALTER TABLE "host_bank_accounts" DROP COLUMN "id";
  END IF;
END $$;
ALTER TABLE "notifications" DROP COLUMN IF EXISTS "id";

ALTER TABLE "wiki_entity_media" DROP COLUMN IF EXISTS "id";
ALTER TABLE "wiki_entity_media" DROP COLUMN IF EXISTS "entity_id";

ALTER TABLE "wiki_entity_relations" DROP COLUMN IF EXISTS "id";
ALTER TABLE "wiki_entity_relations" DROP COLUMN IF EXISTS "from_entity_id";
ALTER TABLE "wiki_entity_relations" DROP COLUMN IF EXISTS "to_entity_id";

ALTER TABLE "wiki_entities" DROP COLUMN IF EXISTS "id";
ALTER TABLE "wiki_entities" DROP COLUMN IF EXISTS "sport_id";

ALTER TABLE "tournaments" DROP COLUMN IF EXISTS "sport_id";
ALTER TABLE "player_profiles" DROP COLUMN IF EXISTS "sport_id";
ALTER TABLE "equipments" DROP COLUMN IF EXISTS "sport_id";
ALTER TABLE "player_matches" DROP COLUMN IF EXISTS "sport_id";
ALTER TABLE "player_matches" DROP COLUMN IF EXISTS "wiki_entity_id";
ALTER TABLE "player_tournament_results" DROP COLUMN IF EXISTS "sport_id";
ALTER TABLE "player_tournament_results" DROP COLUMN IF EXISTS "wiki_entity_id";

ALTER TABLE "sports" DROP COLUMN IF EXISTS "id";

-- ─── rename new columns ────────────────────────────────────────────────────────
ALTER TABLE "sports" RENAME COLUMN "id_new" TO "id";
ALTER TABLE "tournaments" RENAME COLUMN "sport_id_new" TO "sport_id";
ALTER TABLE "player_profiles" RENAME COLUMN "sport_id_new" TO "sport_id";
ALTER TABLE "equipments" RENAME COLUMN "sport_id_new" TO "sport_id";
ALTER TABLE "player_matches" RENAME COLUMN "sport_id_new" TO "sport_id";
ALTER TABLE "player_matches" RENAME COLUMN "wiki_entity_id_new" TO "wiki_entity_id";
ALTER TABLE "player_tournament_results" RENAME COLUMN "sport_id_new" TO "sport_id";
ALTER TABLE "player_tournament_results" RENAME COLUMN "wiki_entity_id_new" TO "wiki_entity_id";

ALTER TABLE "wiki_entities" RENAME COLUMN "id_new" TO "id";
ALTER TABLE "wiki_entities" RENAME COLUMN "sport_id_new" TO "sport_id";
ALTER TABLE "wiki_entity_relations" RENAME COLUMN "id_new" TO "id";
ALTER TABLE "wiki_entity_relations" RENAME COLUMN "from_entity_id_new" TO "from_entity_id";
ALTER TABLE "wiki_entity_relations" RENAME COLUMN "to_entity_id_new" TO "to_entity_id";
ALTER TABLE "wiki_entity_media" RENAME COLUMN "id_new" TO "id";
ALTER TABLE "wiki_entity_media" RENAME COLUMN "entity_id_new" TO "entity_id";

ALTER TABLE "notifications" RENAME COLUMN "id_new" TO "id";
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'host_bank_accounts'
      AND column_name = 'id_new'
  ) THEN
    ALTER TABLE "host_bank_accounts" RENAME COLUMN "id_new" TO "id";
  END IF;
END $$;

-- ─── primary keys & foreign keys ─────────────────────────────────────────────
ALTER TABLE "sports" ADD PRIMARY KEY ("id");
ALTER TABLE "wiki_entities" ADD PRIMARY KEY ("id");
ALTER TABLE "wiki_entity_relations" ADD PRIMARY KEY ("id");
ALTER TABLE "wiki_entity_media" ADD PRIMARY KEY ("id");
ALTER TABLE "notifications" ADD PRIMARY KEY ("id");
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'host_bank_accounts'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'host_bank_accounts_pkey'
      AND conrelid = 'public.host_bank_accounts'::regclass
  ) THEN
    ALTER TABLE "host_bank_accounts" ADD PRIMARY KEY ("id");
  END IF;
END $$;

ALTER TABLE "tournaments" ADD CONSTRAINT "tournaments_sport_id_sports_id_fk"
  FOREIGN KEY ("sport_id") REFERENCES "sports"("id") ON DELETE restrict;
ALTER TABLE "wiki_entities" ADD CONSTRAINT "wiki_entities_sport_id_sports_id_fk"
  FOREIGN KEY ("sport_id") REFERENCES "sports"("id") ON DELETE restrict;
ALTER TABLE "wiki_entity_relations" ADD CONSTRAINT "wiki_entity_relations_from_entity_id_wiki_entities_id_fk"
  FOREIGN KEY ("from_entity_id") REFERENCES "wiki_entities"("id") ON DELETE cascade;
ALTER TABLE "wiki_entity_relations" ADD CONSTRAINT "wiki_entity_relations_to_entity_id_wiki_entities_id_fk"
  FOREIGN KEY ("to_entity_id") REFERENCES "wiki_entities"("id") ON DELETE cascade;
ALTER TABLE "wiki_entity_media" ADD CONSTRAINT "wiki_entity_media_entity_id_wiki_entities_id_fk"
  FOREIGN KEY ("entity_id") REFERENCES "wiki_entities"("id") ON DELETE cascade;
ALTER TABLE "player_matches" ADD CONSTRAINT "player_matches_wiki_entity_id_wiki_entities_id_fk"
  FOREIGN KEY ("wiki_entity_id") REFERENCES "wiki_entities"("id") ON DELETE set null;
ALTER TABLE "player_matches" ADD CONSTRAINT "player_matches_sport_id_sports_id_fk"
  FOREIGN KEY ("sport_id") REFERENCES "sports"("id") ON DELETE set null;
ALTER TABLE "player_tournament_results" ADD CONSTRAINT "player_tournament_results_wiki_entity_id_wiki_entities_id_fk"
  FOREIGN KEY ("wiki_entity_id") REFERENCES "wiki_entities"("id") ON DELETE set null;
ALTER TABLE "player_tournament_results" ADD CONSTRAINT "player_tournament_results_sport_id_sports_id_fk"
  FOREIGN KEY ("sport_id") REFERENCES "sports"("id") ON DELETE set null;
ALTER TABLE "player_profiles" ADD CONSTRAINT "player_profiles_sport_id_sports_id_fk"
  FOREIGN KEY ("sport_id") REFERENCES "sports"("id") ON DELETE restrict;
ALTER TABLE "equipments" ADD CONSTRAINT "equipments_sport_id_sports_id_fk"
  FOREIGN KEY ("sport_id") REFERENCES "sports"("id") ON DELETE restrict;

-- ─── indexes ─────────────────────────────────────────────────────────────────
CREATE UNIQUE INDEX IF NOT EXISTS "tournaments_sport_slug_uidx" ON "tournaments" ("sport_id", "slug");
CREATE INDEX IF NOT EXISTS "tournaments_sport_status_idx" ON "tournaments" ("sport_id", "status");
CREATE UNIQUE INDEX IF NOT EXISTS "wiki_entities_sport_slug_uidx" ON "wiki_entities" ("sport_id", "slug");
CREATE INDEX IF NOT EXISTS "wiki_entities_sport_type_idx" ON "wiki_entities" ("sport_id", "entity_type");
CREATE INDEX IF NOT EXISTS "wiki_rel_from_idx" ON "wiki_entity_relations" ("from_entity_id");
CREATE INDEX IF NOT EXISTS "wiki_rel_to_idx" ON "wiki_entity_relations" ("to_entity_id");
CREATE UNIQUE INDEX IF NOT EXISTS "wiki_rel_unique_uidx" ON "wiki_entity_relations" ("from_entity_id", "to_entity_id", "relation_type");
CREATE INDEX IF NOT EXISTS "wiki_media_entity_idx" ON "wiki_entity_media" ("entity_id");
CREATE INDEX IF NOT EXISTS "player_profiles_sport_idx" ON "player_profiles" ("sport_id");
CREATE INDEX IF NOT EXISTS "equipments_sport_idx" ON "equipments" ("sport_id");

DROP SEQUENCE IF EXISTS "sports_id_seq" CASCADE;
DROP SEQUENCE IF EXISTS "wiki_entities_id_seq" CASCADE;
DROP SEQUENCE IF EXISTS "wiki_entity_relations_id_seq" CASCADE;
DROP SEQUENCE IF EXISTS "wiki_entity_media_id_seq" CASCADE;
DROP SEQUENCE IF EXISTS "notifications_id_seq" CASCADE;
DROP SEQUENCE IF EXISTS "host_bank_accounts_id_seq" CASCADE;
