ALTER TABLE "users" ADD COLUMN "deletion_pending" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "account_preferences" ADD COLUMN "confirmed_minimum_age" integer;