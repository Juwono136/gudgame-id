-- Partner leagues as optional tournament grouping + brand details

ALTER TABLE "partner_leagues"
  ADD COLUMN IF NOT EXISTS "summary" varchar(280);

ALTER TABLE "partner_leagues"
  ADD COLUMN IF NOT EXISTS "description" text;

ALTER TABLE "partner_leagues"
  ADD COLUMN IF NOT EXISTS "brand_image_url" text;

ALTER TABLE "partner_leagues"
  ADD COLUMN IF NOT EXISTS "brand_image_storage_key" varchar(512);

ALTER TABLE "tournaments"
  ADD COLUMN IF NOT EXISTS "partner_league_id" uuid
  REFERENCES "partner_leagues"("id") ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS "tournaments_partner_league_idx"
  ON "tournaments" ("partner_league_id");
