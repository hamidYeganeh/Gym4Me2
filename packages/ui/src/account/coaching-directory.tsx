"use client";
import { DiscoveryContentSections } from "../discovery-content";
import { serviceHref, coachHref } from "@repo/ui/lib/public-route";
import { ApiError } from "@repo/api";
import {
  useAccount,
  useInfiniteCoaches,
  usePracticeQuery,
  type CoachDetailDto,
} from "@repo/api/profile";
import { useLocale, useTranslations } from "@repo/i18n";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  ArrowTopLeftIcon as ArrowUpLeft,
  SealCheckIcon as BadgeCheck,
  MapPin1Icon as MapPin,
} from "../icons";
import { FilterSheet } from "../kit/BottomSheet";
import { Button } from "../kit/Button";
import { AccountDesignPage } from "./account-design";
import { AuthRequired } from "./auth-entry";
import { Input } from "../kit/Input";
import { CoachSamples } from "./coach-samples";
import { CoachProfileLink } from "./coach-profile-link";
import { FitnessIllustration } from "../kit/FitnessIllustration";
import { Loading, QueryError } from "./common";
import {
  PracticeField as Field,
  PracticeForm as Form,
  PracticeFeedback,
  PracticeMoney,
  text,
  usePracticeAction,
} from "./practice-forms";
import { ReviewReactions } from "./review-reactions";
export function CoachingDirectory({
  detail = false,
  backHref,
}: {
  detail?: boolean;
  backHref?: string;
}) {
  const t = useTranslations("Practice"),
    params = useSearchParams(),
    id = params.get("id") ?? "";
  const visual = useTranslations("Visual");
  const locale = useLocale();
  const [filters, setFilters] = useState({
    search: "",
    city: "",
    specialty: "",
    goal: "",
    maxPrice: undefined as string | undefined,
  });
  const activeFilters = [
    filters.city,
    filters.specialty,
    filters.goal,
    filters.maxPrice,
  ].filter(Boolean).length;
  const q = useInfiniteCoaches(filters, !detail);
  const coaches = Array.from(
    new Map(
      q.data?.pages
        .flatMap((page) => page.items)
        .map((coach) => [coach.userId, coach]),
    ).values(),
  );
  const sentinel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = sentinel.current;
    if (!node || !q.hasNextPage || q.isFetchingNextPage || q.isError) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) void q.fetchNextPage();
      },
      { rootMargin: "400px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [q.hasNextPage, q.isFetchingNextPage, q.isError, q.fetchNextPage]);
  const profile = usePracticeQuery<CoachDetailDto>(
    `coaching/directory/${id}`,
    {},
    detail && Boolean(id),
  );
  const a = usePracticeAction();
  const account = useAccount();
  const p = profile.data;
  return (
    <AccountDesignPage
      title={t("directory")}
      backHref={backHref ?? (detail ? "/coaches" : "/coaching")}
    >
      <PracticeFeedback action={a} />
      {a.error instanceof ApiError && a.error.status === 401 && (
        <AuthRequired compact returnTo={`/coaches/detail?id=${id}`} />
      )}
      {!detail ? (
        <>
          <DiscoveryContentSections page="coaches" />
          <Input
            type="search"
            label={t("search")}
            value={filters.search}
            maxLength={120}
            onChange={(event) =>
              setFilters({ ...filters, search: event.target.value })
            }
          />
          <FilterSheet count={activeFilters}>
            <form
              className="space-y-3 rounded-3xl border bg-card p-5"
              onSubmit={(e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                setFilters({
                  search: text(f, "search"),
                  city: text(f, "city"),
                  specialty: text(f, "specialty"),
                  goal: text(f, "goal"),
                  maxPrice: text(f, "price")
                    ? String(BigInt(text(f, "price")) * BigInt(10))
                    : undefined,
                });
              }}
            >
              <div className="coach-directory-search">
                <Field
                  name="search"
                  type="search"
                  label={t("search")}
                  value={filters.search}
                />
                <Button type="submit">{t("search")}</Button>
              </div>
              <div className="coach-directory-filter-grid">
                {(["city", "specialty", "goal"] as const).map((key) => (
                  <Field
                    key={key}
                    name={key}
                    label={t(key)}
                    value={filters[key]}
                  />
                ))}
                <Field
                  name="price"
                  type="number"
                  label={t("maxPrice")}
                  value={
                    filters.maxPrice
                      ? String(BigInt(filters.maxPrice) / BigInt(10))
                      : ""
                  }
                />
              </div>
            </form>
          </FilterSheet>
          {q.isLoading ? (
            <Loading />
          ) : q.error && !coaches.length ? (
            <QueryError error={q.error} retry={q.refetch} />
          ) : !coaches.length ? (
            <div className="flex flex-col items-center gap-4 py-10 text-center">
              <FitnessIllustration kind="coach" />
              <p>{t("noCoaches")}</p>
              <Button
                variant="secondary"
                onClick={() =>
                  setFilters({
                    search: "",
                    city: "",
                    specialty: "",
                    goal: "",
                    maxPrice: undefined,
                  })
                }
              >
                {t("search")}
              </Button>
            </div>
          ) : (
            coaches.map((c) => (
              <article
                key={c.userId}
                data-zoom-exit-key={
                  c.publicId ? `coach-${c.publicId}` : undefined
                }
                className="coach-directory-card"
              >
                <div className="coach-directory-identity">
                  <span className="coach-directory-avatar" aria-hidden="true">
                    {(c.displayName || t("coach"))
                      .trim()
                      .split(/\s+/)
                      .slice(0, 2)
                      .map((part) => part[0])
                      .join(" ")}
                  </span>
                  <div className="min-w-0">
                    <h2>{c.displayName ?? t("coach")}</h2>
                    <p className="flex items-center gap-1">
                      <MapPin size={13} />
                      {c.city}
                    </p>
                  </div>
                </div>
                <div className="coach-directory-tags">
                  {c.specialties.map((specialty) => (
                    <span key={specialty}>{specialty}</span>
                  ))}
                </div>
                <p className="flex flex-wrap items-center gap-x-4 gap-y-1">
                  <span>
                    {t("experienceYears")}:{" "}
                    {new Intl.NumberFormat(locale).format(c.experienceYears)}
                  </span>
                  {c.credentialVerified && (
                    <span className="flex items-center gap-1">
                      <BadgeCheck size={14} />
                      {t("credentialChecked")}
                    </span>
                  )}
                </p>
                <div className="coach-directory-footer">
                  <span>
                    {c.fromPriceMinor ? (
                      <PracticeMoney value={c.fromPriceMinor} />
                    ) : (
                      visual("meetCoach")
                    )}
                  </span>
                  {c.publicId ? (
                    <Button variant="outline" asChild>
                      <Link href={coachHref(c.publicId)}>
                        {t("viewCoach")}
                        <ArrowUpLeft className="ltr:rotate-90" size={16} />
                      </Link>
                    </Button>
                  ) : (
                    <Button variant="outline" disabled title={t("unavailable")}>
                      {t("viewCoach")}
                    </Button>
                  )}
                </div>
              </article>
            ))
          )}
          {q.error && coaches.length > 0 && (
            <QueryError error={q.error} retry={() => q.fetchNextPage()} />
          )}
          <div ref={sentinel} className="h-1" aria-hidden="true" />
          {q.hasNextPage && (
            <Button
              variant="outline"
              disabled={q.isFetchingNextPage}
              onClick={() => void q.fetchNextPage()}
            >
              {t("next")}
            </Button>
          )}
        </>
      ) : profile.isLoading ? (
        <Loading />
      ) : profile.error ? (
        <QueryError error={profile.error} retry={profile.refetch} />
      ) : p ? (
        <>
          <article className="space-y-3 rounded-3xl border bg-card p-5">
            <h2 className="text-2xl font-semibold">
              {p.displayName ?? t("coach")}
            </h2>
            <p>
              {p.city} · {p.specialties.join("، ")}
            </p>
            <p>{p.biography}</p>
            <CoachProfileLink userId={p.publicId} />
            <p>{t("credentialChecked")}</p>
            <p className="text-sm text-muted-foreground">
              {t("requestConsent")}
            </p>
            <Button
              disabled={a.pending}
              onClick={() =>
                void a.run(`profile/coaching/requests/${p.userId}`, {})
              }
            >
              {t("requestCoaching")}
            </Button>
            <Button variant="outline" asChild>
              <Link href="/coaching">{t("manageRelationship")}</Link>
            </Button>
          </article>
          <CoachSamples username={p.publicId} />
          <h2 className="font-semibold">{t("services")}</h2>
          {p.services.map((s) => (
            <article
              key={s.serviceId}
              className="space-y-3 rounded-3xl border p-5"
            >
              <h3>{s.title}</h3>
              <p>
                {t(
                  s.mode === "semi_private"
                    ? "semiPrivate"
                    : s.mode === "online"
                      ? "online"
                      : s.mode === "introduction"
                        ? "introduction"
                        : "private",
                )}
              </p>
              <p>
                {s.clubName} · {s.branchName}
              </p>
              <p>
                {t("totalPrice")}: <PracticeMoney value={s.amountMinor} />
              </p>
              <p>
                {t("entryIncluded")}:{" "}
                <PracticeMoney value={s.entryAmountMinor} />
              </p>
              <p>
                {t("coachFee")}:{" "}
                <PracticeMoney
                  value={(
                    BigInt(s.amountMinor) - BigInt(s.entryAmountMinor)
                  ).toString()}
                />
              </p>
              <p>
                {s.approvalRequired
                  ? t("requestPendingHint")
                  : t("directConfirmation")}
              </p>
              <Button variant="outline" asChild>
                <Link href={serviceHref(s.publicId)}>{t("bookService")}</Link>
              </Button>
            </article>
          ))}
          <h2 className="font-semibold">{t("reviews")}</h2>
          {!p.reviews.length && <p>{t("noReviews")}</p>}
          {p.reviews.map((r) => (
            <article key={r.id} className="space-y-2 rounded-3xl border p-5">
              <p>{r.rating}/5</p>
              <p>{r.body}</p>
              <ReviewReactions kind="coach" reviewId={r.id} />
              {r.example && <p>{r.example}</p>}
              {r.reply && (
                <p>
                  {t("coachReply")}: {r.reply}
                </p>
              )}
              {account.data?.id === r.coachId && (
                <Form
                  key={r.replyRevision}
                  title={t("coachReply")}
                  pending={a.pending}
                  onSubmit={(f) =>
                    void a.run(
                      `profile/coaching-practice/reviews/${r.id}/reply`,
                      { body: text(f, "body"), revision: r.replyRevision },
                    )
                  }
                >
                  <Field
                    name="body"
                    label={t("coachReply")}
                    value={r.reply}
                    required
                  />
                </Form>
              )}
              <details>
                <summary>{t("reportReview")}</summary>
                <Form
                  title={t("reportReview")}
                  pending={a.pending}
                  onSubmit={(f) =>
                    void a.run(
                      `profile/coaching-practice/reviews/${r.id}/report`,
                      { reason: text(f, "reason") },
                    )
                  }
                >
                  <Field name="reason" label={t("reason")} required />
                </Form>
              </details>
            </article>
          ))}
        </>
      ) : (
        <p>{t("unavailable")}</p>
      )}
    </AccountDesignPage>
  );
}
