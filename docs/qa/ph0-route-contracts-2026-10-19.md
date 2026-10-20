# PH0 — نگاشت صفحه، درخواست و شاهد، ۱۹ اکتبر ۲۰۲۶

ابزار نگاشت تکمیل و بررسی محلی شد؛ **P0-12 و PH0/PH1 هنوز بازند**. این نوبت برنامه، API، Docker یا build سنگین اجرا نشد. رسیدهای اجرا از نشست تاریخ‌دار قبلی استفاده می‌کنند.

## خروجی و دامنه

[فهرست منبع](ph0-surface-inventory-2026-10-19.json) اکنون ۹۸ صفحه و۱۴۸ مصرف‌کنندهٔ مشترک دارد:۵۴ ورزشکار،۲۴ بیزینس و۲۰ ادمین. [گراف درخواست‌ها](ph0-route-contracts-2026-10-19.json) برای هر صفحه محل فراخوانی، تعریف hook یا عضو client، روش/مسیر endpoint، شرط، شاخهٔ منتخب UI، layout والد و ارتباط مستقیم منبع آزمون را نگه می‌دارد.

- ۲۴۳ محل یکتای فراخوانی API؛ اشتراک workspaceها باعث۲۵۳۹ ارتباط صفحه–فراخوانی شده است. این عدد شمار درخواست شبکه نیست.
- ۱۷۸ تعریف نامزد درخواست؛۶۸ زوج روش/مسیر لفظی یکتا و۱۰۸ تعریف با روش یا مسیر نمادین ثبت شده‌اند. این دو شمارش، تقسیم‌بندی یکسانی ندارند.
- API client سمت سرور، از جمله `getPublicClub → catalogClients.club`، نیز دنبال می‌شود. فقط عضو انتخاب‌شدهٔ client بررسی می‌شود؛ endpointهای خواهر به آن نسبت داده نمی‌شوند.
- آرگومان لفظی wrapperهای sports قابل تطبیق است. مسیر پویا به شکل expression باقی می‌ماند؛ ابزار مقدار شناسه را حدس نمی‌زند و هیچ hook یا transport را اجرا نمی‌کند.

گراف محافظه‌کار است: props پویا، شاخه‌های workspace مشترک و نام‌های هم‌نام ممکن است ارتباط اضافی بسازند. namespace، computed call، dynamic import و تمام جریان‌های ممکن به‌طور جامع حل نشده‌اند. صفر بودن unresolved به معنی حل۱۰۸ مسیر نمادین یا پوشش کامل نیست. layout/provider در شمار API صفحه ادغام نمی‌شود. ارتباط مستقیم فایل آزمون، شاهد اجرای آزمون نیست؛ فایل‌های integration و harnessها همگی توسط این ارتباط ساده کشف نمی‌شوند.

## پیوند شاهد واقعی

[فهرست رسیدها](ph0-runtime-evidence-2026-10-19.json) شش حالت `/profile/settings/privacy` را به endpoint نامزد، method/path/status مشاهده‌شده، assertion رابط و [گزارش آزمون واقعی](ph1-privacy-2026-10-19.md) وصل می‌کند:

| حالت                     | درخواست در `/api/v1`                                | شاهد رابط                              |
| ------------------------ | --------------------------------------------------- | -------------------------------------- |
| ذخیرهٔ بازاریابی         | POST `profile/account/privacy/preferences` →۲۰۱     | مقدار true و فوکوس ذخیره               |
| بازخوانی لغو رضایت خارجی | همان endpoint →۲۰۱                                  | مقدار false و فوکوس ذخیره              |
| نشست قدیمی               | POST `profile/account/privacy/deletion` →۴۰۹        | خطا داخل دیالوگ فعال                   |
| درخواست حذف              | همان endpoint →۲۰۱                                  | دیالوگ بسته، فوکوس لغو                 |
| لغو حذف                  | POST `profile/account/privacy/deletion/cancel` →۲۰۱ | فوکوس درخواست مجدد                     |
| دانلود خروجی             | GET `profile/account/privacy/export` →۲۰۰           | فایل نسخه۲، جداسازی حساب و فوکوس خروجی |

ابزار hash نه فایل شاهد، hash نه منبع ارجاع‌شده، وجود نامزد متناظر، پاسخ HTTP و assertionهای رابط را کنترل می‌کند؛ تغییر شاهد یا منبع مرتبط خطا می‌دهد. نسبت‌دادن سناریو به HTTP بر گزارش دستی متکی است؛ رسیدها شناسهٔ هم‌بستگی مشترک ندارند و ترتیب رخداد را خودکار ثابت نمی‌کنند. buffer شبکه truncated است؛ شمار کامل درخواست‌ها یا نبود درخواست اضافی ادعا نمی‌شود.

BUILD_ID این نشست `WefDdxE0lp8sGQWe7o4Uz` است. [۷۶۵ ورودی build تاریخ‌دار](baselines/ph1-privacy-2026-10-19/build-inputs.json) با درخت فعلی مقایسه شدند: فقط `apps/application/package.json` برای اصلاح وابستگی CI تغییر کرده است. نه منبعِ صریحِ مرتبط ثابت‌اند، ولی `buildInputsMatchCurrent=false` ثبت می‌شود؛ این رسید، اجرای build جدید نیست. برای۹۷ صفحهٔ دیگر در این فایل رسید پیوندشده وجود ندارد؛ گزارش‌های مستقل قبلی همچنان به محدودهٔ خود معتبرند.

## بررسی محلی

۹ آزمون mapper و۱ آزمون guard وابستگی، مجموع۱۰ آزمون، پاس شدند: انتخاب عضو و re-export، شاخه‌های مهمان/ذخیره، wrapper، مسیر نمادین، shadow شدن پارامتر callback، جلوگیری از نشت متغیر به callback بعدی، درخواست واقعی SSR، حفظ baseline، تازه‌خوانی AST پس از ویرایش، و رد شاهد/منبع کهنه یا assertion نادرست.

اسکن وابستگی۱۰ workspace/۸۴۴ فایل، syntax، محافظ۵۹ فایل و `git diff --check` پاس‌اند. baselineهای۱۸ اکتبر بازنویسی نشدند. بازبینی معماری/spec/استاندارد سه ایراد callback scope، SSR و cache را پیدا کرد؛ پیش از تولید نهایی رفع شدند. patch پنج‌فایلی CI نیز با hash قبلی حفظ شده است؛ اجرای remote طبق تصمیم کاربر موکول است.

تولید، مقصد صریح می‌خواهد تا اجرای بدون آرگومان تاریخچه را بازنویسی نکند:

```sh
node scripts/ph0-surface-inventory.mjs docs/qa/ph0-surface-inventory-2026-10-19.json
NODE_OPTIONS=--max-old-space-size=384 node scripts/ph0-route-contracts.mjs docs/qa/ph0-surface-inventory-2026-10-19.json docs/qa/ph0-route-contracts-2026-10-19.json docs/qa/ph0-runtime-evidence-2026-10-19.json
node --test scripts/ph0-route-contracts.test.mjs scripts/check-workspace-dependencies.test.mjs
```

برای پایان P0-12 هنوز رسیدهای کافی دیگر صفحه‌ها/حالت‌ها، تطبیق منبع با build نهایی، QA بصری/حرکت و خروجی native لازم است. CI آنلاین، دستگاه و بکاپ مستقل نیز طبق backlog بازند؛ هیچ معیار با این ابزار حذف یا بسته نشده است.

## مسیرها

اعداد زیر ارتباط منبع هستند؛ ستون رسید فقط حالت‌های پیوندشده در همین فایل را می‌شمارد.

| اپ          | صفحه                                                  | محل فراخوانی | نامزد درخواست | حالت با رسید |
| ----------- | ----------------------------------------------------- | -----------: | ------------: | -----------: |
| application | `/auth/login`                                         |            3 |             3 |            0 |
| application | `/auth/otp`                                           |            3 |             3 |            0 |
| application | `/bookings/detail`                                    |            6 |             5 |            0 |
| application | `/bookings`                                           |            2 |             1 |            0 |
| application | `/calendars/detail`                                   |            6 |             5 |            0 |
| application | `/calendars`                                          |            2 |             2 |            0 |
| application | `/checkout/mock-gateway`                              |            3 |             2 |            0 |
| application | `/checkout`                                           |            6 |             4 |            0 |
| application | `/checkout/status`                                    |            5 |             4 |            0 |
| application | `/discovery/club`                                     |           10 |            11 |            0 |
| application | `/discovery/clubs/[clubId]/gallery`                   |            4 |             3 |            0 |
| application | `/discovery/clubs/[clubId]`                           |           10 |            11 |            0 |
| application | `/discovery/clubs/[clubId]/reviews`                   |            5 |             4 |            0 |
| application | `/discovery/clubs/[clubId]/slots`                     |            4 |             2 |            0 |
| application | `/discovery/coaches/[coachId]`                        |            0 |             0 |            0 |
| application | `/discovery/compare`                                  |            2 |             4 |            0 |
| application | `/discovery/map`                                      |            5 |             7 |            0 |
| application | `/discovery`                                          |            8 |             8 |            0 |
| application | `/documents`                                          |            5 |             4 |            0 |
| application | `/host`                                               |            0 |             0 |            0 |
| application | `/invitations`                                        |           19 |            16 |            0 |
| application | `/invitations/sports`                                 |            3 |             3 |            0 |
| application | `/login`                                              |            0 |             0 |            0 |
| application | `/membership-card`                                    |            2 |             1 |            0 |
| application | `/memberships/detail`                                 |            3 |             2 |            0 |
| application | `/memberships`                                        |            2 |             1 |            0 |
| application | `/messages/conversation`                              |            7 |             5 |            0 |
| application | `/messages/details`                                   |            4 |             3 |            0 |
| application | `/messages`                                           |            2 |             1 |            0 |
| application | `/notifications`                                      |            3 |             2 |            0 |
| application | `/notifications/preferences`                          |            3 |             2 |            0 |
| application | `/orders/detail`                                      |            2 |             1 |            0 |
| application | `/orders`                                             |            2 |             1 |            0 |
| application | `/`                                                   |            5 |             4 |            0 |
| application | `/privacy`                                            |            4 |             2 |            0 |
| application | `/profile/complete`                                   |            9 |             8 |            0 |
| application | `/profile/edit`                                       |           19 |            16 |            0 |
| application | `/profile`                                            |           19 |            16 |            0 |
| application | `/profile/settings`                                   |           19 |            16 |            0 |
| application | `/profile/settings/privacy`                           |           19 |            16 |            6 |
| application | `/qa/ph0`                                             |            0 |             0 |            0 |
| application | `/reset-password`                                     |            3 |             3 |            0 |
| application | `/saved/clubs`                                        |            7 |             9 |            0 |
| application | `/saved/coaches`                                      |            1 |             1 |            0 |
| application | `/saved`                                              |            7 |             9 |            0 |
| application | `/services/detail`                                    |            4 |             2 |            0 |
| application | `/services`                                           |            2 |             1 |            0 |
| application | `/sessions`                                           |           19 |            16 |            0 |
| application | `/set-password`                                       |            4 |             2 |            0 |
| application | `/support/detail`                                     |            3 |             2 |            0 |
| application | `/support`                                            |            3 |             2 |            0 |
| application | `/tickets/view`                                       |            2 |             1 |            0 |
| application | `/training`                                           |            0 |             0 |            0 |
| application | `/waitlist`                                           |            4 |             3 |            0 |
| business    | `/branches`                                           |           78 |            78 |            0 |
| business    | `/calendar`                                           |           50 |            49 |            0 |
| business    | `/imports`                                            |           50 |            49 |            0 |
| business    | `/invitations`                                        |           78 |            78 |            0 |
| business    | `/login`                                              |            3 |             3 |            0 |
| business    | `/members`                                            |           50 |            49 |            0 |
| business    | `/messages/[conversationId]`                          |           10 |             7 |            0 |
| business    | `/messages`                                           |            5 |             3 |            0 |
| business    | `/organizations/[organizationId]/branches/[branchId]` |           78 |            78 |            0 |
| business    | `/organizations/[organizationId]`                     |           78 |            78 |            0 |
| business    | `/organizations`                                      |           78 |            78 |            0 |
| business    | `/`                                                   |           78 |            78 |            0 |
| business    | `/payments`                                           |           50 |            49 |            0 |
| business    | `/privacy`                                            |            4 |             2 |            0 |
| business    | `/profile`                                            |           78 |            78 |            0 |
| business    | `/reception`                                          |           50 |            49 |            0 |
| business    | `/reports`                                            |           50 |            49 |            0 |
| business    | `/reset-password`                                     |            3 |             3 |            0 |
| business    | `/resources`                                          |           50 |            49 |            0 |
| business    | `/services`                                           |           50 |            49 |            0 |
| business    | `/sessions`                                           |           78 |            78 |            0 |
| business    | `/set-password`                                       |            4 |             2 |            0 |
| business    | `/team`                                               |           78 |            78 |            0 |
| business    | `/training`                                           |            0 |             0 |            0 |
| admin       | `/audit`                                              |           78 |            78 |            0 |
| admin       | `/catalog-reviews`                                    |           78 |            78 |            0 |
| admin       | `/invitations`                                        |           78 |            78 |            0 |
| admin       | `/locations`                                          |           78 |            78 |            0 |
| admin       | `/login`                                              |            3 |             3 |            0 |
| admin       | `/moderation`                                         |           78 |            78 |            0 |
| admin       | `/operations`                                         |            8 |             6 |            0 |
| admin       | `/organizations/[organizationId]/branches/[branchId]` |           78 |            78 |            0 |
| admin       | `/organizations/[organizationId]`                     |           78 |            78 |            0 |
| admin       | `/organizations`                                      |           78 |            78 |            0 |
| admin       | `/`                                                   |           78 |            78 |            0 |
| admin       | `/privacy`                                            |            4 |             2 |            0 |
| admin       | `/profile`                                            |           78 |            78 |            0 |
| admin       | `/reset-password`                                     |            3 |             3 |            0 |
| admin       | `/sessions`                                           |           78 |            78 |            0 |
| admin       | `/set-password`                                       |            4 |             2 |            0 |
| admin       | `/taxonomies`                                         |           78 |            78 |            0 |
| admin       | `/training`                                           |            0 |             0 |            0 |
| admin       | `/users/[userId]`                                     |           78 |            78 |            0 |
| admin       | `/users`                                              |           78 |            78 |            0 |
