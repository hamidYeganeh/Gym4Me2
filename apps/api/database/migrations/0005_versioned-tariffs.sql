CREATE TABLE "club_tariff_groups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"club_id" uuid NOT NULL,
	"branch_id" uuid,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "club_tariff_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"group_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"name" text NOT NULL,
	"service_type" text NOT NULL,
	"price_toman" integer NOT NULL,
	"currency" text DEFAULT 'IRT' NOT NULL,
	"unit" text NOT NULL,
	"duration_days" integer,
	"session_count" integer,
	"included_services" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"conditions" text NOT NULL,
	"effective_from" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tariff_group_version_unique" UNIQUE("group_id","version"),
	CONSTRAINT "tariff_amount_valid" CHECK ("club_tariff_versions"."price_toman" >= 0 and "club_tariff_versions"."currency" = 'IRT' and "club_tariff_versions"."version" > 0),
	CONSTRAINT "tariff_allowances_valid" CHECK (("club_tariff_versions"."duration_days" is null or "club_tariff_versions"."duration_days" > 0) and ("club_tariff_versions"."session_count" is null or "club_tariff_versions"."session_count" > 0))
);
--> statement-breakpoint
ALTER TABLE "club_tariff_groups" ADD CONSTRAINT "club_tariff_groups_club_id_clubs_id_fk" FOREIGN KEY ("club_id") REFERENCES "public"."clubs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "club_tariff_groups" ADD CONSTRAINT "tariff_branch_tenant_fk" FOREIGN KEY ("club_id","branch_id") REFERENCES "public"."branches"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "club_tariff_versions" ADD CONSTRAINT "club_tariff_versions_group_id_club_tariff_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."club_tariff_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "club_tariff_versions" ADD CONSTRAINT "club_tariff_versions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;