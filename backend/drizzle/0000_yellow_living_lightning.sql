CREATE TYPE "public"."color_type" AS ENUM('default', 'red', 'yellow', 'green');--> statement-breakpoint
CREATE TYPE "public"."event_type" AS ENUM('task', 'holiday', 'meeting', 'reminder');--> statement-breakpoint
CREATE TYPE "public"."task_priority" AS ENUM('low', 'medium', 'high');--> statement-breakpoint
CREATE TABLE "calendar_events" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"event_type" "event_type" NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"start_date" text NOT NULL,
	"end_date" text NOT NULL,
	"start_time" text,
	"end_time" text,
	"location" text,
	"country_code" text,
	"reminder_time" text,
	"is_recurring" boolean DEFAULT false NOT NULL,
	"is_public" boolean DEFAULT false NOT NULL,
	"completed" boolean DEFAULT false NOT NULL,
	"priority" "task_priority",
	"colors" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"participants" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "refresh_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"password" text NOT NULL,
	"google_id" text,
	"is_verified" boolean DEFAULT false NOT NULL,
	"verification_token" text,
	"verification_token_expiry" bigint,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "calendar_events_user_id_idx" ON "calendar_events" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "calendar_events_start_date_idx" ON "calendar_events" USING btree ("start_date");--> statement-breakpoint
CREATE INDEX "calendar_events_end_date_idx" ON "calendar_events" USING btree ("end_date");--> statement-breakpoint
CREATE INDEX "calendar_events_event_type_idx" ON "calendar_events" USING btree ("event_type");--> statement-breakpoint
CREATE UNIQUE INDEX "refresh_tokens_token_unique" ON "refresh_tokens" USING btree ("token");--> statement-breakpoint
CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_unique" ON "users" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "users_google_id_unique" ON "users" USING btree ("google_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_verification_token_unique" ON "users" USING btree ("verification_token");