-- Durable live-score audit trail (includes undos) + Order of Play columns

CREATE TABLE IF NOT EXISTS "match_score_revisions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tournament_id" uuid NOT NULL REFERENCES "tournaments"("id") ON DELETE CASCADE,
  "match_kind" varchar(20) NOT NULL,
  "match_id" uuid NOT NULL,
  "seq" integer NOT NULL,
  "action" varchar(32) NOT NULL,
  "score_a_before" integer NOT NULL,
  "score_b_before" integer NOT NULL,
  "score_a_after" integer NOT NULL,
  "score_b_after" integer NOT NULL,
  "side" varchar(1),
  "game_state" jsonb,
  "actor_user_id" text REFERENCES "user"("id") ON DELETE SET NULL,
  "actor_name" varchar(120),
  "reason" varchar(240),
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "match_score_revisions_match_seq_uidx"
  ON "match_score_revisions" ("match_kind", "match_id", "seq");
CREATE INDEX IF NOT EXISTS "match_score_revisions_match_idx"
  ON "match_score_revisions" ("match_kind", "match_id");
CREATE INDEX IF NOT EXISTS "match_score_revisions_tournament_idx"
  ON "match_score_revisions" ("tournament_id");

ALTER TABLE "tournament_group_matches"
  ADD COLUMN IF NOT EXISTS "play_order" integer,
  ADD COLUMN IF NOT EXISTS "call_status" varchar(20) DEFAULT 'queued';

ALTER TABLE "tournament_bracket_matches"
  ADD COLUMN IF NOT EXISTS "play_order" integer,
  ADD COLUMN IF NOT EXISTS "call_status" varchar(20) DEFAULT 'queued';

CREATE INDEX IF NOT EXISTS "tournament_group_matches_play_order_idx"
  ON "tournament_group_matches" ("tournament_id", "play_order");
CREATE INDEX IF NOT EXISTS "tournament_bracket_matches_play_order_idx"
  ON "tournament_bracket_matches" ("tournament_id", "play_order");
