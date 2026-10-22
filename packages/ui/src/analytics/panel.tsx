"use client";
import { useState, useId } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "@repo/i18n";
import {
  useAnalytics,
  type AnalyticsFilters,
  type AnalyticsMetric,
  type AnalyticsSurface,
} from "@repo/api/analytics";
import { Button } from "../kit/Button";
import { Card, CardContent, CardHeader, CardTitle } from "../kit/Card";
import { NativeSelect, NativeSelectOption } from "../kit/NativeSelect";
import { Loading, QueryError, TextField } from "../account/common";
import {
  analyticsBuckets,
  analyticsTotals,
  csvCell,
  rangeValid,
} from "../lib/analytics-data";
import "./panel.css";

function period(days: number): AnalyticsFilters {
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tehran",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const start = new Date(`${today}T12:00:00Z`);
  start.setUTCDate(start.getUTCDate() - days + 1);
  return {
    from: start.toISOString().slice(0, 10),
    to: today,
    interval: days > 93 ? "month" : "day",
  };
}
export function AnalyticsPanel({ surface }: { surface: AnalyticsSurface }) {
  const t = useTranslations("Analytics"),
    luma = useTranslations("Luma"),
    locale = useLocale(),
    id = useId();
  const [filters, setFilters] = useState<AnalyticsFilters>(() => period(30));
  const [draft, setDraft] = useState(filters);
  const query = useAnalytics(surface, filters);
  const data = [401, 403].includes(query.error?.status ?? 0)
    ? undefined
    : query.data;
  const options = data?.options,
    valid = rangeValid(draft),
    totals = analyticsTotals(data?.data ?? []),
    buckets = data ? analyticsBuckets(data) : [];
  const number = (v: number | bigint) =>
    new Intl.NumberFormat(locale).format(v);
  const date = (v: string) =>
    new Intl.DateTimeFormat(locale, {
      month: "short",
      day: "numeric",
      year: "numeric",
      timeZone: "Asia/Tehran",
    }).format(new Date(`${v}T12:00:00Z`));
  const money = (v: bigint) => `${number(v / BigInt(10))} ${luma("toman")}`;
  const organizations = [
    ...new Map(
      options?.branches.map((b) => [
        b.organization_id,
        { id: b.organization_id, name: b.organization_name },
      ]) ?? [],
    ).values(),
  ];
  const branches =
    options?.branches.filter(
      (b) =>
        !draft.organizationId || b.organization_id === draft.organizationId,
    ) ?? [];
  const services =
    options?.services.filter(
      (s) =>
        (!draft.organizationId || s.organization_id === draft.organizationId) &&
        (!draft.branchId || s.branch_id === draft.branchId) &&
        (!draft.kind || s.kind === draft.kind),
    ) ?? [];
  const metrics: AnalyticsMetric[] = [
    "collectedMinor",
    "refundedMinor",
    "orders",
    "bookings",
    "attendance",
    "sessions",
    "cancelled",
    "noShows",
    ...(surface === "coach" &&
    !filters.organizationId &&
    !filters.branchId &&
    !filters.serviceId &&
    !filters.kind
      ? (["sharedWorkouts", "reviewedWorkouts", "plansPublished"] as const)
      : []),
  ];
  const select = (
    key: "organizationId" | "branchId" | "serviceId" | "kind" | "interval",
    values: { id: string; name: string }[],
  ) => (
    <label className="grid min-w-0 gap-2 text-sm" htmlFor={`${id}-${key}`}>
      {t(key)}
      <NativeSelect
        id={`${id}-${key}`}
        value={draft[key] ?? ""}
        onChange={(e) =>
          setDraft((d) => ({
            ...d,
            [key]: e.target.value || undefined,
            ...(key === "organizationId"
              ? { branchId: undefined, serviceId: undefined }
              : key === "branchId" || key === "kind"
                ? { serviceId: undefined }
                : {}),
          }))
        }
      >
        {key !== "interval" && (
          <NativeSelectOption value="">{t("all")}</NativeSelectOption>
        )}
        {values.map((v) => (
          <NativeSelectOption key={v.id} value={v.id}>
            {v.name}
          </NativeSelectOption>
        ))}
      </NativeSelect>
    </label>
  );
  function download() {
    if (!data) return;
    const columns: AnalyticsMetric[] = [
      "orders",
      "bookings",
      "attendance",
      "sessions",
      "cancelled",
      "noShows",
      "capacity",
      "occupied",
      "collectedMinor",
      "refundedMinor",
      ...metrics.filter((k) =>
        ["sharedWorkouts", "reviewedWorkouts", "plansPublished"].includes(k),
      ),
    ];
    const lines: unknown[][] = [
      [
        t("from"),
        data.filters.from,
        t("to"),
        data.filters.to,
        data.timezone,
        data.filters.interval,
      ],
      [
        t("organizationId"),
        data.filters.organizationId ?? "",
        t("branchId"),
        data.filters.branchId ?? "",
        t("serviceId"),
        data.filters.serviceId ?? "",
        t("kind"),
        data.filters.kind ?? "",
      ],
      [
        t("date"),
        ...columns.map((k) =>
          k === "collectedMinor"
            ? t("collectedIRR")
            : k === "refundedMinor"
              ? t("refundedIRR")
              : t(k as Parameters<typeof t>[0]),
        ),
      ],
      ...buckets.map((b) => [
        b.date,
        ...columns.map((k) => b.values[k] ?? "0"),
      ]),
      [],
      [t("statuses")],
      ...data.statuses.map((s) => [s.status, s.count]),
      [],
      [t("funnel")],
      ...data.platform.map((e) => [e.name, e.count]),
      ...(data.growth
        ? [
            [],
            [t("growth")],
            ...Object.entries(data.growth).map(([key, value]) => [key, value]),
          ]
        : []),
    ];
    const url = URL.createObjectURL(
      new Blob(
        ["\uFEFF", lines.map((r) => r.map(csvCell).join(",")).join("\r\n")],
        { type: "text/csv;charset=utf-8" },
      ),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `gym4me-${data.filters.from}-${data.filters.to}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  const max = Math.max(
    1,
    ...buckets.map((r) => Math.max(r.bookings, r.attendance)),
  );
  return (
    <section
      className="analytics-panel grid min-w-0 gap-6"
      aria-label={t("title")}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">{t("title")}</h2>
          <p className="text-sm text-muted-foreground">
            {t(`${surface}Scope`)}
          </p>
        </div>
        <Button
          variant="outline"
          onClick={download}
          disabled={!data || query.isFetching}
        >
          {t("export")}
        </Button>
      </div>
      <Card>
        <CardContent className="grid gap-5 pt-5">
          <div className="flex flex-wrap gap-2" aria-label={t("presets")}>
            {[7, 30, 90, 365].map((days) => (
              <Button
                key={days}
                size="sm"
                variant="outline"
                onClick={() => setDraft((d) => ({ ...d, ...period(days) }))}
              >
                {t("lastDays", { days })}
              </Button>
            ))}
          </div>
          <form
            className="analytics-filters"
            onSubmit={(e) => {
              e.preventDefault();
              if (valid) setFilters(draft);
            }}
          >
            <TextField
              label={t("from")}
              name={`${id}-from`}
              type="date"
              dir="ltr"
              value={draft.from}
              max={draft.to}
              required
              onChange={(e) =>
                setDraft((d) => ({ ...d, from: e.target.value }))
              }
            />
            <TextField
              label={t("to")}
              name={`${id}-to`}
              type="date"
              dir="ltr"
              value={draft.to}
              min={draft.from}
              required
              onChange={(e) => setDraft((d) => ({ ...d, to: e.target.value }))}
            />
            {select(
              "interval",
              (["day", "week", "month"] as const).map((k) => ({
                id: k,
                name: t(k),
              })),
            )}
            <details className="analytics-refine">
              <summary>{t("refine")}</summary>
              <div className="analytics-filters mt-4">
                {select("organizationId", organizations)}
                {select("branchId", branches)}
                {select(
                  "kind",
                  (
                    [
                      "class",
                      "course",
                      "court",
                      "access",
                      "membership",
                    ] as const
                  ).map((k) => ({ id: k, name: luma(`kinds.${k}`) })),
                )}
                {select(
                  "serviceId",
                  services.map((s) => ({ id: s.id, name: s.title })),
                )}
              </div>
            </details>
            <div className="flex flex-wrap items-end gap-2">
              <Button type="submit" disabled={!valid || query.isFetching}>
                {t("apply")}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  const f = period(30);
                  setDraft(f);
                  setFilters(f);
                }}
              >
                {t("reset")}
              </Button>
            </div>
          </form>
          {!valid && (
            <p role="alert" className="text-sm text-destructive">
              {t("invalidRange")}
            </p>
          )}
          <details className="text-xs leading-6 text-muted-foreground">
            <summary>{t("definitions")}</summary>
            <p>{t("timeBasis")}</p>
          </details>
        </CardContent>
      </Card>
      <QueryError error={query.error} retry={query.refetch} />
      {query.isLoading ? (
        <Loading />
      ) : (
        data && (
          <>
            <p role="status" className="text-sm text-muted-foreground">
              {t("appliedRange", {
                from: date(data.filters.from),
                to: date(data.filters.to),
              })}
              {query.isFetching ? ` · ${t("refreshing")}` : ""}
            </p>
            {data.growth && (
              <Card>
                <CardHeader>
                  <CardTitle>{t("growth")}</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-3 gap-3">
                  {(["users", "organizations", "branches"] as const).map(
                    (k) => (
                      <div key={k}>
                        <p className="text-sm text-muted-foreground">
                          {t(`growthLabels.${k}`)}
                        </p>
                        <p className="mt-2 text-xl font-semibold">
                          {number(data.growth![k])}
                        </p>
                      </div>
                    ),
                  )}
                </CardContent>
              </Card>
            )}
            <div className="analytics-kpis">
              {metrics.map((metric) => (
                <Card key={metric}>
                  <CardContent className="pt-5">
                    <p className="text-sm text-muted-foreground">
                      {t(metric as Parameters<typeof t>[0])}
                    </p>
                    <p className="mt-3 text-xl font-semibold tabular-nums">
                      {metric.endsWith("Minor")
                        ? money(totals[metric] ?? BigInt(0))
                        : number(totals[metric] ?? BigInt(0))}
                    </p>
                  </CardContent>
                </Card>
              ))}
              <Card>
                <CardContent className="pt-5">
                  <p className="text-sm text-muted-foreground">{t("net")}</p>
                  <p className="mt-3 text-xl font-semibold tabular-nums">
                    {money(
                      (totals.collectedMinor ?? BigInt(0)) -
                        (totals.refundedMinor ?? BigInt(0)),
                    )}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-5">
                  <p className="text-sm text-muted-foreground">
                    {t("occupancy")}
                  </p>
                  <p className="mt-3 text-xl font-semibold">
                    {totals.capacity
                      ? `${number(Number(((totals.occupied ?? BigInt(0)) * BigInt(1000)) / totals.capacity) / 10)}٪`
                      : t("unavailable")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t("capacityHint")}
                  </p>
                </CardContent>
              </Card>
            </div>
            <Card>
              <CardHeader>
                <CardTitle>{t("trend")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  className="analytics-chart"
                  role="img"
                  aria-label={t("chartDescription")}
                  dir="ltr"
                >
                  {buckets.map((b) => (
                    <div
                      className="analytics-bar"
                      key={b.date}
                      title={`${date(b.date)} · ${t("bookings")}: ${b.bookings} · ${t("attendance")}: ${b.attendance}`}
                    >
                      <span
                        style={{ height: `${(b.bookings / max) * 100}%` }}
                      />
                      <span
                        style={{ height: `${(b.attendance / max) * 100}%` }}
                      />
                    </div>
                  ))}
                </div>
                <p className="mt-3 text-xs text-muted-foreground">
                  {t("legend")}
                </p>
                <details className="mt-5">
                  <summary className="cursor-pointer text-sm">
                    {t("viewData")}
                  </summary>
                  <div className="overflow-x-auto">
                    <table className="w-full text-start text-sm">
                      <thead>
                        <tr>
                          {(
                            [
                              "date",
                              "bookings",
                              "attendance",
                              "collectedMinor",
                              "refundedMinor",
                            ] as const
                          ).map((k) => (
                            <th className="p-2 text-start" key={k}>
                              {t(k)}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {buckets.map((b) => (
                          <tr key={b.date}>
                            <td className="p-2">{date(b.date)}</td>
                            <td>{number(b.bookings)}</td>
                            <td>{number(b.attendance)}</td>
                            <td>{money(BigInt(b.collectedMinor))}</td>
                            <td>{money(BigInt(b.refundedMinor))}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </details>
              </CardContent>
            </Card>
            <div className="grid gap-5 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>{t("statuses")}</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3">
                  {data.statuses.length ? (
                    data.statuses.map((s) => (
                      <div
                        key={s.status}
                        className="flex justify-between gap-3 text-sm"
                      >
                        <span>
                          {luma.has(
                            `status.${s.status}` as Parameters<typeof luma>[0],
                          )
                            ? luma(
                                `status.${s.status}` as Parameters<
                                  typeof luma
                                >[0],
                              )
                            : s.status}
                        </span>
                        <strong>{number(s.count)}</strong>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      {t("empty")}
                    </p>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>{t("controls")}</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-2">
                  {(surface === "admin"
                    ? [
                        "organizations",
                        "users",
                        "operations",
                        "moderation",
                        "audit",
                      ]
                    : surface === "business"
                      ? [
                          "services",
                          "calendar",
                          "members",
                          "payments",
                          "team",
                          "reception",
                        ]
                      : ["coaching", "training"]
                  ).map((path) => (
                    <Button key={path} variant="outline" asChild>
                      <Link href={`/${path}`}>
                        {t(`control.${path}` as Parameters<typeof t>[0])}
                      </Link>
                    </Button>
                  ))}
                </CardContent>
              </Card>
            </div>
            {data.platform.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>{t("funnel")}</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3">
                  <p className="text-xs text-muted-foreground">
                    {t("funnelHint")}
                  </p>
                  {data.platform.map((e) => (
                    <div
                      className="flex justify-between gap-3 text-sm"
                      key={e.name}
                    >
                      <span>
                        {t(`event.${e.name}` as Parameters<typeof t>[0])}
                      </span>
                      <strong>{number(e.count)}</strong>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
            <p className="text-xs text-muted-foreground">
              {t("updated", {
                time: new Intl.DateTimeFormat(locale, {
                  dateStyle: "short",
                  timeStyle: "short",
                  timeZone: data.timezone,
                }).format(new Date(data.generatedAt)),
              })}
            </p>
          </>
        )
      )}
    </section>
  );
}
