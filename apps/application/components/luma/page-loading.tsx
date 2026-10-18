"use client";

import { useTranslations } from "@repo/i18n";
import { Skeleton } from "@repo/ui/kit/Skeleton";

/** Route Suspense fallback; keep a visible surface while page code loads. */
export function PageLoading() {
  const t = useTranslations("Luma");
  return (
    <main
      className="luma-page"
      aria-label={t("loading")}
      data-testid="page-loading"
    >
      <p role="status" className="luma-meta mb-6">
        {t("loading")}
      </p>
      <div aria-hidden="true" className="flex flex-col gap-6">
        <Skeleton className="h-11 w-2/3 motion-reduce:animate-none" />
        {[0, 1, 2].map((item) => (
          <Skeleton
            key={item}
            className="h-24 w-full motion-reduce:animate-none"
          />
        ))}
      </div>
    </main>
  );
}
