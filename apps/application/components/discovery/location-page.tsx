"use client";
import { useEffect, useRef } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { useLocale, useTranslations } from "@repo/i18n";
import { useLocationDiscovery } from "@repo/api/catalog";
import { Button } from "@repo/ui/kit/Button";
import { Skeleton } from "@repo/ui/kit/Skeleton";
import { useInfiniteCatalogClubs } from "./use-catalog";
import { SavedClubCard } from "./discovery";
import "./discovery.css";

export function LocationPage({
  kind,
  locationId,
}: {
  kind: "provinces" | "cities" | "districts";
  locationId: string;
}) {
  const locale = useLocale();
  const t = useTranslations("Discovery");
  const mapCopy = useTranslations("DiscoveryMap");
  const places = useLocationDiscovery({
    [kind === "provinces"
      ? "provinceId"
      : kind === "cities"
        ? "cityId"
        : "districtId"]: locationId,
  });
  const place = places.data?.[kind].find((item) => item.id === locationId);
  const query = useInfiniteCatalogClubs({
    [kind === "provinces"
      ? "provinceId"
      : kind === "cities"
        ? "cityId"
        : "districtId"]: locationId,
  });
  const { hasNextPage, isFetching, isFetchNextPageError, fetchNextPage } =
    query;
  const sentinel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!sentinel.current || !hasNextPage || isFetching || isFetchNextPageError)
      return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) void fetchNextPage();
      },
      { rootMargin: "300px" },
    );
    observer.observe(sentinel.current);
    return () => observer.disconnect();
  }, [
    hasNextPage,
    isFetching,
    isFetchNextPageError,
    fetchNextPage,
  ]);
  return (
    <main className="discovery-page">
      <header className="flex items-center gap-3 py-4">
        <Button asChild variant="secondary" size="icon-lg">
          <Link href="/discovery" aria-label={mapCopy("back")}>
            <ChevronRight className="ltr:rotate-180" />
          </Link>
        </Button>
        <h1 className="text-xl font-semibold">{place?.name ?? t("clubs")}</h1>
      </header>
      {query.isPending && (
        <div className="grid gap-5" aria-busy="true">
          <Skeleton className="aspect-[6/5] w-full rounded-3xl" />
          <Skeleton className="aspect-[6/5] w-full rounded-3xl" />
        </div>
      )}
      <section className="discovery-results" aria-label={t("clubs")}>
        {query.clubs.map((club, index) => (
          <SavedClubCard
            key={club.id}
            club={club}
            priority={index === 0}
            variant="cinematic"
          />
        ))}
      </section>
      {!query.isPending && !query.isError && !query.clubs.length && (
        <p className="py-12 text-center text-muted-foreground">
          {locale === "fa"
            ? "هنوز باشگاهی در این مکان ثبت نشده است."
            : "No clubs in this location yet."}
        </p>
      )}
      <div ref={sentinel} className="py-6">
        {query.isFetchingNextPage && (
          <Skeleton className="aspect-[6/5] w-full rounded-3xl" />
        )}
        {(query.hasNextPage || query.isError) && (
          <Button
            variant="secondary"
            disabled={query.isFetching}
            onClick={() =>
              query.isError && !query.isFetchNextPageError
                ? query.refetch()
                : query.fetchNextPage()
            }
          >
            {locale === "fa"
              ? query.isError
                ? "تلاش دوباره"
                : "نمایش بیشتر"
              : query.isError
                ? "Retry"
                : "Load more"}
          </Button>
        )}
      </div>
    </main>
  );
}
