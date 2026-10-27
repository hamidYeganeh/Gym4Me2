"use client";

import Link from "next/link";
import {
  ChartNoAxesCombined,
  ChevronRight,
  Dumbbell,
  UsersRound,
} from "lucide-react";
import { useTranslations } from "@repo/i18n";
import { Button } from "./kit/Button";

/** Host panels keep coaching operations separate from private athlete training. */
export function TrainingPage({
  back,
  client,
}: {
  back: string;
  client: "business" | "admin";
}) {
  const t = useTranslations("Training");
  return (
    <main className="gym-workspace movement-library">
      <header>
        <Button variant="ghost" asChild>
          <Link href="/">{back}</Link>
        </Button>
        <h1>{t("managementTitle")}</h1>
      </header>
      <section className="training-management-intro">
        <span className="training-management-icon" aria-hidden="true">
          <Dumbbell size={32} />
        </span>
        <h2>{t("managementTitle")}</h2>
        <p>{t("managementHint")}</p>
      </section>
      <nav className="movement-library-list" aria-label={t("managementTitle")}>
        <Link href="/coaching">
          <UsersRound size={24} aria-hidden="true" />
          <span>
            <strong>{t("managementCoaching")}</strong>
            <small>{t("managementCoachingHint")}</small>
          </span>
          <ChevronRight
            className="rtl:rotate-180"
            size={18}
            aria-hidden="true"
          />
        </Link>
        <Link href={client === "admin" ? "/analytics" : "/reports"}>
          <ChartNoAxesCombined size={24} aria-hidden="true" />
          <span>
            <strong>{t("managementReports")}</strong>
            <small>{t("managementReportsHint")}</small>
          </span>
          <ChevronRight
            className="rtl:rotate-180"
            size={18}
            aria-hidden="true"
          />
        </Link>
      </nav>
    </main>
  );
}
