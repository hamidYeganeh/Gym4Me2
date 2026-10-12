CREATE UNIQUE INDEX "members_org_user_role_unique" ON "organization_members" USING btree ("organization_id","user_id","role");--> statement-breakpoint
CREATE TYPE "public"."club_audience" AS ENUM('all', 'men', 'women', 'mixed', 'family', 'private');--> statement-breakpoint
CREATE TYPE "public"."amenity_availability" AS ENUM('included', 'paid', 'unavailable');--> statement-breakpoint
CREATE TYPE "public"."club_media_type" AS ENUM('image', 'video');--> statement-breakpoint
CREATE TYPE "public"."club_operating_state" AS ENUM('active', 'temporarily_closed', 'permanently_closed');--> statement-breakpoint
CREATE TYPE "public"."club_publication_state" AS ENUM('draft', 'pending_review', 'published', 'hidden');--> statement-breakpoint
CREATE TYPE "public"."city_zone" AS ENUM('north', 'south', 'east', 'west', 'central', 'northeast', 'northwest', 'southeast', 'southwest');--> statement-breakpoint
CREATE TABLE "accessibility_features" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(120) NOT NULL,
	"slug" varchar(120) NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "accessibility_features_slug_unique" UNIQUE("slug"),
	CONSTRAINT "accessibility_features_name_nonempty" CHECK (length(trim("accessibility_features"."name")) >= 2)
);
--> statement-breakpoint
CREATE TABLE "amenities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(120) NOT NULL,
	"slug" varchar(120) NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "amenities_slug_unique" UNIQUE("slug"),
	CONSTRAINT "amenities_name_nonempty" CHECK (length(trim("amenities"."name")) >= 2)
);
--> statement-breakpoint
CREATE TABLE "branch_accessibility" (
	"branch_id" uuid NOT NULL,
	"feature_id" uuid NOT NULL,
	"description" text,
	CONSTRAINT "branch_accessibility_branch_id_feature_id_pk" PRIMARY KEY("branch_id","feature_id")
);
--> statement-breakpoint
CREATE TABLE "branch_amenities" (
	"branch_id" uuid NOT NULL,
	"amenity_id" uuid NOT NULL,
	"availability" "amenity_availability" DEFAULT 'included' NOT NULL,
	"description" text,
	CONSTRAINT "branch_amenities_branch_id_amenity_id_pk" PRIMARY KEY("branch_id","amenity_id")
);
--> statement-breakpoint
CREATE TABLE "branch_coaches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"branch_id" uuid NOT NULL,
	"coach_id" uuid NOT NULL,
	"sport_id" uuid,
	"status" text DEFAULT 'pending' NOT NULL,
	"starts_on" date,
	"ends_on" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "branch_coach_unique" UNIQUE("branch_id","coach_id"),
	CONSTRAINT "coach_affiliation_status" CHECK ("branch_coaches"."status" in ('pending', 'active', 'ended')),
	CONSTRAINT "coach_affiliation_dates" CHECK ("branch_coaches"."ends_on" is null or "branch_coaches"."starts_on" is null or "branch_coaches"."ends_on" >= "branch_coaches"."starts_on")
);
--> statement-breakpoint
CREATE TABLE "branch_equipments" (
	"branch_id" uuid NOT NULL,
	"equipment_id" uuid NOT NULL,
	"quantity" integer,
	"description" text,
	CONSTRAINT "branch_equipments_branch_id_equipment_id_pk" PRIMARY KEY("branch_id","equipment_id"),
	CONSTRAINT "equipment_quantity_positive" CHECK ("branch_equipments"."quantity" is null or "branch_equipments"."quantity" > 0)
);
--> statement-breakpoint
CREATE TABLE "branch_profiles" (
	"branch_id" uuid PRIMARY KEY NOT NULL,
	"club_id" uuid NOT NULL,
	"is_main" boolean DEFAULT false NOT NULL,
	"operating_status" "club_operating_state" DEFAULT 'active' NOT NULL,
	"address" text,
	"latitude" double precision,
	"longitude" double precision,
	"country_id" uuid,
	"province_id" uuid,
	"city_id" uuid,
	"district_id" uuid,
	"neighborhood" varchar(120),
	"city_zone" "city_zone",
	"visit_instructions" text,
	"rules" text,
	"audience_policies" jsonb,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "branch_profile_club_id" UNIQUE("club_id","branch_id"),
	CONSTRAINT "branch_coordinate_pair" CHECK (("branch_profiles"."latitude" is null and "branch_profiles"."longitude" is null) or ("branch_profiles"."latitude" is not null and "branch_profiles"."longitude" is not null and "branch_profiles"."latitude" between -90 and 90 and "branch_profiles"."longitude" between -180 and 180)),
	CONSTRAINT "branch_geography_chain" CHECK (("branch_profiles"."province_id" is null or "branch_profiles"."country_id" is not null) and ("branch_profiles"."city_id" is null or "branch_profiles"."province_id" is not null) and ("branch_profiles"."district_id" is null or "branch_profiles"."city_id" is not null))
);
--> statement-breakpoint
CREATE TABLE "branch_sports" (
	"branch_id" uuid NOT NULL,
	"sport_id" uuid NOT NULL,
	CONSTRAINT "branch_sports_branch_id_sport_id_pk" PRIMARY KEY("branch_id","sport_id")
);
--> statement-breakpoint
CREATE TABLE "cities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"province_id" uuid NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "city_province_id" UNIQUE("province_id","id"),
	CONSTRAINT "city_province_name" UNIQUE("province_id","name")
);
--> statement-breakpoint
CREATE TABLE "club_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(120) NOT NULL,
	"slug" varchar(120) NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "club_categories_slug_unique" UNIQUE("slug"),
	CONSTRAINT "club_categories_name_nonempty" CHECK (length(trim("club_categories"."name")) >= 2)
);
--> statement-breakpoint
CREATE TABLE "club_category_links" (
	"club_id" uuid NOT NULL,
	"category_id" uuid NOT NULL,
	CONSTRAINT "club_category_links_club_id_category_id_pk" PRIMARY KEY("club_id","category_id")
);
--> statement-breakpoint
CREATE TABLE "club_gallery" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"club_id" uuid NOT NULL,
	"branch_id" uuid,
	"media_id" uuid NOT NULL,
	"caption" varchar(300),
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "club_media" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"uploaded_by" uuid NOT NULL,
	"type" "club_media_type" NOT NULL,
	"url" text NOT NULL,
	"thumbnail_url" text,
	"alt" text,
	"width" integer,
	"height" integer,
	"duration_seconds" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "media_org_id" UNIQUE("organization_id","id"),
	CONSTRAINT "media_dimensions_positive" CHECK (("club_media"."width" is null or "club_media"."width" > 0) and ("club_media"."height" is null or "club_media"."height" > 0) and ("club_media"."duration_seconds" is null or "club_media"."duration_seconds" > 0))
);
--> statement-breakpoint
CREATE TABLE "club_phones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"club_id" uuid NOT NULL,
	"branch_id" uuid,
	"number" varchar(20) NOT NULL,
	"label" varchar(80),
	"extension" varchar(10),
	"is_primary" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "club_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"branch_id" uuid NOT NULL,
	"author_id" uuid NOT NULL,
	"rating" integer NOT NULL,
	"body" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"moderation_reason" text,
	"reply" text,
	"replied_by" uuid,
	"replied_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "review_branch_author" UNIQUE("branch_id","author_id"),
	CONSTRAINT "review_rating_bounds" CHECK ("club_reviews"."rating" between 1 and 5),
	CONSTRAINT "review_status_allowed" CHECK ("club_reviews"."status" in ('pending', 'published', 'rejected'))
);
--> statement-breakpoint
CREATE TABLE "club_socials" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"club_id" uuid NOT NULL,
	"platform" varchar(30) NOT NULL,
	"link" text NOT NULL,
	"label" varchar(80),
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "club_sport_links" (
	"club_id" uuid NOT NULL,
	"sport_id" uuid NOT NULL,
	CONSTRAINT "club_sport_links_club_id_sport_id_pk" PRIMARY KEY("club_id","sport_id")
);
--> statement-breakpoint
CREATE TABLE "club_tag_links" (
	"club_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	CONSTRAINT "club_tag_links_club_id_tag_id_pk" PRIMARY KEY("club_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "clubs" (
	"id" uuid PRIMARY KEY NOT NULL,
	"owner_id" uuid NOT NULL,
	"owner_role" text DEFAULT 'owner' NOT NULL,
	"logo_id" uuid,
	"cover_id" uuid,
	"description" text,
	"short_description" varchar(280),
	"publication_status" "club_publication_state" DEFAULT 'draft' NOT NULL,
	"operating_status" "club_operating_state" DEFAULT 'active' NOT NULL,
	"last_verified_at" timestamp with time zone,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "club_owner_role_fixed" CHECK ("clubs"."owner_role" = 'owner')
);
--> statement-breakpoint
CREATE TABLE "coach_profiles" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"biography" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "countries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"code" varchar(2) NOT NULL,
	CONSTRAINT "countries_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "districts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"city_id" uuid NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "district_city_id" UNIQUE("city_id","id"),
	CONSTRAINT "district_city_name" UNIQUE("city_id","name")
);
--> statement-breakpoint
CREATE TABLE "equipments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(120) NOT NULL,
	"slug" varchar(120) NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "equipments_slug_unique" UNIQUE("slug"),
	CONSTRAINT "equipments_name_nonempty" CHECK (length(trim("equipments"."name")) >= 2)
);
--> statement-breakpoint
CREATE TABLE "branch_exception_intervals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"exception_id" uuid NOT NULL,
	"start_minute" integer NOT NULL,
	"end_minute" integer NOT NULL,
	CONSTRAINT "exception_hour_bounds" CHECK ("branch_exception_intervals"."start_minute" between 0 and 1439 and "branch_exception_intervals"."end_minute" > "branch_exception_intervals"."start_minute" and "branch_exception_intervals"."end_minute" <= "branch_exception_intervals"."start_minute" + 1440)
);
--> statement-breakpoint
CREATE TABLE "branch_opening_exceptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"branch_id" uuid NOT NULL,
	"date" date NOT NULL,
	"audience" "club_audience" DEFAULT 'all' NOT NULL,
	"is_closed" boolean NOT NULL,
	"reason" varchar(300),
	CONSTRAINT "exception_branch_date_audience" UNIQUE("branch_id","date","audience")
);
--> statement-breakpoint
CREATE TABLE "provinces" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"country_id" uuid NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "province_country_id" UNIQUE("country_id","id"),
	CONSTRAINT "province_country_name" UNIQUE("country_id","name")
);
--> statement-breakpoint
CREATE TABLE "club_spaces" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"branch_id" uuid NOT NULL,
	"name" varchar(120) NOT NULL,
	"description" text,
	"capacity" integer,
	"operating_status" "club_operating_state" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "space_capacity_positive" CHECK ("club_spaces"."capacity" is null or "club_spaces"."capacity" > 0)
);
--> statement-breakpoint
CREATE TABLE "sports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(120) NOT NULL,
	"slug" varchar(120) NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sports_slug_unique" UNIQUE("slug"),
	CONSTRAINT "sports_name_nonempty" CHECK (length(trim("sports"."name")) >= 2)
);
--> statement-breakpoint
CREATE TABLE "club_tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(120) NOT NULL,
	"slug" varchar(120) NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "club_tags_slug_unique" UNIQUE("slug"),
	CONSTRAINT "club_tags_name_nonempty" CHECK (length(trim("club_tags"."name")) >= 2)
);
--> statement-breakpoint
CREATE TABLE "branch_weekly_hours" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"branch_id" uuid NOT NULL,
	"day_of_week" integer NOT NULL,
	"audience" "club_audience" DEFAULT 'all' NOT NULL,
	"start_minute" integer NOT NULL,
	"end_minute" integer NOT NULL,
	CONSTRAINT "weekly_hour_bounds" CHECK ("branch_weekly_hours"."day_of_week" between 0 and 6 and "branch_weekly_hours"."start_minute" between 0 and 1439 and "branch_weekly_hours"."end_minute" > "branch_weekly_hours"."start_minute" and "branch_weekly_hours"."end_minute" <= "branch_weekly_hours"."start_minute" + 1440)
);
--> statement-breakpoint
ALTER TABLE "branch_accessibility" ADD CONSTRAINT "branch_accessibility_branch_id_branch_profiles_branch_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branch_profiles"("branch_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branch_accessibility" ADD CONSTRAINT "branch_accessibility_feature_id_accessibility_features_id_fk" FOREIGN KEY ("feature_id") REFERENCES "public"."accessibility_features"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branch_amenities" ADD CONSTRAINT "branch_amenities_branch_id_branch_profiles_branch_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branch_profiles"("branch_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branch_amenities" ADD CONSTRAINT "branch_amenities_amenity_id_amenities_id_fk" FOREIGN KEY ("amenity_id") REFERENCES "public"."amenities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branch_coaches" ADD CONSTRAINT "branch_coaches_branch_id_branch_profiles_branch_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branch_profiles"("branch_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branch_coaches" ADD CONSTRAINT "branch_coaches_coach_id_coach_profiles_user_id_fk" FOREIGN KEY ("coach_id") REFERENCES "public"."coach_profiles"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branch_coaches" ADD CONSTRAINT "branch_coaches_sport_id_sports_id_fk" FOREIGN KEY ("sport_id") REFERENCES "public"."sports"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branch_equipments" ADD CONSTRAINT "branch_equipments_branch_id_branch_profiles_branch_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branch_profiles"("branch_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branch_equipments" ADD CONSTRAINT "branch_equipments_equipment_id_equipments_id_fk" FOREIGN KEY ("equipment_id") REFERENCES "public"."equipments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branch_profiles" ADD CONSTRAINT "branch_profiles_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branch_profiles" ADD CONSTRAINT "branch_profiles_club_id_clubs_id_fk" FOREIGN KEY ("club_id") REFERENCES "public"."clubs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branch_profiles" ADD CONSTRAINT "branch_profiles_country_id_countries_id_fk" FOREIGN KEY ("country_id") REFERENCES "public"."countries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branch_profiles" ADD CONSTRAINT "branch_profile_tenant_fk" FOREIGN KEY ("club_id","branch_id") REFERENCES "public"."branches"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branch_profiles" ADD CONSTRAINT "branch_province_country_fk" FOREIGN KEY ("country_id","province_id") REFERENCES "public"."provinces"("country_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branch_profiles" ADD CONSTRAINT "branch_city_province_fk" FOREIGN KEY ("province_id","city_id") REFERENCES "public"."cities"("province_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branch_profiles" ADD CONSTRAINT "branch_district_city_fk" FOREIGN KEY ("city_id","district_id") REFERENCES "public"."districts"("city_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branch_sports" ADD CONSTRAINT "branch_sports_branch_id_branch_profiles_branch_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branch_profiles"("branch_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branch_sports" ADD CONSTRAINT "branch_sports_sport_id_sports_id_fk" FOREIGN KEY ("sport_id") REFERENCES "public"."sports"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cities" ADD CONSTRAINT "cities_province_id_provinces_id_fk" FOREIGN KEY ("province_id") REFERENCES "public"."provinces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "club_category_links" ADD CONSTRAINT "club_category_links_club_id_clubs_id_fk" FOREIGN KEY ("club_id") REFERENCES "public"."clubs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "club_category_links" ADD CONSTRAINT "club_category_links_category_id_club_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."club_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "club_gallery" ADD CONSTRAINT "club_gallery_club_id_clubs_id_fk" FOREIGN KEY ("club_id") REFERENCES "public"."clubs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "club_gallery" ADD CONSTRAINT "gallery_media_tenant_fk" FOREIGN KEY ("club_id","media_id") REFERENCES "public"."club_media"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "club_gallery" ADD CONSTRAINT "gallery_branch_tenant_fk" FOREIGN KEY ("club_id","branch_id") REFERENCES "public"."branch_profiles"("club_id","branch_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "club_media" ADD CONSTRAINT "club_media_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "club_media" ADD CONSTRAINT "club_media_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "club_phones" ADD CONSTRAINT "club_phones_club_id_clubs_id_fk" FOREIGN KEY ("club_id") REFERENCES "public"."clubs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "club_phones" ADD CONSTRAINT "phone_branch_tenant_fk" FOREIGN KEY ("club_id","branch_id") REFERENCES "public"."branch_profiles"("club_id","branch_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "club_reviews" ADD CONSTRAINT "club_reviews_branch_id_branch_profiles_branch_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branch_profiles"("branch_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "club_reviews" ADD CONSTRAINT "club_reviews_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "club_reviews" ADD CONSTRAINT "club_reviews_replied_by_users_id_fk" FOREIGN KEY ("replied_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "club_socials" ADD CONSTRAINT "club_socials_club_id_clubs_id_fk" FOREIGN KEY ("club_id") REFERENCES "public"."clubs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "club_sport_links" ADD CONSTRAINT "club_sport_links_club_id_clubs_id_fk" FOREIGN KEY ("club_id") REFERENCES "public"."clubs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "club_sport_links" ADD CONSTRAINT "club_sport_links_sport_id_sports_id_fk" FOREIGN KEY ("sport_id") REFERENCES "public"."sports"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "club_tag_links" ADD CONSTRAINT "club_tag_links_club_id_clubs_id_fk" FOREIGN KEY ("club_id") REFERENCES "public"."clubs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "club_tag_links" ADD CONSTRAINT "club_tag_links_tag_id_club_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."club_tags"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clubs" ADD CONSTRAINT "clubs_id_organizations_id_fk" FOREIGN KEY ("id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clubs" ADD CONSTRAINT "clubs_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clubs" ADD CONSTRAINT "club_owner_membership_fk" FOREIGN KEY ("id","owner_id","owner_role") REFERENCES "public"."organization_members"("organization_id","user_id","role") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clubs" ADD CONSTRAINT "club_logo_tenant_fk" FOREIGN KEY ("id","logo_id") REFERENCES "public"."club_media"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clubs" ADD CONSTRAINT "club_cover_tenant_fk" FOREIGN KEY ("id","cover_id") REFERENCES "public"."club_media"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coach_profiles" ADD CONSTRAINT "coach_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "districts" ADD CONSTRAINT "districts_city_id_cities_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."cities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branch_exception_intervals" ADD CONSTRAINT "branch_exception_intervals_exception_id_branch_opening_exceptions_id_fk" FOREIGN KEY ("exception_id") REFERENCES "public"."branch_opening_exceptions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branch_opening_exceptions" ADD CONSTRAINT "branch_opening_exceptions_branch_id_branch_profiles_branch_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branch_profiles"("branch_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provinces" ADD CONSTRAINT "provinces_country_id_countries_id_fk" FOREIGN KEY ("country_id") REFERENCES "public"."countries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "club_spaces" ADD CONSTRAINT "club_spaces_branch_id_branch_profiles_branch_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branch_profiles"("branch_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branch_weekly_hours" ADD CONSTRAINT "branch_weekly_hours_branch_id_branch_profiles_branch_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branch_profiles"("branch_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "branch_main_per_club" ON "branch_profiles" USING btree ("club_id") WHERE "branch_profiles"."is_main" = true;--> statement-breakpoint
CREATE INDEX "branch_location_city_idx" ON "branch_profiles" USING btree ("city_id");--> statement-breakpoint
CREATE UNIQUE INDEX "gallery_club_media_unique" ON "club_gallery" USING btree ("club_id","media_id") WHERE "club_gallery"."branch_id" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "gallery_branch_media_unique" ON "club_gallery" USING btree ("branch_id","media_id") WHERE "club_gallery"."branch_id" is not null;--> statement-breakpoint
CREATE INDEX "review_branch_status_idx" ON "club_reviews" USING btree ("branch_id","status");--> statement-breakpoint
CREATE INDEX "clubs_publication_idx" ON "clubs" USING btree ("publication_status");--> statement-breakpoint
CREATE INDEX "weekly_branch_idx" ON "branch_weekly_hours" USING btree ("branch_id");--> statement-breakpoint
CREATE UNIQUE INDEX "members_single_owner" ON "organization_members" USING btree ("organization_id") WHERE "organization_members"."role" = 'owner';
--> statement-breakpoint
-- Preserve existing workforce tenants without inventing owners for orphan legacy records.
INSERT INTO clubs (id, owner_id)
SELECT organization_id, user_id FROM organization_members WHERE role = 'owner'
ON CONFLICT (id) DO NOTHING;
--> statement-breakpoint
INSERT INTO branches (organization_id, name, slug)
SELECT c.id, o.name, 'main' FROM clubs c JOIN organizations o ON o.id = c.id
WHERE NOT EXISTS (SELECT 1 FROM branches b WHERE b.organization_id = c.id);
--> statement-breakpoint
INSERT INTO branch_profiles (branch_id, club_id, is_main)
SELECT id, organization_id, rank = 1 FROM (
  SELECT b.id, b.organization_id, row_number() OVER (PARTITION BY b.organization_id ORDER BY b.created_at, b.id) AS rank
  FROM branches b JOIN clubs c ON c.id = b.organization_id
) AS existing_branches;
