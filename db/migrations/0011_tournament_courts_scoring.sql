-- Tournament courts + multi-court scoring support

CREATE TABLE IF NOT EXISTS "tournament_courts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tournament_id" uuid NOT NULL REFERENCES "tournaments"("id") ON DELETE CASCADE,
  "court_number" integer NOT NULL,
  "name" varchar(80) NOT NULL,
  "sort_order" integer NOT NULL DEFAULT 0,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "tournament_courts_tournament_idx"
  ON "tournament_courts" ("tournament_id");

CREATE UNIQUE INDEX IF NOT EXISTS "tournament_courts_tournament_number_uidx"
  ON "tournament_courts" ("tournament_id", "court_number");

ALTER TABLE "tournament_reclub_matches"
  ADD COLUMN IF NOT EXISTS "court_id" uuid REFERENCES "tournament_courts"("id") ON DELETE SET NULL;

ALTER TABLE "tournament_reclub_matches"
  ADD COLUMN IF NOT EXISTS "timer_ends_at" timestamp;

CREATE INDEX IF NOT EXISTS "tournament_reclub_matches_court_idx"
  ON "tournament_reclub_matches" ("tournament_id", "court_id");

ALTER TABLE "tournament_bracket_matches"
  ADD COLUMN IF NOT EXISTS "court_id" uuid REFERENCES "tournament_courts"("id") ON DELETE SET NULL;

ALTER TABLE "tournament_bracket_matches"
  ADD COLUMN IF NOT EXISTS "timer_ends_at" timestamp;

ALTER TABLE "tournament_bracket_matches"
  ADD COLUMN IF NOT EXISTS "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS "tournament_bracket_matches_court_idx"
  ON "tournament_bracket_matches" ("tournament_id", "court_id");
