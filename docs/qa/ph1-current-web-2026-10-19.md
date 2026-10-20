# بازآزمایی تولیدی حساب و فرم‌ها — ۱۹ اکتبر ۲۰۲۶

دو اصلاح محلی انجام شد: `TextField` شناسهٔ مستقل با حفظ `id` صریح و label هماهنگ دارد؛ فیلد و `Submit` حداقل۴۴پیکسل و ثبت، `aria-busy` دارد. تاریخ عضویت پروفایل نیز از ISO خام به formatter مشترک زبان/تقویم منتقل شد و `dateTime` ماشین‌خوان حفظ شد. فایل‌های پایهٔ محافظت‌شده تغییر نکردند.

این گزارش پذیرش کامل PH0/PH1 نیست. یک ایراد تازهٔ فوکوس دیالوگ ادمین نیز تأیید و **باز** ثبت شد.

## build و بررسی‌ها

ابتدا کد مشترک کامل و سه build تولیدی کامل، ترتیبی با Webpack، یک worker، heap640MiB و nice10 اجرا شدند. هنگام QA تاریخ ISO فارسی دیده شد؛ پس از اصلاح، هر سه اپ دوباره از snapshot نهایی ساخته شدند. [شناسه‌های اولیه](baselines/ph1-current-web-2026-10-19/builds-initial.json) و [شناسه‌های نهایی](baselines/ph1-current-web-2026-10-19/builds-final.json) جدا هستند.

| اپ | build نهایی |
| --- | --- |
| Application | `fCy-U4zSBp1M9U3daT4Ub` |
| Business | `pThp5A7HjVanBbnbpvvXN` |
| Admin | `KHWKmE2WBnRTDSQVDom7Q` |

[۸۸۰ ورودی منبع](baselines/ph1-current-web-2026-10-19/build-inputs.json) از قبلِ buildهای نهایی تا پایان QA ثابت بودند؛ [رسید](baselines/ph1-current-web-2026-10-19/source-receipt.json). سه فایل type خودکار به بایت‌های اولیه بازگردانده شدند؛ در این اجرا تفاوت هش نداشتند. این buildها خروجی تولیدی Next در `.next-qa` هستند، نه انتشار روی دامنه یا export بومی.

۱۵۳ آزمون ورزشکار پاس شدند: اجرای اولیه۱۲۲ پاس و۳۱ شکست `listen EPERM` در یک فایل fixture داشت؛ همان۳۱ مورد بدون تغییر کد، با مجوز loopback اجرا و پاس شدند. [اجرای اولیه](baselines/ph1-current-web-2026-10-19/application-tests.log)، [بازاجرای۳۱مورد](baselines/ph1-current-web-2026-10-19/fixture-tests-retry.log). با [۱۰ آزمون نگاشت/وابستگی](baselines/ph1-current-web-2026-10-19/mapper-tests.log) و [دو i18n](baselines/ph1-current-web-2026-10-19/i18n.log)، مجموع۱۶۵ مورد پاس است. اصلاح تاریخ با build/typecheck و مرورگر واقعی بررسی شد؛ آزمون Node اختصاصی برای تغییر قالب نمایشی اضافه نشد. ESLint دو فایل، check-copy، اسکن وابستگی۱۰manifest/۸۴۸فایل و محافظ۵۹ فایل پاس‌اند.

## اجرای واقعی

NestJS و PostgreSQL اختصاصی `gym4me_ph1current_1a14e17_test`، همراه SMS ساختگی استفاده شدند. هر لحظه فقط یک frontend تولیدی با heap384MiB فعال بود. حساب‌ها، سن و رضایت این محیط صرفاً دادهٔ ساختگیِ آزمون‌اند؛ حساب انسان، پیامک زنده یا توافق بیرونی استفاده نشد.

[HTTP پالایش‌شده](baselines/ph1-current-web-2026-10-19/http.json) شامل اقدام‌های حساب، روش، وضعیت، کلاینت و فقط نام فیلدهای PATCH است؛ شماره، OTP، body، cookie و توکن در آن نیست. endpointهای دیگر عمداً ثبت نشده‌اند. نسبت‌دادن رسید UI به درخواست، دستی و براساس توالی این گزارش است؛ شناسهٔ هم‌بستگی مشترک و ادعای ترتیب قطعی همهٔ رخدادها وجود ندارد.

| محدوده | نتیجه و شاهد |
| --- | --- |
| App، build اولیه | نام و سپس خصوصی‌سازی جداگانه ذخیره شدند؛ فوکوس نام و ثبت غیرفعال پس از موفقیت؛ [نام](baselines/ph1-current-web-2026-10-19/application-name.json)، [نمایش](baselines/ph1-current-web-2026-10-19/application-private.json) |
| App، build اولیه | دوبارکلیک دعوت اول یک POST داشت و فوکوس به دعوت بعدی رفت؛ [شمارش](baselines/ph1-current-web-2026-10-19/invitation-rapid.json)، [فوکوس](baselines/ph1-current-web-2026-10-19/invitation-next.json). پذیرش دوم واقعی بود؛ GET503 تزریقی، اقدام قدیمی را پنهان کرد. پس از رفع خطا، Retry فهرست خالی و فوکوس region داشت؛ [خطا](baselines/ph1-current-web-2026-10-19/invitation-read-error.json)، [بازیابی](baselines/ph1-current-web-2026-10-19/invitation-retry-empty.json) |
| App، build اولیه | کد غلط401 نشست را حفظ کرد؛ [رسید](baselines/ph1-current-web-2026-10-19/phone-invalid.json). کد درست شماره را تغییر و هر۳نشست را باطل کرد؛ مقصد `/auth/otp?returnTo=%2Fprofile` و فیلد ورود متمرکز شد؛ [رسید](baselines/ph1-current-web-2026-10-19/phone-success.json). این نوبت زمان تازگی نشست در DB دست‌کاری نشد. |
| حساب تازه، build اولیه | شمارهٔ آزادشدهٔ همان fixture برای حساب جدید استفاده شد؛ DB قبل از انتخاب‌ها، policy/age=false و نام=null/private بود. UI پس از انتخاب فقط سیاست هنوز ثبت را غیرفعال نگه داشت؛ با انتخاب سن و ثبت آزمایشی، policy/age=true شد. فرم نام اختیاری ظاهر و «بعداً» به `/profile` رسید؛ [پیش](baselines/ph1-current-web-2026-10-19/new-account-before.json)، [پس](baselines/ph1-current-web-2026-10-19/new-account-after.json). JSONهای `fresh-user-*` کنار همین رسیدها قبل/بعد DB را نگه می‌دارند؛ نام همچنان خالی و پروفایل خصوصی ماند. |
| App، build نهایی | تاریخ فارسی `۲۷ مهر ۱۴۰۵` و انگلیسی `Oct 19, 2026` برای همان `dateTime` واقعی؛ [فارسی](baselines/ph1-current-web-2026-10-19/date-fa.json)، [انگلیسی](baselines/ph1-current-web-2026-10-19/date-en.json). در۳۶۰×۷۸۰ نیز تاریخ جا شد و سرریز افقی نبود؛ [رسید](baselines/ph1-current-web-2026-10-19/date-fa-360.json)، [تصویر](baselines/ph1-current-web-2026-10-19/date-fa-360.png). ایراد قبلی ISO در `new-profile-before-date-fix.json` حفظ شده است. |
| App، build نهایی | حلقهٔ خانه→کشف→خانه، اسکرول۷۶۹ را حفظ کرد: حالت آمادهٔ عادی، بدون انتظارِ settle اضافی و حالت reduced. [رسید](baselines/ph1-current-web-2026-10-19/scroll.json). helper ابتدا منتظر پنهان‌شدن outgoing می‌ماند؛ این شاهد ورودی داخل خودِ انیمیشن، کل مسیرها یا تغییر media در میانهٔ حرکت نیست. اختلاف قبلی۷۱۰→۰ در این سناریوی تازه تکرار نشد؛ داده/ارتفاع fixture فعلی متفاوت است. |
| Business، build نهایی | فیلد/ثبت فرم مجموعه۴۴پیکسل، label مرتبط، id یکتا و busy=false؛ [رسید](baselines/ph1-current-web-2026-10-19/business-controls.json). نام پروفایل با PATCH فقط نام، ذخیره و فوکوس به نام برگشت؛ [رسید](baselines/ph1-current-web-2026-10-19/business-profile.json). |
| Admin، build نهایی | دو TextField داخل دیالوگ۴۴پیکسل، id مجزا و label مرتبط؛ Submit۴۴پیکسل؛ [رسید](baselines/ph1-current-web-2026-10-19/admin-controls.json). نام خالی پروفایل با PATCH موفق ذخیره و فوکوس نام/ثبت غیرفعال شد؛ [رسید](baselines/ph1-current-web-2026-10-19/admin-profile.json). ایجاد یا ذخیرهٔ دسته‌بندی در این آزمون انجام نشد. |

سناریوهای build اولیه پیش از اصلاح مستقل تاریخ اجرا شدند؛ تکرار تمام آن‌ها روی build نهایی ادعا نمی‌شود. فونکشن‌های حساب و فایل‌های مرتبط آن سناریوها بین دو مجموعه build تغییر نکردند؛ تنها `profile-overview.tsx` تغییر کرد. دادهٔ visibility در برخی رسیدهای UI پنل ثبت نشده؛ برای آن‌ها فقط PATCH نام و فوکوس ادعا می‌شود.

## ایراد باز و بازبینی

**P0-08/P0-10، فوکوس دیالوگ ادمین:** در `/taxonomies`، «افزودن مورد» → Escape، پس از بسته‌شدن پایدار dialog، `activeElement=BODY` ماند؛ [رسید](baselines/ph1-current-web-2026-10-19/admin-dialog-close-focus.json). `TermEditor` دیالوگ را برنامه‌ای باز می‌کند و `DialogTrigger` ندارد؛ `DialogContent` فعلی fallback فوکوس ندارد. علت پیشنهادی از کد است؛ اصلاح هنوز انجام نشده. اقدام بعدی: ممیزی مصرف‌کنندگان برنامه‌ای Dialog و اصلاح مشترک با حفظ handlerهای سفارشی، route/modal جدید و فایل‌های محافظت‌شده؛ سپس بازآزمایی.

### Standards

بازبینی فقط‌خواندنی دو اصلاح این برش: ایراد قطعی باقی‌مانده در `TextField`/`Submit` و قالب تاریخ پیدا نشد. حفظ id صریح و `dateTime` تأیید شد.

### Spec

بازبینی فقط‌خواندنی: ایراد قطعی در همین دو اصلاح پیدا نشد. این نتیجه شامل ایراد تازهٔ دیالوگ، اسکن جامع امنیتی یا پذیرش کل PH0 نیست.

## پاک‌سازی و باقی‌مانده

API/proxy و هر۳frontend متوقف شدند. پس از cleanup fixture و حذف فقط حساب جایگزین ساختگی، [users/organizations/sessions برابر0/0/0](baselines/ph1-current-web-2026-10-19/counts.json) بود؛ DB اختصاصی حذف و postgres-test به خاموش اولیه برگشت؛ storage تغییر نکرد. تب‌های۱۱/۱۲/۱۳ دستی بسته شدند؛ تب خطای۱۰ به علت محدودیت URL ابزار قابل بستن نبود و برای پاک‌سازی خودکار پایان نوبت رها شد. تب کاربر دست‌نخورده است. viewport و emulation کاهش حرکت reset و زبان به فارسی بازگردانده شد؛ cookie حذف نشد و اعتبار fixture با حذف DB از بین رفت.

[بررسی تازهٔ پیش‌نیازها](baselines/ph1-current-web-2026-10-19/native-prerequisites.json): Android آماده=۰، Xcode فقط CommandLineTools، فضای آزاد آن لحظه۶٫۳۵GiB. native export تازه در این برش اجرا نشد؛ نبود دستگاه مانع ساخت export نیست و آن بررسی محلی هنوز باز است. دستگاه، ماتریس کامل PH0/صفحه‌خوان، CI راه‌دور، HTTPS عملیاتی و بکاپ مستقل همچنان بازند. دامنه `gym4me.ir` و نبود مقصد بکاپ طبق تصمیم کاربر حفظ شدند؛ GitHub403 دوباره امتحان نشد.

[نگاشت تازهٔ منبع و رسید](ph0-route-contracts-current-web-2026-10-19.json) چهار حالت تولیدی همین گزارش را به سه مسیر پروفایل اضافه می‌کند؛ شش حالت privacy تاریخی حفظ شده‌اند. هر حالت به هش منبع/شاهد و روش/مسیر HTTP متصل است؛ این اتصال بر توالی دستی گزارش متکی است و پوشش جامع مسیر نیست. snapshot تاریخی جداگانه و تفاوت‌های آن با منبع فعلی صریح‌اند.
