-- Partner player auth (isolated from Gud Game Better Auth `user` table).
-- Email uniqueness is per partnerId only.

CREATE TABLE IF NOT EXISTS "partner_identities" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "partner_id" uuid NOT NULL,
  "email" varchar(255) NOT NULL,
  "password_hash" text NOT NULL,
  "display_name" varchar(120) NOT NULL,
  "email_verified_at" timestamp,
  "last_login_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "partner_identities"
    ADD CONSTRAINT "partner_identities_partner_fk"
    FOREIGN KEY ("partner_id") REFERENCES "partners"("id") ON DELETE cascade;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "partner_identities_partner_email_uidx"
  ON "partner_identities" ("partner_id", "email");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "partner_identities_partner_idx"
  ON "partner_identities" ("partner_id");
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "partner_identity_sessions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "partner_id" uuid NOT NULL,
  "identity_id" uuid NOT NULL,
  "token_hash" varchar(128) NOT NULL,
  "expires_at" timestamp NOT NULL,
  "user_agent" varchar(512),
  "ip_address" varchar(64),
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "partner_identity_sessions"
    ADD CONSTRAINT "partner_id_sessions_partner_fk"
    FOREIGN KEY ("partner_id") REFERENCES "partners"("id") ON DELETE cascade;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "partner_identity_sessions"
    ADD CONSTRAINT "partner_id_sessions_identity_fk"
    FOREIGN KEY ("identity_id") REFERENCES "partner_identities"("id") ON DELETE cascade;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "partner_id_sessions_token_uidx"
  ON "partner_identity_sessions" ("token_hash");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "partner_id_sessions_identity_idx"
  ON "partner_identity_sessions" ("identity_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "partner_id_sessions_expires_idx"
  ON "partner_identity_sessions" ("expires_at");
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "partner_identity_verifications" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "partner_id" uuid NOT NULL,
  "identity_id" uuid NOT NULL,
  "kind" varchar(32) NOT NULL,
  "token_hash" varchar(128) NOT NULL,
  "expires_at" timestamp NOT NULL,
  "consumed_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "partner_identity_verifications"
    ADD CONSTRAINT "partner_id_verify_partner_fk"
    FOREIGN KEY ("partner_id") REFERENCES "partners"("id") ON DELETE cascade;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "partner_identity_verifications"
    ADD CONSTRAINT "partner_id_verify_identity_fk"
    FOREIGN KEY ("identity_id") REFERENCES "partner_identities"("id") ON DELETE cascade;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "partner_id_verify_token_uidx"
  ON "partner_identity_verifications" ("token_hash");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "partner_id_verify_identity_idx"
  ON "partner_identity_verifications" ("identity_id", "kind");
--> statement-breakpoint

ALTER TABLE "partner_players"
  ADD COLUMN IF NOT EXISTS "identity_id" uuid;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "partner_players_identity_uidx"
  ON "partner_players" ("identity_id")
  WHERE "identity_id" IS NOT NULL;
