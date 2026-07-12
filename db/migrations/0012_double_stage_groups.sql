-- Double stage tournament: groups + group matches

CREATE TABLE IF NOT EXISTS "tournament_groups" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tournament_id" uuid NOT NULL REFERENCES "tournaments"("id") ON DELETE CASCADE,
  "name" varchar(40) NOT NULL,
  "sort_order" integer NOT NULL DEFAULT 0,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "tournament_groups_tournament_idx"
  ON "tournament_groups" ("tournament_id");

CREATE UNIQUE INDEX IF NOT EXISTS "tournament_groups_name_uidx"
  ON "tournament_groups" ("tournament_id", "name");

CREATE TABLE IF NOT EXISTS "tournament_group_teams" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "group_id" uuid NOT NULL REFERENCES "tournament_groups"("id") ON DELETE CASCADE,
  "team_id" uuid NOT NULL REFERENCES "tournament_teams"("id") ON DELETE CASCADE,
  "qualification_status" varchar(20) NOT NULL DEFAULT 'pending',
  "group_rank" integer,
  "global_seed" integer,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "tournament_group_teams_group_idx"
  ON "tournament_group_teams" ("group_id");

CREATE UNIQUE INDEX IF NOT EXISTS "tournament_group_teams_team_uidx"
  ON "tournament_group_teams" ("group_id", "team_id");

CREATE UNIQUE INDEX IF NOT EXISTS "tournament_group_teams_team_tournament_uidx"
  ON "tournament_group_teams" ("team_id");

CREATE TABLE IF NOT EXISTS "tournament_group_matches" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tournament_id" uuid NOT NULL REFERENCES "tournaments"("id") ON DELETE CASCADE,
  "group_id" uuid NOT NULL REFERENCES "tournament_groups"("id") ON DELETE CASCADE,
  "match_number" integer NOT NULL DEFAULT 1,
  "team_a_id" uuid REFERENCES "tournament_teams"("id") ON DELETE SET NULL,
  "team_b_id" uuid REFERENCES "tournament_teams"("id") ON DELETE SET NULL,
  "team_a_name" varchar(120),
  "team_b_name" varchar(120),
  "score_a" integer,
  "score_b" integer,
  "winner_team_id" uuid REFERENCES "tournament_teams"("id") ON DELETE SET NULL,
  "status" varchar(20) NOT NULL DEFAULT 'pending',
  "scheduled_at" timestamp,
  "started_at" timestamp,
  "completed_at" timestamp,
  "duration_seconds" integer,
  "recorded_by_user_id" text REFERENCES "user"("id") ON DELETE SET NULL,
  "court_id" uuid REFERENCES "tournament_courts"("id") ON DELETE SET NULL,
  "timer_ends_at" timestamp,
  "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "tournament_group_matches_tournament_idx"
  ON "tournament_group_matches" ("tournament_id");

CREATE INDEX IF NOT EXISTS "tournament_group_matches_group_idx"
  ON "tournament_group_matches" ("group_id");

CREATE INDEX IF NOT EXISTS "tournament_group_matches_court_idx"
  ON "tournament_group_matches" ("tournament_id", "court_id");
