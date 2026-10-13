ALTER TABLE "club_media" ADD COLUMN "object_key" text;--> statement-breakpoint
ALTER TABLE "club_media" ADD COLUMN "content_type" text;--> statement-breakpoint
ALTER TABLE "club_media" ADD COLUMN "size_bytes" integer;--> statement-breakpoint
ALTER TABLE "club_media" ADD CONSTRAINT "club_media_object_key_unique" UNIQUE("object_key");