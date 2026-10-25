ALTER TABLE training_exercises ADD COLUMN video_url text,
 ADD COLUMN video_source text,
 ADD COLUMN video_revision integer NOT NULL DEFAULT 1;
ALTER TABLE training_exercises ADD CONSTRAINT training_video_source_pair CHECK ((video_url IS NULL)=(video_source IS NULL));
