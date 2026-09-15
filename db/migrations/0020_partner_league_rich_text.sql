-- Allow rich-text HTML for partner league summary (was varchar 280)

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'partner_leagues'
      AND column_name = 'summary'
  ) THEN
    ALTER TABLE "partner_leagues"
      ALTER COLUMN "summary" TYPE text;
  END IF;
END $$;
