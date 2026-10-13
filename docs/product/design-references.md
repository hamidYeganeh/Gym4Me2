# منابع و شواهد طرح Gym4Me

تاریخ بررسی: ۲۰۲۶/۱۰/۱۲. مشاهدات از ابزارهای متصل و فایل‌های پروژه؛ پیشنهادهای معماری تصمیم طراحی‌اند، نه ادعای سهم بازار یا پیاده‌سازی.

## Mobbin — فلوهای مشاهده‌شده

| مرجع                                                                                           | آنچه در preview دیده شد                                                                        | کاربرد برای Gym4Me                                                      |
| ---------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| [ClassPass — Reserving a class](https://mobbin.com/flows/f75f704d-9854-4d95-bbf4-f732e2e57b58) | جزئیات کلاس/مربی/زمان، CTA هزینه؛ پنل تأیید با شرایط لغو و timezone؛ state رزروشده و امکان لغو | summary قابل مرور و policy قبل از تأیید در P10/P16؛ state پایدار در P18 |
| [Hevy — Logging a workout](https://mobbin.com/flows/7b6374ff-8ff6-4d7b-babe-077e72b6ee1f)      | شروع تمرین، ردیف ست/وزنه/تکرار، یادداشت، تایمر استراحت؛ summary ذخیره با visibility            | P28 ثبت واقعی و P42 پایان تمرین؛ عکس/private visibility قابل کنترل      |

previewهای ارائه‌شده بررسی شدند؛ همه screenهای میانی فلوها به‌صورت مستقل بازبینی نشده‌اند. تصاویر در اسناد embed نشده‌اند و URL تصویر موقت به‌عنوان reference دائمی استفاده نشده است. Mobbin برای رفتار فلو است؛ ظاهر با IRANSansX، spring-green و kit فعلی Gym4Me هماهنگ می‌شود.

## Product Hunt — مدل محصول

- [MINDBODY](https://www.producthunt.com/products/mindbody): معرفی ابزار مدیریت مجموعه با کشف و رزرو؛ مبنای مقایسه اتصال دو سوی محصول.
- [MyDay](https://www.producthunt.com/products/myday): معرفی مدیریت مشتری، جلسه، پرداخت و یادآوری برای متخصصان ورزش/سلامت؛ مبنای داشبورد روز مربی.
- [SeshMe](https://www.producthunt.com/products/seshme): معرفی کلاس گروهی، رزرو، پرداخت و referral؛ مبنای بررسی رشد مبتنی بر دعوت.
- [Kickoff](https://www.producthunt.com/products/kickoff-formerly-kudos): معرفی مربی انسانی و همراهی مستمر؛ مبنای طراحی check-in و feedback.

این‌ها profile/شرح محصول دریافت‌شده از Product Hunt هستند. اطلاعات معرفی محصول یا نظرهای محدود به معنی اثبات تقاضای ایران، کیفیت فعلی سرویس یا benchmark عملکرد نیستند.

## Base44

ابزار Base44 readme خوانده شد: builder و ویرایش مستقیم، entity و RLS، کشف قرارداد از API catalog. هیچ اپ Base44 ایجاد، ویرایش یا deploy نشد. انتخاب هستهٔ NestJS/PostgreSQL براساس پروژه موجود است؛ گزینه Base44 فقط پس از بررسی تراکنش/قیود/دسترسی و پرداخت قابل ارزیابی است. tag کردن ابزار، تصمیم مهاجرت stack محسوب نشده است.

## کد و اسناد محلی

- `apps/application/components/discovery/discovery.tsx`، `club-page.tsx` و `club-slots.tsx`: مرجع سه صفحه و وضعیت داده نمونه/localStorage.
- `packages/theme/src/preset.ts`، `fonts.ts` و `globals.css`: luma/radix، IRANSansX، spring-green، semantic tokens و light/dark.
- `packages/ui/src/kit/ClubDetail/ClubDetail.styles.ts` و `Button/Button.styles.ts`: پوسته، تصویر hero، پنل گرد، CTA و safe area.
- `apps/application/next.config.ts`، `capacitor.config.ts` و `scripts/build-native.mjs`: دو build و assets local native.
- `apps/api/src/database/schema/core.ts` و `catalog.ts`: هویت، سازمان، کاتالوگ و مدل‌های ساخته‌شده.
- `docs/product/concept.md`، `features.md`، `flows.md`، `roadmap.md` و `backlog.md`: دامنه و وضعیت؛ backlog مرجع تیک اجراست.

## منابع فنی

- [PostgreSQL 18 — range constraints](https://www.postgresql.org/docs/18/rangetypes.html#RANGETYPES-CONSTRAINT): range نیم‌باز و exclusion برای عدم تداخل.
- [PostgreSQL 18 — explicit locking](https://www.postgresql.org/docs/18/explicit-locking.html): row locks، advisory locks و deadlock؛ مبنای طراحی lock order.
- docs نصب‌شدهٔ Next 16.4 در `apps/application/node_modules/next/dist/docs/01-app/02-guides/static-exports.md`: محدودیت routeهای پویا، cookies، redirects و rewrites در export.
- docs نصب‌شده `01-app/01-getting-started/08-caching.md`: caching/PPR این نسخه؛ policy actual config پیش از پیاده‌سازی تعیین شود.
- [Google Search Central — canonical](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls): سیاست URLهای عمومی و duplicateها.
- [web.dev — Core Web Vitals](https://web.dev/articles/vitals): مرجع اهداف کیفیت پیشنهادی؛ اندازه‌گیری واقعی هنوز انجام نشده.

صفحه رسمی Nest modules از ابزار web خطای دسترسی داد؛ از آن نقل یا ادعای خواندن موفق نشده است. مرزبندی پیشنهادی Nest بر ساختار و نسخه موجود پروژه و اصول طراحی دامنه استوار است.

## نقش پلاگین‌ها در این بسته

engineering/system-design برای مرزها و trade-off؛ product-management/write-spec برای پوشش و پذیرش؛ Data/design-kpis برای تعریف metric بدون داده ساختگی؛ searchfit-seo/technical-seo برای قواعد صفحات عمومی. productivity/task-management بررسی شد؛ چون پروژه backlog شناسه‌دار دارد و کاربر طراحی محصول خواسته، task شخصی یا TASKS موازی ساخته نشد و پیگیری اجرا به backlog موجود ارجاع داده شد. این نوبت هیچ پیام، زمان‌بندی یا انتشار بیرونی انجام نشده است.
