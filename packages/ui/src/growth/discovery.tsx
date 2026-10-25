"use client";
import Link from "next/link";
import { useState } from "react";
import { useLocale, useTranslations } from "@repo/i18n";
import { useGrowthQuery } from "@repo/api/growth";
import { Button } from "../kit/Button";
import { NativeSelect, NativeSelectOption } from "../kit/NativeSelect";
import { Loading, QueryError } from "../account/common";
import { Field } from "../advanced-business/forms";
import { useTrainingEvent } from "../training/common";
export type Recommendations = {
  items: {
    id: string;
    service_id: string;
    title: string;
    description: string;
    level: string;
    branch_name: string;
    start_at: string;
    end_at: string;
    remaining: number;
    original_amount_minor: string;
    amount_minor: string;
    offer_id: string | null;
    reasons: string[];
  }[];
  limited: boolean;
};
export function DiscoverOffers() {
  const t = useTranslations("Growth"),
    locale = useLocale(),
    [filters, setFilters] = useState({
      q: "",
      level: "any",
      offersOnly: "false",
      from: "",
      to: "",
    });
  const q = useGrowthQuery<Recommendations>("sports/recommendations", {
    q: filters.q,
    level: filters.level,
    offersOnly: filters.offersOnly,
    from: filters.from ? new Date(filters.from).toISOString() : undefined,
    to: filters.to ? new Date(filters.to).toISOString() : undefined,
  });
  useTrainingEvent("discovery_searched");
  return (
    <main className="mx-auto grid min-h-dvh max-w-3xl gap-6 px-4 pt-7 pb-[calc(8rem+var(--app-safe-bottom,0px))]">
      <header className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">{t("explore")}</h1>
        <Link href="/services">{t("backServices")}</Link>
      </header>
      <p className="text-muted-foreground">{t("recommendationHint")}</p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          setFilters({
            q: String(f.get("q") ?? ""),
            level: String(f.get("level") ?? "any"),
            offersOnly: f.get("offers") === "on" ? "true" : "false",
            from: String(f.get("from") ?? ""),
            to: String(f.get("to") ?? ""),
          });
        }}
        className="grid gap-4 rounded-2xl border p-4"
      >
        <Field name="q" label={t("goal")} required={false} />
        <Field name="level" label={t("level")}>
          <NativeSelect name="level" defaultValue="any">
            <NativeSelectOption value="any">{t("all")}</NativeSelectOption>
            <NativeSelectOption value="beginner">
              {t("beginner")}
            </NativeSelectOption>
          </NativeSelect>
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            name="from"
            type="datetime-local"
            label={t("from")}
            required={false}
          />
          <Field
            name="to"
            type="datetime-local"
            label={t("to")}
            required={false}
          />
        </div>
        <label className="flex min-h-11 items-center gap-3">
          <input name="offers" type="checkbox" />
          {t("onlyOffers")}
        </label>
        <Button>{t("find")}</Button>
      </form>
      {q.isLoading ? (
        <Loading />
      ) : q.error ? (
        <QueryError error={q.error} retry={() => void q.refetch()} />
      ) : !q.data?.items.length ? (
        <p>{t("noRecommendations")}</p>
      ) : (
        <section className="grid gap-4" aria-label={t("explore")}>
          {q.data.items.map((o) => (
            <article key={o.id} className="grid gap-3 rounded-2xl border p-4">
              <h2 className="text-lg font-semibold">{o.title}</h2>
              <p>
                {o.branch_name} ·{" "}
                {o.level.toLowerCase() === "beginner"
                  ? t("beginner")
                  : o.level}
              </p>
              <time dateTime={o.start_at}>
                {new Intl.DateTimeFormat(locale === "fa" ? "fa-IR" : "en", {
                  dateStyle: "medium",
                  timeStyle: "short",
                  timeZone: "Asia/Tehran",
                }).format(new Date(o.start_at))}
              </time>
              <p>{t("remaining", { count: o.remaining })}</p>
              <p>
                {o.offer_id && (
                  <del className="me-3 text-muted-foreground">
                    {new Intl.NumberFormat(locale).format(
                      Number(o.original_amount_minor) / 10,
                    )}
                  </del>
                )}
                {new Intl.NumberFormat(locale).format(
                  Number(o.amount_minor) / 10,
                )}{" "}
                {t("toman")}
              </p>
              <p className="text-sm text-muted-foreground">
                {o.reasons
                  .map((r) =>
                    t(r as "beginner" | "discount" | "available" | "time"),
                  )
                  .join(" · ")}
              </p>
              <Button asChild>
                <Link
                  href={`/checkout?service=${o.service_id}&occurrence=${o.id}`}
                >
                  {t("reserve")}
                </Link>
              </Button>
            </article>
          ))}
        </section>
      )}
      {q.data?.limited && <p>{t("narrowSearch")}</p>}
    </main>
  );
}
