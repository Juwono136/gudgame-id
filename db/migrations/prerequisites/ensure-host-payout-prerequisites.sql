-- Idempotent prerequisites for host payout tables.
-- Safe to run before drizzle migrate on VPS deploys that used db:push or baseline
-- without ever applying 0002 / 0003.

-- 0002_host_bank_payout
ALTER TABLE "host_xendit_accounts" ADD COLUMN IF NOT EXISTS "bank_code" varchar(20);
ALTER TABLE "host_xendit_accounts" ADD COLUMN IF NOT EXISTS "bank_account_number" varchar(40);
ALTER TABLE "host_xendit_accounts" ADD COLUMN IF NOT EXISTS "bank_account_holder" varchar(120);
ALTER TABLE "host_xendit_accounts" ADD COLUMN IF NOT EXISTS "payout_schedule" varchar(20) DEFAULT 'weekly';
ALTER TABLE "host_xendit_accounts" ALTER COLUMN "xendit_account_id" DROP NOT NULL;

-- 0003_host_bank_accounts
CREATE TABLE IF NOT EXISTS "host_bank_accounts" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "bank_code" varchar(20) NOT NULL,
  "bank_account_number" varchar(40) NOT NULL,
  "bank_account_holder" varchar(120) NOT NULL,
  "label" varchar(60),
  "is_primary" boolean DEFAULT false NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "host_bank_accounts_user_idx" ON "host_bank_accounts" ("user_id");

INSERT INTO "host_bank_accounts" (
  "user_id",
  "bank_code",
  "bank_account_number",
  "bank_account_holder",
  "is_primary",
  "created_at",
  "updated_at"
)
SELECT
  "user_id",
  "bank_code",
  "bank_account_number",
  "bank_account_holder",
  true,
  "created_at",
  "updated_at"
FROM "host_xendit_accounts"
WHERE "bank_account_number" IS NOT NULL
  AND "bank_code" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM "host_bank_accounts" hba WHERE hba."user_id" = "host_xendit_accounts"."user_id"
  );
