# بازگشت فوکوس دیالوگ برنامه‌ای — ۱۹ اکتبر ۲۰۲۶

ایراد ثبت‌شدهٔ ادمین پس از Escape بررسی شد: `TermEditor`، `PlaceEditor` و `DecisionDialog` محرک `DialogTrigger` ندارند. Radix نصب‌شده هنگام بستن modal، رفتار پیش‌فرض FocusScope را متوقف و فقط `triggerRef` را متمرکز می‌کند؛ برای این مصرف‌کنندگان مرجع خالی است و فوکوس روی BODY می‌ماند.

`DialogContent` اکنون پیش از autofocus، بازکننده و مسیر کامل را نگه می‌دارد. بعد از handler سفارشی و فرصت بازگشت پیش‌فرض Radix، فقط modalای که فوکوسش روی BODY مانده به بازکنندهٔ معتبر بازمی‌گردد. `preventDefault` سفارشی، nonmodal، فوکوس جدید، مسیر/query/hash جدید، modal فعال دیگر و بازکنندهٔ حذف‌شده/پنهان/غیرفعال مانع fallback هستند. والد بازِ دیالوگ تو‌در‌تو می‌تواند بازکننده را در خود داشته باشد. فوکوس جایگزین با `preventScroll` انجام می‌شود. هیچ DOM wrapper تازه یا تغییر در ۵۹ فایل محافظت‌شده ایجاد نشد.

## بررسی کد

۷ تست تازهٔ helper همراه ۸ تست فوکوس/ناوبری مرتبط، مجموع۱۵ مورد، پاس‌اند؛ [log](baselines/ph1-dialog-focus-2026-10-19/focus-tests.log). این‌ها آزمون رفتار helper با DOM ساختگی‌اند؛ اثبات تمام چرخهٔ React/Radix یا اجرای واقعی nested/nonmodal نیستند. TypeScript UI و ESLint سه فایل production، check-copy، اسکن وابستگی و محافظ۵۹ پاس‌اند. بازبینی مستقل Spec و Standards ایراد قطعی باقی‌مانده در همین اصلاح پیدا نکرد؛ نتیجه اسکن جامع امنیتی نیست.

## خروجی بومی

export نهایی موبایل با Next16.4/Webpack، یک worker و heap640MiB ساخته شد. نشانی API زمان build برابر `https://gym4me.ir/api/v1` است؛ این مقدار، فعال‌بودن HTTPS/API روی دامنه را ثابت نمی‌کند. خروجی۳۹۶ فایل و۲۰٬۳۷۲٬۵۷۲ بایت دارد؛ خانه، ورود OTP، جزئیات باشگاه و privacy موجودند و staging موقت باقی نمانده است. [رسید و هش مسیرها](baselines/ph1-dialog-focus-2026-10-19/native-export.json)، [log ساخت](baselines/ph1-dialog-focus-2026-10-19/native-build.log).

این خروجی نصب یا آزمون Android/iOS نیست. Android متصل و Xcode کامل در آخرین بررسی در دسترس نبودند. بکاپ مستقل، CI راه‌دور و پذیرش کامل PH0/PH1 باز می‌مانند؛ تصمیم کاربر برای ادامهٔ محلی و عدم تکرار GitHub403 حفظ شد.

## ساخت و مرورگر واقعی

هر سه build تولیدی کامل و ترتیبی، با همان محدودیت حافظه/worker، پاس شدند؛ [log ورزشکار](baselines/ph1-dialog-focus-2026-10-19/application-build.log)، [کسب‌وکار](baselines/ph1-dialog-focus-2026-10-19/business-build.log)، [ادمین](baselines/ph1-dialog-focus-2026-10-19/admin-build.log).

| اپ | BUILD_ID |
| --- | --- |
| Application | `6ivgxvtVgP2-IIGrwgy9c` |
| Business | `imeXbTaWvKXXu6CHn8otG` |
| Admin | `9hsRwB0ofGfZI2K9qkMOv` |

[۸۸۲ ورودی کد](baselines/ph1-dialog-focus-2026-10-19/build-inputs.json) از قبلِ ساخت تا پایان آزمون ثابت بودند؛ [رسید](baselines/ph1-dialog-focus-2026-10-19/source-receipt.json). در ساخت native فقط فایل خودکار `next-env.d.ts` ورزشکار تغییر کرد و پیش از ساخت وب، بایت‌های ذخیره‌شدهٔ اولیه بازیابی شد. سه فایل خودکار در پایان نیز دقیقاً با نسخهٔ ذخیره‌شده برابر بودند. خروجی native با API عمومیِ پیکربندی‌شده و خروجی وب با proxy محلی ساخته شده‌اند.

NestJS و PostgreSQL اختصاصی `gym4me_ph1dialogs_1a14e17_test`، SMS ساختگی و حساب‌های fixture دارای رضایت آزمایشی استفاده شدند. در هر لحظه فقط یک frontend تولیدی فعال بود؛ Business در این برش ساخته شد و در مرورگر اجرا نشد. زبان فارسی/تم تیره، ادمین در۱۲۸۰×۷۲۰ و ورزشکار در۳۶۰×۷۸۰ بررسی شدند.

| حالت | نتیجهٔ پایدار پس از جداشدن dialog |
| --- | --- |
| دسته‌بندی: Enter روی بازکننده، سپس Escape | BUTTON «افزودن مورد»، dialog=0؛ [رسید](baselines/ph1-dialog-focus-2026-10-19/term-escape.json) |
| دسته‌بندی: انصراف | همان بازکننده؛ [رسید](baselines/ph1-dialog-focus-2026-10-19/term-cancel.json) |
| دسته‌بندی: بستن | همان بازکننده؛ [رسید](baselines/ph1-dialog-focus-2026-10-19/term-close.json)، [تصویر](baselines/ph1-dialog-focus-2026-10-19/admin-focus.png) |
| جغرافیا: افزودن کشور و Escape | BUTTON «افزودن کشور»؛ [رسید](baselines/ph1-dialog-focus-2026-10-19/place-escape.json) |
| تصمیم ادمین: بازکردن تعلیق ورزشکار ساختگی و انصراف | BUTTON «تعلیق» در همان ردیف ورزشکار؛ [رسید](baselines/ph1-dialog-focus-2026-10-19/decision-cancel.json) |
| privacy: بازکردن حذف و «نگه‌داشتن حساب» | handler سفارشی به BUTTON «درخواست حذف حساب» برگشت؛ dialog=0 و عرض سند/viewport هر دو۳۶۰؛ [رسید](baselines/ph1-dialog-focus-2026-10-19/privacy-custom-cancel.json)، [تصویر](baselines/ph1-dialog-focus-2026-10-19/privacy-focus-360.png) |

ثبت دسته‌بندی، کشور، تعلیق یا حذف حساب انجام نشد. بازگشت فوکوس پس از Escape ممکن است در مشاهدهٔ بلافاصلهٔ اولیه هنوز BODY باشد؛ رسید بالا پس از جداشدن محتوا و callback بستن ثبت شده است. بازگشت پایدار قبلیِ BODY در همان سناریوی دسته‌بندی رفع شد. رفتار normal `DialogTrigger`، nonmodal، nested، تغییر مسیر و modal جدید در این برش مرورگر اجرا نشد؛ حفظ قرارداد آن‌ها با بازبینی و تست محدود helper بررسی شد. این شش سناریو پذیرش جامع focus/AA، صفحه‌خوان یا دستگاه نیستند.

[HTTP پالایش‌شده](baselines/ph1-dialog-focus-2026-10-19/http.json) فقط درخواست‌های خواندن حساب/حریم خصوصی و وضعیتشان را دارد؛ cookie، token، OTP و body ثبت نشده‌اند. [گراف تازه](ph0-route-contracts-dialog-focus-2026-10-19.json) شش حالت این برش را به GET200 حساب در workspace ادمین و GET200 privacy ورزشکار متصل می‌کند. این اتصال، زمینهٔ حساب احرازشدهٔ صفحه است؛ لغو دیالوگ درخواست نوشتن ندارد و ادعای آزمون mutation دسته‌بندی/جغرافیا/تعلیق نیست. توالی دستی گزارش مبنای انتساب است؛ شناسهٔ هم‌بستگی مشترک وجود ندارد. شش حالت privacy تاریخی با snapshot و اختلاف ورودی build خودشان حفظ شدند. شواهد پروفایل گزارش قبلی با تغییر helper مشترک، شاهد تازهٔ این درخت محسوب نمی‌شوند و در manifest تازه بازبرچسب‌گذاری نشده‌اند.

## پاک‌سازی و وضعیت

تب‌های۱۴/۱۵ و همهٔ سرورهای متعلق به این برش بسته شدند؛ پورت‌های۷۳۹۱/۷۳۹۲/۷۳۹۳/۷۳۹۸/۷۳۹۹ شنونده ندارند. پس از cleanup fixture، users/organizations/sessions برابر۰/۰/۰ بود؛ DB اختصاصی حذف شد و postgres-test به خاموش اولیه برگشت. storage و تب۱ کاربر دست‌نخورده‌اند و viewport reset شد؛ [رسید](baselines/ph1-dialog-focus-2026-10-19/cleanup.json).

ایراد مشخص دیالوگ ادمین در P0-03/P0-08/P0-10 با حدود بالا بسته است؛ خود ردیف‌ها و PH0/PH1 کامل بازند. ماتریس باقی‌ماندهٔ وب/دسترس‌پذیری، دستگاه، HTTPS عملیاتی، اجرای سبز remote و بازیابی از بکاپ مستقل هنوز پذیرش نشده‌اند.
