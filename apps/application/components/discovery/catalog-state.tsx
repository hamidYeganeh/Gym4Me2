"use client";
import Link from "next/link";
import { useTranslations } from "@repo/i18n";
import { Button } from "@repo/ui/kit/Button";
import { Skeleton } from "@repo/ui/kit/Skeleton";
export function CatalogState({
  loading,
  missing,
  retry,
}: {
  loading?: boolean;
  missing?: boolean;
  retry?: () => void;
}) {
  const t = useTranslations("Catalog");
  return (
    <section
      className="mx-auto flex min-h-64 w-full flex-col items-center justify-center gap-4 px-6 py-10"
      role="status"
      aria-busy={loading}
    >
      {loading ? (
        <>
          <Skeleton className="h-48 w-full rounded-3xl" />
          <p>{t("loading")}</p>
        </>
      ) : (
        <>
          <p>{t(missing ? "notFound" : "error")}</p>
          {retry && (
            <Button variant="outline" onClick={retry}>
              {t("retry")}
            </Button>
          )}
          <Button asChild variant="ghost">
            <Link href="/discovery">{t("back")}</Link>
          </Button>
        </>
      )}
    </section>
  );
}
