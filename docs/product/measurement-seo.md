# سنجش و SEO در معماری Gym4Me

مرجع: [طرح](blueprint.md) · [صفحات](flow-screen-map.md) · [مدل‌ها](data-model.md). این سند طراحی سنجه است؛ داده یا نرخ واقعی پایلوت هنوز موجود نیست.

## سنجه‌های اصلی پیشنهادی

منبع مرجع طراحی: concept/features، schema فعلی و فلوها. تعریف عملیاتی با grain و مخرج مشخص؛ هدف رشد پس از چهار هفته خط مبنای پایلوت تعیین شود. بر اساس مهارت Data/design-kpis، سه KPI اصلی کافی‌اند؛ بقیه diagnostic یا guardrail هستند.

| KPI                            | تعریف و محاسبه                                                                                                                                                   | منبع/زمان                                                                                                                                      | کاربرد و محدودیت                                                                              |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| خدمات معتبر انجام‌شده در هفته  | شمارش distinct ServiceFulfilment غیرابطال‌شده با وضعیت خرید روشن؛ کلاس و خصوصی به‌ازای ورزشکار/جلسه؛ زمین به‌ازای رزرو کامل؛ مربیگری آنلاین طبق معیار انجام مصوب | ServiceFulfilment با evidence از AttendanceRecord/Reservation/PlanAssignment و Order؛ هفتهٔ محلی شعبه یا timezone خدمت؛ اصلاحات با نسخه metric | ارزش عملیاتی؛ انواع خدمت جدا گزارش شوند تا زمین گروهی، صندلی کلاس و تحویل مربیگری مخلوط نشوند |
| بازگشت برای خدمت دوم در ۳۰ روز | کاربران با دومین خدمت معتبر در ۳۰ روز پس از اولین خدمت ÷ کاربران اولین خدمت که پنجره کامل ۳۰روزه دارند                                                           | cohort تاریخ اولین خدمت؛ server records                                                                                                        | تداوم ورزش؛ cohortهای نارس جدا، کارکنان/test حذف، فرد مشترک شعب یک‌بار                        |
| استفاده عملیاتی باشگاه         | شعب eligible که در ≥۳ روز کاری هفته عملیات واقعی پذیرش/رزرو/حضور داشته‌اند ÷ شعب راه‌اندازی‌شده eligible با ≥۳ روز کاری همان هفته                                | org/branch events؛ هفته محلی                                                                                                                   | عادت کاری و ماندگاری ابزار؛ آستانه ۳ روز فرض اولیه، شیفت/تعطیلی مستند                         |

driverهای اصلی: زمان کشف تا انتخاب خدمت؛ checkout completion به‌تفکیک روش پرداخت؛ فاصله اولین تا دومین حضور؛ سهم رزروهای حضوری ثبت‌شده در تقویم مشترک. فروش، وصول و درآمد انجام خدمت در داشبورد مالی ستون‌های مستقل باشند.

guardrailها: تخصیص ظرفیت/حق جلسه مضاعف با هدف پذیرش صفر؛ تعداد/عمر موارد پرداخت و refund نامشخص؛ شکست واقعی job؛ لغو از طرف باشگاه؛ ticket به‌ازای خرید تکمیل‌شده. عدد صفر بدون مشاهده و coverage کافی گزارش نشود.

## قرارداد رویداد

فیلدها: `eventId/eventName/schemaVersion/occurredAt/receivedAt/source/actorPseudonym/sessionRef/organizationId?/branchId?/entityRefs/properties`. event مالی/حضور پس از commit و با outbox؛ کلاینت فقط مشاهده/تعامل را ثبت می‌کند. time رخداد و دریافت جدا باشند، late arrival و correction به هفتهٔ معتبر نسبت داده شوند. timezone شاخه و تعریف metric version ثبت شود.

| گروه      | رویدادها                                                                                               | مرجع معتبر                                               |
| --------- | ------------------------------------------------------------------------------------------------------ | -------------------------------------------------------- |
| کشف       | discovery_searched، filter_applied، club_opened، service_selected                                      | کلاینت؛ impression با session و timestamp، نه داده خرید  |
| خرید/رزرو | quote_accepted، hold_created/expired، order_created، payment_verified، reservation_confirmed/cancelled | سرور؛ eventId/aggregateVersion و business reference یکتا |
| حضور/بسته | visit_recorded، attendance_confirmed/corrected، entitlement_consumed/restored، membership_renewed      | سرور؛ Visit با Attendance یکی نیست                       |
| مربیگری   | relationship_started/ended، plan_published، workout_completed، checkin_submitted، coach_feedback_sent  | metadata سرور؛ محتوای خصوصی وارد event نشود              |
| عملیات    | import_completed، refund_resolved، settlement_paid، device_result_unknown                              | نتیجه معتبر؛ ارسال فرمان یا شروع payout موفقیت نیست      |
| رشد       | recommendation_shown/selected، split_contribution_verified، beginner_first_service_completed           | توصیه کلاینت؛ پرداخت و خدمت سرور                         |

بدون phone، OTP، token، شناسه بانکی، متن پیام، عکس، وزن یا پاسخ محدودیت جسمانی در analytics عمومی. دسترسی KPI branch-scoped؛ انتشار بیرونی aggregate حداقلی و بدون هویت فرد. بازه نگهداری و رضایت tracking اختیاری در Q09 تعیین شود.

مرجع اندازه‌گیری آغاز PostgreSQL با read-only view/query محدود و snapshot تاریخ‌دار است؛ warehouse مستقل بعد از اثبات بار/نیاز. product analytics SDK مرجع پول/حضور نباشد. viewها metric definition و version داشته باشند؛ اصلاحات تاریخی بدون توضیح باعث تغییر بی‌خبر گزارش نشوند.

## SEO و صفحات عمومی

کشف باشگاه، جزئیات عمومی شعبه/مربی و صفحه شهر/رشته باید محتوای معتبر قابل خواندن در HTML داشته باشند. وب public runtime جدا از build static موبایل باشد. محتوای getClubs نمونه نباید صفحات SEO ساختگی تولید کند.

| گروه                                                            | سیاست پیشنهادی                                                                                                      |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| P06 discovery، P11 club، P12 gallery، P13 review، P14/P15 coach | index فقط محتوای منتشرشده و قابل استفاده؛ metadata مخصوص صفحه و canonical پایدار                                    |
| صفحه شهر/محله/رشته                                              | route جدید فقط با عرضه واقعی و محتوای مفید؛ صفحه صفرنتیجه/thin را خودکار ایندکس نکنیم                               |
| P10 slots                                                       | محتوای معرفی و شرایط ثابت از کاتالوگ؛ date/time/session filter صفحات ایندکس‌شونده نامحدود نسازد؛ رزرو فقط داده live |
| checkout، account، training، پیام، پشتیبانی، native             | noindex و authorization واقعی؛ robots.txt ابزار حفظ حریم خصوصی نیست                                                 |
| business/admin                                                  | authentication/authorization و noindex؛ خارج sitemap                                                                |

جزئیات canonical: `/discovery/clubs/:clubId` مسیر فعلی اصلی است؛ slug تزئینی آینده alias با redirect دائمی پس از بررسی. فیلترهای date/time صرفاً state ناوبری‌اند. برای نتایج شهر/رشته curated که ارزش مستقل دارند canonical خودشان، نه همیشه صفحهٔ اصلی discovery. هر صفحه pagination معتبر canonical خودش را داشته باشد؛ راهنمای قدیمی rel next/prev شرط ایندکس Google نیست. canonical/noindex/redirect را بدون سیاست روشن با هم مخلوط نکنیم. [راهنمای Google](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls)

sitemap فقط URLهای public approved، قابل دسترسی با 200 و canonical؛ lastmod تغییر محتوای واقعی. باشگاه private/تعلیق‌شده بدون افشای محتوای خصوصی پاسخ مناسب بگیرد؛ حذف دائمی 404/410 طبق تصمیم محتوا. robots اجازه فایل CSS/JS لازم بدهد.

metadata: title/description واقعی، OG مناسب از عکس مجاز، html lang و RTL. فارسی/انگلیسی فقط اگر هر دو URL/محتوای واقعی دارند hreflang؛ تغییر زبان فعلی در UI به‌تنهایی دو URL canonical ایجاد نمی‌کند.

JSON-LD پیشنهادی LocalBusiness/SportsActivityLocation و BreadcrumbList براساس محتوای واقعاً قابل مشاهده و properties معتبر schema. review/aggregateRating تنها با eligibility جاری Google و دادهٔ واقعی؛ خودکار وعده ستاره rich result ندهیم. قبل اجرا قواعد روز Google و Schema.org بررسی شوند. تاریخ/قیمت/آدرس markup با صفحه یکسان باشد.

## کیفیت و پایش

هدف پیشنهادی روی صدک ۷۵ کاربران واقعی: LCP≤۲٫۵s، INP≤۲۰۰ms، CLS≤۰٫۱. این‌ها هدف کیفیت‌اند، نتیجه آزمایش فعلی نیستند. [تعریف Core Web Vitals](https://web.dev/articles/vitals)

hero با ابعاد مشخص، بهینه‌سازی تصویر وب، lazy تصویر پایین صفحه، فونت محلی موجود و split نقشه/گالری سنگین؛ نسخه native asset pipeline مناسب خودش دارد. cache محتوای عمومی با نسخهٔ انتشار؛ quote و ظرفیت قطعی یا صفحات private در shared cache نروند. مشاهده زمان snapshot برای availability کافی نیست؛ در purchase دوباره verify شود.

پذیرش: HTML عمومی در پاسخ سرور، canonical/sitemap هماهنگ، ID تازه بدون build مجدد وب/native، schema معتبر، تصویر مفقود بدون جابه‌جایی layout، private data در crawler output غایب و رویدادهای مالی با دفتر قابل تطبیق.
