"use client";
import { useTranslations } from "@repo/i18n";
/** Announce pending navigation without replacing the current page with a skeleton. */
export function PageLoading() {
  const t = useTranslations("Luma");
  return (
    <span role="status" className="sr-only">
      {t("loading")}
    </span>
  );
}
