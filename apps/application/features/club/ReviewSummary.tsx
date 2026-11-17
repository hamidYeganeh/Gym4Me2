"use client";

import type { ClubReview } from "./reviews";

import { useFormatter, useLocale, useTranslations } from "@repo/i18n";

import ClubIcon from "./ClubIcon";
import { averageRating, categoryRating, reviewCategories } from "./reviews";
import styles from "./sections.module.css";

const ReviewSummary = (props: { reviews: ClubReview[] }) => {
  const t = useTranslations("Club");
  const format = useFormatter();
  const locale = useLocale();
  const { reviews } = props;
  return (
    <div className={styles.summary}>
      <div className={styles.ratingHero}>
        <span className={styles.ratingNumber}>
          <ClubIcon name="star" fill="currentColor" />
          {averageRating(reviews, locale)}
        </span>
        <h3>{t("memberExperiences")}</h3>
        <p>{t("sampleReviewCount", { count: reviews.length })}</p>
      </div>
      <div className={styles.ratingBreakdown}>
        <div className={styles.overall}>
          <p>{t("overallRating")}</p>
          {[5, 4, 3, 2, 1].map((rating) => {
            const count = reviews.filter((review) => review.rating === rating).length;
            return (
              <div key={rating}>
                <span>{format.number(rating)}</span>
                <meter
                  min={0}
                  max={reviews.length || 1}
                  value={count}
                  aria-label={t("ratingCount", { count, rating })}
                />
              </div>
            );
          })}
        </div>
        <dl className={styles.categoryGrid}>
          {reviewCategories.map((category) => (
            <div
              key={t(
                category.toLowerCase() as
                  "cleanliness" | "equipment" | "coaching" | "atmosphere" | "value" | "location",
              )}
            >
              <dt>
                {t(
                  category.toLowerCase() as
                    "cleanliness" | "equipment" | "coaching" | "atmosphere" | "value" | "location",
                )}
              </dt>
              <dd>{categoryRating(reviews, category, locale)}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
};
export default ReviewSummary;
