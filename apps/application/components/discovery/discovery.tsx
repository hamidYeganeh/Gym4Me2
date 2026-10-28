"use client";
import { DiscoveryContentSections } from "@repo/ui/discovery-content";
import {
  catalogSelectSource,
  useTaxonomies,
  validCatalogPrices,
} from "@repo/api/catalog";
import {
  useAccountLocation,
  useUpdateAccountLocation,
} from "@repo/api/profile";
import { useTranslations } from "@repo/i18n";
import { EmptyState, ErrorNotice, SuccessNotice } from "@repo/ui/account";
import { useListState } from "@repo/ui/hooks/use-list-state";
import {
  ArrowRightIcon,
  Bell1Icon as Bell,
  UserIcon as CircleUserRound,
  MapTrifoldIcon as Map,
} from "@repo/ui/icons";
import { FilterSheet } from "@repo/ui/kit/BottomSheet";
import { Button } from "@repo/ui/kit/Button";
import type { ClubCardProps } from "@repo/ui/kit/ClubCard";
import { ClubCard } from "@repo/ui/kit/ClubCard";
import type { ClubDetailData } from "@repo/ui/kit/ClubDetail";
import { Search } from "@repo/ui/kit/Search";
import { NativeSelect, NativeSelectOption } from "@repo/ui/kit/NativeSelect";
import { preferredDiscoveryLocation } from "@repo/ui/lib/discovery-location";
import Link from "next/link";
import {
  useDeferredValue,
  useEffect,
  useRef,
  useSyncExternalStore,
} from "react";
import { catalogLocationFilters } from "../../lib/catalog-location";
import { CatalogFilters, type PriceFilters } from "./catalog-filters";
import { CatalogState } from "./catalog-state";
import {
  DiscoveryClubSections,
  DiscoveryPeopleSections,
} from "./discovery-sections";
import { DiscoveryTabBar } from "./discovery-tab-bar";
import "./discovery.css";
import { LocationPicker, type LocationValue } from "./location-picker";
import { PopularCoaches } from "./popular-coaches";
import { useInfiniteCatalogClubs } from "./use-catalog";
import { useSavedClub } from "./use-saved-club";

export function SavedClubCard({
  club,
  priority,
  variant = "landscape",
}: {
  club: ClubDetailData;
  priority: boolean;
  variant?: ClubCardProps["variant"];
}) {
  const t = useTranslations("Clubs");
  const [saved] = useSavedClub(club.id);
  return (
    <div className="discovery-result">
      <ClubCard
        club={club}
        variant={variant}
        galleryLabel={t("gallery")}
        photoLabel={t("photo")}
        saved={saved}
        priority={priority}
        labels={{
          save: t("save"),
          unsave: t("unsave"),
          discover: t("discover"),
        }}
      />
    </div>
  );
}
export function Discovery({
  directoryOnly = false,
}: { directoryOnly?: boolean } = {}) {
  const accountArea = useAccountLocation();
  const saveArea = useUpdateAccountLocation();
  const locationsCopy = useTranslations("LocationDiscovery");
  const categories = useTaxonomies("club-categories");
  const t = useTranslations("Discovery");
  const luma = useTranslations("Luma");
  const copy = useTranslations("Copy");
  const catalog = useTranslations("Catalog");
  const queryCategory = useSyncExternalStore(
    (listener) => {
      window.addEventListener("popstate", listener);
      return () => window.removeEventListener("popstate", listener);
    },
    () => new URLSearchParams(window.location.search).get("category") ?? "",
    () => "",
  );
  const [category, setCategory] = useListState<string | null>(
    "category",
    null,
    (v): v is string | null => v === null || typeof v === "string",
    queryCategory,
  );
  const [place, setPlace] = useListState<LocationValue>(
    "place",
    {},
    (v): v is LocationValue =>
      !!v &&
      typeof v === "object" &&
      Object.values(v).every((x) => x === undefined || typeof x === "string"),
  );
  const [search, setSearch] = useListState(
    "search",
    "",
    (v): v is string => typeof v === "string",
  );

  const [filters, setFilters] = useListState<PriceFilters>(
    "prices",
    {},
    (v): v is PriceFilters =>
      !!v &&
      typeof v === "object" &&
      Object.values(v).every(
        (x) =>
          x === undefined || typeof x === "string" || typeof x === "number",
      ),
  );
  const validPrices = validCatalogPrices(filters);
  const activeCategory = category ?? queryCategory;
  const guest =
    accountArea.error?.status === 401 || accountArea.error?.status === 403;
  const currentPlace = preferredDiscoveryLocation(
    place,
    guest ? null : accountArea.data?.location,
  );
  function changeLocation(next: LocationValue) {
    setPlace(next);
    if (accountArea.data && !accountArea.error && next.provinceId)
      saveArea.mutate({
        countryId: next.countryId || undefined,
        provinceId: next.provinceId,
        cityId: next.cityId || null,
        districtId: next.districtId || null,
      });
  }
  const deferredSearch = useDeferredValue(search);
  const query = useInfiniteCatalogClubs({
    ...filters,
    search: deferredSearch,
    categoryId: activeCategory || undefined,
    ...catalogLocationFilters(currentPlace),
  });
  const allClubs = validPrices ? query.clubs : [];
  const clubs = allClubs;
  const filterCount = [
    activeCategory,
    currentPlace.provinceId,
    currentPlace.cityId,
    currentPlace.districtId,
    ...Object.values(filters),
  ].filter(Boolean).length;
  const hasFilters = Boolean(search || filterCount);
  const loadMore = useRef<HTMLDivElement>(null);
  const { hasNextPage, isFetching, isFetchNextPageError, fetchNextPage } =
    query;
  useEffect(() => {
    if (!loadMore.current || !hasNextPage || isFetching || isFetchNextPageError)
      return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) void fetchNextPage();
      },
      { rootMargin: "300px" },
    );
    observer.observe(loadMore.current);
    return () => observer.disconnect();
  }, [hasNextPage, isFetching, isFetchNextPageError, fetchNextPage]);
  function resetFilters() {
    setCategory("");
    setPlace({ countryId: "" });
    setSearch("");
    setFilters({});
  }
  const filterSheet = (
    <FilterSheet count={filterCount} onReset={resetFilters}>
      <label className="grid gap-2 text-sm">
        {copy("categories")}
        <NativeSelect
          value={activeCategory}
          optionsSource={catalogSelectSource("club-categories")}
          sheetTitle={copy("categories")}
          onChange={(event) => {
            setCategory(event.target.value);
            setPlace({ countryId: "" });
          }}
        >
          <NativeSelectOption value="">{t("allClubs")}</NativeSelectOption>
          {(categories.data ?? []).map((category) => (
            <NativeSelectOption
              key={category.id}
              value={category.id}
              subtitle={category.description ?? undefined}
            >
              {category.name}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </label>
      <div className="discovery-filter-fields">
        <LocationPicker
          value={currentPlace}
          onChange={changeLocation}
          disabled={saveArea.isPending}
        />
        <CatalogFilters
          value={filters}
          onChange={(value) => {
            setFilters(value);
          }}
        />
      </div>
    </FilterSheet>
  );
  return (
    <main className="discovery-page">
      <header className="discovery-header">
        <Link
          href={directoryOnly ? "/discovery" : "/profile"}
          className="discovery-account"
          aria-label={directoryOnly ? catalog("back") : luma("account")}
        >
          {directoryOnly ? (
            <ArrowRightIcon size={26} className="ltr:rotate-180" />
          ) : (
            <CircleUserRound size={26} />
          )}
        </Link>
        <h1>{directoryOnly ? t("clubs") : luma("discover")}</h1>
        <div className="discovery-header-actions">
          <Link href="/discovery/map" scroll={false} aria-label={t("map")}>
            <Map size={21} />
          </Link>
          <Link href="/notifications" aria-label={luma("notifications")}>
            <Bell size={21} />
          </Link>
        </div>
      </header>
      <section className="discovery-intro" aria-label={t("search")}>
        <Search
          onClear={() => setSearch("")}
          className="discovery-search"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
          }}
          placeholder={t("search")}
          aria-label={t("search")}
        />
      </section>

      <DiscoveryContentSections page={directoryOnly ? "clubs" : "home"} />
      {!directoryOnly && (
        <>
          <DiscoveryClubSections clubs={clubs} />
          <PopularCoaches />
          <DiscoveryPeopleSections />
        </>
      )}

      <SuccessNotice
        success={saveArea.isSuccess}
        message={copy("changesSaved")}
      />
      {accountArea.isError && !guest && (
        <div>
          <ErrorNotice error={accountArea.error} />
          <button
            type="button"
            className="min-h-11 underline"
            onClick={() => void accountArea.refetch()}
          >
            {locationsCopy("retry")}
          </button>
        </div>
      )}
      {saveArea.isError && (
        <div>
          <ErrorNotice error={saveArea.error} />
          <button
            type="button"
            className="min-h-11 underline"
            onClick={() => changeLocation(currentPlace)}
          >
            {locationsCopy("retry")}
          </button>
        </div>
      )}

      {!validPrices && (
        <p role="alert" className="text-sm text-destructive">
          {catalog("invalidPriceRange")}
        </p>
      )}
      <div className="discovery-results-heading">
        <h2>{t("clubs")}</h2>
        <div className="flex shrink-0 items-center gap-1">{filterSheet}</div>
      </div>
      {validPrices && query.isPending && <CatalogState loading />}
      {validPrices && query.isError && !query.data && (
        <CatalogState retry={() => void query.refetch()} />
      )}
      {validPrices &&
        !query.isPending &&
        !query.isError &&
        clubs.length === 0 && (
          <section role="status">
            <EmptyState
              title={t(hasFilters ? "noResultsTitle" : "emptyTitle")}
              description={t(
                hasFilters ? "noResultsDescription" : "emptyDescription",
              )}
              illustration="treadmill"
              action={
                hasFilters ? (
                  <Button variant="outline" onClick={resetFilters}>
                    {t("resetFilters")}
                  </Button>
                ) : undefined
              }
            />
          </section>
        )}
      <section
        id="discovery-clubs"
        aria-label={t("clubs")}
        className="discovery-results"
      >
        {clubs.map((club, index) => (
          <SavedClubCard
            key={club.id}
            club={club}
            priority={index === 0}
            variant="cinematic"
          />
        ))}
      </section>

      {validPrices && query.hasNextPage && (
        <div ref={loadMore} className="flex justify-center py-4">
          <Button
            variant="outline"
            disabled={query.isFetchingNextPage}
            onClick={() => void query.fetchNextPage()}
          >
            {query.isFetchingNextPage
              ? t("loadingMore")
              : query.isFetchNextPageError
                ? locationsCopy("retry")
                : t("moreClubs")}
          </Button>
        </div>
      )}
      {!directoryOnly && <DiscoveryTabBar />}
    </main>
  );
}
