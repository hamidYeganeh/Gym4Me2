"use client";

import { useQuery } from "@tanstack/react-query";
import { useId, useState } from "react";

import { dashboardGeographyKey } from "@repo/api/schedule";
import { useFormatter, useLocale, useTranslations } from "@repo/i18n";
import { AnimatedButton } from "@repo/ui/kit/button";
import { AnimatedSelectControl } from "@repo/ui/kit/select";

import { readApi } from "../../lib/admin-api";
import boundaries from "./iran-provinces.json";

const boundarySource = "https://www.geoboundaries.org/api/current/gbOpen/IRN/ADM1/";
const metricKeys = ["clubs", "coaches", "users", "classes", "reservations"] as const;
type Metric = (typeof metricKeys)[number];
type Counts = Record<Metric, number>;
type GeographyCounts = Counts & {
  provinces: (Counts & { code: string })[];
  unassigned: Counts;
};

export const IranGeography = () => {
  const t = useTranslations("DashboardGeography");
  const locale = useLocale();
  const format = useFormatter();
  const headingId = useId();
  const dotsId = useId();
  const [selected, setSelected] = useState("");
  const [metric, setMetric] = useState<Metric>("clubs");
  const query = useQuery({
    queryKey: dashboardGeographyKey,
    queryFn: ({ signal }) => readApi<GeographyCounts>("/api/dashboard/geography", signal),
  });
  const counts = new Map(query.data?.provinces.map((province) => [province.code, province]));
  const options = boundaries.provinces
    .map((province) => ({ ...province, name: province[locale] }))
    .sort((a, b) => a.name.localeCompare(b.name, locale));
  const province = options.find(({ code }) => code === selected);
  const totals = selected ? counts.get(selected) : query.data;
  const maxCount = Math.max(1, ...options.map(({ code }) => counts.get(code)?.[metric] ?? 0));

  return (
    <section
      aria-labelledby={headingId}
      className="overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900"
    >
      <header className="flex flex-wrap items-center justify-between gap-4 px-5 pt-5 pb-4 sm:px-7 sm:pt-6">
        <div className="flex flex-wrap items-center gap-3">
          <h2 id={headingId} className="text-xl font-semibold">
            {t("title")}
          </h2>
          <span className="rounded-full bg-neutral-800 px-2.5 py-1 text-xs text-theme-muted-foreground">
            {t("provinceCount", { count: options.length })}
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          <AnimatedSelectControl
            value={metric}
            items={metricKeys.map((key) => ({ value: key, label: t(key) }))}
            onChange={setMetric}
            triggerProps={{ "aria-label": t("selectMetric"), className: "w-auto" }}
          />
          <AnimatedSelectControl
            value={selected}
            items={[
              { value: "", label: t("allProvinces") },
              ...options.map(({ code, name }) => ({ value: code, label: name })),
            ]}
            onChange={setSelected}
            triggerProps={{ "aria-label": t("selectProvince"), className: "w-auto" }}
          />
        </div>
      </header>
      <div className="mx-5 grid overflow-hidden rounded-xl border border-neutral-800 bg-neutral-950 sm:mx-7 lg:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)]">
        <div className="relative grid place-items-center p-4 sm:p-6">
          <svg
            viewBox={boundaries.viewBox}
            aria-label={t("mapLabel")}
            className="block w-full max-w-[27rem] motion-reduce:[&_path]:transition-none"
            role="group"
          >
            <defs>
              <pattern id={dotsId} x="0" y="0" width="5" height="5" patternUnits="userSpaceOnUse">
                <circle
                  cx="2.5"
                  cy="2.5"
                  r=".65"
                  className="fill-theme-muted-foreground opacity-40"
                />
              </pattern>
            </defs>
            {options.map(({ code, name, path }) => {
              const count = counts.get(code)?.[metric] ?? 0;
              const strength = count ? 20 + 45 * (count / maxCount) : 0;
              const label =
                query.data ? t("provinceLabel", { name, count, metric: t(metric) }) : name;
              return (
                <g key={code}>
                  <path
                    d={path}
                    role="button"
                    tabIndex={0}
                    aria-label={label}
                    aria-pressed={selected === code}
                    fillRule="evenodd"
                    className="cursor-pointer fill-neutral-800 stroke-neutral-500 stroke-[1.1] transition-colors outline-none hover:fill-theme-primary/25 focus-visible:fill-theme-primary/30 focus-visible:stroke-theme-primary aria-pressed:fill-theme-primary/35 aria-pressed:stroke-theme-primary"
                    style={
                      strength && selected !== code ?
                        {
                          fill: `color-mix(in oklab, var(--theme-color-primary) ${strength}%, var(--theme-ref-neutral-800))`,
                        }
                      : undefined
                    }
                    onClick={() => setSelected(code)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setSelected(code);
                      }
                    }}
                  >
                    <title>{label}</title>
                  </path>
                  <path
                    aria-hidden="true"
                    pointerEvents="none"
                    fillRule="evenodd"
                    d={path}
                    fill={`url(#${dotsId})`}
                  />
                </g>
              );
            })}
          </svg>
          <div
            className="flex flex-wrap justify-center gap-4 pt-2 text-xs text-theme-muted-foreground"
            aria-label={t("legend", { metric: t(metric) })}
          >
            <span className="flex items-center gap-2">
              <i
                className="size-2.5 rounded-sm border border-neutral-700 bg-neutral-800"
                aria-hidden
              />
              {t("noRecords")}
            </span>
            <span className="flex items-center gap-2">
              <i className="size-2.5 rounded-sm bg-theme-primary/35" aria-hidden />
              {t("withRecords")}
            </span>
          </div>
        </div>
        <div className="min-w-0 border-t border-neutral-800 bg-neutral-900 p-5 lg:border-s lg:border-t-0">
          <div className="grid gap-1">
            <span className="text-xs text-theme-muted-foreground">{t("country")}</span>
            <h3 className="text-lg font-semibold" aria-live="polite">
              {province?.name ?? t("allProvinces")}
            </h3>
          </div>
          {query.isPending && (
            <p role="status" className="mt-3 text-sm text-theme-muted-foreground">
              {t("loading")}
            </p>
          )}
          {query.isError && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <p role="alert" className="text-sm text-theme-error">
                {t("error")}
              </p>
              <AnimatedButton
                size="sm"
                variant="outlined"
                color="neutral"
                loading={query.isFetching}
                onClick={() => void query.refetch()}
              >
                {t("retry")}
              </AnimatedButton>
            </div>
          )}
          <dl className="mt-3 divide-y divide-neutral-800">
            {metricKeys.map((key) => (
              <div key={key} className="flex min-h-11 items-center justify-between gap-3 py-2">
                <dt className="grid gap-0.5 text-sm text-theme-muted-foreground">
                  {t(key)}
                  {!selected && Boolean(query.data?.unassigned?.[key]) && (
                    <small>{t("unassigned", { count: query.data?.unassigned?.[key] ?? 0 })}</small>
                  )}
                </dt>
                <dd className="text-xl font-semibold tabular-nums">
                  {!query.data ?
                    <span aria-label={t("unavailable")} className="text-theme-muted-foreground">
                      —
                    </span>
                  : format.number(totals?.[key] ?? 0)}
                </dd>
              </div>
            ))}
          </dl>
          <p className="mt-4 text-xs leading-relaxed text-theme-muted-foreground">
            {t("provinceCoverage")}
          </p>
        </div>
      </div>
      <p className="px-5 py-4 text-xs text-theme-muted-foreground sm:px-7">
        {t("boundaries")} ·{" "}
        <a href={boundarySource} className="underline">
          geoBoundaries
        </a>{" "}
        ·{" "}
        <a href="https://www.openstreetmap.org/copyright" className="underline">
          © OpenStreetMap contributors
        </a>{" "}
        ·{" "}
        <a href="https://opendatacommons.org/licenses/odbl/1-0/" className="underline">
          ODbL 1.0
        </a>
      </p>
    </section>
  );
};
