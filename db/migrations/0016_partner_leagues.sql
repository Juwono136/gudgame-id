-- Partner leagues: manual scores, standings, public web (no TV / career sync)

CREATE TABLE IF NOT EXISTS "partner_leagues" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "partner_id" uuid NOT NULL REFERENCES "partners"("id") ON DELETE CASCADE,
  "sport_id" uuid NOT NULL REFERENCES "sports"("id") ON DELETE RESTRICT,
  "slug" varchar(100) NOT NULL,
  "name" varchar(160) NOT NULL,
  "status" varchar(20) DEFAULT 'active' NOT NULL,
  "settings" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_by" text REFERENCES "user"("id") ON DELETE SET NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "partner_leagues_partner_slug_uidx"
  ON "partner_leagues" ("partner_id", "slug");
CREATE INDEX IF NOT EXISTS "partner_leagues_partner_idx"
  ON "partner_leagues" ("partner_id");
CREATE INDEX IF NOT EXISTS "partner_leagues_sport_idx"
  ON "partner_leagues" ("sport_id");
CREATE INDEX IF NOT EXISTS "partner_leagues_status_idx"
  ON "partner_leagues" ("status");

CREATE TABLE IF NOT EXISTS "partner_league_teams" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "league_id" uuid NOT NULL REFERENCES "partner_leagues"("id") ON DELETE CASCADE,
  "name" varchar(120) NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "partner_league_teams_league_idx"
  ON "partner_league_teams" ("league_id");
CREATE UNIQUE INDEX IF NOT EXISTS "partner_league_teams_league_name_uidx"
  ON "partner_league_teams" ("league_id", "name");

CREATE TABLE IF NOT EXISTS "partner_league_matches" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "league_id" uuid NOT NULL REFERENCES "partner_leagues"("id") ON DELETE CASCADE,
  "team_a_id" uuid NOT NULL REFERENCES "partner_league_teams"("id") ON DELETE RESTRICT,
  "team_b_id" uuid NOT NULL REFERENCES "partner_league_teams"("id") ON DELETE RESTRICT,
  "score_a" integer,
  "score_b" integer,
  "status" varchar(20) DEFAULT 'scheduled' NOT NULL,
  "played_at" timestamp,
  "recorded_by" text REFERENCES "user"("id") ON DELETE SET NULL,
  "notes" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "partner_league_matches_league_idx"
  ON "partner_league_matches" ("league_id");
CREATE INDEX IF NOT EXISTS "partner_league_matches_status_idx"
  ON "partner_league_matches" ("status");
CREATE INDEX IF NOT EXISTS "partner_league_matches_played_at_idx"
  ON "partner_league_matches" ("played_at");
