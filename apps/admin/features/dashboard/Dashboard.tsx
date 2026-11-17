"use client";

import Link from "next/link";
import { useState } from "react";

import { useTranslations } from "@repo/i18n";
import { AnimatedSelectControl } from "@repo/ui/kit/select";

import { dashboardClasses } from "./dashboard-classes";
import { IranGeography } from "./IranGeography";

const periods = {
  month: {
    label: "Last 30 days",
    views: [454, 6322],
    interactions: [6, 42],
    reservations: [87, 29],
  },
  week: { label: "Last 7 days", views: [112, 1580], interactions: [2, 10], reservations: [24, 8] },
} as const;

const MetricCard = (props: { title: string; values: readonly number[] }) => {
  const { title, values } = props;
  const total = values.reduce((sum, value) => sum + value, 0);
  const circumference = 2 * Math.PI * 112;
  const first = (values[0]! / total) * circumference;
  const gap = 9;
  return (
    <section className={dashboardClasses.card} aria-label={title}>
      <h2>{title}</h2>
      <div
        className={dashboardClasses.chart}
        role="img"
        aria-label={`${title}: ${total.toLocaleString("en-US")}, members ${values[0]}, visitors ${values[1]}`}
      >
        <svg viewBox="0 0 256 256" aria-hidden="true">
          <circle
            cx="128"
            cy="128"
            r="112"
            className={dashboardClasses.memberArc}
            strokeDasharray={`${Math.max(0, first - gap)} ${circumference}`}
          />
          <circle
            cx="128"
            cy="128"
            r="112"
            className={dashboardClasses.visitorArc}
            strokeDasharray={`${circumference - first - gap} ${circumference}`}
            strokeDashoffset={-first}
          />
        </svg>
        <div className={dashboardClasses.total}>
          <span>Total {title.toLowerCase()}</span>
          <strong>{total.toLocaleString("en-US")}</strong>
        </div>
      </div>
      <dl className={dashboardClasses.legend}>
        <div>
          <dt>
            <i className={dashboardClasses.memberDot} />
            Members
          </dt>
          <dd>{values[0]!.toLocaleString("en-US")}</dd>
        </div>
        <div>
          <dt>
            <i className={dashboardClasses.visitorDot} />
            Visitors
          </dt>
          <dd>{values[1]!.toLocaleString("en-US")}</dd>
        </div>
      </dl>
    </section>
  );
};

export const Dashboard = () => {
  const t = useTranslations("DashboardGeography");
  const [period, setPeriod] = useState<keyof typeof periods>("month");
  const data = periods[period];

  function downloadReport() {
    const csv = `Metric,Members,Visitors,Period\nViews,${data.views.join(",")},${data.label}\nInteractions,${data.interactions.join(",")},${data.label}\nReservations,${data.reservations.join(",")},${data.label}\n`;
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "gym4me-demo-insights.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main id="dashboard-content" className="mx-auto grid max-w-screen-2xl gap-6 px-4 py-6 sm:px-8">
      <h1 className="text-2xl font-semibold sm:text-3xl">{t("dashboard")}</h1>
      <IranGeography />
      <header className={dashboardClasses.header}>
        <div className={dashboardClasses.heading}>
          <h2 className="font-semibold">{t("demoInsights")}</h2>
          <div className={dashboardClasses.period}>
            <span className={dashboardClasses.srOnly}>Reporting period</span>
            <AnimatedSelectControl
              value={period}
              items={(Object.keys(periods) as (keyof typeof periods)[]).map((value) => ({
                value,
                label: periods[value].label,
              }))}
              onChange={setPeriod}
              triggerProps={{ "aria-label": "Reporting period", className: "w-auto" }}
            />
          </div>
        </div>
        <details className={dashboardClasses.menu}>
          <summary aria-label="Report options">•••</summary>
          <div className={dashboardClasses.menuContent}>
            <button type="button" onClick={downloadReport}>
              Download demo CSV
            </button>
            <Link href="/club">Manage clubs</Link>
          </div>
        </details>
      </header>
      <div className="grid gap-4 lg:grid-cols-3">
        <MetricCard title="Views" values={data.views} />
        <MetricCard title="Interactions" values={data.interactions} />
        <MetricCard title="Reservations" values={data.reservations} />
      </div>
    </main>
  );
};
