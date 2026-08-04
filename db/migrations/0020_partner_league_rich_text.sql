-- Allow rich-text HTML for partner league summary (was varchar 280)

ALTER TABLE "partner_leagues"
  ALTER COLUMN "summary" TYPE text;
