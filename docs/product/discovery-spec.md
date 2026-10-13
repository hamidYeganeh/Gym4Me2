# مشخصات توسعه روی طراحی فعلی discovery

مرجع: [طرح](blueprint.md) · [فلو/صفحه](flow-screen-map.md) · [مدل](data-model.md). درخواست کاربر در ۲۰۲۶/۱۰/۱۲: مبنا طراحی فعلی سه صفحه باشد.

## مرجع واقعی در کد

| مسیر                             | فایل/کامپوننت                                                         | وضعیت امروز                                                                        |
| -------------------------------- | --------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `/discovery`                     | `components/discovery/discovery.tsx` و route `app/discovery/page.tsx` | فیلتر و کارت از getClubs محلی؛ بعضی علاقه‌مندی‌ها localStorage                     |
| `/discovery/clubs/:clubId`       | `ClubPage` و kit `ClubDetail`                                         | گالری، شعب، امکانات، مربی، نظر و CTA با داده نمونه                                 |
| `/discovery/clubs/:clubId/slots` | `ClubSlots`                                                           | انتخاب چهار روز/زمان و extra؛ submit فقط برنامه بازدید را در localStorage می‌نویسد |

دو مسیر پویا `generateStaticParams` را از clubIds نمونه می‌گیرند و `dynamicParams=false` دارند. تغییر UI به داده واقعی باید راه بازشدن باشگاه جدید را هم حل کند؛ راهبرد وب و native در architecture.md آمده است.

## قواعد طراحی مشترک

- `@repo/theme`: preset فعلی luma/radix، زمینه neutral، spring-green، فونت محلی IRANSansX؛ رنگ اصلی light از spring-green-500 و dark از spring-green-400. رنگ‌های semantic مانند background/foreground/muted/primary/image-surface استفاده شوند.
- `@repo/ui/kit`: Button، InputGroup، Badge، ToggleGroup، ChoiceOptionCard، Carousel، Sheet/Drawer، Skeleton، Empty، Alert، Sonner، SlidingNumber، ClubCard، ClubFeaturedCard، ClubBranchCard، CoachCard، ClubDetail، ReviewCard و ClassCard. component جدید از همین primitiveها ساخته شود.
- پهنای mobile shell فعلی max-w-xl حدود ۵۷۶px؛ گوشه‌های گرد و پنل هم‌پوشان روی تصویر، فاصله‌گذاری و safe area بالا/پایین حفظ شوند. desktop public همان خوانایی mobile را داشته باشد؛ صفحه بیزینس تراکم مناسب خودش را دارد.
- typography و layout با RTL واقعی؛ آیکن جهت‌دار و carousel با direction درست؛ زمان و کد با قطعه LTR؛ مبلغ با Intl و واحد روشن. theme/language toggle فعلی حفظ شود.
- touch target دست‌کم ۴۴px با padding/hit area کافی، focus-visible، نام accessible، state دارای متن و رنگ، پشتیبانی keyboard؛ motion با reduced-motion سازگار. رنگ success و انتخاب مبلغ را به‌تنهایی قطعی معرفی نکند.
- toast بازخورد کوتاه است؛ تأیید رزرو/پرداخت در صفحه وضعیت پایدار و قابل مراجعه نشان داده شود.

## قرارداد ViewModel مشترک

این ViewModelها پیشنهاد قرارداد UI هستند، نه schema ORM یا API ساخته‌شده.

| مدل نمایشی           | فیلدهای لازم                                                                                                                                     |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| DiscoveryQuery       | text، cityId، districtId?، coordinates?، radius?، sportIds، audience، day/timeWindow، budget، level، amenities، sort، cursor                     |
| ClubCardVM           | clubId، branchId، name، category، cover، locationLabel، distanceMeters?، verifiedReviewSummary?، priceSummary?، matchingAvailability?، updatedAt |
| ClubDetailVM         | هویت Club، publishedVersion، branches، رسانه، امکانات/ساعات شعبه، مربیان فعال، نظرات منتشرشده، serviceSummaries                                  |
| BranchSelection      | clubId، branchId، serviceId، audience، timezone؛ انتخاب شعبه مستقل از برند                                                                       |
| AvailabilityOptionVM | occurrenceId، resourceId?، serviceVersionId، branchId، startsAt/endsAt، capacityState، observedAt، fromPriceMinor?، currency                     |
| QuoteVM              | quoteId، version، service/price/policyVersion، lines، totalMinor، paymentRequirement، expiresAt، permittedFundingMethods                         |
| BookingDraftVM       | branchId، serviceId، occurrenceId، extras، quoteId?، holdId?؛ انتخاب کاربر، نه مرجع قیمت/ظرفیت                                                   |

`priceSummary` معلوم کند «از»، تک‌جلسه، دوره یا عضویت است. اگر قیمت یا ظرفیت نداریم، null و متن قابل فهم؛ عدد صفر/ظرفیت ساختگی نمایش داده نشود. فاصله فقط با مختصات معتبر و مبدا واقعی کاربر یا مبدا دستی محاسبه شود.

## `/discovery` — P06، FL04

ساختار فعلی: header برند و نقشه/تم/زبان، hero تصویری با search، کارت معرفی، category carousel، کارت محله، فهرست و کارت باشگاه. این زبان تصویری حفظ شود.

توسعه رفتاری:

۱. انتخاب شهر/محله همیشه قابل استفاده باشد؛ درخواست GPS در اقدام مشخص کاربر. search و فیلترها در URL نرمال ذخیره شوند؛ حروف ی/ک و ارقام فارسی/عربی در سرور و کلاینت همسان شوند.

۲. فیلترهای زمان، audience، بودجه، رشته، سطح، امکانات و فاصله در Sheet/Drawer موجود؛ summary فیلتر فعال و پاک‌کردن مشخص. اعمال فیلتر state نتایج را یک‌جا به‌روز کند.

۳. نتیجهٔ club/branch/service مرتبط برگردد؛ باشگاه دارای کلاس نامناسب زمان کاربر با badge قابل رزرو معرفی نشود. زمان نزدیک و price summary به خدمت قابل خرید لینک شود. محله و شمارش نتیجه از داده واقعی محاسبه شوند.

۴. ورود به نقشه همان query را نگه دارد؛ انتخاب pin کارت مشترک را نشان دهد. برگشت از ClubDetail scroll و query را بازیابی کند.

۵. پسندیدن برای مهمان محلی مجاز؛ بعد از ورود با union/انتخاب روشن به FavoriteClub سرور ادغام شود. افزودن به مقایسه انتخاب حداکثر قابل مدیریت داشته باشد؛ حد اولیه پیشنهادی ۳ باشگاه/خدمت است.

۶. پیشنهاد ویژه و قیمت خلوت برچسب و شرایط روشن داشته باشند. رتبه‌بندی paid promotion به‌عنوان تبلیغ مشخص شود؛ توصیه زمان فقط براساس ظرفیت تازه باشد.

query: GET کاتالوگ فعلی با فیلتر توسعه‌یافته و read model نتیجه. Favorite و SavedSearch commandهای آینده‌اند. متریک‌ها: discovery_searched، filter_applied، club_opened؛ مشاهده صفحه خرید اثبات رزرو نیست. فاصله و زمان سفر دو مفهوم جدا هستند؛ محاسبه زمان سفر فقط با سرویس مسیر منتخب و نتیجه معتبر عرضه شود.

حالت‌ها: skeleton هم‌اندازه کارت؛ بدون نتیجه با تغییر زمان/شعاع؛ موقعیت ردشده با انتخاب دستی؛ قطع شبکه با داده ذخیره‌شده و زمان مشاهده؛ خطای سرور با retry؛ باشگاه بسته/تعلیق‌شده حذف از عرضه یا وضعیت روشن. search debounce و cancellation پاسخ قدیمی جلوگیری کند که نتیجهٔ query قبلی جای جدید را بگیرد.

## `/discovery/clubs/:clubId` — P11، FL04/FL19

kit `ClubDetail` فعلی: تصویر hero، nav برگشت/ذخیره/اشتراک، نام/قیمت، پنل گرد، تصاویر کوچک، آمار، توضیح، امکانات، شعب، مربیان، نظرات، پیشنهادها و CTA پایین. همین component با data adapter تغذیه شود.

توسعه رفتاری:

۱. اطلاعات برند و اطلاعات شعبه تفکیک شوند. شعبه اولیه صریح انتخاب شود؛ تغییر شعبه آدرس، ساعات، امکانات، مربی و خدمت را با هم عوض کند. لینک اشتراک context شعبه را در query نگه دارد.

۲. قیمت به service summary متصل باشد؛ هزینه ورودی، مربی، اجاره تجهیز و خدمات شامل‌شده قابل فهم باشند. CTA مطابق خدمت «انتخاب سانس»، «دیدن کلاس‌ها» یا «خرید بسته» باشد.

۳. برنامه روز/ساعت اطلاع‌رسانی با availability واقعی جدا باشد. «اکنون باز است» فقط از محاسبه معتبر timezone/استثنا؛ «قابل رزرو» از occurrence و ظرفیت هسته رزرو.

۴. نظرات فقط منتشرشده؛ badge مراجعه تأییدشده پس از اتصال AttendanceEvidence. نبود نظر با متن، نه امتیاز صفر ساختگی. مدارک مربی نوع/زمان بررسی داشته باشند.

۵. گالری از رسانه آماده و مجاز؛ عکس مفقود fallback از kit موجود، بدون تغییر ابعاد. share sheet، native share و clipboard fallback فعلی حفظ شوند.

۶. CTA context معتبر به slots بدهد: `branchId/serviceId` و در صورت انتخاب روز `date/occurrenceId`. URL مبلغ، مانده یا مجوز تولید نکند. user می‌تواند بدون ورود تا انتخاب زمان پیش برود.

query: `/catalog/clubs/:id` و branch detail موجود؛ service summary و availability query آینده؛ endpoint نظرات موجود توسعه evidence می‌یابد. metadata از نسخه عمومی ساخته شود. data adapter رابط getClubs نمونه را برای حالت واقعی جایگزین کند؛ mock data فقط fixture/dev مشخص باشد.

حالت‌ها: ID ناشناخته 404؛ hidden/suspended بدون محتوای خصوصی؛ شعبه بدون خدمت فروشی با CTA مناسب؛ اطلاعات ناقص با unavailable؛ قیمت/ظرفیت نامشخص بدون امکان خرید قطعی؛ رأی کارمند/مربی همان شعبه مطابق محدودیت backend رد شود.

## `/discovery/clubs/:clubId/slots` — P10، FL06/FL07/FL11

ساختار فعلی: تصویر پس‌زمینه باشگاه و header، عنوان، پنل گرد با تاریخ، carousel زمان، ChoiceOptionCard برای extras، SlidingNumber مبلغ و Button اصلی. طراحی حفظ؛ منبع انتخاب و نتیجه submit عملیاتی شود.

۱. context از URL: clubId + branchId + serviceId. اگر ناقص است، انتخاب شعبه/خدمت در پنل؛ timestamp و resource ID از سرور. برای لینک قدیمی `time` فقط اگر occurrence معتبر مطابق پیدا شد resolve شود؛ fallback ثابت ۱۲:۳۰ یا انتخاب زمان unavailable ممنوع.

۲. تاریخ شمسی و منطقه زمانی شعبه؛ چهار روز پیش‌نمایش فعلی می‌ماند و «انتخاب تاریخ دیگر» با Calendar/Sheet افزوده شود. روز بدون ظرفیت از روز بدون داده تفکیک شود.

۳. time option شامل شروع/پایان، خدمت/مربی در صورت نیاز، ظرفیت و وضعیت unavailable/sold_out؛ زمان‌های گذشته قابل انتخاب نباشند. تغییر روز، شعبه یا خدمت انتخاب ناسازگار قبلی و quote/hold وابسته را invalidate کند.

۴. extras قیمت، تعداد و موجودی واقعی دارند. انتخاب switch برای افزودنی ساده؛ تعداد با کنترل مناسب از kit. وسایل محدود در همان هسته allocation تخصیص یابند.

۵. خواندن quote یا ساخت quote ذخیره‌شده از سرور: ریز اقلام، مبلغ نهایی تومان، هزینه جدا، مبلغ بیعانه/مانده، شرایط لغو و زمان. محاسبه کلاینت فقط پیش‌نمایش است.

۶. Button اول «ادامه رزرو». کاربر مهمان به P01 با draft قابل بازیابی برود. پس از ورود، quote و ظرفیت دوباره خوانده شوند؛ تغییر مبلغ نیازمند پذیرش دوباره است.

۷. hold با transaction سرور ساخته شود. P16 یا Sheet مشترک checkout summary، policy و مهلت را نشان دهد؛ برگشت یا timeout باعث hold تازه و برداشت مضاعف نشود. پرداخت با بسته، پول، بیعانه و درخواست تأیید مربی وضعیت‌های روشن دارند.

۸. پرداخت بیرون اپ یا مرورگر؛ P17 نتیجه از API می‌خواند. فقط تأیید معتبر، شماره رزرو و P18 ساخته/نشان داده شود. پیام ذخیرهٔ بازدید localStorage از مسیر واقعی خرید حذف شود؛ این ذخیره صرفاً draft است.

۹. کلاس پر با لیست انتظار؛ با پیشنهاد انتظار capacity hold همان session منتقل/مصرف شود. دوره تعداد جلسات و تضمین صندلی تمام جلسات را قبل از قبول نشان دهد. private session ابتدا نتیجه accept/decline مربی را روشن کند.

| حالت                           | نمایش و اقدام                                               |
| ------------------------------ | ----------------------------------------------------------- |
| loading                        | skeleton زمان/قیمت، CTA غیرفعال                             |
| unavailable/sold_out           | گزینه غیرقابل انتخاب؛ تغییر تاریخ یا انتظار                 |
| price_changed                  | قیمت قدیم/جدید و علت؛ تأیید دوباره                          |
| capacity_changed               | انتخاب قبلی حفظ ولی نامعتبر؛ ظرفیت تازه و جایگزین           |
| hold_expired                   | پایان مهلت؛ بررسی مجدد پیش از پرداخت تازه                   |
| payment_unknown                | «در حال بررسی» با مرجع سفارش؛ بررسی مجدد امن/پشتیبانی       |
| payment_verified_capacity_lost | سفارش پرداخت‌شده ولی رزرو تأییدنشده؛ مسیر refund/رسیدگی     |
| offline                        | draft باقی؛ ادامه خرید پس از اتصال                          |
| confirmed                      | شماره رزرو، زمان/محل، مبلغ/مانده، policy و لینک کارت/جزئیات |

## پذیرش سه صفحه

- [ ] رنگ/فونت/radius/تم/RTL و safe area از بسته‌های فعلی؛ UI موازی یا CSS رنگ ثابت تازه ساخته نشود.
- [ ] کارت، ClubDetail و slots برای باشگاه/شعبه واقعی و جدید در وب و native باز شوند.
- [ ] لینک discovery → detail → slots context درست را حفظ کند؛ back/ورود انتخاب را بازیابی کند.
- [ ] قیمت و ظرفیت تازه توسط API کنترل شوند؛ آخرین ظرفیت در دو مرورگر فقط یک‌بار فروخته شود.
- [ ] روز بدون ظرفیت، شبکه قطع، تغییر قیمت و بازگشت نامشخص درگاه قابل بازیابی باشند.
- [ ] QR، نظر و درآمد بر پایهٔ حضور واقعی؛ صفحهٔ جزئیات به‌تنهایی evidence مراجعه نسازد.
- [ ] نسخه light/dark و فارسی/انگلیسی، متن بلند، تصویر مفقود، screen reader و keyboard بررسی شوند.
- [ ] metadata، canonical و محتوای عمومی از نسخه منتشرشده؛ اطلاعات private وارد HTML عمومی نشود.

ترتیب پیشنهاد اجرا: adapter کاتالوگ و انتشار → context خدمت/شعبه → availability و quote → hold و checkout → وضعیت پرداخت/رزرو → حضور و evidence نظر. هر مرحله روی همین سه صفحهٔ مرجع توسعه پیدا کند.
