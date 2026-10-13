# عملیات محلی PH1

آخرین بررسی: ۲۰۲۶/۱۰/۱۳. این محیط staging محلی است؛ HTTPS محلی API آماده است؛ انتشار وب، اتصال گوشی، هشدارها و عملیات production هنوز پذیرش نشده‌اند.

## staging مستقل

از ریشهٔ مخزن، با Docker در حال اجرا:

```sh
node scripts/staging.mjs init
node scripts/staging.mjs up
node scripts/staging.mjs migrate
node scripts/staging.mjs verify
pnpm --filter api build
node scripts/staging.mjs start
```

`init` فقط بار اول اجرا شود؛ فایل موجود را بازنویسی نمی‌کند. فایل `.env.staging` با مجوز 0600 و رمزهای تصادفی ساخته و از Git خارج می‌شود. هیچ رمز واقعی در `.env.staging.example` قرار ندهید. توقف سرویس‌های Docker: `node scripts/staging.mjs stop`؛ API پیش‌زمینه جداگانه متوقف می‌شود.

PostgreSQL روی 127.0.0.1:55434، S3 روی 127.0.0.1:8334 و API روی 127.0.0.1:7188 هستند. داده‌ها و volumeها از محیط توسعه جدا هستند. migration با نقش migrator و API با runtime اجرا می‌شود؛ آزمون نقش اجازهٔ خواندن/نوشتن و منع DDL و خواندن تاریخچهٔ migration را بررسی می‌کند. readiness در `/api/v1/system/health/ready` هر دو وابستگی DB/S3 را بررسی می‌کند؛ آخرین پاسخ هر دو `up` بود.

originهای وب HTTPS در تنظیمات، مقصد مورد انتظار اپ‌ها هستند؛ proxy و گواهی محلی در بخش HTTPS توضیح داده شده‌اند. HTTP داخلی فقط روی loopback در دسترس است. worker نگهداری در staging فعلاً خاموش است. محدودسازی مجوز S3 runtime و هشدارهای بیرونی هنوز کار باز هستند.

## نگهداری فایل

در workspace API با تنظیمات محیط مقصد:

```sh
pnpm media:retention
pnpm media:retention --apply
```

پیش‌فرض dry-run است. `MEDIA_ORPHAN_GRACE_DAYS` پیش‌فرض ۷ و دامنهٔ ۱ تا ۹۰ روز دارد. فایل‌های قدیمیِ بدون ارجاع، بعد از بررسی دوباره زیر قفل، حذف می‌شوند. فایل مرجع‌دار یا تازه حفظ می‌شود. orphanها فقط در الگوی شناخته‌شدهٔ `clubs/<uuid>/<uuid>.webp` بررسی می‌شوند. شکست یک مورد عملیات قبلی را برنمی‌گرداند؛ اجرای مجدد باید انجام شود. worker فعال هر ساعت پاک‌سازی حساب و فایل را اجرا می‌کند.

## تست و CI

```sh
pnpm exec turbo run lint check-types
docker compose --profile test up -d --wait postgres-test storage
bash scripts/verify-ph1.sh
pnpm --filter api backup:drill
```

تست‌های مشترک دیتابیس به‌ترتیب اجرا شوند. آخرین اجرا: ۱۱۷ تست موفق و کنترل متن موفق. workflow `.github/workflows/ph1.yml` تست‌ها، restore drill و buildها را اجرا می‌کند؛ هنوز روی GitHub اجرا نشده است.

## تمرین بازیابی

`backup:drill` فقط دیتابیس محلی test روی 55433 و bucket آزمون را می‌پذیرد. محیط آزمون هنگام تمرین باید بدون نویسندهٔ هم‌زمان باشد؛ snapshot دیتابیس با dump سازگار است، اما snapshot اتمیک مشترک DB/S3 وجود ندارد. فایل‌های خروجی در `.artifacts/backup-drill/<id>` با مجوز خصوصی نگهداری می‌شوند. دیتابیس و bucket موقت restore پس از بررسی پاک می‌شوند.

نتیجهٔ ثبت‌شدهٔ `33a88f61228146ff`: ۴۷ جدول، یک فایل، تطبیق تعداد ردیف‌ها و SHA-256 و حفظ tombstone حساب حذف‌شده؛ ۱۲۷۲ میلی‌ثانیه. این اندازهٔ کوچک معیار ظرفیت production نیست. حذف‌هایی که بعد از snapshot اتفاق افتاده‌اند هنوز به دفتر مستقل و بازاعمال هنگام restore نیاز دارند. زمان‌بندی، رمزگذاری و حذف خودکار بکاپ‌های قدیمی هنوز پیاده نشده‌اند.

## موبایل

خروجی static native با ۱۴ صفحه، sync پنج افزونه و APK debug ساخته شده است. نسخهٔ ساخت ۳ روی گوشی متصل SM-S928B با `adb install -r` با موفقیت نصب شد؛ داده‌های قبلی پاک نشدند. نصب موفق به معنی پذیرش UI یا اتصال API نیست. مسیر APK: `apps/application/android/app/build/outputs/apk/debug/app-debug.apk`. اتصال API نیازمند `NEXT_PUBLIC_API_URL` با HTTPS معتبر است. بیلد بدون آن پذیرش ارتباط سرور نیست. Xcode کامل برای build iOS لازم است.

فایل خروجی حساب با Filesystem در cache خصوصی ساخته و با Share به انتخاب کاربر ارائه می‌شود. پاک‌سازی فایل‌های بالای یک ساعت در شروع/بازگشت اپ یا export بعدی انجام می‌شود؛ هنگام بسته‌بودن اپ زمان‌بندی قطعی ندارد. مستندات: [Filesystem](https://capacitorjs.com/docs/apis/filesystem)، [Share](https://capacitorjs.com/docs/apis/share).

لینک `gym4me://club/<uuid>` پیاده شده؛ لینک HTTPS فقط از origin تنظیم‌شده پذیرفته می‌شود. association دامنه برای universal/app links هنوز تنظیم نشده است.

## بازاعمال حذف‌های جدید روی بکاپ قدیمی

ابزار جدید در workspace API اجرا می‌شود. پیش از restore، نوشتن حساب‌ها و worker را متوقف کنید و از دیتابیس فعلی دفتر جدید بگیرید؛ فایل را خارج از snapshotی که بازیابی می‌کنید نگه دارید:

```sh
pnpm data:deletion-ledger export /absolute/private/deletions.json
```

سپس با `DATABASE_URL` دیتابیس بازیابی‌شده و API آفلاین، زمان واقعی snapshot را جایگزین کنید:

```sh
pnpm data:deletion-ledger replay /absolute/private/deletions.json 2026-10-13T00:00:00.000Z
pnpm data:deletion-ledger replay /absolute/private/deletions.json 2026-10-13T00:00:00.000Z --apply
```

پیش‌فرض آزمایشی است. export فایل موجود را بازنویسی نمی‌کند؛ فایل با مجوز 0600 ساخته می‌شود و فقط شناسهٔ تصادفی حساب و زمان حذف دارد. replay فایل symlink، فایل بزرگ‌تر از ۱۰ مگابایت، مجوز عمومی یا مالک متفاوت، دفتر قدیمی‌تر از snapshot، شناسهٔ تکراری و دادهٔ خارج از قرارداد را رد می‌کند. فایل باید از منبع مورد اعتماد اپراتور باشد؛ امضای رمزنگاری‌شده ندارد.

حساب‌های غایب یا از قبل حذف‌شده دست‌نخورده می‌مانند؛ روی حساب برگشته، همان مسیر پاک‌سازی نشست، OTP، پروفایل و محتوای حساب اجرا می‌شود. عملیات تراکنشی و تکرارپذیر است. اگر snapshot مالکیت یا نقش ادمین قدیمی را برگرداند، کل replay متوقف می‌شود؛ مسئولیت‌ها باید با سوابق معتبر تعیین تکلیف شوند و سپس replay دوباره اجرا شود. تا تکمیل این فرایند API نباید منتشر شود.

آزمون جدید `f96a028029da42a6`: بازیابی واقعی ۴۷ جدول و یک فایل، حفظ tombstone موجود و بازاعمال حذفِ پس از snapshot، تکرار replay موفق؛ ۱۱۹۰۷ میلی‌ثانیه. دو تست یکپارچهٔ جدید و دو تست اعتبارسنجی اضافه شدند؛ مجموعهٔ هویت اکنون ۲۷ تست موفق دارد.

محدودیت: این ابزار برای restore برنامه‌ریزی‌شده با دسترسی به منبع جدید مناسب است. دفتر هنوز به‌صورت پیوسته روی ذخیره‌ساز مستقل تکثیر نمی‌شود؛ پس در از‌دست‌رفتن کامل منبع، پوشش حذف‌های صادرنشده تضمین نمی‌شود. زمان‌بندی/تکثیر مستقل و اتصال اجباری replay به مسیر انتشار، کار باز PH1 است.

## HTTPS محلی staging

```sh
node scripts/staging-tls.mjs
node scripts/staging-proxy.mjs
```

فرمان اول فقط یک بار اجرا می‌شود؛ گواهی موجود را بازنویسی نمی‌کند. کلیدها در `.staging-tls/` با مجوز خصوصی و خارج Git هستند. CA محلی یک‌ساله و گواهی سرور ۹۰روزه فقط برای localhost و loopback ساخته می‌شوند. این فرمان هیچ گواهی‌ای را به trust store سیستم یا گوشی اضافه نمی‌کند.

API: `https://localhost:7443` به HTTP داخلی 7188 متصل است. سه listener وب 7181/7182/7183 به اپ‌های application/admin/business روی 7281/7282/7283 متصل می‌شوند؛ اپ‌های وب staging اکنون روی آن پورت‌ها راه‌اندازی و بررسی شده‌اند؛ دستورها در بخش سه اپ وب آمده‌اند. همهٔ listenerها فقط روی 127.0.0.1 هستند. این proxy برای اپ‌های production است؛ websocket/HMR فراهم نمی‌کند.

```sh
curl --fail --cacert .staging-tls/ca.crt https://127.0.0.1:7443/api/v1/system/health/ready
node --test scripts/staging-proxy.test.mjs
```

readiness واقعی از HTTPS هر دو DB/S3 را `up` گزارش کرد. تست انتقال درخواست/کوکی Secure، رد گواهی ناشناخته و نام میزبان اشتباه، رد مقصد نامعتبر و 502 هنگام قطع upstream پاس شد؛ هیچ بررسی TLS غیرفعال نشده است. PUBLIC_API_ORIGIN به پورت 7443 تغییر کرده است. پذیرش اعتماد محدود گواهی در بیلد آزمایشی گوشی و اتصال USB هنوز انجام نشده؛ این گواهی برای انتشار عمومی معتبر نیست.

## سه اپ وب staging

از ریشه، برای هر اپ ابتدا build و سپس start را اجرا کنید؛ start هر اپ یک فرایند طولانی‌مدت جداست:

```sh
node scripts/staging-web.mjs build application
node scripts/staging-web.mjs build admin
node scripts/staging-web.mjs build business
node scripts/staging-web.mjs start application
node scripts/staging-web.mjs start admin
node scripts/staging-web.mjs start business
node scripts/verify-staging-web.mjs
```

خروجی هر اپ در `.next-staging` با `tsconfig.staging.json` مستقل ساخته می‌شود. runner مقصد API را روی 7188 و native export را خاموش می‌گذارد؛ endpointهای مرورگر same-origin هستند و rewrite به staging می‌رود. تنظیمات محرمانهٔ دیتابیس به این runner داده نمی‌شوند. start روی loopback و پورت‌های 7281/7282/7283 است؛ TLS proxy باید هم‌زمان روشن باشد.

هر سه build و بررسی HTTPS موفق شدند: HTML صفحهٔ ورود 200، مقصد rewrite دقیقاً staging، readiness دیتابیس/S3 سالم و مسیر حساب خصوصی بدون نشست با client و referer صحیح 401. این بررسی HTTP است؛ نمایش مرورگر، OTP واقعی و ماتریس نقش‌ها را پذیرش نمی‌کند. گواهی محلی هنوز در مرورگر/گوشی مورد اعتماد قرار نگرفته و نباید هشدار گواهی دور زده شود.

هنگام build فضای دیسک کم بود؛ فقط cache قابل‌بازتولید خروجی‌های همین staging پس از اتمام build پاک شد و خروجی قابل اجرا باقی ماند.

## پایش محلی و هشدار تغییر وضعیت

```sh
node scripts/staging-monitor.mjs --once
node scripts/staging-monitor.mjs --watch
```

`--once` خروجی سلامت چهار endpoint را ثبت می‌کند و با هر خطا exit code برابر ۱ می‌دهد. `--watch` هر ۳۰ ثانیه API و سه مسیر readiness وب را با TLS معتبر بررسی می‌کند. بعد از سه شکست پیاپی یک incident و بعد از دو موفقیت پیاپی یک recovered ثبت می‌شود؛ وضعیت ثابت پیام تکراری ندارد. شروع فرایند به شواهد تازه نیاز دارد و status قبلی را مبنای سلامت قرار نمی‌دهد. هر درخواست deadline ده‌ثانیه‌ای و سقف اندازهٔ پاسخ دارد.

خروجی خصوصی در `.artifacts/staging-monitor/status.json` و رخدادها در `events.jsonl` است؛ status اتمیک جایگزین می‌شود و log با سقف یک مگابایت به سه نسخهٔ قبلی می‌چرخد. متن پاسخ، کوکی، توکن و رمز در رخدادها ثبت نمی‌شود. SIGINT/SIGTERM مانیتور را متوقف می‌کند. هنوز supervisor برای راه‌اندازی پس از reboot و ارسال هشدار بیرونی تنظیم نشده است.

آزمون سه شکست، حذف اعلان تکراری، دو موفقیت بازیابی، خرابی S3 در پاسخ 200، گواهی ناشناخته و timeout پاس شد. اجرای واقعی `--once` هر چهار endpoint را سالم گزارش کرد. این پایش وضعیت API و وابستگی‌هاست؛ خطاهای رندر UI یا تراکنش ورود را جایگزین تست سرتاسری نمی‌کند.

## بیلد Android مخصوص staging محلی

```sh
node scripts/staging-android.mjs
cd apps/application/android
ANDROID_HOME="$HOME/Library/Android/sdk" ./gradlew :app:assembleDebug -PgymLocalStaging=true
```

این runner خروجی native را با API برابر `https://localhost:7443/api/v1` آماده می‌کند و فایل‌های Android را در `.staging-android` می‌گذارد. فقط گواهی عمومی CA کپی می‌شود. main assets اندروید بازنویسی نمی‌شوند؛ Gradle هنگام انتخاب `gymLocalStaging=true` از assets و manifest مستقل debug استفاده می‌کند. نام اپ «Gym4Me Staging» و شناسهٔ آن `com.gym4me.app.staging` است تا داده‌های اپ اصلی جابه‌جا نشوند.

اعتماد CA فقط برای دامنهٔ دقیق localhost در همین variant است؛ cleartext ممنوع و سایر دامنه‌ها تابع گواهی‌های سیستم‌اند. هر task مربوط به release همراه این property رد می‌شود. این ساختار از [Network Security Configuration اندروید](https://developer.android.com/privacy-and-security/security-config) استفاده می‌کند؛ trust store گوشی تغییر نمی‌کند.

پس از اتصال گوشی برای تست، `adb reverse tcp:7443 tcp:7443` مسیر USB به proxy محلی را فراهم می‌کند. پایان تست: `adb reverse --remove tcp:7443`. نصب و پذیرش این variant هنوز باید روی گوشی تأیید شود. برای export معمولی بعدی، فرمان عادی build:native با endpoint انتشار را اجرا کنید؛ `.next-native` آخرین export است و ممکن است staging باشد، اما main Android assets در این runner تغییر نمی‌کنند.

شواهد بیلد staging Android: export چهارده‌صفحه‌ای و assembleDebug موفق؛ شناسهٔ بسته com.gym4me.app.staging، endpoint HTTPS و گواهی عمومی داخل APK بررسی شدند و فایل کلید خصوصی در بسته نبود. task release با property staging رد شد و manifest معمولی release بدون تنظیم اعتماد staging تولید و بررسی شد. نسخهٔ قابل نصب در `.artifacts/ph1/gym4me-staging-debug.apk` نگهداری شده است. اگر export staging بعداً با cap sync وارد main assets شود، marker آن مانع build release می‌شود؛ export معمولی تازه باید جایگزین شود.


## وضعیت نصب روی گوشی و آزمون شبکه

Gym4Me Staging نسخهٔ `1.0-local-staging` (code 3) روی SM-S928B نصب شد؛ `adb reverse --list` نگاشت 7443 را تأیید کرد. readiness سمت میزبان از HTTPS سالم بود. تست `StagingConnectivityTest` برای اتصال HTTPS واقعی گوشی، پاسخ 401 حساب بدون نشست و رد CA خارج از localhost اضافه شده است:

```sh
ANDROID_HOME="$HOME/Library/Android/sdk" ./gradlew :app:connectedDebugAndroidTest -PgymLocalStaging=true -Pandroid.testInstrumentationRunnerArguments.class=com.gym4me.app.StagingConnectivityTest
```

این تست هنوز اجرا نشده است: آماده‌سازی AndroidX در مخزن رسمی Google برای annotation-experimental:1.4.0 و core-runtime:2.1.0 شکست خورد؛ URL مستقیم artifact اول نیز در این محیط HTTP 404 داد. این شکست مربوط به دریافت وابستگی آزمون است و شاهد سلامت یا خرابی ارتباط داخل اپ نیست. مشاهدهٔ دستی صفحهٔ سیاست روی گوشی نیز هنوز منتظر پاسخ کاربر است. هیچ OTP یا SMS زنده‌ای ارسال نشد.


### پذیرش اتصال واقعی Android — موفق

نسخه‌های AndroidX تست با core-runtime:2.2.0 و annotation-experimental:1.4.1 موجود در پروژه هماهنگ شدند. APK آزمون ساخته شد. اجراکنندهٔ میزبان UTP در حالت offline کش نبود؛ همان تست‌های AndroidJUnitRunner مستقیماً با `adb shell am instrument` اجرا شدند و `OK (3 tests)` دادند: readiness DB/S3 روی HTTPS، پاسخ 401 بدون نشست native و رد اعتماد CA برای IP خارج از domain دقیق localhost؛ cleartext نیز ممنوع بود.

مسیر تکرار، پس از آماده‌سازی staging و انتخاب دستگاه:

```sh
node scripts/verify-staging-android.mjs DEVICE_SERIAL --allow-app-restart
```

این runner فقط APK با شناسه‌های staging را نصب می‌کند، تونل USB را برقرار می‌کند و گزارش آزمون را در `.artifacts/ph1/android-connectivity.txt` می‌گذارد. خطای تست را از محتوای گزارش تشخیص می‌دهد؛ صرف exit code صفر adb شاهد پذیرش نیست. این سه تست شبکهٔ native هستند و آزمون UI/WebView، OTP، Secure Storage و اشتراک فایل را جایگزین نمی‌کنند. اتصال USB برای ادامهٔ پذیرش دستی باز مانده است.

تداخل پذیرش دستی و instrumentation: AndroidJUnitRunner هنگام شروع/پایان اپ هدف را force-stop می‌کند و نصب مجدد هم آن را متوقف می‌کند. گزارش exit-info گوشی خروج با دلیل start/finished instrumentation را نشان داد؛ پس از پایان، فرایند تازه زنده بود و هشدار تازه‌ای نداشت. تست خودکار را هم‌زمان با بررسی دستی اجرا نکنید. runner اکنون پیش از هر تماس با adb پرچم صریح `--allow-app-restart` را الزامی می‌کند. بازماندن رابط پس از این تداخل همچنان باید توسط کاربر تأیید شود.
