-- Store host role request timestamps as timestamptz for accurate UTC↔
-- Existing naive timestamps are interpreted as UTC wall-clock values.

ALTER TABLE "host_role_requests"
  ALTER COLUMN "created_at" TYPE timestamptz
  USING "created_at" AT TIME ZONE 'UTC';
--> statement-breakpoint
ALTER TABLE "host_role_requests"
  ALTER COLUMN "updated_at" TYPE timestamptz
  USING "updated_at" AT TIME ZONE 'UTC';
--> statement-breakpoint
ALTER TABLE "host_role_requests"
  ALTER COLUMN "reviewed_at" TYPE timestamptz
  USING CASE
    WHEN "reviewed_at" IS NULL THEN NULL
    ELSE "reviewed_at" AT TIME ZONE 'UTC'
  END;
