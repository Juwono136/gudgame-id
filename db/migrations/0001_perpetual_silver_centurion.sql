CREATE TABLE "notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"type" varchar(64) NOT NULL,
	"title" varchar(200) NOT NULL,
	"body" text NOT NULL,
	"action_url" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"read_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "tournament_registrations" ADD COLUMN "confirmed_at" timestamp;--> statement-breakpoint
ALTER TABLE "tournament_registrations" ADD COLUMN "confirmed_by_user_id" text;--> statement-breakpoint
ALTER TABLE "tournament_registrations" ADD COLUMN "declined_at" timestamp;--> statement-breakpoint
ALTER TABLE "tournament_registrations" ADD COLUMN "payment_due_at" timestamp;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "notifications_user_created_idx" ON "notifications" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "notifications_user_unread_idx" ON "notifications" USING btree ("user_id","read_at");--> statement-breakpoint
ALTER TABLE "tournament_registrations" ADD CONSTRAINT "tournament_registrations_confirmed_by_user_id_user_id_fk" FOREIGN KEY ("confirmed_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;