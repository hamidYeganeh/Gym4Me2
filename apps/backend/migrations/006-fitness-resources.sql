-- Extend the resource catalogs without changing existing titles, IDs, or activation states.
INSERT INTO club_resources (kind, code, title) VALUES
  ('club_types', 'strength-gym', 'باشگاه تمرین قدرتی'),
  ('club_types', 'functional-fitness', 'باشگاه تمرین عملکردی'),
  ('club_types', 'martial-arts', 'باشگاه هنرهای رزمی'),
  ('club_types', 'pilates-studio', 'استودیو پیلاتس'),
  ('club_types', 'yoga-studio', 'استودیو یوگا'),
  ('club_types', 'cycling-studio', 'استودیو دوچرخه ثابت'),
  ('club_types', 'dance-studio', 'استودیو رقص و آمادگی جسمانی'),
  ('club_types', 'climbing-gym', 'سالن سنگ‌نوردی'),
  ('club_types', 'athletics-center', 'مجموعه دوومیدانی'),
  ('club_types', 'racket-center', 'مجموعه ورزش‌های راکتی'),
  ('club_types', 'boxing-gym', 'باشگاه بوکس'),
  ('club_types', 'weightlifting-club', 'باشگاه وزنه‌برداری'),
  ('club_types', 'gymnastics-center', 'سالن ژیمناستیک'),
  ('club_types', 'outdoor-training', 'مجموعه تمرین فضای باز'),
  ('coach_types', 'personal-trainer', 'مربی خصوصی'),
  ('coach_types', 'strength-conditioning', 'مربی قدرت و آماده‌سازی'),
  ('coach_types', 'group-fitness', 'مربی تمرین گروهی'),
  ('coach_types', 'bodybuilding', 'مربی بدنسازی'),
  ('coach_types', 'weightlifting', 'مربی وزنه‌برداری'),
  ('coach_types', 'powerlifting', 'مربی پاورلیفتینگ'),
  ('coach_types', 'functional-training', 'مربی تمرین عملکردی'),
  ('coach_types', 'pilates', 'مربی پیلاتس'),
  ('coach_types', 'yoga', 'مربی یوگا'),
  ('coach_types', 'swimming', 'مربی شنا'),
  ('coach_types', 'martial-arts', 'مربی هنرهای رزمی'),
  ('coach_types', 'boxing', 'مربی بوکس'),
  ('coach_types', 'running', 'مربی دویدن'),
  ('coach_types', 'cycling', 'مربی دوچرخه‌سواری'),
  ('coach_types', 'gymnastics', 'مربی ژیمناستیک'),
  ('coach_types', 'climbing', 'مربی سنگ‌نوردی'),
  ('coach_types', 'tennis', 'مربی تنیس'),
  ('coach_types', 'mobility', 'مربی تحرک و انعطاف'),
  ('gallery_media_types', 'facility-tour', 'معرفی فضای باشگاه'),
  ('gallery_media_types', 'equipment-showcase', 'معرفی تجهیزات'),
  ('gallery_media_types', 'class-demo', 'نمونه کلاس'),
  ('gallery_media_types', 'coach-introduction', 'معرفی مربی'),
  ('gallery_media_types', 'accessibility', 'دسترسی و ورودی باشگاه'),
  ('gallery_media_types', 'changing-rooms', 'رختکن و امکانات رفاهی'),
  ('sport_categories', 'strength', 'ورزش‌های قدرتی'),
  ('sport_categories', 'conditioning', 'هوازی و آمادگی جسمانی'),
  ('sport_categories', 'mind-body', 'ذهن و بدن'),
  ('sport_categories', 'combat', 'ورزش‌های رزمی'),
  ('sport_categories', 'aquatics', 'ورزش‌های آبی'),
  ('sport_categories', 'team', 'ورزش‌های تیمی'),
  ('sport_categories', 'racket', 'ورزش‌های راکتی'),
  ('sport_categories', 'outdoor', 'ورزش‌های فضای باز'),
  ('sport_categories', 'movement', 'ژیمناستیک و حرکت'),
  ('equipment', 'barbell', 'هالتر'),
  ('equipment', 'plates', 'صفحه وزنه'),
  ('equipment', 'dumbbell', 'دمبل'),
  ('equipment', 'kettlebell', 'کتل‌بل'),
  ('equipment', 'power-rack', 'رک قدرتی'),
  ('equipment', 'squat-rack', 'رک اسکوات'),
  ('equipment', 'adjustable-bench', 'میز چندحالته'),
  ('equipment', 'flat-bench', 'میز تخت'),
  ('equipment', 'weightlifting-platform', 'سکوی وزنه‌برداری'),
  ('equipment', 'smith-machine', 'دستگاه اسمیت'),
  ('equipment', 'cable-machine', 'دستگاه سیم‌کش'),
  ('equipment', 'lat-pulldown', 'دستگاه لت'),
  ('equipment', 'leg-press', 'دستگاه پرس پا'),
  ('equipment', 'leg-extension', 'دستگاه جلوپا'),
  ('equipment', 'leg-curl', 'دستگاه پشت پا'),
  ('equipment', 'chest-press', 'دستگاه پرس سینه'),
  ('equipment', 'pull-up-bar', 'میله بارفیکس'),
  ('equipment', 'dip-station', 'پایه دیپ'),
  ('equipment', 'resistance-band', 'کش مقاومتی'),
  ('equipment', 'suspension-trainer', 'بند تمرین معلق'),
  ('equipment', 'treadmill', 'تردمیل'),
  ('equipment', 'elliptical', 'الپتیکال'),
  ('equipment', 'stationary-bike', 'دوچرخه ثابت'),
  ('equipment', 'air-bike', 'دوچرخه بادی'),
  ('equipment', 'rowing-machine', 'دستگاه پارویی'),
  ('equipment', 'stair-climber', 'دستگاه پله'),
  ('equipment', 'ski-erg', 'دستگاه اسکی ارگ'),
  ('equipment', 'medicine-ball', 'توپ پزشکی'),
  ('equipment', 'slam-ball', 'توپ ضربه‌ای'),
  ('equipment', 'plyo-box', 'جعبه پرش'),
  ('equipment', 'battle-rope', 'طناب تمرینی'),
  ('equipment', 'sled', 'سورتمه تمرینی'),
  ('equipment', 'jump-rope', 'طناب ورزشی'),
  ('equipment', 'exercise-mat', 'زیرانداز تمرین'),
  ('equipment', 'foam-roller', 'فوم رولر'),
  ('equipment', 'stability-ball', 'توپ تعادلی'),
  ('equipment', 'pilates-reformer', 'ریفورمر پیلاتس'),
  ('equipment', 'pilates-cadillac', 'کادیلاک پیلاتس'),
  ('equipment', 'pilates-ring', 'حلقه پیلاتس'),
  ('equipment', 'yoga-block', 'آجر یوگا'),
  ('equipment', 'yoga-strap', 'بند یوگا'),
  ('equipment', 'boxing-bag', 'کیسه بوکس'),
  ('equipment', 'gymnastic-rings', 'حلقه ژیمناستیک'),
  ('equipment', 'climbing-wall', 'دیواره سنگ‌نوردی'),
  ('amenities', 'locker-room', 'رختکن'),
  ('amenities', 'lockers', 'کمد شخصی'),
  ('amenities', 'showers', 'دوش'),
  ('amenities', 'parking', 'پارکینگ'),
  ('amenities', 'bicycle-parking', 'جای پارک دوچرخه'),
  ('amenities', 'wheelchair-access', 'ورودی مناسب ویلچر'),
  ('amenities', 'accessible-restroom', 'سرویس بهداشتی قابل‌دسترس'),
  ('amenities', 'drinking-water', 'آب آشامیدنی'),
  ('amenities', 'air-conditioning', 'تهویه مطبوع'),
  ('amenities', 'wifi', 'اینترنت بی‌سیم'),
  ('amenities', 'sauna', 'سونا'),
  ('amenities', 'steam-room', 'اتاق بخار'),
  ('amenities', 'swimming-pool', 'استخر'),
  ('amenities', 'recovery-zone', 'فضای ریکاوری'),
  ('amenities', 'stretching-area', 'فضای حرکات کششی'),
  ('amenities', 'group-class-room', 'سالن تمرین گروهی'),
  ('amenities', 'outdoor-area', 'فضای تمرین روباز'),
  ('amenities', 'first-aid', 'کمک‌های اولیه'),
  ('amenities', 'towel-service', 'سرویس حوله'),
  ('amenities', 'cafe', 'کافه'),
  ('amenities', 'prayer-room', 'نمازخانه'),
  ('amenities', 'restroom', 'سرویس بهداشتی')
ON CONFLICT DO NOTHING;

INSERT INTO club_resources (kind, parent_id, code, title)
SELECT 'sports', parent.id, seed.code, seed.title
FROM (VALUES
  ('strength', 'bodybuilding', 'بدنسازی'),
  ('strength', 'powerlifting', 'پاورلیفتینگ'),
  ('strength', 'weightlifting', 'وزنه‌برداری'),
  ('strength', 'strongman', 'قوی‌ترین مردان'),
  ('strength', 'calisthenics', 'کالیستنیکس'),
  ('conditioning', 'functional-training', 'تمرین عملکردی'),
  ('conditioning', 'hiit', 'تمرین تناوبی پرفشار'),
  ('conditioning', 'indoor-cycling', 'دوچرخه ثابت'),
  ('conditioning', 'rowing', 'پاروزنی'),
  ('conditioning', 'running', 'دویدن'),
  ('conditioning', 'aerobics', 'ایروبیک'),
  ('conditioning', 'jump-rope', 'طناب‌زنی'),
  ('mind-body', 'yoga', 'یوگا'),
  ('mind-body', 'pilates', 'پیلاتس'),
  ('mind-body', 'mobility', 'تمرین تحرک'),
  ('mind-body', 'barre', 'باره'),
  ('mind-body', 'stretching', 'حرکات کششی'),
  ('mind-body', 'tai-chi', 'تای‌چی'),
  ('combat', 'boxing', 'بوکس'),
  ('combat', 'kickboxing', 'کیک‌بوکسینگ'),
  ('combat', 'muay-thai', 'موی‌تای'),
  ('combat', 'wrestling', 'کشتی'),
  ('combat', 'judo', 'جودو'),
  ('combat', 'karate', 'کاراته'),
  ('combat', 'taekwondo', 'تکواندو'),
  ('combat', 'jiu-jitsu', 'جوجیتسو'),
  ('combat', 'mma', 'هنرهای رزمی ترکیبی'),
  ('aquatics', 'swimming', 'شنا'),
  ('aquatics', 'aqua-fitness', 'آمادگی جسمانی در آب'),
  ('aquatics', 'water-polo', 'واترپلو'),
  ('aquatics', 'diving', 'شیرجه'),
  ('team', 'football', 'فوتبال'),
  ('team', 'futsal', 'فوتسال'),
  ('team', 'basketball', 'بسکتبال'),
  ('team', 'volleyball', 'والیبال'),
  ('team', 'handball', 'هندبال'),
  ('racket', 'tennis', 'تنیس'),
  ('racket', 'padel', 'پدل'),
  ('racket', 'badminton', 'بدمینتون'),
  ('racket', 'squash', 'اسکواش'),
  ('racket', 'table-tennis', 'تنیس روی میز'),
  ('outdoor', 'climbing', 'سنگ‌نوردی'),
  ('outdoor', 'hiking', 'کوه‌پیمایی'),
  ('outdoor', 'cycling', 'دوچرخه‌سواری'),
  ('outdoor', 'athletics', 'دوومیدانی'),
  ('movement', 'gymnastics', 'ژیمناستیک'),
  ('movement', 'dance-fitness', 'تمرین هوازی با رقص'),
  ('movement', 'parkour', 'پارکور')
) AS seed(parent_code, code, title)
JOIN club_resources AS parent ON parent.code = seed.parent_code AND parent.kind = 'sport_categories' AND parent.parent_id IS NULL
ON CONFLICT DO NOTHING;

INSERT INTO club_resources (kind, parent_id, code, title)
SELECT 'sub_sports', sport.id, seed.code, seed.title
FROM (VALUES
  ('strength', 'bodybuilding', 'classic-physique', 'فیزیک کلاسیک'),
  ('strength', 'bodybuilding', 'physique', 'فیزیک'),
  ('strength', 'bodybuilding', 'bodybuilding-open', 'بدنسازی آزاد'),
  ('strength', 'powerlifting', 'classic', 'پاورلیفتینگ کلاسیک'),
  ('strength', 'powerlifting', 'equipped', 'پاورلیفتینگ با تجهیزات'),
  ('strength', 'powerlifting', 'bench-only', 'پرس سینه'),
  ('strength', 'weightlifting', 'snatch', 'یک‌ضرب'),
  ('strength', 'weightlifting', 'clean-and-jerk', 'دوضرب'),
  ('conditioning', 'functional-training', 'circuit', 'تمرین ایستگاهی'),
  ('conditioning', 'functional-training', 'kettlebell', 'تمرین کتل‌بل'),
  ('conditioning', 'running', 'road-running', 'دو جاده'),
  ('conditioning', 'running', 'trail-running', 'دو مسیر طبیعی'),
  ('conditioning', 'running', 'sprint', 'دو سرعت'),
  ('mind-body', 'yoga', 'hatha', 'هاتا یوگا'),
  ('mind-body', 'yoga', 'vinyasa', 'وینیاسا یوگا'),
  ('mind-body', 'yoga', 'yin', 'یین یوگا'),
  ('mind-body', 'yoga', 'ashtanga', 'آشتانگا یوگا'),
  ('mind-body', 'pilates', 'mat', 'پیلاتس مت'),
  ('mind-body', 'pilates', 'reformer', 'پیلاتس ریفورمر'),
  ('combat', 'wrestling', 'freestyle', 'کشتی آزاد'),
  ('combat', 'wrestling', 'greco-roman', 'کشتی فرنگی'),
  ('aquatics', 'swimming', 'freestyle', 'شنای آزاد'),
  ('aquatics', 'swimming', 'backstroke', 'کرال پشت'),
  ('aquatics', 'swimming', 'breaststroke', 'قورباغه'),
  ('aquatics', 'swimming', 'butterfly', 'پروانه'),
  ('outdoor', 'climbing', 'bouldering', 'بولدرینگ'),
  ('outdoor', 'climbing', 'lead', 'سرطناب'),
  ('outdoor', 'climbing', 'speed', 'سنگ‌نوردی سرعت'),
  ('outdoor', 'cycling', 'road', 'دوچرخه‌سواری جاده'),
  ('outdoor', 'cycling', 'mountain', 'دوچرخه‌سواری کوهستان'),
  ('movement', 'gymnastics', 'artistic', 'ژیمناستیک هنری'),
  ('movement', 'gymnastics', 'rhythmic', 'ژیمناستیک ریتمیک'),
  ('movement', 'gymnastics', 'trampoline', 'ترامپولین')
) AS seed(category_code, sport_code, code, title)
JOIN club_resources AS category
  ON category.kind = 'sport_categories' AND category.code = seed.category_code
JOIN club_resources AS sport
  ON sport.kind = 'sports' AND sport.code = seed.sport_code AND sport.parent_id = category.id
ON CONFLICT DO NOTHING;

INSERT INTO club_resources (kind, parent_id, code, title)
SELECT 'provinces', parent.id, seed.code, seed.title
FROM (VALUES
  ('ir', 'tehran', 'تهران'),
  ('ir', 'alborz', 'البرز'),
  ('ir', 'isfahan', 'اصفهان'),
  ('ir', 'fars', 'فارس'),
  ('ir', 'razavi-khorasan', 'خراسان رضوی'),
  ('ir', 'east-azerbaijan', 'آذربایجان شرقی'),
  ('ir', 'gilan', 'گیلان'),
  ('ir', 'mazandaran', 'مازندران'),
  ('ir', 'khuzestan', 'خوزستان'),
  ('ir', 'qom', 'قم')
) AS seed(parent_code, code, title)
JOIN club_resources AS parent ON parent.code = seed.parent_code AND parent.kind = 'countries' AND parent.parent_id IS NULL
ON CONFLICT DO NOTHING;

INSERT INTO club_resources (kind, parent_id, code, title)
SELECT 'cities', parent.id, seed.code, seed.title
FROM (VALUES
  ('tehran', 'tehran', 'تهران'),
  ('tehran', 'rey', 'ری'),
  ('tehran', 'shahriar', 'شهریار'),
  ('alborz', 'karaj', 'کرج'),
  ('isfahan', 'isfahan', 'اصفهان'),
  ('fars', 'shiraz', 'شیراز'),
  ('razavi-khorasan', 'mashhad', 'مشهد'),
  ('east-azerbaijan', 'tabriz', 'تبریز'),
  ('gilan', 'rasht', 'رشت'),
  ('mazandaran', 'sari', 'ساری'),
  ('khuzestan', 'ahvaz', 'اهواز'),
  ('qom', 'qom', 'قم')
) AS seed(parent_code, code, title)
JOIN club_resources AS parent ON parent.code = seed.parent_code AND parent.kind = 'provinces'
  AND parent.parent_id IN (SELECT id FROM club_resources WHERE kind = 'countries' AND code = 'ir')
ON CONFLICT DO NOTHING;

INSERT INTO club_resources (kind, parent_id, code, title)
SELECT 'districts', city.id, 'district-' || district.number, 'منطقه ' ||
  translate(district.number::text, '0123456789', '۰۱۲۳۴۵۶۷۸۹')
FROM club_resources AS city
JOIN club_resources AS province ON province.id = city.parent_id
JOIN club_resources AS country ON country.id = province.parent_id
CROSS JOIN generate_series(1, 22) AS district(number)
WHERE city.kind = 'cities' AND city.code = 'tehran'
  AND province.kind = 'provinces' AND province.code = 'tehran'
  AND country.kind = 'countries' AND country.code = 'ir'
ON CONFLICT DO NOTHING;

INSERT INTO club_resources (kind, parent_id, code, title)
SELECT 'neighborhoods', district.id, seed.code, seed.title
FROM (VALUES
  ('tajrish', 'تجریش'),
  ('niavaran', 'نیاوران'),
  ('zaferanieh', 'زعفرانیه')
) AS seed(code, title)
JOIN club_resources AS district ON district.kind = 'districts' AND district.code = 'district-1'
JOIN club_resources AS city ON city.id = district.parent_id
JOIN club_resources AS province ON province.id = city.parent_id
JOIN club_resources AS country ON country.id = province.parent_id
WHERE city.kind = 'cities' AND city.code = 'tehran'
  AND province.kind = 'provinces' AND province.code = 'tehran'
  AND country.kind = 'countries' AND country.code = 'ir'
ON CONFLICT DO NOTHING;
