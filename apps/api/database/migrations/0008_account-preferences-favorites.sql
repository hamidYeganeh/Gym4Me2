CREATE TABLE "account_deletion_requests" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"requested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"eligible_after" timestamp with time zone NOT NULL,
	"processed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "account_preferences" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"accepted_policy_version" text,
	"accepted_at" timestamp with time zone,
	"adult_confirmed_at" timestamp with time zone,
	"marketing_consent" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "favorite_clubs" (
	"user_id" uuid NOT NULL,
	"club_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "favorite_clubs_user_id_club_id_pk" PRIMARY KEY("user_id","club_id")
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "profile_public" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "account_deletion_requests" ADD CONSTRAINT "account_deletion_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account_preferences" ADD CONSTRAINT "account_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "favorite_clubs" ADD CONSTRAINT "favorite_clubs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "favorite_clubs" ADD CONSTRAINT "favorite_clubs_club_id_clubs_id_fk" FOREIGN KEY ("club_id") REFERENCES "public"."clubs"("id") ON DELETE cascade ON UPDATE no action;