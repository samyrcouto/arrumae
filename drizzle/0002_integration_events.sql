CREATE TYPE "public"."integration_event_status" AS ENUM('pending', 'delivered', 'failed');--> statement-breakpoint
CREATE TABLE "integration_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" text NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"dedupe_key" text,
	"status" "integration_event_status" DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"next_attempt_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_error" text,
	"delivered_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "integration_events_dedupe_idx" ON "integration_events" USING btree ("dedupe_key");--> statement-breakpoint
CREATE INDEX "integration_events_due_idx" ON "integration_events" USING btree ("status","next_attempt_at");--> statement-breakpoint
CREATE INDEX "integration_events_created_idx" ON "integration_events" USING btree ("created_at");