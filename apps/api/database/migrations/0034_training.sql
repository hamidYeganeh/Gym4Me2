CREATE TABLE training_exercises (
  id text PRIMARY KEY, name_fa text NOT NULL, name_en text NOT NULL,
  equipment text NOT NULL, tags text[] NOT NULL DEFAULT '{}',
  instruction_fa text NOT NULL, instruction_en text NOT NULL,
  alternatives text[] NOT NULL DEFAULT '{}', illustration text NOT NULL,
  source text NOT NULL DEFAULT 'Gym4Me original demo content', archived boolean NOT NULL DEFAULT false
);
CREATE TABLE training_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), owner_id uuid REFERENCES users(id) ON DELETE SET NULL,
  athlete_id uuid REFERENCES users(id) ON DELETE CASCADE,
  relationship_id uuid REFERENCES coaching_relationships(id) ON DELETE SET NULL,
  title text NOT NULL, draft jsonb NOT NULL, revision integer NOT NULL DEFAULT 1,
  archived boolean NOT NULL DEFAULT false, is_template boolean NOT NULL DEFAULT false, review_due_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX training_plans_owner ON training_plans(owner_id, updated_at DESC);
CREATE TABLE training_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), plan_id uuid NOT NULL REFERENCES training_plans(id) ON DELETE CASCADE,
  version integer NOT NULL, content jsonb NOT NULL, effective_from date NOT NULL,
  published_at timestamptz NOT NULL DEFAULT now(), UNIQUE(plan_id,version)
);
CREATE FUNCTION training_immutable_version() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Published training versions are immutable'; END $$;
CREATE TRIGGER training_version_immutable BEFORE UPDATE ON training_versions FOR EACH ROW EXECUTE FUNCTION training_immutable_version();
CREATE TABLE training_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), version_id uuid NOT NULL REFERENCES training_versions(id) ON DELETE CASCADE,
  athlete_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  relationship_id uuid REFERENCES coaching_relationships(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(version_id,athlete_id)
);
CREATE INDEX training_assignments_athlete ON training_assignments(athlete_id,created_at DESC);
CREATE TABLE training_sessions (
  id uuid PRIMARY KEY, athlete_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assignment_id uuid REFERENCES training_assignments(id) ON DELETE SET NULL,
  relationship_id uuid REFERENCES coaching_relationships(id) ON DELETE SET NULL,
  snapshot jsonb NOT NULL, logs jsonb NOT NULL DEFAULT '[]', day_index integer NOT NULL CHECK(day_index>=0),
  state text NOT NULL CHECK(state IN('in_progress','completed','discarded')),
  revision integer NOT NULL DEFAULT 1, shared boolean NOT NULL DEFAULT false,
  started_at timestamptz NOT NULL, ended_at timestamptz,
  feedback text NOT NULL DEFAULT '', reviewed_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX training_one_active ON training_sessions(athlete_id) WHERE state='in_progress';
CREATE INDEX training_sessions_athlete ON training_sessions(athlete_id,started_at DESC);
CREATE TABLE training_receipts (
  actor_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE, operation_id uuid NOT NULL,
  request_hash text NOT NULL, result jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(actor_id,operation_id)
);
CREATE TABLE training_sharing (
  relationship_id uuid PRIMARY KEY REFERENCES coaching_relationships(id) ON DELETE CASCADE,
  personal_plans boolean NOT NULL DEFAULT false, measurements boolean NOT NULL DEFAULT false
);
CREATE TABLE training_measurements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), athlete_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK(kind IN('weight','waist','chest','hip')), value numeric(7,2) NOT NULL CHECK(value>0 AND value<=1000),
  unit text NOT NULL CHECK(unit IN('kg','cm')), measured_on date NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(athlete_id,kind,measured_on), CHECK((kind='weight' AND unit='kg') OR (kind<>'weight' AND unit='cm'))
);
CREATE TABLE training_checkins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), relationship_id uuid NOT NULL REFERENCES coaching_relationships(id) ON DELETE CASCADE,
  week_start date NOT NULL, adherence integer NOT NULL CHECK(adherence BETWEEN 0 AND 7), difficulty integer NOT NULL CHECK(difficulty BETWEEN 1 AND 10),
  body text NOT NULL, feedback text NOT NULL DEFAULT '', revision integer NOT NULL DEFAULT 1,
  updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(relationship_id,week_start)
);
CREATE TABLE training_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), relationship_id uuid NOT NULL REFERENCES coaching_relationships(id) ON DELETE CASCADE,
  sender_id uuid REFERENCES users(id) ON DELETE SET NULL, body text NOT NULL,
  workout_id uuid REFERENCES training_sessions(id) ON DELETE SET NULL,
  image_key text, image_type text, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX training_messages_relationship ON training_messages(relationship_id,created_at DESC,id);
CREATE TABLE training_reads (
  relationship_id uuid NOT NULL REFERENCES coaching_relationships(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE, read_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(relationship_id,user_id)
);
CREATE TABLE product_events (
  id uuid PRIMARY KEY, actor_id uuid REFERENCES users(id) ON DELETE CASCADE,
  name text NOT NULL, entity_id uuid, occurred_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX product_events_name ON product_events(name,occurred_at);
CREATE TABLE club_review_proofs (
  review_id uuid PRIMARY KEY REFERENCES club_reviews(id) ON DELETE CASCADE,
  reservation_id uuid NOT NULL REFERENCES sport_reservations(id) ON DELETE CASCADE
);
CREATE TABLE club_review_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), review_id uuid NOT NULL REFERENCES club_reviews(id) ON DELETE CASCADE,
  reporter_id uuid REFERENCES users(id) ON DELETE SET NULL, reason text NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK(status IN('open','resolved')),
  decision text, resolved_by uuid REFERENCES users(id) ON DELETE SET NULL,
  revision integer NOT NULL DEFAULT 1, created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz, UNIQUE(review_id,reporter_id)
);

INSERT INTO training_exercises(id,name_fa,name_en,equipment,tags,instruction_fa,instruction_en,alternatives,illustration) VALUES
('squat','اسکوات','Squat','bodyweight',ARRAY['legs']::text[],'پاها را به اندازهٔ راحت باز کن؛ زانوها هم‌راستای پنجه و حرکت آرام باشد.','Stand comfortably, keep knees aligned with toes, and move with control.',ARRAY['goblet-squat']::text[],'/images/exercises/squat.svg'),
('goblet-squat','اسکوات جام','Goblet squat','dumbbell',ARRAY['legs']::text[],'دمبل را نزدیک سینه نگه دار و اسکوات را با کنترل اجرا کن.','Keep the dumbbell close to your chest and squat with control.',ARRAY['squat']::text[],'/images/exercises/goblet-squat.svg'),
('push-up','شنا','Push-up','bodyweight',ARRAY['chest','arms']::text[],'بدن را هم‌راستا نگه دار و آرنج‌ها را با کنترل خم و باز کن.','Keep the body aligned and bend and extend the elbows with control.',ARRAY['chest-press']::text[],'/images/exercises/push-up.svg'),
('chest-press','پرس سینه دمبل','Dumbbell chest press','dumbbell',ARRAY['chest']::text[],'روی نیمکت پایدار، دمبل‌ها را با دامنهٔ راحت بالا ببر و آرام برگردان.','On a stable bench, press through a comfortable range and lower with control.',ARRAY['push-up']::text[],'/images/exercises/chest-press.svg'),
('row','پارویی دمبل','Dumbbell row','dumbbell',ARRAY['back']::text[],'تنه را ثابت نگه دار و دمبل را با کنترل به سمت پهلو بکش.','Keep the torso stable and pull the dumbbell toward your side.',ARRAY['band-row']::text[],'/images/exercises/row.svg'),
('band-row','پارویی کش','Band row','band',ARRAY['back']::text[],'کش را به تکیه‌گاه مناسب وصل کن و با تنهٔ ثابت به سمت خود بکش.','Secure the band appropriately and pull toward you with a stable torso.',ARRAY['row']::text[],'/images/exercises/band-row.svg'),
('lunge','لانج','Lunge','bodyweight',ARRAY['legs']::text[],'گام راحت بردار؛ با تعادل پایین برو و به حالت شروع برگرد.','Take a comfortable step, lower with balance, and return to the start.',ARRAY['squat']::text[],'/images/exercises/lunge.svg'),
('plank','پلانک','Plank','mat',ARRAY['core']::text[],'روی ساعد تکیه کن، بدن را هم‌راستا نگه دار و طبیعی نفس بکش.','Support on the forearms, keep the body aligned, and breathe normally.',ARRAY['dead-bug']::text[],'/images/exercises/plank.svg'),
('dead-bug','ددباگ','Dead bug','mat',ARRAY['core']::text[],'به پشت دراز بکش و دست و پای مخالف را آرام حرکت بده.','Lie on your back and move the opposite arm and leg slowly.',ARRAY['plank']::text[],'/images/exercises/dead-bug.svg'),
('shoulder-press','پرس سرشانه','Shoulder press','dumbbell',ARRAY['shoulders']::text[],'با تنهٔ ثابت، دمبل‌ها را در دامنهٔ راحت بالا ببر.','Keep the torso stable and press the dumbbells through a comfortable range.',ARRAY['lateral-raise']::text[],'/images/exercises/shoulder-press.svg'),
('lateral-raise','نشر جانب','Lateral raise','dumbbell',ARRAY['shoulders']::text[],'دمبل سبک را با کنترل از کنار بدن بالا ببر و آرام پایین بیاور.','Raise light dumbbells to the sides with control and lower slowly.',ARRAY['shoulder-press']::text[],'/images/exercises/lateral-raise.svg'),
('march','راه‌رفتن درجا','March in place','bodyweight',ARRAY['cardio']::text[],'با گام‌های راحت و ریتم یکنواخت درجا راه برو.','March in place with comfortable steps and a steady rhythm.',ARRAY[]::text[],'/images/exercises/march.svg');
CREATE UNIQUE INDEX product_events_domain_once ON product_events(name,entity_id) WHERE name IN('order_created','payment_verified','attendance_confirmed');
CREATE FUNCTION training_commerce_event() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE event_name text;
BEGIN
  IF TG_TABLE_NAME='sport_orders' THEN
    IF TG_OP='INSERT' THEN event_name:='order_created';
    ELSIF NEW.status='paid' AND OLD.status IS DISTINCT FROM NEW.status THEN event_name:='payment_verified'; END IF;
  ELSIF NEW.status='completed' AND (TG_OP='INSERT' OR OLD.status IS DISTINCT FROM NEW.status) THEN event_name:='attendance_confirmed'; END IF;
  IF event_name IS NOT NULL THEN INSERT INTO product_events(id,actor_id,name,entity_id) VALUES(gen_random_uuid(),NEW.user_id,event_name,NEW.id) ON CONFLICT DO NOTHING; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER product_order_event AFTER INSERT OR UPDATE OF status ON sport_orders FOR EACH ROW EXECUTE FUNCTION training_commerce_event();
CREATE TRIGGER product_attendance_event AFTER INSERT OR UPDATE OF status ON sport_reservations FOR EACH ROW EXECUTE FUNCTION training_commerce_event();
CREATE TABLE demo_delivery_modes (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE, channel text NOT NULL CHECK(channel IN('sms','push')),
  outcome text NOT NULL CHECK(outcome IN('success','failure','delay')), updated_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(user_id,channel)
);
CREATE TABLE demo_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  channel text NOT NULL, outcome text NOT NULL, state text NOT NULL CHECK(state IN('pending','delivered','failed')),
  due_at timestamptz NOT NULL DEFAULT now(), created_at timestamptz NOT NULL DEFAULT now()
);
