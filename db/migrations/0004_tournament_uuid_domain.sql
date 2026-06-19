-- Fase 1: migrate tournament domain primary keys and foreign keys from integer to UUID
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── tournaments ───────────────────────────────────────────────────────────────
ALTER TABLE "tournaments" ADD COLUMN IF NOT EXISTS "id_new" uuid;
UPDATE "tournaments" SET "id_new" = gen_random_uuid() WHERE "id_new" IS NULL;
ALTER TABLE "tournaments" ALTER COLUMN "id_new" SET NOT NULL;
ALTER TABLE "tournaments" ALTER COLUMN "id_new" SET DEFAULT gen_random_uuid();

-- ─── tournament_teams ────────────────────────────────────────────────────────
ALTER TABLE "tournament_teams" ADD COLUMN IF NOT EXISTS "id_new" uuid;
ALTER TABLE "tournament_teams" ADD COLUMN IF NOT EXISTS "tournament_id_new" uuid;
UPDATE "tournament_teams" SET "id_new" = gen_random_uuid() WHERE "id_new" IS NULL;
UPDATE "tournament_teams" tt
SET "tournament_id_new" = t."id_new"
FROM "tournaments" t
WHERE tt."tournament_id" = t."id";
ALTER TABLE "tournament_teams" ALTER COLUMN "id_new" SET NOT NULL;
ALTER TABLE "tournament_teams" ALTER COLUMN "tournament_id_new" SET NOT NULL;

-- ─── tournament_team_members ─────────────────────────────────────────────────
ALTER TABLE "tournament_team_members" ADD COLUMN IF NOT EXISTS "id_new" uuid;
ALTER TABLE "tournament_team_members" ADD COLUMN IF NOT EXISTS "team_id_new" uuid;
UPDATE "tournament_team_members" SET "id_new" = gen_random_uuid() WHERE "id_new" IS NULL;
UPDATE "tournament_team_members" m
SET "team_id_new" = tt."id_new"
FROM "tournament_teams" tt
WHERE m."team_id" = tt."id";
ALTER TABLE "tournament_team_members" ALTER COLUMN "id_new" SET NOT NULL;
ALTER TABLE "tournament_team_members" ALTER COLUMN "team_id_new" SET NOT NULL;

-- ─── tournament_registrations ──────────────────────────────────────────────────
ALTER TABLE "tournament_registrations" ADD COLUMN IF NOT EXISTS "id_new" uuid;
ALTER TABLE "tournament_registrations" ADD COLUMN IF NOT EXISTS "tournament_id_new" uuid;
ALTER TABLE "tournament_registrations" ADD COLUMN IF NOT EXISTS "team_id_new" uuid;
UPDATE "tournament_registrations" SET "id_new" = gen_random_uuid() WHERE "id_new" IS NULL;
UPDATE "tournament_registrations" r
SET "tournament_id_new" = t."id_new"
FROM "tournaments" t
WHERE r."tournament_id" = t."id";
UPDATE "tournament_registrations" r
SET "team_id_new" = tt."id_new"
FROM "tournament_teams" tt
WHERE r."team_id" = tt."id";
ALTER TABLE "tournament_registrations" ALTER COLUMN "id_new" SET NOT NULL;
ALTER TABLE "tournament_registrations" ALTER COLUMN "tournament_id_new" SET NOT NULL;

-- ─── tournament_payments ─────────────────────────────────────────────────────
ALTER TABLE "tournament_payments" ADD COLUMN IF NOT EXISTS "id_new" uuid;
ALTER TABLE "tournament_payments" ADD COLUMN IF NOT EXISTS "tournament_id_new" uuid;
ALTER TABLE "tournament_payments" ADD COLUMN IF NOT EXISTS "registration_id_new" uuid;
UPDATE "tournament_payments" SET "id_new" = gen_random_uuid() WHERE "id_new" IS NULL;
UPDATE "tournament_payments" p
SET "tournament_id_new" = t."id_new"
FROM "tournaments" t
WHERE p."tournament_id" = t."id";
UPDATE "tournament_payments" p
SET "registration_id_new" = r."id_new"
FROM "tournament_registrations" r
WHERE p."registration_id" = r."id";
ALTER TABLE "tournament_payments" ALTER COLUMN "id_new" SET NOT NULL;
ALTER TABLE "tournament_payments" ALTER COLUMN "tournament_id_new" SET NOT NULL;
ALTER TABLE "tournament_payments" ALTER COLUMN "registration_id_new" SET NOT NULL;

-- ─── tournament_reclub_matches ─────────────────────────────────────────────────
ALTER TABLE "tournament_reclub_matches" ADD COLUMN IF NOT EXISTS "id_new" uuid;
ALTER TABLE "tournament_reclub_matches" ADD COLUMN IF NOT EXISTS "tournament_id_new" uuid;
ALTER TABLE "tournament_reclub_matches" ADD COLUMN IF NOT EXISTS "team_a_id_new" uuid;
ALTER TABLE "tournament_reclub_matches" ADD COLUMN IF NOT EXISTS "team_b_id_new" uuid;
UPDATE "tournament_reclub_matches" SET "id_new" = gen_random_uuid() WHERE "id_new" IS NULL;
UPDATE "tournament_reclub_matches" m
SET "tournament_id_new" = t."id_new"
FROM "tournaments" t
WHERE m."tournament_id" = t."id";
UPDATE "tournament_reclub_matches" m
SET "team_a_id_new" = tt."id_new"
FROM "tournament_teams" tt
WHERE m."team_a_id" = tt."id";
UPDATE "tournament_reclub_matches" m
SET "team_b_id_new" = tt."id_new"
FROM "tournament_teams" tt
WHERE m."team_b_id" = tt."id";
ALTER TABLE "tournament_reclub_matches" ALTER COLUMN "id_new" SET NOT NULL;
ALTER TABLE "tournament_reclub_matches" ALTER COLUMN "tournament_id_new" SET NOT NULL;

-- ─── tournament_bracket_matches ────────────────────────────────────────────────
ALTER TABLE "tournament_bracket_matches" ADD COLUMN IF NOT EXISTS "id_new" uuid;
ALTER TABLE "tournament_bracket_matches" ADD COLUMN IF NOT EXISTS "tournament_id_new" uuid;
ALTER TABLE "tournament_bracket_matches" ADD COLUMN IF NOT EXISTS "team_a_id_new" uuid;
ALTER TABLE "tournament_bracket_matches" ADD COLUMN IF NOT EXISTS "team_b_id_new" uuid;
ALTER TABLE "tournament_bracket_matches" ADD COLUMN IF NOT EXISTS "winner_team_id_new" uuid;
ALTER TABLE "tournament_bracket_matches" ADD COLUMN IF NOT EXISTS "next_match_id_new" uuid;
UPDATE "tournament_bracket_matches" SET "id_new" = gen_random_uuid() WHERE "id_new" IS NULL;
UPDATE "tournament_bracket_matches" m
SET "tournament_id_new" = t."id_new"
FROM "tournaments" t
WHERE m."tournament_id" = t."id";
UPDATE "tournament_bracket_matches" m
SET "team_a_id_new" = tt."id_new"
FROM "tournament_teams" tt
WHERE m."team_a_id" = tt."id";
UPDATE "tournament_bracket_matches" m
SET "team_b_id_new" = tt."id_new"
FROM "tournament_teams" tt
WHERE m."team_b_id" = tt."id";
UPDATE "tournament_bracket_matches" m
SET "winner_team_id_new" = tt."id_new"
FROM "tournament_teams" tt
WHERE m."winner_team_id" = tt."id";
UPDATE "tournament_bracket_matches" b
SET "next_match_id_new" = n."id_new"
FROM "tournament_bracket_matches" n
WHERE b."next_match_id" = n."id";
ALTER TABLE "tournament_bracket_matches" ALTER COLUMN "id_new" SET NOT NULL;
ALTER TABLE "tournament_bracket_matches" ALTER COLUMN "tournament_id_new" SET NOT NULL;

-- ─── player_matches / player_tournament_results (FK only) ─────────────────────
ALTER TABLE "player_matches" ADD COLUMN IF NOT EXISTS "tournament_id_new" uuid;
UPDATE "player_matches" pm
SET "tournament_id_new" = t."id_new"
FROM "tournaments" t
WHERE pm."tournament_id" = t."id";

ALTER TABLE "player_tournament_results" ADD COLUMN IF NOT EXISTS "tournament_id_new" uuid;
UPDATE "player_tournament_results" ptr
SET "tournament_id_new" = t."id_new"
FROM "tournaments" t
WHERE ptr."tournament_id" = t."id";

-- ─── drop foreign keys ─────────────────────────────────────────────────────────
ALTER TABLE "player_matches" DROP CONSTRAINT IF EXISTS "player_matches_tournament_id_tournaments_id_fk";
ALTER TABLE "player_tournament_results" DROP CONSTRAINT IF EXISTS "player_tournament_results_tournament_id_tournaments_id_fk";
ALTER TABLE "tournament_registrations" DROP CONSTRAINT IF EXISTS "tournament_registrations_tournament_id_tournaments_id_fk";
ALTER TABLE "tournament_registrations" DROP CONSTRAINT IF EXISTS "tournament_registrations_team_id_tournament_teams_id_fk";
ALTER TABLE "tournament_team_members" DROP CONSTRAINT IF EXISTS "tournament_team_members_team_id_tournament_teams_id_fk";
ALTER TABLE "tournament_teams" DROP CONSTRAINT IF EXISTS "tournament_teams_tournament_id_tournaments_id_fk";
ALTER TABLE "tournament_payments" DROP CONSTRAINT IF EXISTS "tournament_payments_tournament_id_tournaments_id_fk";
ALTER TABLE "tournament_payments" DROP CONSTRAINT IF EXISTS "tnmt_payments_reg_fk";
ALTER TABLE "tournament_bracket_matches" DROP CONSTRAINT IF EXISTS "tournament_bracket_matches_tournament_id_tournaments_id_fk";
ALTER TABLE "tournament_bracket_matches" DROP CONSTRAINT IF EXISTS "tournament_bracket_matches_team_a_id_tournament_teams_id_fk";
ALTER TABLE "tournament_bracket_matches" DROP CONSTRAINT IF EXISTS "tournament_bracket_matches_team_b_id_tournament_teams_id_fk";
ALTER TABLE "tournament_bracket_matches" DROP CONSTRAINT IF EXISTS "tb_matches_winner_team_fk";
ALTER TABLE "tournament_reclub_matches" DROP CONSTRAINT IF EXISTS "tournament_reclub_matches_tournament_id_tournaments_id_fk";
ALTER TABLE "tournament_reclub_matches" DROP CONSTRAINT IF EXISTS "tournament_reclub_matches_team_a_id_tournament_teams_id_fk";
ALTER TABLE "tournament_reclub_matches" DROP CONSTRAINT IF EXISTS "tournament_reclub_matches_team_b_id_tournament_teams_id_fk";

-- ─── drop primary keys & old integer columns ─────────────────────────────────
ALTER TABLE "tournament_payments" DROP CONSTRAINT IF EXISTS "tournament_payments_pkey";
ALTER TABLE "tournament_registrations" DROP CONSTRAINT IF EXISTS "tournament_registrations_pkey";
ALTER TABLE "tournament_team_members" DROP CONSTRAINT IF EXISTS "tournament_team_members_pkey";
ALTER TABLE "tournament_teams" DROP CONSTRAINT IF EXISTS "tournament_teams_pkey";
ALTER TABLE "tournament_bracket_matches" DROP CONSTRAINT IF EXISTS "tournament_bracket_matches_pkey";
ALTER TABLE "tournament_reclub_matches" DROP CONSTRAINT IF EXISTS "tournament_reclub_matches_pkey";
ALTER TABLE "tournaments" DROP CONSTRAINT IF EXISTS "tournaments_pkey";

ALTER TABLE "tournament_payments" DROP COLUMN IF EXISTS "id";
ALTER TABLE "tournament_payments" DROP COLUMN IF EXISTS "tournament_id";
ALTER TABLE "tournament_payments" DROP COLUMN IF EXISTS "registration_id";

ALTER TABLE "tournament_registrations" DROP COLUMN IF EXISTS "id";
ALTER TABLE "tournament_registrations" DROP COLUMN IF EXISTS "tournament_id";
ALTER TABLE "tournament_registrations" DROP COLUMN IF EXISTS "team_id";

ALTER TABLE "tournament_team_members" DROP COLUMN IF EXISTS "id";
ALTER TABLE "tournament_team_members" DROP COLUMN IF EXISTS "team_id";

ALTER TABLE "tournament_teams" DROP COLUMN IF EXISTS "id";
ALTER TABLE "tournament_teams" DROP COLUMN IF EXISTS "tournament_id";

ALTER TABLE "tournament_bracket_matches" DROP COLUMN IF EXISTS "id";
ALTER TABLE "tournament_bracket_matches" DROP COLUMN IF EXISTS "tournament_id";
ALTER TABLE "tournament_bracket_matches" DROP COLUMN IF EXISTS "team_a_id";
ALTER TABLE "tournament_bracket_matches" DROP COLUMN IF EXISTS "team_b_id";
ALTER TABLE "tournament_bracket_matches" DROP COLUMN IF EXISTS "winner_team_id";
ALTER TABLE "tournament_bracket_matches" DROP COLUMN IF EXISTS "next_match_id";

ALTER TABLE "tournament_reclub_matches" DROP COLUMN IF EXISTS "id";
ALTER TABLE "tournament_reclub_matches" DROP COLUMN IF EXISTS "tournament_id";
ALTER TABLE "tournament_reclub_matches" DROP COLUMN IF EXISTS "team_a_id";
ALTER TABLE "tournament_reclub_matches" DROP COLUMN IF EXISTS "team_b_id";

ALTER TABLE "player_matches" DROP COLUMN IF EXISTS "tournament_id";
ALTER TABLE "player_tournament_results" DROP COLUMN IF EXISTS "tournament_id";

ALTER TABLE "tournaments" DROP COLUMN IF EXISTS "id";

-- ─── rename new columns ────────────────────────────────────────────────────────
ALTER TABLE "tournaments" RENAME COLUMN "id_new" TO "id";
ALTER TABLE "tournament_teams" RENAME COLUMN "id_new" TO "id";
ALTER TABLE "tournament_teams" RENAME COLUMN "tournament_id_new" TO "tournament_id";
ALTER TABLE "tournament_team_members" RENAME COLUMN "id_new" TO "id";
ALTER TABLE "tournament_team_members" RENAME COLUMN "team_id_new" TO "team_id";
ALTER TABLE "tournament_registrations" RENAME COLUMN "id_new" TO "id";
ALTER TABLE "tournament_registrations" RENAME COLUMN "tournament_id_new" TO "tournament_id";
ALTER TABLE "tournament_registrations" RENAME COLUMN "team_id_new" TO "team_id";
ALTER TABLE "tournament_payments" RENAME COLUMN "id_new" TO "id";
ALTER TABLE "tournament_payments" RENAME COLUMN "tournament_id_new" TO "tournament_id";
ALTER TABLE "tournament_payments" RENAME COLUMN "registration_id_new" TO "registration_id";
ALTER TABLE "tournament_reclub_matches" RENAME COLUMN "id_new" TO "id";
ALTER TABLE "tournament_reclub_matches" RENAME COLUMN "tournament_id_new" TO "tournament_id";
ALTER TABLE "tournament_reclub_matches" RENAME COLUMN "team_a_id_new" TO "team_a_id";
ALTER TABLE "tournament_reclub_matches" RENAME COLUMN "team_b_id_new" TO "team_b_id";
ALTER TABLE "tournament_bracket_matches" RENAME COLUMN "id_new" TO "id";
ALTER TABLE "tournament_bracket_matches" RENAME COLUMN "tournament_id_new" TO "tournament_id";
ALTER TABLE "tournament_bracket_matches" RENAME COLUMN "team_a_id_new" TO "team_a_id";
ALTER TABLE "tournament_bracket_matches" RENAME COLUMN "team_b_id_new" TO "team_b_id";
ALTER TABLE "tournament_bracket_matches" RENAME COLUMN "winner_team_id_new" TO "winner_team_id";
ALTER TABLE "tournament_bracket_matches" RENAME COLUMN "next_match_id_new" TO "next_match_id";
ALTER TABLE "player_matches" RENAME COLUMN "tournament_id_new" TO "tournament_id";
ALTER TABLE "player_tournament_results" RENAME COLUMN "tournament_id_new" TO "tournament_id";

-- ─── primary keys & foreign keys ─────────────────────────────────────────────
ALTER TABLE "tournaments" ADD PRIMARY KEY ("id");
ALTER TABLE "tournament_teams" ADD PRIMARY KEY ("id");
ALTER TABLE "tournament_team_members" ADD PRIMARY KEY ("id");
ALTER TABLE "tournament_registrations" ADD PRIMARY KEY ("id");
ALTER TABLE "tournament_payments" ADD PRIMARY KEY ("id");
ALTER TABLE "tournament_reclub_matches" ADD PRIMARY KEY ("id");
ALTER TABLE "tournament_bracket_matches" ADD PRIMARY KEY ("id");

ALTER TABLE "tournament_teams" ADD CONSTRAINT "tournament_teams_tournament_id_tournaments_id_fk"
  FOREIGN KEY ("tournament_id") REFERENCES "tournaments"("id") ON DELETE cascade;
ALTER TABLE "tournament_team_members" ADD CONSTRAINT "tournament_team_members_team_id_tournament_teams_id_fk"
  FOREIGN KEY ("team_id") REFERENCES "tournament_teams"("id") ON DELETE cascade;
ALTER TABLE "tournament_registrations" ADD CONSTRAINT "tournament_registrations_tournament_id_tournaments_id_fk"
  FOREIGN KEY ("tournament_id") REFERENCES "tournaments"("id") ON DELETE cascade;
ALTER TABLE "tournament_registrations" ADD CONSTRAINT "tournament_registrations_team_id_tournament_teams_id_fk"
  FOREIGN KEY ("team_id") REFERENCES "tournament_teams"("id") ON DELETE set null;
ALTER TABLE "tournament_payments" ADD CONSTRAINT "tournament_payments_tournament_id_tournaments_id_fk"
  FOREIGN KEY ("tournament_id") REFERENCES "tournaments"("id") ON DELETE restrict;
ALTER TABLE "tournament_payments" ADD CONSTRAINT "tnmt_payments_reg_fk"
  FOREIGN KEY ("registration_id") REFERENCES "tournament_registrations"("id") ON DELETE restrict;
ALTER TABLE "tournament_reclub_matches" ADD CONSTRAINT "tournament_reclub_matches_tournament_id_tournaments_id_fk"
  FOREIGN KEY ("tournament_id") REFERENCES "tournaments"("id") ON DELETE cascade;
ALTER TABLE "tournament_reclub_matches" ADD CONSTRAINT "tournament_reclub_matches_team_a_id_tournament_teams_id_fk"
  FOREIGN KEY ("team_a_id") REFERENCES "tournament_teams"("id") ON DELETE set null;
ALTER TABLE "tournament_reclub_matches" ADD CONSTRAINT "tournament_reclub_matches_team_b_id_tournament_teams_id_fk"
  FOREIGN KEY ("team_b_id") REFERENCES "tournament_teams"("id") ON DELETE set null;
ALTER TABLE "tournament_bracket_matches" ADD CONSTRAINT "tournament_bracket_matches_tournament_id_tournaments_id_fk"
  FOREIGN KEY ("tournament_id") REFERENCES "tournaments"("id") ON DELETE cascade;
ALTER TABLE "tournament_bracket_matches" ADD CONSTRAINT "tournament_bracket_matches_team_a_id_tournament_teams_id_fk"
  FOREIGN KEY ("team_a_id") REFERENCES "tournament_teams"("id") ON DELETE set null;
ALTER TABLE "tournament_bracket_matches" ADD CONSTRAINT "tournament_bracket_matches_team_b_id_tournament_teams_id_fk"
  FOREIGN KEY ("team_b_id") REFERENCES "tournament_teams"("id") ON DELETE set null;
ALTER TABLE "tournament_bracket_matches" ADD CONSTRAINT "tb_matches_winner_team_fk"
  FOREIGN KEY ("winner_team_id") REFERENCES "tournament_teams"("id") ON DELETE set null;
ALTER TABLE "tournament_bracket_matches" ADD CONSTRAINT "tb_matches_next_match_fk"
  FOREIGN KEY ("next_match_id") REFERENCES "tournament_bracket_matches"("id") ON DELETE set null;
ALTER TABLE "player_matches" ADD CONSTRAINT "player_matches_tournament_id_tournaments_id_fk"
  FOREIGN KEY ("tournament_id") REFERENCES "tournaments"("id") ON DELETE set null;
ALTER TABLE "player_tournament_results" ADD CONSTRAINT "player_tournament_results_tournament_id_tournaments_id_fk"
  FOREIGN KEY ("tournament_id") REFERENCES "tournaments"("id") ON DELETE set null;

-- ─── indexes (recreate if dropped with columns) ──────────────────────────────
CREATE INDEX IF NOT EXISTS "tournament_teams_tournament_idx" ON "tournament_teams" ("tournament_id");
CREATE UNIQUE INDEX IF NOT EXISTS "tournament_teams_name_uidx" ON "tournament_teams" ("tournament_id", "name");
CREATE INDEX IF NOT EXISTS "tournament_team_members_team_idx" ON "tournament_team_members" ("team_id");
CREATE UNIQUE INDEX IF NOT EXISTS "tournament_team_members_user_team_uidx" ON "tournament_team_members" ("team_id", "user_id");
CREATE UNIQUE INDEX IF NOT EXISTS "tournament_team_members_slot_uidx" ON "tournament_team_members" ("team_id", "slot_index");
CREATE INDEX IF NOT EXISTS "tournament_registrations_tournament_idx" ON "tournament_registrations" ("tournament_id");
CREATE INDEX IF NOT EXISTS "tournament_registrations_user_idx" ON "tournament_registrations" ("registered_by_user_id");
CREATE INDEX IF NOT EXISTS "tournament_payments_tournament_idx" ON "tournament_payments" ("tournament_id");
CREATE INDEX IF NOT EXISTS "tournament_payments_registration_idx" ON "tournament_payments" ("registration_id");
CREATE INDEX IF NOT EXISTS "tournament_reclub_matches_tournament_idx" ON "tournament_reclub_matches" ("tournament_id");
CREATE INDEX IF NOT EXISTS "tournament_reclub_matches_round_idx" ON "tournament_reclub_matches" ("tournament_id", "round_number");
CREATE INDEX IF NOT EXISTS "tournament_bracket_matches_tournament_idx" ON "tournament_bracket_matches" ("tournament_id");
CREATE INDEX IF NOT EXISTS "tournament_bracket_matches_round_idx" ON "tournament_bracket_matches" ("tournament_id", "round_number", "match_number");

-- drop legacy sequences if present
DROP SEQUENCE IF EXISTS "tournaments_id_seq" CASCADE;
DROP SEQUENCE IF EXISTS "tournament_teams_id_seq" CASCADE;
DROP SEQUENCE IF EXISTS "tournament_team_members_id_seq" CASCADE;
DROP SEQUENCE IF EXISTS "tournament_registrations_id_seq" CASCADE;
DROP SEQUENCE IF EXISTS "tournament_payments_id_seq" CASCADE;
DROP SEQUENCE IF EXISTS "tournament_reclub_matches_id_seq" CASCADE;
DROP SEQUENCE IF EXISTS "tournament_bracket_matches_id_seq" CASCADE;
