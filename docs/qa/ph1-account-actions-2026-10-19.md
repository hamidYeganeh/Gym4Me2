# نشست، دعوت و تغییر شماره — ۱۹ اکتبر ۲۰۲۶

کد مشترک این سه فلو اصلاح شد. آزمون واقعی این برش با Next development، NestJS، PostgreSQL اختصاصی و SMS ساختگی انجام شد. این گزارش پذیرش کامل PH0/PH1، build تولیدی تازه یا اجرای دستگاه نیست.

## تغییر رفتار

- تغییر شماره: قفل هم‌زمان از شروع آماده‌سازی autofill، لغو ادامهٔ دیررس پس از unmount، شناسهٔ مستقل فیلدها، مقصد ورود متناسب با اپ، پاک‌شدن خطای قدیمی هنگام ویرایش، حفظ cooldown بعد از ویرایش و کنترل‌های حداقل۴۴ پیکسل.
- نشست و دعوت: قفل synchronous برای جلوگیری از درخواست تکراری؛ `aria-disabled` و `aria-busy` بدون حذف دکمه از مسیر فوکوس؛ توصیف دستگاه و نام قابل‌تشخیص دعوت.
- فوکوس پس از commit و فعال‌شدن کنترل مقصد انجام می‌شود؛ حذف ردیف به اقدام بعدی/قبلی و سپس region نام‌دار برمی‌گردد. انتخاب جدید کاربر و تغییر مسیر مقدم‌اند.
- دادهٔ دعوت قدیمی در خطای بازخوانی پنهان می‌شود. حالت خالی نشست و مقصد فوکوس Retry اضافه شدند. `useQueryRetry` نیز از همان انتظار commit استفاده می‌کند.

## آزمون واقعی این برش

[رسیدهای HTTP پالایش‌شده](baselines/ph1-account-actions-2026-10-19/requests.json) فقط اقدام، کلاینت، وضعیت، شمارش و کد خطا دارند؛ body، cookie، توکن یا OTP ثبت نشده‌اند. API واقعی است؛ فقط SMS و خطاهای صریحاً ذکرشده شبیه‌سازی شدند. همهٔ حساب‌ها و دعوت‌ها fixture هستند، با رضایت ازپیش‌آماده؛ پیامک زنده یا دادهٔ کاربر واقعی استفاده نشد.

| سطح | اقدام و نتیجه |
| --- | --- |
| Application | پذیرش دعوت اول با دوبارکلیک و تأخیر۶ثانیه: یک POST، حذف همان ردیف و فوکوس روی دعوت بعدی؛ [شمارش](baselines/ph1-account-actions-2026-10-19/invitation-double-click.json)، [فوکوس نهایی](baselines/ph1-account-actions-2026-10-19/invitation-next-focus-final.json) |
| Application | پذیرش دعوت دوم واقعی؛ GET بعدی با proxy به503 تبدیل شد: هیچ اقدام قدیمی نمایش داده نشد و فوکوس روی region بود؛ [رسید](baselines/ph1-account-actions-2026-10-19/invitation-read-error.json) |
| Application | پس از رفع خطای proxy، Retry فهرست واقعاً خالی را دریافت کرد و فوکوس روی region ماند؛ [رسید نهایی](baselines/ph1-account-actions-2026-10-19/invitation-empty-retry-final.json) |
| Application | دو نشست dummy با API واقعی باطل شدند؛ پس از حذف اول، فوکوس روی اقدام دستگاه Beta بود؛ پس از حذف دوم، روی نشست جاری؛ [رسید اول](baselines/ph1-account-actions-2026-10-19/session-next-focus.json) |
| Application | ورود قدیمی → درخواست تغییر شماره403، حفظ فیلد و فوکوس؛ [رسید](baselines/ph1-account-actions-2026-10-19/phone-recent-signin-error.json). تازگی ورود فقط برای همین fixture در DB به قدیمی/تازه تنظیم شد؛ ورود مجدد واقعی در این مورد ادعا نمی‌شود. |
| Application | درخواست کد201 و فوکوس OTP؛ دوبارکلیک فقط یک درخواست موفق فرستاد. کد غلط401 به خطای متصل به فیلد رسید و حساب معتبر باقی ماند؛ [رسید](baselines/ph1-account-actions-2026-10-19/phone-wrong-code.json). ویرایش، خطا/چالش را پاک و فوکوس را به شماره برگرداند؛ شمارش۴۳ثانیه در UI مشاهده شد. [رسید پس از پایان cooldown](baselines/ph1-account-actions-2026-10-19/phone-edit-after-cooldown.json) شاهد فعال‌بودن شمارش نیست. |
| Application | ارسال جدید پس از cooldown و تأیید کد درست: شماره عوض شد؛ هر۳ نشست active=0؛ مقصد `/auth/otp?returnTo=%2Fprofile` و فوکوس فیلد ورود؛ [UI](baselines/ph1-account-actions-2026-10-19/phone-success.json)، [DB](baselines/ph1-account-actions-2026-10-19/final-database-state.json) |
| Business | ابطال نشست جاری با503 تزریقی: خطا، نشست و فوکوس دکمه حفظ شدند؛ [رسید](baselines/ph1-account-actions-2026-10-19/business-session-error.json). پس از رفع خطا، ابطال واقعی موفق و active=0؛ مقصد `/login?returnTo=%2Fsessions`؛ [رسید](baselines/ph1-account-actions-2026-10-19/business-session-success.json) |

دو ایراد در اجرای اولیه یافت و رفع شدند: دوبارکلیکِ دکمهٔ native-disabled فوکوس را به region می‌برد؛ Retry نیز پیش از commit به دکمهٔ در حال حذف فوکوس می‌داد. رسیدهای اولیهٔ `invitation-next-focus.json` و `invitation-empty-retry.json` عمداً نگه داشته شده‌اند و **پاس نیستند**؛ فایل‌های `*-final.json` نتیجهٔ اصلاح را نشان می‌دهند. برای تکرار دعوت اول، فقط عضویت fixture همان ورزشکار/مجموعه حذف و دعوت متعلق به همین آزمون reset شد.

آزمون انتقال عمدی فوکوس حین ابطال دوم به علت timeout تعامل مرورگر کامل نشد؛ در این برش شاهد مرورگری برای آن ادعا نمی‌شود. محافظ انتخاب جدید/مسیر در آزمون واحد بررسی شد. Admin در این برش دوباره اجرا نشد؛ تغییر در جزء مشترک است، نه شاهد اجرای تازهٔ سه اپ.

## بررسی کد و ابزار

### Standards

بازبینی نهایی فقط‌خواندنی: ایراد قطعی باقی‌مانده در محدوده پیدا نشد. شکاف‌های۴۴پیکسل و بازیابی فوکوس رفع شدند.

### Spec

بازبینی نهایی فقط‌خواندنی: ایراد قطعی باقی‌مانده پیدا نشد. نگرانی مقصد ورود بعد از resetSession با اجرای موفق تغییر شماره رفع شد. این بازبینی اسکن جامع امنیتی نیست.

- TypeScript UI بدون incremental و ESLint شش فایل تغییرکرده: exit0.
- [۸ آزمون](baselines/ph1-account-actions-2026-10-19/focus-tests.log): فوکوس اقدام، guard مقصد پنهان/غیرفعال، overlay و ناوبری بازیابی نشست؛ همه پاس.
- [۱۰ آزمون](baselines/ph1-account-actions-2026-10-19/mapper-tests.log): نگاشت درخواست و کنترل وابستگی مستقیم؛ همه پاس.
- دو آزمون i18n و check-copy پاس؛ اسکن وابستگی۱۰manifest/۸۴۸فایل پاس؛ محافظ۵۹ فایل پاس.
- چند invocation اولیهٔ runner به‌دلیل loader/ESM نامناسب اجرا نشدند. اجرای نهایی با ts-node ثبت‌شده برای CommonJS و TypeScript نصب‌شده، هر۸ آزمون را پاس کرد. لاگ نهایی بالا ملاک است.
- Fast Refresh پس از اضافه‌شدن hook در جلسهٔ development یک بار تغییر ترتیب hook گزارش کرد و reload کامل شد؛ آزمون نهایی Retry پس از آن انجام شد. ترتیب hook در کد شرطی نیست.

## منبع و پاک‌سازی

[نگاشت تازه](ph0-route-contracts-account-actions-2026-10-19.json):۹۸صفحه،۹۱دارای ارتباط API،۴۴۶فایل parseشده،۱۷۸تعریف درخواست و۲۳۷۹ارتباط صفحه/فراخوانی. هر۴۴۶هش منبع در پایان برابر بود. رسیدهای runtime موجود در این نگاشت همان۶حالت تاریخی privacy هستند؛ شاهد development حاضر جدا از آن‌هاست و به معنای پوشش کل۹۸صفحه نیست.

[رسید منبع](baselines/ph1-account-actions-2026-10-19/source-receipt.json):۸۸۰ورودی؛۸۷۷ورودی ثابت پس از آخرین اصلاح کد تا پایان QA تغییر نکردند؛ هر۳فایل `next-env.d.ts` دقیقاً به بایت/هش پیش از اجرا بازگردانده شدند. اصلاح‌های کشف‌شده در QA پیش از این snapshot نهایی ثبت شدند.

فقط یک frontend در هر لحظه، با heap640MiB و nice10 اجرا شد؛ API با heap384MiB. هیچ build سنگین تازه انجام نشد. App/Business/API/proxy متوقف و تب‌های موقت بسته شدند. پس از cleanup، [users/organizations/sessions برابر0/0/0](baselines/ph1-account-actions-2026-10-19/counts.json) بود؛ دیتابیس اختصاصی `gym4me_ph1actions_1a14e17_test` حذف و postgres-test به وضعیت خاموش اولیه برگشت. storage دست‌نخورده ماند؛ تب کاربر دست‌نخورده است. حذف cookie ادعا نمی‌شود؛ اعتبار fixture با حذف DB دیگر قابل استفاده نیست.

پذیرش کامل native، QA جامع PH0، build تولیدی جاری، CI راه‌دور، HTTPS عملیاتی و بکاپ خارج از این مک همچنان بازند. طبق پاسخ کاربر، 403 اتصال GitHub مجدداً امتحان نشد و کار محلی ادامه یافت.
