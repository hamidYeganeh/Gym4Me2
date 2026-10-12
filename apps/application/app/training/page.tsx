"use client";
import { useTranslations } from "@repo/i18n";
import { TrainingPage } from "@repo/ui/training-page";
export default function Training() {
  const t = useTranslations("Home");
  return (
    <TrainingPage
      title={t("dialog")}
      description={t("dialogDescription")}
      back={t("back")}
    />
  );
}
