ALTER TABLE "user"
  ADD COLUMN IF NOT EXISTS sport_interest_slugs jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE "user"
  ADD COLUMN IF NOT EXISTS profile_onboarding_completed_at timestamp;
