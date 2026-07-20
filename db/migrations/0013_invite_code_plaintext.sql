ALTER TABLE "tournament_access_grants" ADD COLUMN IF NOT EXISTS "invite_code" varchar(16);--> statement-breakpoint
ALTER TABLE "tournament_player_invites" ADD COLUMN IF NOT EXISTS "invite_code" varchar(16);
