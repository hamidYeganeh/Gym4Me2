"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useLocale, useTranslations } from "@repo/i18n";
import { useAccount } from "@repo/api/profile";
import { useGrowthQuery } from "@repo/api/growth";
import type { ServiceDto } from "@repo/api/sports";
import { Button } from "../kit/Button";
import { Field } from "../advanced-business/forms";
import { Loading, QueryError } from "../account/common";
import { GrowthForm } from "./form";
type GameSummary = {
  id: string;
  title: string;
  status?: string;
  player_count: number;
  joined: number;
  deadline: string;
  start_at: string;
  branch_name: string;
};
type GameDetail = {
  id: string;
  serviceId: string;
  serviceTitle: string;
  branchName: string;
  title: string;
  status: "recruiting" | "confirmed" | "cancelled";
  deadline: string;
  organizer: boolean;
  bookingState: string | null;
  startAt: string;
  policy: { terms: string; cancellationHours: number };
  ownShare: { order_id: string; amount_minor: string } | null;
  shares: {
    slot: number;
    amount_minor: string;
    joined: boolean;
    status: string;
  }[];
};
function SignIn({ returnTo = "/games" }: { returnTo?: string }) {
  const t = useTranslations("Growth");
  return (
    <Button asChild>
      <Link href={`/login?returnTo=${encodeURIComponent(returnTo)}`}>
        {t("gameSignIn")}
      </Link>
    </Button>
  );
}
export function GamesHome() {
  const t = useTranslations("Growth"),
    account = useAccount(),
    publicGames = useGrowthQuery<GameSummary[]>("sports/games"),
    own = useGrowthQuery<GameSummary[]>("profile/games", {}, !!account.data);
  return (
    <main className="mx-auto grid min-h-dvh max-w-3xl gap-6 px-4 pt-7 pb-[calc(8rem+var(--app-safe-bottom,0px))]">
      <header className="flex justify-between gap-4">
        <h1 className="text-2xl font-semibold">{t("games")}</h1>
        <Link href="/services">{t("backServices")}</Link>
      </header>
      <p>{t("gamesHint")}</p>
      {!account.data && <SignIn />}
      {publicGames.error ? (
        <QueryError
          error={publicGames.error}
          retry={() => void publicGames.refetch()}
        />
      ) : publicGames.isLoading ? (
        <Loading />
      ) : (
        <section className="grid gap-3">
          {!publicGames.data?.length && <p>{t("noGames")}</p>}
          {publicGames.data?.map((g) => (
            <article key={g.id} className="grid gap-3 rounded-2xl border p-4">
              <h2>{g.title}</h2>
              <p>{g.branch_name}</p>
              <p>{t("players", { count: g.joined, total: g.player_count })}</p>
              <Link href={`/games/detail?id=${g.id}`}>{t("viewGame")}</Link>
            </article>
          ))}
        </section>
      )}
      {!!account.data && (
        <section className="grid gap-3">
          <h2 className="text-lg font-semibold">{t("myGames")}</h2>
          {own.error && (
            <QueryError error={own.error} retry={() => void own.refetch()} />
          )}{" "}
          {own.data?.map((g) => (
            <Link
              key={g.id}
              href={`/games/detail?id=${g.id}`}
              className="min-h-11 rounded-xl border p-3"
            >
              {g.title} ·{" "}
              {t(g.status as "recruiting" | "confirmed" | "cancelled")}
            </Link>
          ))}
        </section>
      )}
    </main>
  );
}
export function GameCreate() {
  const t = useTranslations("Growth"),
    params = useSearchParams(),
    router = useRouter(),
    account = useAccount(),
    service = params.get("service"),
    occurrence = params.get("occurrence"),
    q = useGrowthQuery<ServiceDto>(`sports/services/${service}`, {}, !!service);
  return (
    <main className="mx-auto grid min-h-dvh max-w-2xl gap-5 px-4 pt-7 pb-[calc(8rem+var(--app-safe-bottom,0px))]">
      <h1 className="text-2xl font-semibold">{t("createGame")}</h1>
      <Link href="/games">{t("games")}</Link>
      {!account.data ? (
        <SignIn
          returnTo={`/games/new?${new URLSearchParams({ service: service ?? "", occurrence: occurrence ?? "" })}`}
        />
      ) : q.error ? (
        <QueryError error={q.error} retry={() => void q.refetch()} />
      ) : q.isLoading ? (
        <Loading />
      ) : !service || !occurrence || q.data?.kind !== "court" ? (
        <p>{t("gameCourtOnly")}</p>
      ) : (
        <>
          <h2>{q.data.title}</h2>
          <p>{q.data.policy.terms}</p>
          <p>{t("gameDeadlineHint")}</p>
          <GrowthForm
            path="profile/games"
            label={t("createGame")}
            onSaved={(r) =>
              router.push(`/games/detail?id=${(r as { id: string }).id}`)
            }
            build={(f) => ({
              serviceId: service,
              occurrenceId: occurrence,
              title: String(f.get("title")),
              playerCount: Number(f.get("players")),
              public: f.get("public") === "on",
              acceptedTerms: f.get("accepted") === "on",
            })}
          >
            <Field name="title" label={t("gameTitle")} />
            <Field
              name="players"
              type="number"
              min="2"
              max="12"
              label={t("playerCount")}
            />
            <label className="flex min-h-11 gap-3">
              <input type="checkbox" name="public" defaultChecked />
              {t("publicGame")}
            </label>
            <label className="flex min-h-11 gap-3">
              <input type="checkbox" required name="accepted" />
              {t("acceptGameTerms")}
            </label>
          </GrowthForm>
        </>
      )}
    </main>
  );
}
export function GameDetails() {
  const t = useTranslations("Growth"),
    params = useSearchParams(),
    account = useAccount(),
    id = params.get("id"),
    locale = useLocale(),
    [copied, setCopied] = useState(false),
    q = useGrowthQuery<GameDetail>(
      `profile/games/${id}`,
      {},
      !!id && !!account.data,
    );
  const g = q.data;
  return (
    <main className="mx-auto grid min-h-dvh max-w-3xl gap-5 px-4 pt-7 pb-[calc(8rem+var(--app-safe-bottom,0px))]">
      <header className="flex justify-between gap-4">
        <h1 className="text-2xl font-semibold">{g?.title ?? t("games")}</h1>
        <Link href="/games">{t("back")}</Link>
      </header>
      {!account.data ? (
        <SignIn
          returnTo={`/games/detail?${new URLSearchParams({ id: id ?? "" })}`}
        />
      ) : q.error ? (
        <QueryError error={q.error} retry={() => void q.refetch()} />
      ) : q.isLoading ? (
        <Loading />
      ) : (
        g && (
          <>
            <p>
              {g.serviceTitle} · {g.branchName}
            </p>
            <time dateTime={g.startAt}>
              {new Intl.DateTimeFormat(locale === "fa" ? "fa-IR" : "en", {
                dateStyle: "medium",
                timeStyle: "short",
                timeZone: "Asia/Tehran",
              }).format(new Date(g.startAt))}
            </time>
            <Link href={`/services/detail?id=${g.serviceId}`}>
              {t("gameServiceDetails")}
            </Link>
            <p role="status">{t(g.status)}</p>
            {g.status === "confirmed" &&
              g.bookingState === "pending_approval" && (
                <p>{t("gameHostPending")}</p>
              )}
            {g.status === "confirmed" && g.bookingState === "confirmed" && (
              <p>{t("gameReservationConfirmed")}</p>
            )}
            <p>
              {t("gameDeadline")}:{" "}
              {new Intl.DateTimeFormat(locale === "fa" ? "fa-IR" : "en", {
                dateStyle: "medium",
                timeStyle: "short",
                timeZone: "Asia/Tehran",
              }).format(new Date(g.deadline))}
            </p>
            <p>{g.policy.terms}</p>
            {g.status === "recruiting" && <p>{t("gameDeadlineHint")}</p>}
            <div className="grid gap-3">
              {g.shares.map((s) => (
                <p key={s.slot} className="rounded-xl border p-3">
                  {t("shareNumber", { count: s.slot })} ·{" "}
                  {new Intl.NumberFormat(locale).format(
                    Number(s.amount_minor) / 10,
                  )}{" "}
                  {t("toman")} ·{" "}
                  {s.status === "paid"
                    ? t("sharePaid")
                    : s.status === "refunded"
                      ? t("shareRefunded")
                      : s.status === "partially_refunded"
                        ? t("sharePartialRefund")
                        : s.status === "cancelled"
                          ? t("shareCancelled")
                          : s.status === "review"
                            ? t("shareReview")
                            : s.joined
                              ? t("shareJoined")
                              : t("shareOpen")}
                </p>
              ))}
            </div>
            {g.status === "recruiting" && !g.ownShare && (
              <GrowthForm
                path={`profile/games/${id}/join`}
                label={t("joinGame")}
                build={(f) => ({ acceptedTerms: f.get("accepted") === "on" })}
              >
                <label className="flex min-h-11 gap-3">
                  <input type="checkbox" required name="accepted" />
                  {t("acceptGameTerms")}
                </label>
              </GrowthForm>
            )}
            {g.ownShare && (
              <Button asChild>
                <Link href={`/checkout/status?order=${g.ownShare.order_id}`}>
                  {t(g.status === "recruiting" ? "payMyShare" : "viewShare")}
                </Link>
              </Button>
            )}
            <GrowthForm
              path={`profile/games/${id}/reconcile`}
              label={t("reviewPayments")}
              build={() => ({ acceptedTerms: true })}
            >
              <p>{t("reviewPaymentsHint")}</p>
            </GrowthForm>
            {g.organizer && g.status !== "cancelled" && (
              <GrowthForm
                path={`profile/games/${id}/cancel`}
                label={t("cancelGame")}
                build={(f) => ({ acceptedTerms: f.get("accepted") === "on" })}
              >
                <label className="flex min-h-11 gap-3">
                  <input type="checkbox" required name="accepted" />
                  {t("confirmGameCancel")}
                </label>
              </GrowthForm>
            )}
            <Button
              variant="outline"
              onClick={() => {
                const base =
                  process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
                const url = new URL(`/games/detail?id=${id}`, base);
                void navigator.clipboard
                  .writeText(url.href)
                  .then(() => setCopied(true))
                  .catch(() => setCopied(false));
              }}
            >
              {t("copyGameLink")}
            </Button>
            {copied && <p role="status">{t("linkCopied")}</p>}
          </>
        )
      )}
    </main>
  );
}
