-- Official provisional roster slots + claim tokens (Gud Game career stats after claim)

ALTER TABLE "tournament_team_members"
  ADD COLUMN IF NOT EXISTS "pending_display_name" varchar(120),
  ADD COLUMN IF NOT EXISTS "pending_email" varchar(255),
  ADD COLUMN IF NOT EXISTS "pending_phone" varchar(32),
  ADD COLUMN IF NOT EXISTS "claim_token_hash" varchar(128),
  ADD COLUMN IF NOT EXISTS "claim_expires_at" timestamp,
  ADD COLUMN IF NOT EXISTS "claimed_at" timestamp,
  ADD COLUMN IF NOT EXISTS "invited_by_user_id" text REFERENCES "user"("id") ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS "invite_sent_at" timestamp;

ALTER TABLE "tournament_team_members"
  DROP CONSTRAINT IF EXISTS "tournament_team_members_user_xor_partner";

ALTER TABLE "tournament_team_members"
  ADD CONSTRAINT "tournament_team_members_identity_kind" CHECK (
    (
      "user_id" IS NOT NULL
      AND "partner_player_id" IS NULL
      AND "pending_email" IS NULL
      AND "claim_token_hash" IS NULL
    )
    OR (
      "user_id" IS NULL
      AND "partner_player_id" IS NOT NULL
      AND "pending_email" IS NULL
      AND "claim_token_hash" IS NULL
    )
    OR (
      "user_id" IS NULL
      AND "partner_player_id" IS NULL
      AND "pending_email" IS NOT NULL
      AND "pending_display_name" IS NOT NULL
      AND "claim_token_hash" IS NOT NULL
    )
  );

CREATE UNIQUE INDEX IF NOT EXISTS "tournament_team_members_claim_token_uidx"
  ON "tournament_team_members" ("claim_token_hash")
  WHERE "claim_token_hash" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "tournament_team_members_pending_email_idx"
  ON "tournament_team_members" ("pending_email")
  WHERE "pending_email" IS NOT NULL;
