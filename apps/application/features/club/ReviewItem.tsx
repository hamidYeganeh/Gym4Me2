"use client";

import type { ClubReview } from "./reviews";

import { useLocale, useTranslations } from "@repo/i18n";

import ClubIcon from "./ClubIcon";
import { reviewDate } from "./reviews";
import styles from "./sections.module.css";

const ReviewItem = (props: { review: ClubReview }) => {
  const t = useTranslations("Club");
  const { review } = props;
  const locale = useLocale();
  return (
    <article className={styles.reviewItem} aria-label={t("reviewBy", { name: review.name })}>
      <header className={styles.person}>
        <span className={styles.avatar} aria-hidden="true">
          {review.name
            .split(" ")
            .map((part) => part[0])
            .join("")}
        </span>
        <div>
          <h3>{review.name}</h3>
          <p>{t("memberSince", { year: review.memberSince })}</p>
        </div>
      </header>
      <div className={styles.reviewMeta}>
        <span className={styles.stars} aria-label={t("stars", { rating: review.rating })}>
          {[1, 2, 3, 4, 5].map((star) => (
            <ClubIcon
              key={star}
              name="star"
              fill={star <= review.rating ? "currentColor" : "none"}
            />
          ))}
        </span>
        <time dateTime={review.date}>{reviewDate(review.date, locale)}</time>
      </div>
      <p className={styles.reviewText}>{review.text}</p>
      <p className={styles.training}>{review.training}</p>
    </article>
  );
};
export default ReviewItem;
