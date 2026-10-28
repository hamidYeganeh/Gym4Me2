"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "@repo/i18n";
import {
  useAnalytics,
  type AnalyticsFilters,
  type AnalyticsReport,
} from "@repo/api/analytics";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "../kit/Chart";
import { Button } from "../kit/Button";
import { NativeSelect, NativeSelectOption } from "../kit/NativeSelect";
import { Loading, QueryError } from "../account/common";
import {
  overviewModel,
  overviewMoney,
  overviewPeriods,
  type OverviewPeriod,
} from "../lib/dashboard-overview";
import "./overview.css";

type Surface = "business" | "coach";
type Props = {
  surface: Surface;
  compact?: boolean;
  onViewDetails?: () => void;
};

export function AnalyticsOverview({ surface, compact, onViewDetails }: Props) {
  const [days, setDays] = useState<OverviewPeriod>(30);
  const [scope, setScope] = useState<
    Pick<AnalyticsFilters, "organizationId" | "branchId">
  >({});
  const windows = overviewPeriods(days);
  const filters = { ...windows.current, ...scope };
  const current = useAnalytics(surface, filters);
  const previous = useAnalytics(
    surface,
    { ...windows.previous, ...scope },
    Boolean(current.data) && !current.error,
  );
  const t = useTranslations("DashboardOverview");
  const id = useId();
  const [refreshing, setRefreshing] = useState(false);
  const refresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([current.refetch(), previous.refetch()]);
    } finally {
      setRefreshing(false);
    }
  };
  const controls = (
    <div className="overview-controls">
      <label htmlFor={`${id}-period`}>
        <span>{t("period")}</span>
        <NativeSelect
          id={`${id}-period`}
          value={days}
          onChange={(event) => {
            const value = Number(event.target.value);
            if (value === 7 || value === 30 || value === 90) setDays(value);
          }}
        >
          {([7, 30, 90] as const).map((value) => (
            <NativeSelectOption key={value} value={value}>
              {t("lastDays", { days: value })}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </label>
      {surface === "business" && current.data && !current.error && (
        <>
          <label htmlFor={`${id}-organization`}>
            <span>{t("organization")}</span>
            <NativeSelect
              id={`${id}-organization`}
              value={scope.organizationId ?? ""}
              onChange={(event) =>
                setScope({ organizationId: event.target.value || undefined })
              }
            >
              <NativeSelectOption value="">
                {t("allOrganizations")}
              </NativeSelectOption>
              {[
                ...new Map(
                  current.data.options.branches.map((branch) => [
                    branch.organization_id,
                    branch.organization_name,
                  ]),
                ).entries(),
              ].map(([key, name]) => (
                <NativeSelectOption key={key} value={key}>
                  {name}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </label>
          <label htmlFor={`${id}-branch`}>
            <span>{t("branch")}</span>
            <NativeSelect
              id={`${id}-branch`}
              value={scope.branchId ?? ""}
              onChange={(event) =>
                setScope((value) => ({
                  ...value,
                  branchId: event.target.value || undefined,
                }))
              }
            >
              <NativeSelectOption value="">
                {t("allBranches")}
              </NativeSelectOption>
              {current.data.options.branches
                .filter(
                  (branch) =>
                    !scope.organizationId ||
                    branch.organization_id === scope.organizationId,
                )
                .map((branch) => (
                  <NativeSelectOption key={branch.id} value={branch.id}>
                    {branch.name}
                  </NativeSelectOption>
                ))}
            </NativeSelect>
          </label>
        </>
      )}
      <Button
        type="button"
        variant="outline"
        disabled={refreshing || current.isFetching}
        onClick={() => void refresh()}
      >
        {t("refresh")}
      </Button>
    </div>
  );
  return (
    <section
      className="overview-dashboard"
      aria-label={t(surface === "coach" ? "coachTitle" : "businessTitle")}
    >
      {controls}
      {current.error ? (
        <QueryError error={current.error} retry={refresh} />
      ) : !current.data ? (
        <Loading />
      ) : (
        <OverviewDashboard
          surface={surface}
          compact={compact}
          data={current.data}
          previous={previous.error ? undefined : previous.data}
          onViewDetails={onViewDetails}
        />
      )}
    </section>
  );
}

/** Presentation consumes only server reports; there is no sample-data fallback. */
export function OverviewDashboard({
  surface,
  compact,
  data,
  previous,
  onViewDetails,
}: Props & { data: AnalyticsReport; previous?: AnalyticsReport }) {
  const t = useTranslations("DashboardOverview"),
    locale = useLocale();
  const model = overviewModel(data),
    old = previous ? overviewModel(previous) : undefined;
  const count = (value: number | bigint) =>
    new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(value);
  const money = (value: bigint) =>
    `${overviewMoney(value, locale)} ${t("toman")}`;
  const date = (value: string) =>
    new Intl.DateTimeFormat(locale, {
      month: "short",
      day: "numeric",
      timeZone: "Asia/Tehran",
    }).format(new Date(`${value}T12:00:00Z`));
  const cards =
    surface === "business"
      ? (["netCollected", "bookings", "attendance", "occupancy"] as const)
      : ([
          "sessions",
          "attendance",
          "sharedWorkouts",
          "plansPublished",
        ] as const);
  const value = (source: typeof model, key: (typeof cards)[number]) =>
    key === "netCollected"
      ? source.netCollected
      : key === "occupancy"
        ? source.occupied
        : (source.totals[key] ?? BigInt(0));
  const rows = model.buckets;
  const activity = surface === "coach" ? "sessions" : "bookings";
  const details = onViewDetails ? (
    <Button type="button" variant="outline" onClick={onViewDetails}>
      {t("viewReports")}
    </Button>
  ) : (
    <Button variant="outline" asChild>
      <Link href={surface === "business" ? "/reports" : "/coaching"}>
        {t("viewReports")}
      </Link>
    </Button>
  );
  const firstSeries =
    surface === "business" ? "collectionsPlot" : "sharedWorkouts";
  const secondSeries =
    surface === "business" ? "refundsPlot" : "reviewedWorkouts";
  const firstLabel =
    surface === "business" ? t("collectedMinor") : t("sharedWorkouts");
  const secondLabel =
    surface === "business" ? t("refundedMinor") : t("reviewedWorkouts");
  const config = {
    [firstSeries]: { label: firstLabel, color: "var(--primary)" },
    [secondSeries]: { label: secondLabel, color: "var(--chart-2)" },
    [activity]: { label: t(activity), color: "var(--primary)" },
    attendance: { label: t("attendance"), color: "var(--chart-2)" },
  };
  const hasFlow = rows.some(
    (row) => row[firstSeries] !== 0 || row[secondSeries] !== 0,
  );
  const hasActivity = rows.some(
    (row) => row[activity] !== 0 || row.attendance !== 0,
  );
  return (
    <div className="overview-content">
      <header className="overview-heading">
        <div>
          <p className="overview-eyebrow">{t("liveRecords")}</p>
          <h2>{t(surface === "coach" ? "coachTitle" : "businessTitle")}</h2>
          <p>
            {date(data.filters.from)} — {date(data.filters.to)} · {t("tehran")}
          </p>
        </div>
        {details}
      </header>
      <div className="overview-kpis">
        {cards.map((key) => {
          const current = value(model, key),
            before = old ? value(old, key) : undefined;
          const delta = before === undefined ? undefined : current - before;
          return (
            <article className="overview-kpi" key={key}>
              <h3>{t(key)}</h3>
              <strong>
                {key === "netCollected" ? (
                  <>
                    {overviewMoney(current, locale)}
                    <span className="overview-currency">{t("toman")}</span>
                  </>
                ) : key === "occupancy" ? (
                  model.occupancy === null ? (
                    "—"
                  ) : (
                    new Intl.NumberFormat(locale, {
                      style: "percent",
                      maximumFractionDigits: 1,
                    }).format(model.occupancy / 100)
                  )
                ) : (
                  count(current)
                )}
              </strong>
              <p>
                {key === "occupancy"
                  ? t("seats", {
                      occupied: count(model.occupied),
                      capacity: count(model.capacity),
                    })
                  : key === "netCollected"
                    ? t("netDefinition")
                    : t(`${key}Definition`)}
              </p>
              <small>
                {key === "occupancy"
                  ? model.occupancy === null
                    ? t("noCapacity")
                    : t("occupancyDefinition")
                  : delta === undefined
                    ? t("comparisonUnavailable")
                    : `${delta > BigInt(0) ? "+" : ""}${key === "netCollected" ? money(delta) : count(delta)} · ${t("previousPeriod")}`}
              </small>
            </article>
          );
        })}
      </div>
      <div
        className={`overview-charts${compact ? " overview-charts-compact" : ""}`}
      >
        <article className="overview-chart-card">
          <h3>{t(surface === "business" ? "cashFlow" : "workoutActivity")}</h3>
          <p>
            {t(
              surface === "business"
                ? "cashFlowDefinition"
                : "workoutDefinition",
            )}
          </p>
          <div className="overview-legend">
            <span>
              <i />
              {firstLabel}
            </span>
            <span>
              <i />
              {secondLabel}
            </span>
          </div>
          {hasFlow ? (
            <ChartContainer
              config={config}
              className="overview-chart"
              dir="ltr"
              aria-label={t(
                surface === "business" ? "cashFlow" : "workoutActivity",
              )}
            >
              <AreaChart
                data={rows}
                accessibilityLayer
                margin={{ left: 4, right: 12, top: 12 }}
              >
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="date"
                  tickFormatter={date}
                  tickLine={false}
                  axisLine={false}
                  minTickGap={40}
                />
                <YAxis
                  tickFormatter={(v: number) =>
                    new Intl.NumberFormat(locale, {
                      notation: "compact",
                      maximumFractionDigits: 1,
                    }).format(v)
                  }
                  tickLine={false}
                  axisLine={false}
                  width={58}
                  allowDecimals={surface === "business"}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      labelFormatter={(label) => date(String(label))}
                      formatter={(v, name, item) => {
                        const row = item.payload as (typeof rows)[number];
                        const label =
                          String(name) === firstSeries
                            ? firstLabel
                            : secondLabel;
                        const display =
                          surface === "business"
                            ? money(
                                BigInt(
                                  String(name) === firstSeries
                                    ? row.collectedMinor
                                    : row.refundedMinor,
                                ),
                              )
                            : count(Number(v));
                        return (
                          <span
                            className="overview-tooltip"
                            dir={locale === "fa" ? "rtl" : "ltr"}
                          >
                            {label}
                            <strong>{display}</strong>
                          </span>
                        );
                      }}
                    />
                  }
                />
                <Area
                  type="monotone"
                  dataKey={firstSeries}
                  stroke={`var(--color-${firstSeries})`}
                  fill={`var(--color-${firstSeries})`}
                  fillOpacity={0.12}
                  strokeWidth={2}
                  isAnimationActive={false}
                />
                <Area
                  type="monotone"
                  dataKey={secondSeries}
                  stroke={`var(--color-${secondSeries})`}
                  fill={`var(--color-${secondSeries})`}
                  fillOpacity={0.04}
                  strokeWidth={2}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ChartContainer>
          ) : (
            <EmptyChart text={t("noActivity")} />
          )}
          {surface === "business" && (
            <p className="overview-unit">
              {t("chartUnit", { unit: t("toman") })}
            </p>
          )}
        </article>
        {!compact && (
          <article className="overview-chart-card">
            <h3>{t("activityTitle")}</h3>
            <p>
              {t(
                surface === "coach"
                  ? "coachActivityDefinition"
                  : "businessActivityDefinition",
              )}
            </p>
            <div className="overview-legend">
              <span>
                <i />
                {t(activity)}
              </span>
              <span>
                <i />
                {t("attendance")}
              </span>
            </div>
            {hasActivity ? (
              <ChartContainer
                config={config}
                className="overview-chart"
                dir="ltr"
                aria-label={t("activityTitle")}
              >
                <BarChart
                  data={rows}
                  accessibilityLayer
                  margin={{ left: 4, right: 12, top: 12 }}
                >
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="date"
                    tickFormatter={date}
                    tickLine={false}
                    axisLine={false}
                    minTickGap={40}
                  />
                  <YAxis
                    tickFormatter={count}
                    allowDecimals={false}
                    tickLine={false}
                    axisLine={false}
                    width={40}
                  />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        labelFormatter={(label) => date(String(label))}
                      />
                    }
                  />
                  <Bar
                    dataKey={activity}
                    fill={`var(--color-${activity})`}
                    radius={[3, 3, 0, 0]}
                    isAnimationActive={false}
                  />
                  <Bar
                    dataKey="attendance"
                    fill="var(--color-attendance)"
                    radius={[3, 3, 0, 0]}
                    isAnimationActive={false}
                  />
                </BarChart>
              </ChartContainer>
            ) : (
              <EmptyChart text={t("noActivity")} />
            )}
          </article>
        )}
      </div>
      <footer className="overview-footer">
        <span>
          {t("updated", {
            time: new Intl.DateTimeFormat(locale, {
              hour: "2-digit",
              minute: "2-digit",
              timeZone: data.timezone,
            }).format(new Date(data.generatedAt)),
          })}{" "}
          · {t("partialDay")}
        </span>
        <details className="overview-data">
          <summary>{t("viewData")}</summary>
          <div
            className="overview-table-scroll"
            tabIndex={0}
            role="region"
            aria-label={t("viewData")}
          >
            <table>
              <caption>{t("sourceDefinition")}</caption>
              <thead>
                <tr>
                  <th>{t("date")}</th>
                  <th>{t(activity)}</th>
                  <th>{t("attendance")}</th>
                  <th>{firstLabel}</th>
                  <th>{secondLabel}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.date}>
                    <th scope="row">{date(row.date)}</th>
                    <td>{count(row[activity])}</td>
                    <td>{count(row.attendance)}</td>
                    <td>
                      {surface === "business"
                        ? money(BigInt(row.collectedMinor))
                        : count(row.sharedWorkouts)}
                    </td>
                    <td>
                      {surface === "business"
                        ? money(BigInt(row.refundedMinor))
                        : count(row.reviewedWorkouts)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      </footer>
    </div>
  );
}

function EmptyChart({ text }: { text: string }) {
  return (
    <div className="overview-chart-empty">
      <span aria-hidden="true">—</span>
      <p>{text}</p>
    </div>
  );
}
