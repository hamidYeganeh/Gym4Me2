"use client";
import Link from "next/link";
import { useEffect, useRef, type Ref } from "react";
import { useTranslations } from "@repo/i18n";
import { Button } from "@repo/ui/kit/Button";
import { Skeleton } from "@repo/ui/kit/Skeleton";
import { restoreCatalogRetryFocus } from "../../lib/catalog-retry-focus";
export function CatalogState({
  loading,
  missing,
  retry,
  retryRef,
  retrying,
}: {
  loading?: boolean;
  missing?: boolean;
  retry?: () => void;
  retryRef?: Ref<HTMLButtonElement>;
  retrying?: boolean;
}) {
  const t = useTranslations("Catalog");
  const section = useRef<HTMLElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const restoration = useRef<{
    surface: HTMLElement | null;
    path: string;
  } | null>(null);
  useEffect(
    () => () => {
      const attempt = restoration.current;
      restoration.current = null;
      if (attempt) restoreCatalogRetryFocus(attempt.surface, attempt.path);
    },
    [],
  );
  return (
    <section
      ref={section}
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
            <Button
              ref={retryRef ?? button}
              variant="outline"
              onClick={() => {
                if (
                  missing &&
                  !retryRef &&
                  document.activeElement === button.current
                )
                  restoration.current = {
                    surface: section.current?.parentElement ?? null,
                    path: `${window.location.pathname}${window.location.search}`,
                  };
                retry();
              }}
              disabled={retrying}
              aria-busy={retrying || undefined}
            >
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
