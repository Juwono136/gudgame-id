CREATE TABLE IF NOT EXISTS "host_role_requests" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" text NOT NULL,
  "status" varchar(20) DEFAULT 'pending' NOT NULL,
  "message" text DEFAULT '' NOT NULL,
  "rejection_reason" text,
  "reviewed_by_user_id" text,
  "reviewed_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "host_role_requests"
    ADD CONSTRAINT "host_role_requests_user_id_user_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "public"."user"("id")
    ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "host_role_requests"
    ADD CONSTRAINT "host_role_requests_reviewed_by_user_id_user_id_fk"
    FOREIGN KEY ("reviewed_by_user_id") REFERENCES "public"."user"("id")
    ON DELETE set null ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "host_role_requests_user_idx"
  ON "host_role_requests" ("user_id", "created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "host_role_requests_status_idx"
  ON "host_role_requests" ("status", "created_at");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "host_role_requests_one_pending_uidx"
  ON "host_role_requests" ("user_id")
  WHERE "status" = 'pending';
