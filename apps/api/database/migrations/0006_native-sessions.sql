ALTER TABLE "auth_sessions" ADD COLUMN "transport" text DEFAULT 'web' NOT NULL;--> statement-breakpoint
ALTER TABLE "otp_challenges" ADD COLUMN "transport" text DEFAULT 'web' NOT NULL;--> statement-breakpoint
ALTER TABLE "otp_challenges" ADD COLUMN "purpose" text DEFAULT 'sign-in' NOT NULL;--> statement-breakpoint
ALTER TABLE "otp_challenges" ADD COLUMN "requested_by" uuid;--> statement-breakpoint
ALTER TABLE "otp_challenges" ADD CONSTRAINT "otp_challenges_requested_by_users_id_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;