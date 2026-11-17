"use client";

import Link from "next/link";
import { useState } from "react";

import { AnimatedSelectControl } from "@repo/ui/kit/select";

import styles from "./dashboard.module.css";

const periods = {
  month: {
    label: "Last 30 days",
    counts: { Views: [454, 6322], Interactions: [6, 42], Reservations: [87, 29] },
  },
  week: {
    label: "Last 7 days",
    counts: { Views: [112, 1580], Interactions: [2, 10], Reservations: [24, 8] },
  },
} as const;

const metricNames = ["Views", "Interactions", "Reservations"] as const;
const number = new Intl.NumberFormat("en-US");

export const Dashboard = () => {
  const [period, setPeriod] = useState<keyof typeof periods>("month");
  const data = periods[period];
  const metrics = metricNames.map((name) => {
    const [members, visitors] = data.counts[name];
    return { name, members, visitors, total: members + visitors };
  });

  function downloadReport() {
    const rows = metrics.map(({ name, members, visitors }) =>
      [name, members, visitors, data.label].join(","),
    );
    const csv = ["Metric,Members,Visitors,Period", ...rows, ""].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "gym4me-demo-insights.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main id="dashboard-content" className={styles.main}>
      <header className={styles.header}>
        <div>
          <h1>Insights</h1>
          <p className={styles.demo}>Demo data · Live analytics aren’t connected</p>
        </div>
        <div className={styles.actions}>
          <AnimatedSelectControl
            value={period}
            items={(Object.keys(periods) as (keyof typeof periods)[]).map((value) => ({
              value,
              label: periods[value].label,
            }))}
            onChange={setPeriod}
            triggerProps={{ "aria-label": "Reporting period", className: "w-auto" }}
          />
          <details className={styles.menu}>
            <summary aria-label="Report options">
              <span aria-hidden="true">···</span>
            </summary>
            <div className={styles.menuContent}>
              <button type="button" onClick={downloadReport}>
                Download demo CSV
              </button>
              <Link href="/club">Manage clubs</Link>
            </div>
          </details>
        </div>
      </header>

      <dl className={styles.totals} aria-label="Activity totals" aria-live="polite">
        {metrics.map(({ name, total }) => (
          <div key={name}>
            <dt>{name}</dt>
            <dd>{number.format(total)}</dd>
          </div>
        ))}
      </dl>

      <section className={styles.comparison} aria-labelledby="audience-heading">
        <header className={styles.comparisonHeader}>
          <h2 id="audience-heading">Activity by audience</h2>
          <p>Member and visitor share of each total</p>
        </header>
        <div className={styles.breakdown}>
          {metrics.map(({ name, members, visitors, total }) => (
            <div className={styles.metricRow} key={name}>
              <h3>{name}</h3>
              <div className={styles.bar} aria-hidden="true">
                <span style={{ inlineSize: total ? `${(members / total) * 100}%` : 0 }} />
              </div>
              <dl className={styles.counts}>
                <div>
                  <dt>Members</dt>
                  <dd>{number.format(members)}</dd>
                </div>
                <div>
                  <dt>Visitors</dt>
                  <dd>{number.format(visitors)}</dd>
                </div>
              </dl>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
};
