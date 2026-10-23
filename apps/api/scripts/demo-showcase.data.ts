/** Fictional businesses and people for the explicitly isolated, free demo. */
export const showcaseCities = [
  {
    name: 'تهران',
    province: 'تهران',
    neighborhoods: ['یوسف‌آباد', 'سعادت‌آباد'],
    latitude: 35.735,
    longitude: 51.405,
  },
  {
    name: 'کرج',
    province: 'البرز',
    neighborhoods: ['جهانشهر'],
    latitude: 35.834,
    longitude: 50.995,
  },
  {
    name: 'شیراز',
    province: 'فارس',
    neighborhoods: ['معالی‌آباد', 'قصرالدشت'],
    latitude: 29.656,
    longitude: 52.49,
  },
  {
    name: 'اصفهان',
    province: 'اصفهان',
    neighborhoods: ['مرداویج'],
    latitude: 32.617,
    longitude: 51.673,
  },
  {
    name: 'مشهد',
    province: 'خراسان رضوی',
    neighborhoods: ['سجاد'],
    latitude: 36.326,
    longitude: 59.548,
  },
  {
    name: 'رشت',
    province: 'گیلان',
    neighborhoods: ['گلسار'],
    latitude: 37.3,
    longitude: 49.594,
  },
] as const;
export const showcaseClubs = [
  {
    key: 'hasht',
    name: 'باشگاه هشت',
    city: 0,
    sport: 'تمرین قدرتی',
    image: 'strength',
    branches: ['یوسف‌آباد', 'سعادت‌آباد'],
    description:
      'سالن روشن با وزنه‌های آزاد، فضای تمرین عملکردی و گروه‌های کوچک. برای تمرین پیش از کار یا یک عصر پرانرژی.',
  },
  {
    key: 'tanaffos',
    name: 'استودیو تنفس',
    city: 1,
    sport: 'پیلاتس',
    image: 'studio',
    branches: ['جهانشهر'],
    description:
      'فضایی آرام برای پیلاتس، تمرین تعادل و حرکت‌های کنترل‌شده. گروه‌های کم‌جمعیت و شروع مناسب برای تازه‌کارها.',
  },
  {
    key: 'roshan',
    name: 'استودیو روشن',
    city: 2,
    sport: 'یوگا',
    image: 'studio',
    branches: ['معالی‌آباد', 'قصرالدشت'],
    description:
      'نور طبیعی، فضای خلوت و کلاس‌های کشش و یوگا. یک ساعت فاصله از شلوغی روز، با تمرکز بر حرکت و تنفس.',
  },
  {
    key: 'madar',
    name: 'باشگاه مدار',
    city: 3,
    sport: 'آمادگی جسمانی',
    image: 'training',
    branches: ['مرداویج'],
    description:
      'تمرین‌های گروهی پویا در کنار برنامهٔ شخصی قدرت و استقامت. تجهیزات کاربردی و فضای کافی برای حرکت.',
  },
  {
    key: 'owj',
    name: 'باشگاه اوج',
    city: 4,
    sport: 'تمرین قدرتی',
    image: 'strength',
    branches: ['سجاد'],
    description:
      'فضای تمرین قدرتی با دستگاه و وزنهٔ آزاد. انتخاب برنامه با توجه به تجربه، زمان و هدف هر ورزشکار.',
  },
  {
    key: 'harekat',
    name: 'خانهٔ حرکت',
    city: 5,
    sport: 'آمادگی جسمانی',
    image: 'training',
    branches: ['گلسار'],
    description:
      'باشگاهی محلی برای تمرین مداوم و کلاس‌های دوستانه. ترکیبی از تمرین قدرت، تعادل و فعالیت گروهی.',
  },
] as const;
export const showcaseCoaches = [
  {
    key: 'afra',
    phone: '+989000000009',
    name: 'افرا نیک‌نام',
    city: 'کرج',
    specialty: 'پیلاتس',
    goal: 'تعادل و کنترل حرکت',
    years: 7,
    club: 'tanaffos',
    biography:
      'تمرکز بر حرکت‌های دقیق، تمرین تعادل و ساختن یک عادت قابل‌ادامه.',
  },
  {
    key: 'kian',
    phone: '+989000000010',
    name: 'کیان آزادی',
    city: 'تهران',
    specialty: 'تمرین قدرتی',
    goal: 'افزایش قدرت',
    years: 6,
    club: 'hasht',
    biography:
      'برنامه‌های قدرتی ساده و قابل پیگیری با وزنهٔ آزاد و دستگاه؛ شروع از سطح فعلی ورزشکار.',
  },
  {
    key: 'nika',
    phone: '+989000000011',
    name: 'نیکا توانا',
    city: 'شیراز',
    specialty: 'یوگا',
    goal: 'انعطاف و تندرستی',
    years: 8,
    club: 'roshan',
    biography: 'کلاس‌های آرام با توجه به تنفس، انعطاف و دامنهٔ راحت حرکت.',
  },
  {
    key: 'parsa',
    phone: '+989000000012',
    name: 'پارسا رستمی',
    city: 'رشت',
    specialty: 'آمادگی جسمانی',
    goal: 'تندرستی',
    years: 4,
    club: 'harekat',
    biography: 'تمرین‌های کوتاه و متنوع برای جا دادن فعالیت در برنامهٔ روزمره.',
  },
] as const;
export const showcasePlans = [
  {
    key: 'home',
    title: '۲۰ دقیقه برای خودم',
    template: false,
    days: [
      {
        name: 'در خانه · بدون تجهیزات',
        movements: ['squat', 'push-up', 'dead-bug'],
      },
    ],
  },
  {
    key: 'strength',
    title: 'پایهٔ قدرت · دو روز در هفته',
    template: false,
    days: [
      {
        name: 'روز اول · تمام بدن',
        movements: ['goblet-squat', 'row', 'plank'],
      },
      {
        name: 'روز دوم · قدرت و تعادل',
        movements: ['lunge', 'chest-press', 'dead-bug'],
      },
    ],
  },
  {
    key: 'return',
    title: 'بازگشت آرام به تمرین',
    template: false,
    days: [{ name: 'یک شروع سبک', movements: ['march', 'band-row', 'squat'] }],
  },
  {
    key: 'coach-foundation',
    title: 'الگو · شروع در باشگاه',
    template: true,
    days: [
      { name: 'قدرت پایه', movements: ['goblet-squat', 'chest-press', 'row'] },
    ],
  },
  {
    key: 'coach-home',
    title: 'الگو · تمرین در خانه',
    template: true,
    days: [{ name: 'وزن بدن', movements: ['squat', 'push-up', 'plank'] }],
  },
  {
    key: 'coach-circuit',
    title: 'الگو · مدار کوتاه',
    template: true,
    days: [
      { name: 'مدار تمام بدن', movements: ['march', 'lunge', 'band-row'] },
    ],
  },
] as const;
