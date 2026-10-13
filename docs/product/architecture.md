# معماری پیشنهادی Gym4Me

مرجع: [طرح کامل](blueprint.md) · [مدل‌ها](data-model.md) · [فلو/صفحات](flow-screen-map.md) · تاریخ ۲۰۲۶/۱۰/۱۲.

## وضعیت موجود و هدف

موجود: Next.js 16.4.0، React 19.3.0، Capacitor 8، NestJS 11، PostgreSQL/Drizzle، pnpm workspace و Turborepo؛ بسته‌های theme، ui و i18n؛ هویت وب و کاتالوگ پایه. نسخه‌ها از package.json خوانده شده‌اند. رزرو/پرداخت/تمرین، worker، دفتر مالی، نشست native و کاتالوگ زندهٔ UI هنوز تحویل کامل نشده‌اند.

هدف پیشنهادی: modular monolith. مرزها به مسئلهٔ کسب‌وکار وابسته‌اند؛ چند instance از API و یک یا چند worker می‌توانند از یک release و دیتابیس استفاده کنند. این انتخاب تراکنش ظرفیت، حق استفاده و سفارش را ساده نگه می‌دارد. استخراج سرویس مستقل زمانی بازبینی شود که حجم، استقلال تیم یا نیاز انتشار جدا اندازه‌گیری شده باشد.

## مالکیت ماژول‌ها

| ماژول                         | مسئولیت                                 | عملیات بین ماژولی                                       |
| ----------------------------- | --------------------------------------- | ------------------------------------------------------- |
| identity / organizations      | هویت، نشست، کارکنان و محدودهٔ شعب       | Principal و policy دسترسی                               |
| catalog / media               | محتوای عمومی، بررسی انتشار، فایل        | read model عمومی؛ دادهٔ خصوصی از این خروجی عبور نکند    |
| offerings / scheduling        | خدمت، نسخه قیمت/قانون، منابع و جلسات    | محاسبه quote و گزینهٔ قابل رزرو                         |
| booking                       | نگهداری ظرفیت، رزرو، انتظار و جابه‌جایی | هماهنگ‌کنندهٔ ظرفیت و حق استفاده                        |
| memberships                   | بستهٔ خریداری‌شده و دفتر جلسه           | reserve/consume/release حق استفاده در transaction مشترک |
| commerce / finance            | سفارش، تلاش پرداخت، استرداد، ثبت مالی   | تأیید پرداخت و fulfilment تراکنشی                       |
| attendance / access           | مجوز ورود، تردد و حضور واقعی            | مصرف جلسه و ثبت انجام خدمت                              |
| coaching / workouts           | رابطهٔ شاگرد، برنامه و اجرا             | دسترسی رابطه‌محور؛ سابقهٔ برنامه مستقل                  |
| communication / notifications | پیام خصوصی و اعلان                      | ارسال پس از commit و با دسترسی جاری                     |
| settlements / subscriptions   | قرارداد، درآمد مربی، پلن بیزینس         | محاسبه براساس نسخه و انجام خدمت                         |
| hardware                      | کمد و ارتباط دستگاه                     | ثبت فرمان/پاسخ؛ reconciliation فیزیکی                   |
| community / operations        | نظر، تخلف، تیکت و import                | اقدام اصلاحی از command صاحب دامنه                      |
| growth / analytics            | دعوت تیم، پیشنهاد و سنجش                | از هستهٔ رزرو استفاده کند؛ مرجع ظرفیت جدا نسازد         |

هر ماژول دادهٔ خود را می‌نویسد. ماژول دیگر از use case یا query رسمی استفاده می‌کند. برای گردش حساس، orchestrator یک transaction context صریح را به سرویس‌های درگیر می‌دهد؛ هیچ سرویس به‌صورت پنهانی transaction مستقل باز نکند. projectionها قابل بازسازی‌اند؛ جدول مبنا حذف یا بازنویسی نشود.

ساختار پیشنهادی در هر feature: controller/contract، application use cases، domain policies و infrastructure repository/provider. برای CRUD ساده لایهٔ اضافی بی‌مصرف نسازیم. اشتراک schema ورودی با UI از قرارداد تولیدشده باشد؛ ORM و Nest provider به مرورگر صادر نشوند. پیشنهاد بسته‌های جدید `@repo/api-client` و `@repo/contracts` است، با نسخهٔ سازگار؛ فعلاً این‌ها موجود نیستند.

## API و مهاجرت مسیرها

پایهٔ جدید `/api/v1/{domain}/{feature}` است. API موجود `/catalog/clubs` حفظ شود؛ مثال قدیمی `/catalog/gyms` در api-conventions قرارداد ساخته‌شده نیست. مسیرهای فعلی business/admin تدریجی به domain منتقل شوند؛ هر تغییر با alias موقت، قرارداد و اعلان deprecation انجام شود. نام اپ یا `x-gym-client` به‌تنهایی مجوز نیست.

| مسیر نمونه                                                | کاربرد                                                          |
| --------------------------------------------------------- | --------------------------------------------------------------- |
| `GET /catalog/clubs` و `/catalog/clubs/:id`               | جست‌وجو و جزئیات عمومی موجود؛ فیلترها توسعه می‌یابند            |
| `POST /commerce/quotes`                                   | ساخت quote شخصی ذخیره‌شده با no-store؛ نتیجهٔ پیشنهادی، نه خرید |
| `GET /scheduling/availability?branchId=&serviceId=&date=` | بازه‌ها و ظرفیت مشاهده‌شده                                      |
| `POST /booking/holds`                                     | قفل ظرفیت و حق استفاده با مهلت، پاسخ `holdId/expiresAt/version` |
| `POST /commerce/orders` و `/commerce/orders/:id/payments` | سفارش با snapshot و تلاش پرداخت                                 |
| `GET /commerce/orders/:id/status`                         | وضعیت قطعی/نامشخص پس از بازگشت از درگاه                         |
| `POST /booking/reservations/:id/cancel` و `/reschedule`   | تغییر وضعیت با policy و نسخهٔ مورد انتظار                       |
| `GET /memberships/entitlements`                           | مانده و گردش مجاز کاربر                                         |
| `POST /attendance/check-ins` و `/attendance/records`      | تردد و حضور مستقل                                               |
| `GET /coaching/students` و `POST /workouts/plan-versions` | شاگرد مجاز و برنامه                                             |
| `POST /workouts/sessions/:id/sets`                        | ثبت واقعی با شناسهٔ عملیات کلاینت                               |
| `POST /settlements/statements/:id/approve`                | تأیید صورت‌حساب مجاز                                            |
| `POST /hardware/commands`                                 | درخواست دستگاه؛ نتیجهٔ ارسال برابر انجام نیست                   |
| `POST /operations/tickets` و `/operations/imports`        | پروندهٔ رسیدگی و import                                         |

تمام مسیرهای غیر از کاتالوگ موجود، پیشنهاد قراردادند. pagination محدود، sort پایدار، فیلتر allowlist و query دارای tenant لازم‌اند. خطا: `code/message/requestId/fieldErrors/retryable`؛ `CAPACITY_CHANGED`، `HOLD_EXPIRED`، `PRICE_CHANGED` و `PAYMENT_PENDING` رفتار مشخص UI داشته باشند. تغییرات متداخل با `expectedVersion` یا `If-Match` رد شوند.

`Idempotency-Key` برای ساخت سفارش، hold، لغو، ثبت حضور، refund و انتقال مالی؛ scope شامل actor، دامنه و operation باشد. hash بدنه ذخیره شود؛ استفادهٔ همان key با بدنهٔ دیگر خطا بدهد. برای callback و provider، شناسهٔ رویداد/مرجع provider نیز unique است. کلید انقضای کوتاه تنها سد مالی نیست؛ unique مرجع business اثر هم حفظ شود.

## سازگاری ظرفیت و زمان

برای منابع انحصاری، `tstzrange` نیم‌باز `[start,end)` و exclusion constraint روی conflict unit + range. سالن کامل تمام واحدهای اتمی بخش‌هایش را اشغال کند؛ دو نیمهٔ مستقل فقط واحد خود را. این طراحی تداخل والد/فرزند را واقعاً کنترل می‌کند. [مستند PostgreSQL](https://www.postgresql.org/docs/18/rangetypes.html#RANGETYPES-CONSTRAINT)

برای کلاس، سالن و زمان مربی یک‌بار برای occurrence گرفته شوند؛ رزرو هر ورزشکار فقط seat pool همان occurrence را مصرف کند. ظرفیت کلاس یک عدد بدون قفل نباشد: seat pool در transaction قفل و ظرفیت آزاد محاسبه/به‌روز شود. رزرو دوره که صندلی همه جلسات را تضمین می‌کند، همه seat poolها را به ترتیب پایدار قفل کند و all-or-nothing باشد.

برای مربی در سازمان‌های مختلف، CoachTimeClaim سراسری به user وصل شود؛ جزئیات جلسات سازمان دیگر خصوصی بماند. تداخل مستقیم با exclusion و فاصلهٔ رفت‌وآمد با قفل سراسری ردیف CoachProfile مربوط به user و بررسی همسایهٔ قبلی/بعدی کنترل شود؛ قفل صرفاً ردیف‌های جلسه، تقویم خالی را در برابر درج هم‌زمان محافظت نمی‌کند. lock order سراسری: تقویم مربی، conflict unitها، seat poolها، bucketهای حق استفاده، سفارش و تلاش پرداخت؛ شناسه‌ها در هر گروه مرتب شوند. [قفل‌های PostgreSQL](https://www.postgresql.org/docs/18/explicit-locking.html)

انقضا با زمان دیتابیس معتبر است. partial index بر پایهٔ `expiresAt > now()` طراحی نشود. پیش از تخصیص، زیر همان قفل holdهای منقضی در دامنهٔ مربوط آزاد شوند؛ worker فقط پاک‌سازی و اعلان را تسریع می‌کند. در هر خرید، ظرفیت و قیمت دوباره بررسی شوند؛ cache نتیجهٔ جست‌وجو ضمانت فروش نیست.

## پرداخت و اثر کسب‌وکار

تماس درگاه بیرون transaction دیتابیس انجام شود. مراحل: ایجاد سفارش/تلاش پرداخت و outbox ← درخواست درگاه ← verify معتبر ← transaction کوتاه ثبت نتیجه، تخصیص وجه، فعال‌سازی عضویت/رزرو و outbox. امضای معتبر در صورت پشتیبانی provider و verify سمت سرور لازم‌اند؛ redirect مرورگر اثبات پرداخت نیست.

سفارش state مستقل از پرداخت و رزرو دارد. پرداخت بعد از انقضای hold: ظرفیت دوباره گرفته شود؛ در نبود ظرفیت fulfilment متوقف و refund/reconciliation ساخته شود. retry درگاه با همان مرجع باشد؛ timeout مساوی شکست قطعی نیست. مجموع تخصیص‌ها از وجه تأییدشده و مجموع refundها از مبلغ مجاز بیشتر نشوند. جابه‌جایی، رزرو قدیم را تا حصول تعهد جدید نگه دارد؛ اختلاف قیمت و شکست خارجی مسیر جبران مشخص داشته باشند.

مالی: journal متوازن و append-only، مبلغ صحیح IRR؛ نمایش تومان با تبدیل صریح. پول، حق جلسه، درآمد مربی و وجه تسویه‌شده مدل مستقل دارند. اصلاح با سند معکوس/اصلاحی انجام شود. posting متوازن با deferred constraint trigger یا posting procedure قابل آزمون enforce شود؛ جمع چند ردیف با CHECK ساده ممکن نیست. فروش بسته و خدمت انجام‌شده در گزارش تفکیک شوند؛ سیاست شناسایی درآمد نیازمند تصمیم مالی است.

## کارهای پایدار و ارسال

پیشنهاد آغاز: جدول OutboxEvent و JobRecord در PostgreSQL، claim با `FOR UPDATE SKIP LOCKED`، lease، retry با backoff، سقف تلاش و صف رسیدگی. publish پس از commit؛ پردازش at-least-once و consumer idempotent. رویداد دارای aggregateVersion و schemaVersion باشد؛ اعلان رزرو لغوشده به‌عنوان تأیید فعال ارسال نشود. queue سریع‌تر مانند Redis/BullMQ فقط پس از اندازه‌گیری، با حفظ outbox و DB مرجع بازبینی شود؛ اکنون dependency آن موجود نیست.

موارد worker: verify/reconcile پرداخت، انقضای hold، انتظار، یادآوری، پردازش فایل، import/export، صورت‌حساب و sync دستگاه. worker API call طولانی را با transaction باز نگه ندارد. صف عقب‌افتاده باید از روی عمر قدیمی‌ترین job و تعداد شکست‌ها پایش شود.

## وب و native

وب عمومی: محتوای کاتالوگ server-rendered با metadata/canonical؛ ظرفیت و مبلغ شخصی تازه و no-store. API فعلی همه خروجی‌ها را no-store می‌کند؛ cache محتوای عمومی فقط پس از تفکیک خروجی عمومی و invalidation نسخه‌ای اضافه شود.

موبایل موجود static export است. مسیرهای پویا با شناسهٔ نمونه نمی‌توانند همه باشگاه‌های آینده را پوشش دهند. پیشنهاد: renderer و کامپوننت مشترک، وب با مسیر فعلی `/discovery/clubs/:clubId`، native با shellهای ثابت مانند `/native/club?clubId=…` و `/native/slots?clubId=…` و route resolver برای deep link. یک باشگاه تازه باید بدون rebuild باز شود. redirect، cookie server و ISR در static export قابل اتکا نیستند؛ راهبرد مطابق [docs نصب‌شدهٔ Next](../../apps/application/node_modules/next/dist/docs/01-app/02-guides/static-exports.md) پیاده شود. این shellها مسیر عمومی انتخابی کاربر را تغییر نمی‌دهند.

وب: نشست opaque در HttpOnly/Secure cookie با client binding، Origin/CSRF policy و ابطال دستگاه. native: قرارداد access/refresh جدا، refresh rotation و revocation، نگهداری در Keychain/Keystore با plugin منتخب؛ localStorage محل secret نباشد. ClientGuard فعلی فقط Origin وب را می‌شناسد؛ حالت native باید صریح طراحی و آزموده شود. پذیرش Origin یا header جای authentication/authorization را نگیرد.

deep link و بازگشت درگاه state/nonce یک‌بارمصرف و مقصد allowlist داشته باشند. پس از بازگشت، status از API خوانده شود. offline فقط پیش‌نویس تمرین/پیام و snapshot خواندنی؛ خرید یا رزرو قطعی آفلاین انجام نشود. عملیات محلی `clientOperationId`، صف sync و کنترل version داشته باشند؛ اصلاح برنامهٔ مربی نباید log قبلی را بازنویسی کند.

## فایل، دسترسی و عملیات

FileAsset مستقل از URL: owner، scope، object key، checksum و processing status. عکس عمومی باشگاه پس از بررسی؛ عکس بدن، مدرک و پیام خصوصی با مجوز جاری و URL کوتاه‌عمر. محدودیت MIME/حجم، scan، تبدیل، پاک‌سازی upload رهاشده و revoke رضایت برای رسانهٔ عمومی. private file وارد cache عمومی نشود.

دسترسی RBAC برای کارکنان + scope مجموعه/شعبه + رابطه و رضایت برای مربیگری. tenantId از Principal و رابطهٔ معتبر کنترل شود؛ body شناسهٔ مالک معتبر نمی‌سازد. FKهای ترکیبی مالکیت را تقویت کنند. runtime DB role از migration role جدا؛ RLS یک دفاع اختیاری اضافه است و تنها پس از طراحی transaction-local tenant context و آزمون pooling فعال شود.

لاگ ساختاریافته، request/trace ID، audit اقدام حساس؛ phone/OTP/token/private text در log عمومی نباشند. health/readiness، عمر outbox، verifyهای نامشخص، timeout DB و شکست دستگاه پایش شوند. backup و PITR در صورت قابلیت میزبان، همراه restore drill و backup فایل. هدف پیشنهادی اولیه RPO≤۱۵ دقیقه و RTO≤۲ ساعت است؛ تعهد واقعی پس از آزمون و انتخاب زیرساخت تعیین شود.

CI با schema/contract check، lint/typecheck، آزمون meaningful دسترسی و رقابت PG، و flowهای حساس روی وب/دستگاه. migration به سبک expand→backfill→switch→contract؛ rollback اپ باید با schema جدید سازگار باشد. دادهٔ seed نمایشی وارد گزارش عملیاتی نشود.

## اندازه‌گیری و trade-off

فرض ظرفیت برای آزمون آغاز، نه پیش‌بینی بازار: ۱۰۰ شعبه، ۱۰ هزار ورزشکار فعال ماهانه، ۱۰۰ درخواست خواندن/ثانیه و ۱۰ mutation/ثانیه در burst؛ آزمون رقابت جدا روی یک صندلی/زمین/جلسه. بودجهٔ پیشنهادی p95 پاسخ خواندن API≤۵۰۰ms و mutation داخلی≤۱s، بدون زمان درگاه؛ این‌ها SLO اثبات‌شده نیستند.

| انتخاب                   | هزینه/محدودیت                                           | زمان بازبینی                                      |
| ------------------------ | ------------------------------------------------------- | ------------------------------------------------- |
| یک DB و monolith ماژولار | انضباط مرزها و transaction لازم است                     | تیم‌ها یا بار مستقل با شواهد عملی                 |
| job در PG                | رقابت I/O با OLTP                                       | backlog یا throughput نامناسب پس از tuning        |
| جست‌وجو در PG            | fuzzy/geo باید index و benchmark شود                    | حجم/کیفیت نیازمند search engine                   |
| دو build وب/native       | route و auth adapter نیاز دارند                         | هزینهٔ نگهداری یا قابلیت native پیچیده            |
| دفتر مالی کامل           | مدل و تست بیشتر                                         | از آغاز فروش لازم؛ provider جای آن نیست           |
| Base44                   | امکانات atomic booking و مالی در این درخواست تأیید نشده | نمونهٔ مستقل یا گزینهٔ hosting پس از بررسی قابلیت |

Base44 در این نوبت فقط از ابزار readme بررسی شد؛ پروژه فعلی NestJS/PostgreSQL است و ایجاد یا مهاجرت اپ Base44 جزو درخواست طراحی نیست. پیش از انتخاب آن برای هسته، transaction، constraint، tenant isolation، webhook retry و export داده باید اثبات شوند.
