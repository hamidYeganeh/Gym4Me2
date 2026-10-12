import type { ReviewSummary } from "@repo/ui/kit/ReviewCard";
// Preview data until club reviews are supplied by the API.
const feedback = [
  [
    "تجهیزات کامل",
    "تنوع دستگاه‌ها برای برنامهٔ تمرینی من کافی بود.",
    "Well equipped",
    "The equipment selection covered my training routine.",
  ],
  [
    "مربی همراه",
    "مربی حرکت‌ها را با حوصله توضیح داد.",
    "Helpful coaching",
    "The coach explained the exercises patiently.",
  ],
  [
    "فضای روشن",
    "نور سالن و فضای تمرین را دوست داشتم.",
    "Bright space",
    "I enjoyed the light and the training space.",
  ],
  [
    "تمرین خوب",
    "برای تمرین عصر انتخاب مناسبی بود.",
    "Good session",
    "A good choice for an afternoon workout.",
  ],
  [
    "رختکن مرتب",
    "رختکن تمیز بود و فضای کافی داشت.",
    "Tidy changing room",
    "The changing room was clean and spacious.",
  ],
  [
    "برخورد خوب",
    "تیم پذیرش با حوصله راهنمایی کرد.",
    "Welcoming team",
    "The reception team gave helpful directions.",
  ],
  [
    "ساعت شلوغ",
    "در ساعت اوج برای بعضی دستگاه‌ها منتظر ماندم.",
    "Busy hours",
    "I had to wait for some equipment at peak time.",
  ],
  [
    "تمرین گروهی",
    "کلاس گروهی انرژی خوبی داشت.",
    "Group workout",
    "The group class had great energy.",
  ],
  [
    "دسترسی مناسب",
    "رسیدن به باشگاه برای من راحت بود.",
    "Easy access",
    "Getting to the club was convenient for me.",
  ],
  [
    "نیاز به بهبود",
    "تهویه در سانس شلوغ می‌تواند بهتر باشد.",
    "Room for improvement",
    "Ventilation could improve during busy sessions.",
  ],
  [
    "برنامه منظم",
    "سانس طبق برنامه شروع شد.",
    "On schedule",
    "The session started on time.",
  ],
  [
    "تجربه مثبت",
    "از فضای تمرین و تجهیزات راضی بودم.",
    "Positive experience",
    "I was happy with the training space and equipment.",
  ],
];
const reviewers = [
  ["سارا محمدی", "Sara Mohammadi"],
  ["علی رضایی", "Ali Rezaei"],
  ["مریم احمدی", "Maryam Ahmadi"],
  ["امیر حسینی", "Amir Hosseini"],
  ["نرگس کریمی", "Narges Karimi"],
  ["رضا موسوی", "Reza Mousavi"],
  ["هانیه مرادی", "Hanieh Moradi"],
  ["سامان نوری", "Saman Noori"],
  ["نازنین عباسی", "Nazanin Abbasi"],
  ["محمد کاظمی", "Mohammad Kazemi"],
  ["ندا رحیمی", "Neda Rahimi"],
  ["آرمان جعفری", "Arman Jafari"],
];
const ratings = [5, 5, 5, 4, 4, 5, 3, 4, 5, 2, 4, 5];
export function getReviews(locale: string, clubId: string): ReviewSummary[] {
  return feedback.map(([titleFa, bodyFa, titleEn, bodyEn], index) => ({
    id: `${clubId}-review-${index}`,
    author: { displayName: reviewers[index]![locale === "fa" ? 0 : 1]! },
    title: locale === "fa" ? titleFa! : titleEn!,
    body: locale === "fa" ? bodyFa! : bodyEn!,
    rating: ratings[index]!,
    date: `2026-09-${String(28 - index).padStart(2, "0")}`,
  }));
}
export function getReviewCounts(reviews: ReviewSummary[]) {
  const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  reviews.forEach((review) => {
    const level = Math.max(
      1,
      Math.min(5, Math.round(review.rating)),
    ) as keyof typeof counts;
    counts[level]++;
  });
  return counts;
}
