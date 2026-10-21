"use client";
import { MobileHeader, MobilePage } from "@repo/ui/mobile-page";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "@repo/i18n";
import { ReviewCard } from "@repo/ui/kit/ReviewCard";
import { ReviewsSummary } from "@repo/ui/kit/ReviewsSummary";
import { Button } from "@repo/ui/kit/Button";
import { getReviewCounts } from "../../lib/reviews";
import { useClubReviews } from "@repo/api/catalog";
import { useCatalogClub } from "./use-catalog";
import { CatalogState } from "./catalog-state";
import { clubHref } from "../../lib/club-href";
import { ServiceReviewForm, ReviewReportForm } from "@repo/ui/training";
import { useState } from "react";
export function ClubReviews({
  clubId,
  full = false,
  branchId,
}: {
  clubId: string;
  full?: boolean;
  branchId?: string;
}) {
  const locale = useLocale();
  const t = useTranslations("Reviews");
  const copy = useTranslations("Catalog");
  const [page, setPage] = useState(1);
  const [reportId, setReportId] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const requestedBranch = branchId ?? searchParams.get("branch") ?? undefined;
  const club = useCatalogClub(clubId, requestedBranch);
  const currentBranch = requestedBranch ?? club.branch?.id;
  const query = useClubReviews(clubId, currentBranch, { page });
  const reviews = (query.data ?? []).map((review) => ({
    id: review.id,
    title: "",
    body: review.body ?? "",
    date: review.createdAt,
    rating: review.rating,
    verified: review.verified,
    author: { displayName: review.author ?? copy("anonymous") },
  }));
  if (!club.club || club.branchQuery.isError) {
    const state = (
      <CatalogState
        loading={club.isPending}
        missing={club.error?.status === 404}
        retry={
          club.isError
            ? () => void club.refetch()
            : club.branchQuery.isError
              ? () => void club.branchQuery.refetch()
              : undefined
        }
      />
    );
    return full ? (
      <MobilePage
        title={t("title")}
        backHref={clubHref(
          clubId,
          undefined,
          currentBranch ? { branch: currentBranch } : undefined,
        )}
      >
        {state}
      </MobilePage>
    ) : (
      state
    );
  }
  const cards = (
    <section className="flex min-w-0 flex-col gap-4" aria-label={t("title")}>
      {!full && (
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-2xl font-semibold">{t("title")}</h2>
          {reviews.length > 5 && (
            <Button asChild variant="ghost" className="shrink-0">
              <Link
                scroll={false}
                href={clubHref(
                  clubId,
                  "reviews",
                  currentBranch ? { branch: currentBranch } : undefined,
                )}
              >
                {t("seeAll")}
              </Link>
            </Button>
          )}
        </div>
      )}
      {!query.isPending && reviews.length < 25 && page === 1 && (
        <ReviewsSummary
          counts={getReviewCounts(reviews)}
          locale={locale}
          labels={{
            average: t("average"),
            users: (count) =>
              t("users", {
                count: new Intl.NumberFormat(locale).format(count),
              }),
            rating: t("rating"),
          }}
        />
      )}
      {query.isPending && <CatalogState loading />}
      {query.isError && <CatalogState retry={() => void query.refetch()} />}
      {currentBranch && (
        <ServiceReviewForm clubId={clubId} branchId={currentBranch} />
      )}
      {(full ? reviews : reviews.slice(0, 5)).map((review) => (
        <div key={review.id} className="space-y-3">
          <ReviewCard
            key={review.id}
            review={review}
            locale={locale}
            onReport={() => setReportId(review.id)}
            labels={{
              verified: t("verified"),
              like: t("like"),
              dislike: t("dislike"),
              report: t("report"),
              more: t("more"),
              rating: t("rating"),
            }}
          />
          {query.data?.find((r) => r.id === review.id)?.reply && (
            <p className="rounded-2xl bg-muted p-4 text-sm">
              {query.data.find((r) => r.id === review.id)?.reply}
            </p>
          )}
          {reportId === review.id && currentBranch && (
            <ReviewReportForm
              clubId={clubId}
              branchId={currentBranch}
              reviewId={review.id}
              onClose={() => setReportId(null)}
            />
          )}
        </div>
      ))}
      {!query.isPending && !query.isError && !reviews.length && (
        <p className="text-muted-foreground">{t("empty")}</p>
      )}
      {full && (
        <div className="flex gap-3">
          <Button
            variant="outline"
            disabled={page === 1 || query.isFetching}
            onClick={() => setPage(page - 1)}
          >
            {copy("previous")}
          </Button>
          <Button
            variant="outline"
            disabled={reviews.length < 25 || query.isFetching}
            onClick={() => setPage(page + 1)}
          >
            {copy("next")}
          </Button>
        </div>
      )}
    </section>
  );
  if (!full) return cards;
  return (
    <main className="mx-auto flex max-w-xl flex-col gap-6 px-6 pt-[calc(1.5rem+var(--app-safe-top))] pb-[calc(1.5rem+var(--app-safe-bottom))]">
      <MobileHeader
        title={t("title")}
        subtitle={club.club?.name}
        backHref={clubHref(
          clubId,
          undefined,
          currentBranch ? { branch: currentBranch } : undefined,
        )}
      />
      {cards}
    </main>
  );
}
