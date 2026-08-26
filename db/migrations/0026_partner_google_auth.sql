-- Partner member Google Sign-In (Firebase ID token → partner_identities).
-- password_hash nullable for Google-only accounts; google_uid unique per partner.

ALTER TABLE "partner_identities"
  ALTER COLUMN "password_hash" DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE "partner_identities"
  ADD COLUMN IF NOT EXISTS "google_uid" varchar(128);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "partner_identities_partner_google_uidx"
  ON "partner_identities" ("partner_id", "google_uid")
  WHERE "google_uid" IS NOT NULL;
