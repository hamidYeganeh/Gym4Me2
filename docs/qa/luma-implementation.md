# Luma → Gym4Me: نگاشت اجرا و پذیرش

وضعیت ۱۷ اکتبر ۲۰۲۶. زمان‌های حرکت ۱۸۰/۳۰۰/۳۲۰ میلی‌ثانیه تصمیم اجرایی هستند؛ ضبط قابل اتکای حرکت Luma در مرورگر در دسترس نبود.

به‌روزرسانی۱۸ اکتبر: [هستهٔ PH0 وب](ph0-web-core-2026-10-18.md) نگاشت فرم/حساب، Sheet مشترک، Back عادی، inventory۹۶ مسیر و۱۴۲ مصرف‌کننده، برد توکن و trace محدود را اضافه می‌کند. زمان‌های تنظیم‌شده هنوز اندازه‌گیری حرکت Luma نیستند؛ پذیرش کامل فاز باز است.

ادامهٔ همان روز: [Back، اسکرول و PNG](ph0-navigation-2026-10-18.md)،۹۹ آزمون و build سه وب، اصلاح commit قفل Back و scroll anchoring، رسید دو Back با فاصلهٔ۸۰ms و مرجع PNG جدید را ثبت می‌کند.۷۸/۸۴ جفت دقیق‌اند و شش جفت اختلاف حداکثر۱ واحد رنگ دارند؛ ورودی اسکرول خیلی زود، پوشش کامل بصری/رفتاری و دستگاه بازند.

| الگو | مسیر Gym4Me | API | حالت‌ها و شاهد |
| --- | --- | --- | --- |
| خانه و رزرو | `/`، `/bookings`، `/bookings/detail` | `sports/account/bookings/page`، `sports/account/bookings/:id`، `sports/services` | نزدیک‌ترین سه رزرو، تب‌های صفحه‌بندی‌شده، تاریخچهٔ بیش از ۱۰۰ رکورد و کنترل حساب؛ [شاهد](booking-history-2026-10-17.md) |
| کشف و خدمت | `/discovery`، `/services`، `/services/detail`، `/discovery/clubs/[clubId]/slots` | `sports/services` و کاتالوگ PH1 | شهر/شعبه، زمان، ظرفیت، خطا؛ کارت‌های موجود محافظت شدند |
| ثبت‌نام و بلیت | `/checkout`، `/checkout/mock-gateway`، `/checkout/status`، `/tickets/view` | quote، order، payment/verify/query، callback امضاشده، QR | ماک سامان، تلاش تکرارپذیر، پرداخت موفق/شکست/نامشخص، hold منقضی و بلیت در بازه جلسه؛ ۲۷ آزمون PostgreSQL و فلو مرورگر پیشین |
| عضویت و انتظار | `/memberships`، `/memberships/detail`، `/waitlist` | memberships، entitlement، waitlist | مانده، فریز، تمدید/ورود به انتظار، پیشنهاد؛ آزمون هم‌زمانی و بدون شارژ خودکار |
| تقویم و دعوت | `/calendars`، `/calendars/detail`، `/invitations/sports` در ورزشکار؛ `/calendar` و مدیریت دعوت در `/services` بیزینس | calendars/page، :id/services، follow، host/calendar، invitations و host recipients/answer/cancel | تقویم عمومی/دنبال‌شده با pagination، جست‌وجو، فرم metadata نسخه‌دار و حالت فقط‌خواندنی؛ دعوت بدون ظرفیت؛ Back پس از ورود رفع شد. [تقویم](sports-calendars-2026-10-17.md) و [دعوت](sports-invitations-2026-10-17.md)؛ دستگاه و پذیرش کامل T069 بازند |
| گفتگو | `/messages`، `/messages/conversation`، `/messages/details`، `/admin/operations` | conversations/page، messages، archive، close، report/decision | عضویت معتبر، تصویر خصوصی، pagination فهرست/پیام، وضعیت نسخه‌دار و دلیل‌دار، حفظ intent در تعارض و ۳۶ حالت رابط؛ [شاهد](communication-lists-and-host-state-2026-10-17.md)؛ دستگاه/پس‌زمینه و staging 0029/0030 بازند؛ guard گیرنده و چرخهٔ اعلان با آزمون جدا بررسی شده‌اند، نه پذیرش تحویل بیرونی |
| گفتگوی میزبان در وب بیزینس | `/messages` و `/messages/[conversationId]` در بیزینس | `sports/community/host/conversations/page` و `host/conversations/:id`؛ فرمان‌های مجاز پیام/ترجیحات/وضعیت | scope مجموعه/شعبه، inbox/archive، ۲۰→۲۵ ردیف با focus، ۵۰ پیام نخست در مرورگر؛ ۶۹ آزمون تجارت شامل دسترسی منفی و cursor شعبه. پیام/تصویر و Sheet در کد متصل‌اند؛ آخرین flex و محافظ focus/read فقط types/lint شده‌اند و پذیرش کامل بصری/رفتاری باز است. [شاهد](business-host-chat-2026-10-17.md) |
| میزبانی | `/host` و `/business/services` | service policy/version، occurrences، approval، coupons، images | محدودیت نقش سازمان/شعبه؛ تخفیف، تصویر نسخه‌دار، شرایط مخاطب و برنامهٔ تکرارشونده ساخته‌اند؛ پذیرش کامل UI و تنظیمات عملیاتی باز |
| منابع و تقویم ظرفیت | `/business/resources` | `business/sports/resources`، `business/sports-resources/:id/settings`، `blocks`، `calendar` | فضای مشترک، buffer، تعمیرات/تعطیلی و رفع دلیل‌دار؛ [شاهد مدل و پنل](resource-availability-2026-10-17.md) |
| عملیات | `/business/reception`، `/business/payments`، `/business/reports`، `/business/imports`، `/admin/operations` | QR/check-in، cash/refund، report/import/reconcile | جدایی تردد و حضور، پرداخت حضوری و تطبیق؛ سناریوهای کامل پذیرش باز |
| اعلان | `/notifications`، `/notifications/preferences` | notifications/page، :id/read، preferences | all/unread، read تکرارپذیر، متن دارای زمینه، focus پس از read و خطای نبود API؛ [شاهد](communication-lists-and-host-state-2026-10-17.md)؛ guard گیرنده، یادآور و اعلان مالی در PostgreSQL آزموده شده‌اند؛ [چرخهٔ مالی](order-notifications-2026-10-17.md) و [زمان‌بندی](scheduled-notifications-2026-10-17.md)؛ staging 0029/0030 و تحویل بیرونی بازند |
| حساب | `/profile`، `/profile/settings`، `/documents`، `/notifications` | privacy/account، sports documents/preferences | خروجی/حذف، زبان، ظاهر، اعلان و مدارک؛ بررسی نسخه‌دار مدرک در پنل بیزینس، QA دستگاه باز |

کد سرویس و migrationها در `apps/api/src/modules/commerce` و `apps/api/database/migrations/0011` تا `0030` است؛ staging محلی در آخرین پذیرش روی `0028` مانده و ارتقای 0029/0030 هنوز شاهد بکاپ/بازیابی ندارد. قراردادهای تایپ‌دار در `packages/api/src/sports` قرار دارند. `scripts/check-protected-design.mjs` با `docs/qa/protected-design-baseline.json` ۵۹ فایل محافظت‌شده را کنترل می‌کند؛ این مقایسهٔ هش جایگزین پذیرش پیکسلی روشن/تیره و فارسی/انگلیسی نیست.

آزمون‌های PostgreSQL رزرو آخرین صندلی، آخرین جلسهٔ بسته، منبع مشترک، پرداخت تکراری/دیرهنگام، جابه‌جایی ناموفق، QR تکراری، بازپرداخت، انتظار، تخصیص اتمیک دوره و دسترسی متقاطع دو سازمان را پوشش می‌دهند. `test:commerce` و `scripts/verify-ph1.sh` روی همان دیتابیس `_test` که fixture مرورگر استفاده می‌کند اجرا می‌شوند و می‌توانند دادهٔ آن را پاک کنند؛ محافظ `scripts/check-ui-fixture.mjs` اکنون اجرای این مسیرها را هنگام فعال‌بودن fixture روی 7088 متوقف می‌کند. در ۱۶ اکتبر پس از بازآزمایی PH1، ارتباط ورزش دو باشگاه و شش خدمت ورزشی fixture بازسازی و از API با شمار ۲ باشگاه/۶ خدمت بررسی شد؛ شناسهٔ باشگاه‌های باز مانده حفظ شد.

پایهٔ PH0 تکمیل محلی دارد، اما پذیرش بصری بازطراحی Luma در PH0 هنوز باز است. پایان PH1/PH2 هنوز اعلام نشده است. باقی‌ماندهٔ محلی: آزمون و رفع نقص همهٔ مسیرهای UI و حرکت در ۳۶۰/۳۹۰/۴۳۰، فارسی/انگلیسی و روشن/تیره؛ تکمیل چرخهٔ اسناد/تخفیف/عملیات، آزمون تعارض نقش‌ها، اجرای remote CI و دستگاه. پذیرش staging نیازمند بکاپ رمزگذاری‌شدهٔ زمان‌بندی‌شده، مقصد مستقل دفتر حذف، اعلان بیرونی و آزمون restore است. فروش واقعی علاوه بر آن به پذیرنده، مالک وجه، سیاست نهایی و مجموعه‌های پایلوت نیاز دارد.


برش تقویم/فرم۱۸ اکتبر: [نگاشت صفحه، API، حالت و شاهد](ph0-calendar-2026-10-18.md)، حفظ داده در خطای pagination، فوکوس امن/شمارنده، reflow، چهار حالت اعتبارسنجی محلی فرم،۱۰۳ تست و build جدید application را ثبت می‌کند. این نگاشت به دیگر خانواده‌ها یا دستگاه تعمیم داده نمی‌شود.

برش فوکوس۱۸ اکتبر: [۲۵ مشاهدهٔ وب و محدودیت‌ها](ph0-focus-2026-10-18.md)، اصلاح حلقهٔ مشترک/فایل/کارت و تأخیر transition؛ سه build جدید پاس‌اند. پذیرش کامل دسترس‌پذیری و PH0 باز است.

برش صحت capture۱۸ اکتبر: [تطبیق backing/DPR و ثبات frame](ph0-capture-2026-10-18.md)،۶۰ کارت فوکوس‌شدهٔ فعلی را در دو زبان/تم و سه عرض قابل بازبینی کرد. مجموعهٔ اولیهٔ دارای frame قدیمی رد و حفظ شد. مقایسهٔ قبل/بعد و پذیرش PH0 همچنان باز است.

برش ورود۱۸ اکتبر: [۹۶ حالت سه اپ](ph0-auth-2026-10-18.md)، کف هدف لمس/فونت و h1 فرم را بررسی کرد. سه build جدید پاس‌اند؛ tooltip بومی required در فارسی انگلیسی باقی است و خطای inline محلی/پذیرش جامع PH0 بازند.

برش خطای ورود۱۸ اکتبر: [۲۴۰ حالت نامعتبر و۱۲ probe۴۰۵](ph0-auth-errors-2026-10-18.md)، خطای inline محلی، شناسهٔ یکتا و بازگشت/دید فوکوس را ثبت کرد.۶ قرارداد و سه build نهایی پاس‌اند؛ ورود و دستگاه واقعی و پذیرش کامل PH0 بازند.
