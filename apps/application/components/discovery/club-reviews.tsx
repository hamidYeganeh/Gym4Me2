"use client";
import Link from "next/link";
import { useLocale, useTranslations } from "@repo/i18n";
import { ReviewCard } from "@repo/ui/kit/ReviewCard";
import { ReviewsSummary } from "@repo/ui/kit/ReviewsSummary";
import { Button } from "@repo/ui/kit/Button";
import { ChevronLeftIcon } from "@repo/ui/icons";
import { getReviews, getReviewCounts } from "../../lib/reviews";
import { getClubs } from "../../lib/clubs";
export function ClubReviews({
  clubId,
  full = false,
}: {
  clubId: string;
  full?: boolean;
}) {
  const locale = useLocale();
  const t = useTranslations("Reviews");
  const reviews = getReviews(locale, clubId);
  const cards = (
    <section className="flex min-w-0 flex-col gap-4" aria-label={t("title")}>
      {!full && (
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-2xl font-semibold">{t("title")}</h2>
          {reviews.length > 5 && (
            <Button asChild variant="ghost" className="shrink-0">
              <Link scroll={false} href={`/discovery/clubs/${clubId}/reviews`}>
                {t("seeAll")}
              </Link>
            </Button>
          )}
        </div>
      )}
      <ReviewsSummary
        counts={getReviewCounts(reviews)}
        locale={locale}
        labels={{
          average: t("average"),
          users: (count) =>
            t("users", { count: new Intl.NumberFormat(locale).format(count) }),
          rating: t("rating"),
        }}
      />
      {(full ? reviews : reviews.slice(0, 5)).map((review) => (
        <ReviewCard
          key={review.id}
          review={review}
          locale={locale}
          labels={{
            verified: t("verified"),
            like: t("like"),
            dislike: t("dislike"),
            report: t("report"),
            more: t("more"),
            rating: t("rating"),
          }}
        />
      ))}
      {!reviews.length && <p className="text-muted-foreground">{t("empty")}</p>}
    </section>
  );
  if (!full) return cards;
  return (
    <main className="mx-auto flex max-w-xl flex-col gap-6 px-6 pt-[calc(1.5rem+var(--app-safe-top))] pb-[calc(1.5rem+var(--app-safe-bottom))]">
      <header className="flex items-center gap-3">
        <Button asChild variant="outline" size="icon-lg">
          <Link
            href={`/discovery/clubs/${clubId}`}
            scroll={false}
            aria-label={t("back")}
          >
            <ChevronLeftIcon className="rtl:rotate-180" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">
            {getClubs(locale).find((club) => club.id === clubId)?.name}
          </p>
        </div>
      </header>
      {cards}
    </main>
  );
}
