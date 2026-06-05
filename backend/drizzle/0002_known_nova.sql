CREATE TYPE "public"."participation_status" AS ENUM('pending', 'accepted', 'declined', 'tentative');--> statement-breakpoint
CREATE TYPE "public"."permission_level" AS ENUM('read', 'write');--> statement-breakpoint
CREATE TABLE "calendar_shares" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"shared_with_id" uuid NOT NULL,
	"permission" "permission_level" DEFAULT 'read' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "event_participants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"status" "participation_status" DEFAULT 'pending' NOT NULL,
	"invited_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "theme" text DEFAULT 'light';--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "language" text DEFAULT 'en';--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "preferred_country" text;--> statement-breakpoint
ALTER TABLE "calendar_shares" ADD CONSTRAINT "calendar_shares_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calendar_shares" ADD CONSTRAINT "calendar_shares_shared_with_id_users_id_fk" FOREIGN KEY ("shared_with_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_participants" ADD CONSTRAINT "event_participants_event_id_calendar_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."calendar_events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_participants" ADD CONSTRAINT "event_participants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "calendar_shares_owner_id_idx" ON "calendar_shares" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "calendar_shares_shared_with_id_idx" ON "calendar_shares" USING btree ("shared_with_id");--> statement-breakpoint
CREATE INDEX "event_participants_user_id_idx" ON "event_participants" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "event_participants_event_id_idx" ON "event_participants" USING btree ("event_id");