# اجرای کم‌مصرف QA — ۱۷ اکتبر ۲۰۲۶

کاربر خواست ادامهٔ هدف با همین دستگاه و مصرف کمتر منابع انجام شود. شرط ۵ GiB مربوط به guard ساخت native موجود است؛ این مقدار پیش‌شرط همهٔ buildهای وب محسوب نمی‌شود. در شروع این برش ۱٫۲ GiB آزاد اندازه‌گیری شد و build وب به‌صورت ترتیبی پیش رفت. native و پذیرش دستگاه در این برش هنوز اجرا نشده‌اند.

## تنظیمات

در سه اپ، `GYM_QA_WEB=true` خروجی ایزولهٔ `.next-qa`، یک worker تولید صفحات، `webpackMemoryOptimizations` و Webpack cache خاموش دارد. تنظیمات production/staging عادی عوض نشده‌اند. مستندات memory-usage نصب‌شدهٔ Next 16.4 پیش از تغییر خوانده شد؛ هر سه اپ همان نصب را resolve می‌کنند.

فرمان زیر از پوشهٔ هر اپ و یکی‌یکی اجرا می‌شود؛ هم‌زمان API fixture، preview، Jest یا build اپ دیگر روشن نمی‌شود:

```sh
GYM_QA_WEB=true \
API_URL=http://127.0.0.1:7288 \
SWC_NATIVE_BINDING_CACHE=/Users/mahdi/Documents/projects/Gym4Me/.artifacts/swc-native-cache \
NEXT_TELEMETRY_DISABLED=1 \
NODE_OPTIONS=--max-old-space-size=512 \
RAYON_NUM_THREADS=1 UV_THREADPOOL_SIZE=2 \
node_modules/.bin/next build --webpack
```

۵۱۲ MiB سقف heap هر فرایند Node است، نه ادعای سقف کل RAM یا اندازه‌گیری peak. TypeScript، تولید صفحات و بررسی‌های امنیتی SWC حذف نشده‌اند. cache خصوصی SWC مجوز 0700 دارد. هیچ dependency یا preset جدیدی نصب نشد.

## نتیجهٔ ثبت‌شده تا این نقطه

- بیزینس: build موفق، compile حدود ۷٫۶ ثانیه و TypeScript حدود ۲٫۹ ثانیه؛ شامل آخرین flex گفتگو، محافظ focus/read و اتصال pathname به isolation است. این نتیجه، پذیرش مرورگری نیست.
- ورزشکار: build موفق، compile حدود ۱۱٫۱ ثانیه و TypeScript حدود ۷٫۴ ثانیه.
- ادمین: build موفق، compile حدود ۷٫۲ ثانیه و TypeScript حدود ۵٫۸ ثانیه؛ پنل عملیات نیز در خروجی موجود است.

## مانع مستقل PostgreSQL

دیتابیس ایزولهٔ تازهٔ `gym4me_lean_host_ui_test` ایجاد شد، اما fixture پیش از ساخت جدول‌های public شکست خورد. فرایند آن متوقف شد؛ به‌جای اجرای مجددِ هم‌زمان، migration مستقیماً روی همان DB خالی بررسی شد. خطای دقیق:

```text
could not open extension control file "/usr/local/share/postgresql/extension/btree_gist.control": I/O error
```

S3 محلی پاسخ HTTP 403 داد (endpoint در دسترس است) و اتصال PostgreSQL برقرار بود. Docker control API با timeout سه‌ثانیه‌ای پاسخ نداد. زمان DB در این بررسی `2026-10-17T11:05:18.068Z` و میزبان `2026-10-17T11:39:32.721Z` بود؛ اختلاف حدود ۳۴ دقیقه و ۱۵ ثانیه همچنان باز است. بسط/قید ظرفیت حذف نشد و دیتابیس واقعی یا fixture حساب‌های واقعی جایگزین نشد. شروع مجدد QA مرورگر به رفع این خطای محیط و fixture سالم وابسته است.

## بررسی مرورگر با API عمداً خاموش

پس از buildها، فقط preview بیزینس با heap محدود ۲۵۶ MiB روشن شد. هیچ build یا fixture هم‌زمان اجرا نشد. خطای فارسی، Loading و Retry با Enter در مرورگر بررسی شدند. در اجرای اولیه، Retry درخواست host list فاقد scope می‌فرستاد و پس از برگشت خطا فوکوس روی body می‌افتاد. هر دو اصلاح شدند: refetch شعبه/گفتگو فقط با شناسه‌های لازم انجام می‌شود؛ callback فوکوس فقط سطح فعال همان صفحه را هدف می‌گیرد و اگر کاربر به کنترل دیگری رفته باشد مداخله نمی‌کند. dropdownهای فاقد گزینه غیرفعال شدند.

پس از آخرین اصلاح، build بیزینس دوباره موفق شد (compile حدود ۱۶ ثانیه، TypeScript حدود ۴٫۹ ثانیه) و ESLint فایل تغییرکرده پاس شد. بازآزمایی Enter نشان داد Retry با اندازهٔ حدود ۹۲٫۷×۴۴ پیکسل، پس از خطا فوکوس دارد. دادهٔ live یا API ساختگیِ جایگزین استفاده نشد؛ این فقط پذیرش محدود حالت API-unavailable است.

- فارسی/تیره در ۳۹۰×۸۴۴ و انگلیسی/روشن در ۳۶۰×۸۴۴، بدون سرریز افقی و با یک main فعال مشاهده شدند. این دو مورد ماتریس کامل زبان/تم/عرض نیستند.
- هنگام رفتن `/messages` به `/calendar`، دو سطح گذار وجود داشت: خروجی `inert` و `aria-hidden=true` و مقصد فعال بود. Back همین جداسازی را در جهت معکوس نشان داد. این شاهد برای همین دو مسیر در حالت قطع API است؛ همهٔ ترنزیشن‌ها یا دستگاه را نمی‌پوشاند.
- تغییر Archive به `/messages?view=archived` فقط یک سطح مسیر و یک main فعال داشت؛ query فیلتر گذار کل صفحه نساخت.
- reduced-motion در محیط این بررسی false بود؛ رفتار آن در این برش آزموده نشد.
- یک locator انگلیسی با فرض «Try again» منتظر ماند و match نشد؛ snapshot برچسب واقعی «Retry» را نشان داد. این خطای ابزار آزمون بود و به‌عنوان شکست شبکه یا UI ثبت نشد.

شاهد تصویری: [فارسی/تیره، focus پس از Retry](screenshots/low-resource-2026-10-17/business-chat-api-unavailable-fa-390.jpg) و [انگلیسی/روشن](screenshots/low-resource-2026-10-17/business-chat-api-unavailable-en-360.jpg). در پایان، زبان/ظاهر به فارسی/تیره برگشت، viewport reset شد، تب موقت بسته شد و preview با shutdown عادی خاتمه یافت.

## بازیابی محیط و پاک‌سازی

`docker desktop restart --timeout 45` به روش عادی اجرا شد، ولی CLI با خطای `processes still running ... context deadline exceeded` خارج شد. هیچ force-kill، reset، prune یا حذف volume اجرا نشد. ماشین مجازی و ساعت/کنترل Docker سالم اعلام نمی‌شوند. دیتابیس تازهٔ بدون جدول publicِ این برش، پس از کنترل نبود اتصال، بدون FORCE حذف شد. حساب یا دادهٔ fixture ساخته نشد. پذیرش staging 0029/0030، گفتگو با داده و فلوهای مالی همچنان بازند.

## خوانایی متن خطای میزبان

در ادامهٔ هدف، Docker control API همچنان با timeout سه‌ثانیه‌ای در دسترس نبود. بررسی سبکِ متن خطا مستقل از دیتابیس ادامه یافت. رنگ‌های واقعی با `getComputedStyle` در هر دو تم از مرورگر خوانده شدند؛ متن ۱۴ پیکسلی AlertDescription رنگ destructive با alpha برابر ۰٫۹ داشت. براساس تبدیل CSS Color 4 به sRGB و ترکیب alpha روی کارت مات، نسبت اسمی روشن حدود ۴٫۵۱۵۶ و تیره ۵٫۲۲۳۵ بود. **این شاهد، شکست معیار ۴٫۵ را نشان نمی‌داد**؛ بهبود برای حاشیهٔ خوانایی بیشتر انجام شد. [معیار و توضیح W3C](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html) به استفاده از رنگ‌های تعریف‌شده و احتمال کم‌رنگ‌تر دیده‌شدن حروف نازک اشاره می‌کند. [ماتریس تبدیل CSSWG](https://raw.githubusercontent.com/w3c/csswg-drafts/main/css-color-4/conversions.js) مرجع محاسبه بود.

فقط selector محدوده‌دار در `host-conversations.css` اضافه شد: توضیح Alert در `.sports-host-conversations` و `.sports-host-sheet` رنگ کامل والد را به ارث می‌برد. توکن رنگ، Kit مشترک، فونت، کارت و جزئیات باشگاه تغییر نکردند. رنگ نهایی در مرورگر فاقد alpha بود و نسبت اسمی sRGB به حدود ۴٫۷۶۴۷ در روشن و ۶٫۱۹۳۷ در تیره رسید. مقدارها، اندازه‌گیری پیکسل anti-alias یا نمایشگر wide-gamut و ادعای پذیرش کلی WCAG نیستند.

build بیزینس پس از تغییر با همان پروفایل سبک موفق شد (compile حدود ۹٫۳ ثانیه، TypeScript حدود ۱٫۸۳۵ ثانیه). preview تکی با heap ۲۵۶ MiB اجرا و متن خطای inbox در فارسی، روشن/تیره و ۳۹۰×۸۴۴ مشاهده شد. Sheet دارای داده، صفحه‌خوان و ماتریس کامل این بار اجرا نشدند. اولین تصویر روشن وسط انیمیشن تغییر تم بود و جایگزین تصویر پایدار شد؛ درخواست read-only برای getAnimations در ابزار مرورگر پشتیبانی نشد و از روش جایگزین برای دست‌کاری انیمیشن استفاده نشد. پس از بررسی، ظاهر به تیره برگشت، viewport reset شد، تب بسته و preview با خروج عادی متوقف شد.

[دادهٔ رنگ و حدود آزمون](host-error-contrast-2026-10-17.json) · [تصویر روشن](screenshots/low-resource-2026-10-17/business-chat-error-contrast-light-390.jpg) · [تصویر تیره](screenshots/low-resource-2026-10-17/business-chat-error-contrast-dark-390.jpg). بازراه‌اندازی دستی Docker برای ادامهٔ آزمون دیتابیس از کاربر درخواست شد؛ تا مشاهدهٔ سلامت واقعی، رفع محیط یا پذیرش فاز ثبت نمی‌شود.
