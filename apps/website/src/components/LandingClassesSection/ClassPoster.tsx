"use client";

import { useLocale, useTranslations } from "@repo/i18n";
import { ClassCard } from "@repo/ui/kit/ClassCard";
import type { LandingClass } from "./LandingClassesSection.types";
import styles from "./LandingClassesSection.module.css";

export function ClassPoster({ item }: { item: LandingClass }) {
  const locale = useLocale();
  const t = useTranslations("Website.classes.fitness");
  return (
    <ClassCard
      classItem={item}
      locale={locale}
      className={styles.sharedClass}
      labels={{
        save: t("save"),
        unsave: t("unsave"),
        calories: t("calories"),
        minutes: t("minutes"),
        score: t("score"),
      }}
    />
  );
}
