-- Partner white-label tenants + data isolation columns

CREATE TABLE IF NOT EXISTS "partners" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "slug" varchar(80) NOT NULL,
  "display_name" varchar(120) NOT NULL,
  "logo_url" text,
  "logo_storage_key" varchar(512),
  "branding" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_by" text REFERENCES "user"("id") ON DELETE SET NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "partners_slug_uidx" ON "partners" ("slug");
CREATE INDEX IF NOT EXISTS "partners_active_idx" ON "partners" ("is_active");

CREATE TABLE IF NOT EXISTS "partner_members" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "partner_id" uuid NOT NULL REFERENCES "partners"("id") ON DELETE CASCADE,
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "role" varchar(20) DEFAULT 'owner' NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "partner_members_partner_user_uidx"
  ON "partner_members" ("partner_id", "user_id");
CREATE INDEX IF NOT EXISTS "partner_members_user_idx"
  ON "partner_members" ("user_id");

ALTER TABLE "tournaments"
  ADD COLUMN IF NOT EXISTS "partner_id" uuid REFERENCES "partners"("id") ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS "tournaments_partner_idx" ON "tournaments" ("partner_id");

DROP INDEX IF EXISTS "tournaments_sport_slug_uidx";

CREATE UNIQUE INDEX IF NOT EXISTS "tournaments_gud_sport_slug_uidx"
  ON "tournaments" ("sport_id", "slug") WHERE "partner_id" IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "tournaments_partner_sport_slug_uidx"
  ON "tournaments" ("partner_id", "sport_id", "slug") WHERE "partner_id" IS NOT NULL;

ALTER TABLE "player_matches"
  ADD COLUMN IF NOT EXISTS "partner_id" uuid REFERENCES "partners"("id") ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS "player_matches_partner_idx" ON "player_matches" ("partner_id");

ALTER TABLE "player_tournament_results"
  ADD COLUMN IF NOT EXISTS "partner_id" uuid REFERENCES "partners"("id") ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS "player_tournament_results_partner_idx"
  ON "player_tournament_results" ("partner_id");
