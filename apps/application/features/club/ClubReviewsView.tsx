"use client";

import Link from "next/link";
import { useState } from "react";

import type { FitnessClub } from "./clubs";

import { useFormatter, useTranslations } from "@repo/i18n";
import { AnimatedButton } from "@repo/ui/kit/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from "@repo/ui/kit/empty";
import { Field, FieldGroup, FieldLabel } from "@repo/ui/kit/field";
import { Input } from "@repo/ui/kit/input";
import { Separator } from "@repo/ui/kit/separator";
import { ToggleGroup, ToggleGroupItem } from "@repo/ui/kit/toggle-group";

import ClubIcon from "./ClubIcon";
import ReviewItem from "./ReviewItem";
import ReviewSummary from "./ReviewSummary";
import styles from "./sections.module.css";

const ClubReviewsView = (props: { club: FitnessClub }) => {
  const t = useTranslations("Club");
  const format = useFormatter();

  const { club } = props;
  const [topic, setTopic] = useState("");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("newest");
  const search = query.trim().toLocaleLowerCase();
  const reviews = club.reviewEntries
    .filter((review) => !topic || review.training === topic)
    .filter((review) =>
      [review.name, review.text, review.training].some((value) =>
        value.toLocaleLowerCase().includes(search),
      ),
    )
    .sort((a, b) =>
      sort === "highest" ? b.rating - a.rating || b.date.localeCompare(a.date)
      : sort === "lowest" ? a.rating - b.rating || b.date.localeCompare(a.date)
      : b.date.localeCompare(a.date),
    );
  return (
    <main className={styles.reviewsPage}>
      <header className={styles.reviewsHeader}>
        <AnimatedButton
          asChild
          iconOnly
          className="size-12 p-0"
          color="secondary"
          radius="full"
          size="xl"
        >
          <Link href={`/club/${club.id}/#club-reviews`} aria-label={t("backToClub")}>
            <ClubIcon name="back" />
          </Link>
        </AnimatedButton>
        <div>
          <p>{club.name}</p>
          <h1>{t("memberReviews")}</h1>
        </div>
      </header>
      <ReviewSummary reviews={club.reviewEntries} />
      <Separator />
      <div className={styles.reviewsLayout}>
        <section aria-label={t("memberReviewList")} className={styles.reviewList}>
          <h2 className={styles.topicTitle}>{t("memberReviewsMention")}</h2>
          <div className={styles.topicRow} aria-label={t("filterReviewsByTraining")}>
            {Array.from(new Set(club.reviewEntries.map((review) => review.training))).map(
              (training) => (
                <AnimatedButton
                  key={training}
                  radius="full"
                  variant="outlined"
                  color={topic === training ? "primary" : "neutral"}
                  aria-pressed={topic === training}
                  onClick={() => setTopic(topic === training ? "" : training)}
                >
                  {training} ·{" "}
                  {format.number(
                    club.reviewEntries.filter((review) => review.training === training).length,
                  )}
                </AnimatedButton>
              ),
            )}
          </div>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="review-search">{t("searchReviews")}</FieldLabel>
              <Input
                id="review-search"
                type="search"
                placeholder={t("searchByTopicOrMember")}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                size="lg"
              />
            </Field>
          </FieldGroup>
          <div className={styles.reviewTools}>
            <p role="status">
              {t("reviewResults", { count: reviews.length, total: club.reviewEntries.length })}
            </p>
            <ToggleGroup
              aria-label={t("sortReviews")}
              value={[sort]}
              onValueChange={(values) => {
                if (values[0]) setSort(values[0]);
              }}
            >
              <ToggleGroupItem value="newest">{t("newest")}</ToggleGroupItem>
              <ToggleGroupItem value="highest">{t("highestRated")}</ToggleGroupItem>
              <ToggleGroupItem value="lowest">{t("lowestRated")}</ToggleGroupItem>
            </ToggleGroup>
          </div>
          {reviews.length ?
            reviews.map((review) => (
              <div key={review.id} id={review.id}>
                <ReviewItem review={review} />
                <Separator />
              </div>
            ))
          : <Empty>
              <EmptyHeader>
                <EmptyTitle>{t("noMatchingReviews")}</EmptyTitle>
                <EmptyDescription>
                  {t("tryAnotherWordOrBrowseAllMemberExperiences")}
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <AnimatedButton
                  variant="outlined"
                  onClick={() => {
                    setQuery("");
                    setTopic("");
                  }}
                >
                  {t("clearFilters")}
                </AnimatedButton>
              </EmptyContent>
            </Empty>
          }
        </section>
      </div>
    </main>
  );
};
export default ClubReviewsView;
