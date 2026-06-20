CREATE TABLE IF NOT EXISTS "host_payout_disbursements" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "host_user_id" text NOT NULL,
  "reference_id" varchar(120) NOT NULL,
  "xendit_payout_id" varchar(120),
  "amount_idr" integer NOT NULL,
  "payment_count" integer DEFAULT 0 NOT NULL,
  "payout_schedule" varchar(20) NOT NULL,
  "bank_code" varchar(20) NOT NULL,
  "masked_account" varchar(40) NOT NULL,
  "bank_account_holder" varchar(120) NOT NULL,
  "status" varchar(20) DEFAULT 'pending' NOT NULL,
  "failure_code" varchar(80),
  "failure_reason" text,
  "period_start" timestamp,
  "period_end" timestamp,
  "estimated_arrival_at" timestamp,
  "completed_at" timestamp,
  "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "host_payout_disbursements"
    ADD CONSTRAINT "host_payout_disbursements_host_user_id_user_id_fk"
    FOREIGN KEY ("host_user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "host_payout_disbursements_reference_uidx"
  ON "host_payout_disbursements" ("reference_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "host_payout_disbursements_host_created_idx"
  ON "host_payout_disbursements" ("host_user_id", "created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "host_payout_disbursements_status_idx"
  ON "host_payout_disbursements" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "host_payout_disbursements_xendit_idx"
  ON "host_payout_disbursements" ("xendit_payout_id");--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "host_payout_disbursement_items" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "disbursement_id" uuid NOT NULL,
  "tournament_payment_id" uuid NOT NULL,
  "amount_idr" integer NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "host_payout_disbursement_items"
    ADD CONSTRAINT "host_payout_disb_items_disbursement_fk"
    FOREIGN KEY ("disbursement_id") REFERENCES "host_payout_disbursements"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "host_payout_disbursement_items"
    ADD CONSTRAINT "host_payout_disb_items_payment_fk"
    FOREIGN KEY ("tournament_payment_id") REFERENCES "tournament_payments"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "host_payout_disbursement_items_payment_uidx"
  ON "host_payout_disbursement_items" ("tournament_payment_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "host_payout_disbursement_items_disbursement_idx"
  ON "host_payout_disbursement_items" ("disbursement_id");
