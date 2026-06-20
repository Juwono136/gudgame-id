CREATE TABLE IF NOT EXISTS "wiki_scrape_hosts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "sport_id" uuid,
  "hostname" varchar(253) NOT NULL,
  "label" varchar(120) NOT NULL,
  "parser_profile" varchar(40) DEFAULT 'generic' NOT NULL,
  "enabled" boolean DEFAULT true NOT NULL,
  "created_by" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "wiki_scrape_hosts"
    ADD CONSTRAINT "wiki_scrape_hosts_sport_id_sports_id_fk"
    FOREIGN KEY ("sport_id") REFERENCES "sports"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "wiki_scrape_hosts"
    ADD CONSTRAINT "wiki_scrape_hosts_created_by_user_id_fk"
    FOREIGN KEY ("created_by") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "wiki_scrape_hosts_sport_hostname_uidx"
  ON "wiki_scrape_hosts" ("sport_id", "hostname");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "wiki_scrape_hosts_enabled_idx"
  ON "wiki_scrape_hosts" ("enabled");--> statement-breakpoint

INSERT INTO "wiki_scrape_hosts" ("sport_id", "hostname", "label", "parser_profile", "enabled")
SELECT NULL, v.hostname, v.label, v.parser_profile, true
FROM (VALUES
  ('padeltop.id', 'PadelTop', 'padeltop'),
  ('www.padeltop.id', 'PadelTop (www)', 'padeltop'),
  ('padelful.com', 'Padelful', 'padelful'),
  ('www.padelful.com', 'Padelful (www)', 'padelful'),
  ('padelracket.id', 'Padel Racket', 'padelracket'),
  ('www.padelracket.id', 'Padel Racket (www)', 'padelracket'),
  ('decathlon.co.id', 'Decathlon', 'decathlon'),
  ('www.decathlon.co.id', 'Decathlon (www)', 'decathlon')
) AS v(hostname, label, parser_profile)
WHERE NOT EXISTS (
  SELECT 1 FROM "wiki_scrape_hosts" h
  WHERE h."sport_id" IS NULL AND h."hostname" = v.hostname
);
