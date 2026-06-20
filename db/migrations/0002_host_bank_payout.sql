ALTER TABLE "host_xendit_accounts" ADD COLUMN IF NOT EXISTS "bank_code" varchar(20);--> statement-breakpoint
ALTER TABLE "host_xendit_accounts" ADD COLUMN IF NOT EXISTS "bank_account_number" varchar(40);--> statement-breakpoint
ALTER TABLE "host_xendit_accounts" ADD COLUMN IF NOT EXISTS "bank_account_holder" varchar(120);--> statement-breakpoint
ALTER TABLE "host_xendit_accounts" ADD COLUMN IF NOT EXISTS "payout_schedule" varchar(20) DEFAULT 'weekly';--> statement-breakpoint
ALTER TABLE "host_xendit_accounts" ALTER COLUMN "xendit_account_id" DROP NOT NULL;
