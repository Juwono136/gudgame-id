-- Partner brand icon (favicon) columns

ALTER TABLE "partners"
  ADD COLUMN IF NOT EXISTS "icon_url" text;

ALTER TABLE "partners"
  ADD COLUMN IF NOT EXISTS "icon_storage_key" varchar(512);
