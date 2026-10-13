import { getTranslator } from "@repo/i18n/messages";
import type { ReviewSummary } from "@repo/ui/kit/ReviewCard";
// Preview data until club reviews are supplied by the API.
const feedback = [
  ["Preview.wellEquipped", "Preview.wellEquipped2"],
  ["Preview.helpfulCoaching", "Preview.helpfulCoaching2"],
  ["Preview.brightSpace", "Preview.brightSpace2"],
  ["Preview.goodSession", "Preview.goodSession2"],
  ["Preview.tidyChangingRoom", "Preview.tidyChangingRoom2"],
  ["Preview.welcomingTeam", "Preview.welcomingTeam2"],
  ["Preview.busyHours", "Preview.busyHours2"],
  ["Copy.groupWorkout", "Preview.groupWorkout"],
  ["Preview.easyAccess", "Preview.easyAccess2"],
  ["Preview.roomForImprovement", "Preview.roomForImprovement2"],
  ["Preview.onSchedule", "Preview.onSchedule2"],
  ["Preview.positiveExperience", "Preview.positiveExperience2"],
] as const;
const reviewers = [
  "Preview.saraMohammadi",
  "Preview.aliRezaei",
  "Preview.maryamAhmadi",
  "Preview.amirHosseini",
  "Preview.nargesKarimi",
  "Preview.rezaMousavi",
  "Preview.haniehMoradi",
  "Preview.samanNoori",
  "Preview.nazaninAbbasi",
  "Preview.mohammadKazemi",
  "Preview.nedaRahimi",
  "Preview.armanJafari",
] as const;
const ratings = [5, 5, 5, 4, 4, 5, 3, 4, 5, 2, 4, 5];
export function getReviews(locale: string, clubId: string): ReviewSummary[] {
  const text = getTranslator(locale);
  return feedback.map(([title, body], index) => ({
    id: `${clubId}-review-${index}`,
    author: { displayName: text(reviewers[index]!) },
    title: text(title!),
    body: text(body!),
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
