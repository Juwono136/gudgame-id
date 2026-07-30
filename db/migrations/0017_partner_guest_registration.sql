-- Partner guest players, registration, dual-key membership, payments, history

CREATE TABLE IF NOT EXISTS "partner_players" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "partner_id" uuid NOT NULL REFERENCES "partners"("id") ON DELETE CASCADE,
  "full_name" varchar(120) NOT NULL,
  "email" varchar(255) NOT NULL,
  "phone" varchar(32) NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "partner_players_partner_email_uidx"
  ON "partner_players" ("partner_id", "email");
CREATE UNIQUE INDEX IF NOT EXISTS "partner_players_partner_phone_uidx"
  ON "partner_players" ("partner_id", "phone");
CREATE INDEX IF NOT EXISTS "partner_players_partner_idx"
  ON "partner_players" ("partner_id");
CREATE INDEX IF NOT EXISTS "partner_players_name_idx"
  ON "partner_players" ("full_name");

CREATE TABLE IF NOT EXISTS "partner_tournament_registrations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tournament_id" uuid NOT NULL REFERENCES "tournaments"("id") ON DELETE CASCADE,
  "partner_id" uuid NOT NULL REFERENCES "partners"("id") ON DELETE CASCADE,
  "status" varchar(24) DEFAULT 'awaiting_payment' NOT NULL,
  "team_name" varchar(120) NOT NULL,
  "captain_partner_player_id" uuid REFERENCES "partner_players"("id") ON DELETE SET NULL,
  "team_id" uuid,
  "fee_idr" integer,
  "payment_due_at" timestamp,
  "access_token_hash" varchar(128) NOT NULL,
  "notes" text,
  "confirmed_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "partner_tnmt_regs_tournament_idx"
  ON "partner_tournament_registrations" ("tournament_id");
CREATE INDEX IF NOT EXISTS "partner_tnmt_regs_partner_idx"
  ON "partner_tournament_registrations" ("partner_id");
CREATE INDEX IF NOT EXISTS "partner_tnmt_regs_status_idx"
  ON "partner_tournament_registrations" ("status");
CREATE UNIQUE INDEX IF NOT EXISTS "partner_tnmt_regs_token_uidx"
  ON "partner_tournament_registrations" ("access_token_hash");

CREATE TABLE IF NOT EXISTS "partner_tournament_registration_members" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "registration_id" uuid NOT NULL REFERENCES "partner_tournament_registrations"("id") ON DELETE CASCADE,
  "partner_player_id" uuid REFERENCES "partner_players"("id") ON DELETE SET NULL,
  "full_name" varchar(120) NOT NULL,
  "email" varchar(255),
  "phone" varchar(32),
  "role_order" integer DEFAULT 0 NOT NULL,
  "is_captain" boolean DEFAULT false NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "partner_tnmt_reg_members_reg_idx"
  ON "partner_tournament_registration_members" ("registration_id");

CREATE TABLE IF NOT EXISTS "partner_player_matches" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "partner_player_id" uuid NOT NULL REFERENCES "partner_players"("id") ON DELETE CASCADE,
  "partner_id" uuid NOT NULL REFERENCES "partners"("id") ON DELETE CASCADE,
  "sport_id" uuid REFERENCES "sports"("id") ON DELETE SET NULL,
  "tournament_id" uuid REFERENCES "tournaments"("id") ON DELETE SET NULL,
  "tournament_name" varchar(200) NOT NULL,
  "opponents" varchar(300) NOT NULL,
  "result_type" varchar(10) NOT NULL,
  "score" varchar(50),
  "round" varchar(80),
  "played_at" timestamp NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "partner_player_matches_player_idx"
  ON "partner_player_matches" ("partner_player_id");
CREATE INDEX IF NOT EXISTS "partner_player_matches_partner_idx"
  ON "partner_player_matches" ("partner_id");
CREATE INDEX IF NOT EXISTS "partner_player_matches_tournament_idx"
  ON "partner_player_matches" ("tournament_id");

CREATE TABLE IF NOT EXISTS "partner_player_tournament_results" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "partner_player_id" uuid NOT NULL REFERENCES "partner_players"("id") ON DELETE CASCADE,
  "partner_id" uuid NOT NULL REFERENCES "partners"("id") ON DELETE CASCADE,
  "sport_id" uuid REFERENCES "sports"("id") ON DELETE SET NULL,
  "tournament_id" uuid REFERENCES "tournaments"("id") ON DELETE SET NULL,
  "year" integer NOT NULL,
  "tournament_name" varchar(200) NOT NULL,
  "category" varchar(80),
  "placement" varchar(80) NOT NULL,
  "placement_rank" integer,
  "played_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "partner_player_results_player_idx"
  ON "partner_player_tournament_results" ("partner_player_id");
CREATE INDEX IF NOT EXISTS "partner_player_results_partner_idx"
  ON "partner_player_tournament_results" ("partner_id");
CREATE INDEX IF NOT EXISTS "partner_player_results_year_idx"
  ON "partner_player_tournament_results" ("year");

-- Dual-key membership: userId XOR partnerPlayerId
ALTER TABLE "tournament_team_members"
  ALTER COLUMN "user_id" DROP NOT NULL;

ALTER TABLE "tournament_team_members"
  ADD COLUMN IF NOT EXISTS "partner_player_id" uuid
    REFERENCES "partner_players"("id") ON DELETE CASCADE;

CREATE UNIQUE INDEX IF NOT EXISTS "tournament_team_members_partner_player_team_uidx"
  ON "tournament_team_members" ("team_id", "partner_player_id");
CREATE INDEX IF NOT EXISTS "tournament_team_members_partner_player_idx"
  ON "tournament_team_members" ("partner_player_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tournament_team_members_user_xor_partner'
  ) THEN
    ALTER TABLE "tournament_team_members"
      ADD CONSTRAINT "tournament_team_members_user_xor_partner"
      CHECK (
        ("user_id" IS NOT NULL AND "partner_player_id" IS NULL)
        OR ("user_id" IS NULL AND "partner_player_id" IS NOT NULL)
      );
  END IF;
END $$;

-- Extend tournament_payments for partner guest registrations
ALTER TABLE "tournament_payments"
  ALTER COLUMN "registration_id" DROP NOT NULL;

ALTER TABLE "tournament_payments"
  ALTER COLUMN "payer_user_id" DROP NOT NULL;

ALTER TABLE "tournament_payments"
  ADD COLUMN IF NOT EXISTS "partner_registration_id" uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tnmt_payments_partner_reg_fk'
  ) THEN
    ALTER TABLE "tournament_payments"
      ADD CONSTRAINT "tnmt_payments_partner_reg_fk"
      FOREIGN KEY ("partner_registration_id")
      REFERENCES "partner_tournament_registrations"("id")
      ON DELETE RESTRICT;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "tournament_payments_partner_reg_idx"
  ON "tournament_payments" ("partner_registration_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tournament_payments_reg_xor_partner'
  ) THEN
    ALTER TABLE "tournament_payments"
      ADD CONSTRAINT "tournament_payments_reg_xor_partner"
      CHECK (
        ("registration_id" IS NOT NULL AND "partner_registration_id" IS NULL)
        OR ("registration_id" IS NULL AND "partner_registration_id" IS NOT NULL)
      );
  END IF;
END $$;
