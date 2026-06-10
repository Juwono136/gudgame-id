CREATE TABLE "equipments" (
	"id" serial PRIMARY KEY NOT NULL,
	"sport_id" integer NOT NULL,
	"brand" varchar(50) NOT NULL,
	"model_name" varchar(100) NOT NULL,
	"specifications" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"image_url" text,
	"source_type" varchar(20) DEFAULT 'scraped' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "player_profiles" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"sport_id" integer NOT NULL,
	"full_name" varchar(100) NOT NULL,
	"tier" varchar(20) DEFAULT 'bronze' NOT NULL,
	"is_pro_verified" boolean DEFAULT false NOT NULL,
	"stats" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sports" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(50) NOT NULL,
	"slug" varchar(50) NOT NULL,
	"tagline" varchar(160),
	"description" text,
	"rules_summary" text,
	"rules_content" text,
	"how_to_play" text,
	"equipment_overview" text,
	"hero_image_url" text,
	"hero_image_storage_key" varchar(512),
	"entry_count_label" varchar(32),
	"accent_color" varchar(32),
	"visibility" varchar(20) DEFAULT 'coming_soon' NOT NULL,
	"modules" jsonb DEFAULT '{"tournaments":true,"players":true,"gear":true,"rankings":true,"rules":true}'::jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "sports_name_unique" UNIQUE("name"),
	CONSTRAINT "sports_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"image_storage_key" varchar(512),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"role" varchar(32) DEFAULT 'player' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_login_at" timestamp,
	"phone" varchar(20),
	"phone_country_code" varchar(8),
	"nickname" varchar(50),
	"club_name" varchar(100),
	"full_name_ktp" varchar(150),
	"must_change_password" boolean DEFAULT false NOT NULL,
	"invited_by_admin" boolean DEFAULT false NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email"),
	CONSTRAINT "user_nickname_unique" UNIQUE("nickname")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_role_assignments" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"role" varchar(32) NOT NULL,
	"assigned_at" timestamp DEFAULT now() NOT NULL,
	"assigned_by" text
);
--> statement-breakpoint
CREATE TABLE "admin_invite_pending" (
	"email" text PRIMARY KEY NOT NULL,
	"temporary_password" text NOT NULL,
	"expires_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wiki_entities" (
	"id" serial PRIMARY KEY NOT NULL,
	"sport_id" integer NOT NULL,
	"entity_type" varchar(20) NOT NULL,
	"slug" varchar(120) NOT NULL,
	"display_name" varchar(200) NOT NULL,
	"nickname" varchar(120),
	"summary" text,
	"biography" text,
	"status" varchar(20) DEFAULT 'draft' NOT NULL,
	"hero_image_url" text,
	"hero_image_storage_key" varchar(512),
	"primary_image_url" text,
	"primary_image_storage_key" varchar(512),
	"attributes" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"performance" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"specs" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"features" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"source_type" varchar(20) DEFAULT 'manual' NOT NULL,
	"source_url" text,
	"scraped_at" timestamp,
	"published_at" timestamp,
	"owner_user_id" text,
	"created_by" text,
	"updated_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wiki_entity_media" (
	"id" serial PRIMARY KEY NOT NULL,
	"entity_id" integer NOT NULL,
	"url" text,
	"storage_key" varchar(512),
	"caption" varchar(200),
	"sort_order" integer DEFAULT 0 NOT NULL,
	"media_type" varchar(20) DEFAULT 'image' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wiki_entity_relations" (
	"id" serial PRIMARY KEY NOT NULL,
	"from_entity_id" integer NOT NULL,
	"to_entity_id" integer NOT NULL,
	"relation_type" varchar(40) NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "player_matches" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"wiki_entity_id" integer,
	"sport_id" integer,
	"tournament_id" integer,
	"is_official" boolean DEFAULT true NOT NULL,
	"tournament_name" varchar(200) NOT NULL,
	"opponents" varchar(300) NOT NULL,
	"result_type" varchar(10) NOT NULL,
	"score" varchar(50),
	"round" varchar(80),
	"played_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "player_tournament_results" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"wiki_entity_id" integer,
	"sport_id" integer,
	"tournament_id" integer,
	"is_official" boolean DEFAULT true NOT NULL,
	"year" integer NOT NULL,
	"tournament_name" varchar(200) NOT NULL,
	"category" varchar(80),
	"placement" varchar(80) NOT NULL,
	"placement_rank" integer,
	"played_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tournaments" (
	"id" serial PRIMARY KEY NOT NULL,
	"sport_id" integer NOT NULL,
	"slug" varchar(120) NOT NULL,
	"name" varchar(200) NOT NULL,
	"summary" text,
	"description" text,
	"status" varchar(20) DEFAULT 'draft' NOT NULL,
	"tournament_type" varchar(20) NOT NULL,
	"rules" text,
	"venue" varchar(200),
	"category_label" varchar(80),
	"format" varchar(40) DEFAULT 'single_elimination' NOT NULL,
	"max_teams" integer,
	"players_per_team" integer DEFAULT 2 NOT NULL,
	"registration_fee_idr" integer,
	"prize_pool_idr" integer,
	"registration_opens_at" timestamp,
	"registration_closes_at" timestamp,
	"starts_at" timestamp,
	"ends_at" timestamp,
	"cover_image_url" text,
	"cover_image_storage_key" varchar(512),
	"settings" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tournament_registrations" (
	"id" serial PRIMARY KEY NOT NULL,
	"tournament_id" integer NOT NULL,
	"team_id" integer,
	"registered_by_user_id" text NOT NULL,
	"status" varchar(24) DEFAULT 'draft' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tournament_team_members" (
	"id" serial PRIMARY KEY NOT NULL,
	"team_id" integer NOT NULL,
	"user_id" text NOT NULL,
	"slot_index" integer DEFAULT 0 NOT NULL,
	"role" varchar(20) DEFAULT 'member' NOT NULL,
	"joined_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tournament_teams" (
	"id" serial PRIMARY KEY NOT NULL,
	"tournament_id" integer NOT NULL,
	"name" varchar(120) NOT NULL,
	"logo_url" text,
	"captain_user_id" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "platform_settings" (
	"key" varchar(80) PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"updated_by" text,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tournament_payments" (
	"id" serial PRIMARY KEY NOT NULL,
	"tournament_id" integer NOT NULL,
	"registration_id" integer NOT NULL,
	"payer_user_id" text NOT NULL,
	"xendit_invoice_id" varchar(120),
	"xendit_external_id" varchar(120),
	"amount_idr" integer NOT NULL,
	"platform_fee_idr" integer DEFAULT 0 NOT NULL,
	"host_payout_idr" integer DEFAULT 0 NOT NULL,
	"processing_fee_idr" integer DEFAULT 0 NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"invoice_url" text,
	"xendit_split_rule_id" varchar(120),
	"host_payout_status" varchar(20) DEFAULT 'pending' NOT NULL,
	"host_payout_completed_at" timestamp,
	"paid_at" timestamp,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tournament_bracket_matches" (
	"id" serial PRIMARY KEY NOT NULL,
	"tournament_id" integer NOT NULL,
	"round_number" integer NOT NULL,
	"match_number" integer NOT NULL,
	"team_a_id" integer,
	"team_b_id" integer,
	"team_a_name" varchar(120),
	"team_b_name" varchar(120),
	"score_a" integer,
	"score_b" integer,
	"winner_team_id" integer,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"next_match_id" integer,
	"scheduled_at" timestamp,
	"completed_at" timestamp,
	"recorded_by_user_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tournament_reclub_matches" (
	"id" serial PRIMARY KEY NOT NULL,
	"tournament_id" integer NOT NULL,
	"round_number" integer NOT NULL,
	"team_a_id" integer,
	"team_b_id" integer,
	"team_a_name" varchar(120),
	"team_b_name" varchar(120),
	"score_a" integer,
	"score_b" integer,
	"duration_seconds" integer,
	"summary" varchar(300),
	"status" varchar(20) DEFAULT 'completed' NOT NULL,
	"started_at" timestamp,
	"ended_at" timestamp,
	"recorded_by_user_id" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "host_xendit_accounts" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"xendit_account_id" varchar(80) NOT NULL,
	"account_email" varchar(200) NOT NULL,
	"business_name" varchar(200),
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "equipments" ADD CONSTRAINT "equipments_sport_id_sports_id_fk" FOREIGN KEY ("sport_id") REFERENCES "public"."sports"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_profiles" ADD CONSTRAINT "player_profiles_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_profiles" ADD CONSTRAINT "player_profiles_sport_id_sports_id_fk" FOREIGN KEY ("sport_id") REFERENCES "public"."sports"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_role_assignments" ADD CONSTRAINT "user_role_assignments_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_role_assignments" ADD CONSTRAINT "user_role_assignments_assigned_by_user_id_fk" FOREIGN KEY ("assigned_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wiki_entities" ADD CONSTRAINT "wiki_entities_sport_id_sports_id_fk" FOREIGN KEY ("sport_id") REFERENCES "public"."sports"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wiki_entities" ADD CONSTRAINT "wiki_entities_owner_user_id_user_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wiki_entities" ADD CONSTRAINT "wiki_entities_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wiki_entities" ADD CONSTRAINT "wiki_entities_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wiki_entity_media" ADD CONSTRAINT "wiki_entity_media_entity_id_wiki_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."wiki_entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wiki_entity_relations" ADD CONSTRAINT "wiki_entity_relations_from_entity_id_wiki_entities_id_fk" FOREIGN KEY ("from_entity_id") REFERENCES "public"."wiki_entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wiki_entity_relations" ADD CONSTRAINT "wiki_entity_relations_to_entity_id_wiki_entities_id_fk" FOREIGN KEY ("to_entity_id") REFERENCES "public"."wiki_entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_matches" ADD CONSTRAINT "player_matches_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_matches" ADD CONSTRAINT "player_matches_wiki_entity_id_wiki_entities_id_fk" FOREIGN KEY ("wiki_entity_id") REFERENCES "public"."wiki_entities"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_matches" ADD CONSTRAINT "player_matches_sport_id_sports_id_fk" FOREIGN KEY ("sport_id") REFERENCES "public"."sports"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_matches" ADD CONSTRAINT "player_matches_tournament_id_tournaments_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_tournament_results" ADD CONSTRAINT "player_tournament_results_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_tournament_results" ADD CONSTRAINT "player_tournament_results_wiki_entity_id_wiki_entities_id_fk" FOREIGN KEY ("wiki_entity_id") REFERENCES "public"."wiki_entities"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_tournament_results" ADD CONSTRAINT "player_tournament_results_sport_id_sports_id_fk" FOREIGN KEY ("sport_id") REFERENCES "public"."sports"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_tournament_results" ADD CONSTRAINT "player_tournament_results_tournament_id_tournaments_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournaments" ADD CONSTRAINT "tournaments_sport_id_sports_id_fk" FOREIGN KEY ("sport_id") REFERENCES "public"."sports"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournaments" ADD CONSTRAINT "tournaments_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament_registrations" ADD CONSTRAINT "tournament_registrations_tournament_id_tournaments_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament_registrations" ADD CONSTRAINT "tournament_registrations_team_id_tournament_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."tournament_teams"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament_registrations" ADD CONSTRAINT "tournament_registrations_registered_by_user_id_user_id_fk" FOREIGN KEY ("registered_by_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament_team_members" ADD CONSTRAINT "tournament_team_members_team_id_tournament_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."tournament_teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament_team_members" ADD CONSTRAINT "tournament_team_members_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament_teams" ADD CONSTRAINT "tournament_teams_tournament_id_tournaments_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament_teams" ADD CONSTRAINT "tournament_teams_captain_user_id_user_id_fk" FOREIGN KEY ("captain_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform_settings" ADD CONSTRAINT "platform_settings_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament_payments" ADD CONSTRAINT "tournament_payments_tournament_id_tournaments_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament_payments" ADD CONSTRAINT "tournament_payments_payer_user_id_user_id_fk" FOREIGN KEY ("payer_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament_payments" ADD CONSTRAINT "tnmt_payments_reg_fk" FOREIGN KEY ("registration_id") REFERENCES "public"."tournament_registrations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament_bracket_matches" ADD CONSTRAINT "tournament_bracket_matches_tournament_id_tournaments_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament_bracket_matches" ADD CONSTRAINT "tournament_bracket_matches_team_a_id_tournament_teams_id_fk" FOREIGN KEY ("team_a_id") REFERENCES "public"."tournament_teams"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament_bracket_matches" ADD CONSTRAINT "tournament_bracket_matches_team_b_id_tournament_teams_id_fk" FOREIGN KEY ("team_b_id") REFERENCES "public"."tournament_teams"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament_bracket_matches" ADD CONSTRAINT "tournament_bracket_matches_recorded_by_user_id_user_id_fk" FOREIGN KEY ("recorded_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament_bracket_matches" ADD CONSTRAINT "tb_matches_winner_team_fk" FOREIGN KEY ("winner_team_id") REFERENCES "public"."tournament_teams"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament_reclub_matches" ADD CONSTRAINT "tournament_reclub_matches_tournament_id_tournaments_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament_reclub_matches" ADD CONSTRAINT "tournament_reclub_matches_team_a_id_tournament_teams_id_fk" FOREIGN KEY ("team_a_id") REFERENCES "public"."tournament_teams"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament_reclub_matches" ADD CONSTRAINT "tournament_reclub_matches_team_b_id_tournament_teams_id_fk" FOREIGN KEY ("team_b_id") REFERENCES "public"."tournament_teams"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament_reclub_matches" ADD CONSTRAINT "tournament_reclub_matches_recorded_by_user_id_user_id_fk" FOREIGN KEY ("recorded_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "host_xendit_accounts" ADD CONSTRAINT "host_xendit_accounts_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "equipments_sport_idx" ON "equipments" USING btree ("sport_id");--> statement-breakpoint
CREATE INDEX "equipments_brand_idx" ON "equipments" USING btree ("brand");--> statement-breakpoint
CREATE INDEX "player_profiles_tier_idx" ON "player_profiles" USING btree ("tier");--> statement-breakpoint
CREATE INDEX "player_profiles_sport_idx" ON "player_profiles" USING btree ("sport_id");--> statement-breakpoint
CREATE INDEX "player_profiles_user_idx" ON "player_profiles" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sports_slug_idx" ON "sports" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "account_user_id_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "session_user_id_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "session_token_idx" ON "session" USING btree ("token");--> statement-breakpoint
CREATE INDEX "user_email_idx" ON "user" USING btree ("email");--> statement-breakpoint
CREATE INDEX "user_nickname_idx" ON "user" USING btree ("nickname");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");--> statement-breakpoint
CREATE UNIQUE INDEX "user_role_assignments_user_role_uidx" ON "user_role_assignments" USING btree ("user_id","role");--> statement-breakpoint
CREATE INDEX "user_role_assignments_user_idx" ON "user_role_assignments" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_role_assignments_role_idx" ON "user_role_assignments" USING btree ("role");--> statement-breakpoint
CREATE UNIQUE INDEX "wiki_entities_sport_slug_uidx" ON "wiki_entities" USING btree ("sport_id","slug");--> statement-breakpoint
CREATE INDEX "wiki_entities_sport_type_idx" ON "wiki_entities" USING btree ("sport_id","entity_type");--> statement-breakpoint
CREATE INDEX "wiki_entities_status_idx" ON "wiki_entities" USING btree ("status");--> statement-breakpoint
CREATE INDEX "wiki_entities_display_name_idx" ON "wiki_entities" USING btree ("display_name");--> statement-breakpoint
CREATE INDEX "wiki_entities_owner_user_idx" ON "wiki_entities" USING btree ("owner_user_id");--> statement-breakpoint
CREATE INDEX "wiki_media_entity_idx" ON "wiki_entity_media" USING btree ("entity_id");--> statement-breakpoint
CREATE INDEX "wiki_rel_from_idx" ON "wiki_entity_relations" USING btree ("from_entity_id");--> statement-breakpoint
CREATE INDEX "wiki_rel_to_idx" ON "wiki_entity_relations" USING btree ("to_entity_id");--> statement-breakpoint
CREATE UNIQUE INDEX "wiki_rel_unique_uidx" ON "wiki_entity_relations" USING btree ("from_entity_id","to_entity_id","relation_type");--> statement-breakpoint
CREATE INDEX "player_matches_user_idx" ON "player_matches" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "player_matches_played_at_idx" ON "player_matches" USING btree ("played_at");--> statement-breakpoint
CREATE INDEX "player_matches_tournament_idx" ON "player_matches" USING btree ("tournament_name");--> statement-breakpoint
CREATE INDEX "player_tournament_results_user_idx" ON "player_tournament_results" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "player_tournament_results_year_idx" ON "player_tournament_results" USING btree ("year");--> statement-breakpoint
CREATE INDEX "player_tournament_results_tournament_idx" ON "player_tournament_results" USING btree ("tournament_name");--> statement-breakpoint
CREATE UNIQUE INDEX "tournaments_sport_slug_uidx" ON "tournaments" USING btree ("sport_id","slug");--> statement-breakpoint
CREATE INDEX "tournaments_sport_status_idx" ON "tournaments" USING btree ("sport_id","status");--> statement-breakpoint
CREATE INDEX "tournaments_starts_at_idx" ON "tournaments" USING btree ("starts_at");--> statement-breakpoint
CREATE INDEX "tournament_registrations_tournament_idx" ON "tournament_registrations" USING btree ("tournament_id");--> statement-breakpoint
CREATE INDEX "tournament_registrations_user_idx" ON "tournament_registrations" USING btree ("registered_by_user_id");--> statement-breakpoint
CREATE INDEX "tournament_team_members_team_idx" ON "tournament_team_members" USING btree ("team_id");--> statement-breakpoint
CREATE UNIQUE INDEX "tournament_team_members_user_team_uidx" ON "tournament_team_members" USING btree ("team_id","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "tournament_team_members_slot_uidx" ON "tournament_team_members" USING btree ("team_id","slot_index");--> statement-breakpoint
CREATE INDEX "tournament_teams_tournament_idx" ON "tournament_teams" USING btree ("tournament_id");--> statement-breakpoint
CREATE UNIQUE INDEX "tournament_teams_name_uidx" ON "tournament_teams" USING btree ("tournament_id","name");--> statement-breakpoint
CREATE INDEX "tournament_payments_tournament_idx" ON "tournament_payments" USING btree ("tournament_id");--> statement-breakpoint
CREATE INDEX "tournament_payments_registration_idx" ON "tournament_payments" USING btree ("registration_id");--> statement-breakpoint
CREATE INDEX "tournament_payments_xendit_invoice_idx" ON "tournament_payments" USING btree ("xendit_invoice_id");--> statement-breakpoint
CREATE INDEX "tournament_payments_payer_idx" ON "tournament_payments" USING btree ("payer_user_id");--> statement-breakpoint
CREATE INDEX "tournament_bracket_matches_tournament_idx" ON "tournament_bracket_matches" USING btree ("tournament_id");--> statement-breakpoint
CREATE INDEX "tournament_bracket_matches_round_idx" ON "tournament_bracket_matches" USING btree ("tournament_id","round_number","match_number");--> statement-breakpoint
CREATE INDEX "tournament_reclub_matches_tournament_idx" ON "tournament_reclub_matches" USING btree ("tournament_id");--> statement-breakpoint
CREATE INDEX "tournament_reclub_matches_round_idx" ON "tournament_reclub_matches" USING btree ("tournament_id","round_number");--> statement-breakpoint
CREATE UNIQUE INDEX "host_xendit_accounts_user_uidx" ON "host_xendit_accounts" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "host_xendit_accounts_xendit_uidx" ON "host_xendit_accounts" USING btree ("xendit_account_id");--> statement-breakpoint
CREATE INDEX "host_xendit_accounts_status_idx" ON "host_xendit_accounts" USING btree ("status");