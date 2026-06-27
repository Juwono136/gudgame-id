-- Tournament tier overhaul: fun_match rename, official billing, stats tiers, invitations, archives, sport interests

-- 1. Rename recreational → fun_match
UPDATE "tournaments" SET "tournament_type" = 'fun_match' WHERE "tournament_type" = 'recreational';

-- 2. Add official_billing column
ALTER TABLE "tournaments" ADD COLUMN IF NOT EXISTS "official_billing" varchar(10);
UPDATE "tournaments" SET "official_billing" = 'paid' WHERE "tournament_type" = 'official' AND "official_billing" IS NULL;

-- 3. Index for tournament listing filters
CREATE INDEX IF NOT EXISTS "tournaments_sport_type_billing_status_idx"
  ON "tournaments" ("sport_id", "tournament_type", "official_billing", "status");

-- 4. Sport tournament config
ALTER TABLE "sports" ADD COLUMN IF NOT EXISTS "tournament_config" jsonb;

-- 5. Stats tier on player competition tables
ALTER TABLE "player_matches" ADD COLUMN IF NOT EXISTS "stats_tier" varchar(20);
ALTER TABLE "player_tournament_results" ADD COLUMN IF NOT EXISTS "stats_tier" varchar(20);

UPDATE "player_matches" SET "stats_tier" = 'official_paid'
  WHERE "is_official" = true AND "stats_tier" IS NULL;
UPDATE "player_matches" SET "stats_tier" = 'fun_match'
  WHERE "is_official" = false AND "stats_tier" IS NULL;

UPDATE "player_tournament_results" SET "stats_tier" = 'official_paid'
  WHERE "is_official" = true AND "stats_tier" IS NULL;
UPDATE "player_tournament_results" SET "stats_tier" = 'fun_match'
  WHERE "is_official" = false AND "stats_tier" IS NULL;

CREATE INDEX IF NOT EXISTS "player_matches_stats_tier_idx" ON "player_matches" ("stats_tier");
CREATE INDEX IF NOT EXISTS "player_tournament_results_stats_tier_idx" ON "player_tournament_results" ("stats_tier");

-- 6. Tournament access grants
CREATE TABLE IF NOT EXISTS "tournament_access_grants" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tournament_id" uuid NOT NULL REFERENCES "tournaments"("id") ON DELETE CASCADE,
  "user_id" text REFERENCES "user"("id") ON DELETE SET NULL,
  "email" varchar(255),
  "role" varchar(32) NOT NULL,
  "invite_code_hash" varchar(128) NOT NULL,
  "invite_token" varchar(64) NOT NULL UNIQUE,
  "status" varchar(20) DEFAULT 'pending' NOT NULL,
  "expires_at" timestamp NOT NULL,
  "invited_by_user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "accepted_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "tournament_access_grants_tournament_idx"
  ON "tournament_access_grants" ("tournament_id");
CREATE INDEX IF NOT EXISTS "tournament_access_grants_user_idx"
  ON "tournament_access_grants" ("tournament_id", "user_id");
CREATE UNIQUE INDEX IF NOT EXISTS "tournament_access_grants_code_hash_uidx"
  ON "tournament_access_grants" ("tournament_id", "invite_code_hash");

-- 7. Tournament player invites
CREATE TABLE IF NOT EXISTS "tournament_player_invites" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tournament_id" uuid NOT NULL REFERENCES "tournaments"("id") ON DELETE CASCADE,
  "team_id" uuid REFERENCES "tournament_teams"("id") ON DELETE SET NULL,
  "invite_code_hash" varchar(128) NOT NULL,
  "invite_token" varchar(64) NOT NULL UNIQUE,
  "status" varchar(20) DEFAULT 'pending' NOT NULL,
  "expires_at" timestamp NOT NULL,
  "invited_by_user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "redeemed_by_user_id" text REFERENCES "user"("id") ON DELETE SET NULL,
  "redeemed_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "tournament_player_invites_tournament_idx"
  ON "tournament_player_invites" ("tournament_id");
CREATE UNIQUE INDEX IF NOT EXISTS "tournament_player_invites_code_hash_uidx"
  ON "tournament_player_invites" ("tournament_id", "invite_code_hash");

-- 8. Tournament archives
CREATE TABLE IF NOT EXISTS "tournament_archives" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tournament_id" uuid NOT NULL REFERENCES "tournaments"("id") ON DELETE CASCADE,
  "created_by_user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "stats_tier" varchar(20) NOT NULL,
  "sport_id" uuid NOT NULL REFERENCES "sports"("id") ON DELETE RESTRICT,
  "snapshot" jsonb NOT NULL,
  "archived_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "tournament_archives_creator_idx"
  ON "tournament_archives" ("created_by_user_id", "archived_at");
CREATE INDEX IF NOT EXISTS "tournament_archives_tournament_idx"
  ON "tournament_archives" ("tournament_id");

-- 9. User sport interests
CREATE TABLE IF NOT EXISTS "user_sport_interests" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "sport_id" uuid NOT NULL REFERENCES "sports"("id") ON DELETE CASCADE,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "user_sport_interests_user_sport_uidx"
  ON "user_sport_interests" ("user_id", "sport_id");
CREATE INDEX IF NOT EXISTS "user_sport_interests_user_idx"
  ON "user_sport_interests" ("user_id");
