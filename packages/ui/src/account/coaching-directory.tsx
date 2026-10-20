"use client";
import Link from "next/link";
import { ApiError } from "@repo/api";
import { AuthRequired } from "./auth-entry";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "@repo/i18n";
import {
  usePracticeQuery,
  useAccount,
  type CoachDirectoryDto,
  type CoachDetailDto,
} from "@repo/api/profile";
import { Button } from "../kit/Button";
import { AccountDesignPage } from "./account-design";
import { Loading, QueryError } from "./common";
import {
  PracticeField as Field,
  PracticeForm as Form,
  PracticeMoney,
  usePracticeAction,
  PracticeFeedback,
  text,
} from "./practice-forms";
export function CoachingDirectory({ detail = false }: { detail?: boolean }) {
  const t = useTranslations("Practice"),
    params = useSearchParams(),
    id = params.get("id") ?? "";
  const [filters, setFilters] = useState({
    search: "",
    city: "",
    specialty: "",
    goal: "",
    maxPrice: undefined as string | undefined,
    page: 1,
  });
  const q = usePracticeQuery<{ items: CoachDirectoryDto[]; hasMore: boolean }>(
    "coaching/directory",
    filters,
    !detail,
  );
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
      backHref={detail ? "/coaches" : "/coaching"}
    >
      <PracticeFeedback action={a} />
      {a.error instanceof ApiError && a.error.status === 401 && (
        <AuthRequired compact returnTo={`/coaches/detail?id=${id}`} />
      )}
      {!detail ? (
        <>
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
                  ? String(BigInt(text(f, "price")) * 10n)
                  : undefined,
                page: 1,
              });
            }}
          >
            {(["search", "city", "specialty", "goal"] as const).map((key) => (
              <Field key={key} name={key} label={t(key)} />
            ))}
            <Field name="price" type="number" label={t("maxPrice")} />
            <Button type="submit">{t("search")}</Button>
          </form>
          {q.isLoading ? (
            <Loading />
          ) : q.error ? (
            <QueryError error={q.error} retry={q.refetch} />
          ) : !q.data?.items.length ? (
            <p>{t("noCoaches")}</p>
          ) : (
            q.data.items.map((c) => (
              <article
                key={c.userId}
                className="space-y-3 rounded-3xl border bg-card p-5"
              >
                <h2 className="text-xl font-semibold">
                  {c.displayName ?? t("coach")}
                </h2>
                <p>
                  {c.city} · {c.specialties.join("، ")}
                </p>
                <p>
                  {t("experienceYears")}: {c.experienceYears}
                </p>
                <p>{t("credentialChecked")}</p>
                {c.fromPriceMinor && <PracticeMoney value={c.fromPriceMinor} />}
                <Button asChild>
                  <Link href={`/coaches/detail?id=${c.userId}`}>
                    {t("viewCoach")}
                  </Link>
                </Button>
              </article>
            ))
          )}
          <div className="flex gap-2">
            <Button
              variant="outline"
              disabled={filters.page === 1 || q.isFetching}
              onClick={() => setFilters({ ...filters, page: filters.page - 1 })}
            >
              {t("previous")}
            </Button>
            <Button
              variant="outline"
              disabled={!q.data?.hasMore || q.isFetching}
              onClick={() => setFilters({ ...filters, page: filters.page + 1 })}
            >
              {t("next")}
            </Button>
          </div>
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
                <Link href={`/services/detail?id=${s.serviceId}`}>
                  {t("bookService")}
                </Link>
              </Button>
            </article>
          ))}
          <h2 className="font-semibold">{t("reviews")}</h2>
          {!p.reviews.length && <p>{t("noReviews")}</p>}
          {p.reviews.map((r) => (
            <article key={r.id} className="space-y-2 rounded-3xl border p-5">
              <p>
                {r.rating}/5 · {t("verifiedSession")}
              </p>
              <p>{r.body}</p>
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
