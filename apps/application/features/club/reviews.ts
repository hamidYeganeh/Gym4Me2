export const reviewCategories = [
  "Cleanliness",
  "Equipment",
  "Coaching",
  "Atmosphere",
  "Value",
  "Location",
] as const;
export type ClubReview = {
  id: string;
  name: string;
  memberSince: string;
  date: string;
  rating: number;
  text: string;
  training: string;
  scores: Record<(typeof reviewCategories)[number], number>;
};
export const averageRating = (reviews: ClubReview[], locale = "fa") =>
  reviews.length ?
    (reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length).toLocaleString(
      locale,
      { maximumFractionDigits: 2 },
    )
  : "—";
export const categoryRating = (
  reviews: ClubReview[],
  category: (typeof reviewCategories)[number],
  locale = "fa",
) =>
  reviews.length ?
    (
      reviews.reduce((sum, review) => sum + review.scores[category], 0) / reviews.length
    ).toLocaleString(locale, { maximumFractionDigits: 1 })
  : "—";
export const reviewDate = (value: string, locale = "fa") =>
  new Intl.DateTimeFormat(locale, { month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(value),
  );
