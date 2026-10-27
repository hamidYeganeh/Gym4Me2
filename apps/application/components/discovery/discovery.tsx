"use client";
import { ClubFeaturedCard } from "@repo/ui/kit/ClubFeaturedCard";
import { ErrorNotice, SuccessNotice } from "@repo/ui/account";
import {
  useDeferredValue,
  useSyncExternalStore,
  useEffect,
  useRef,
} from "react";
import { Map, Search, X, Bookmark, CircleUserRound, Bell } from "lucide-react";
import {
  InputGroup,
  InputGroupInput,
  InputGroupAddon,
  InputGroupButton,
} from "@repo/ui/kit/InputGroup";
import { EmptyState } from "@repo/ui/account";
import { DiscoveryTabBar } from "./discovery-tab-bar";
import Link from "next/link";
import { FilterSheet } from "@repo/ui/kit/BottomSheet";
import { NativeSelect, NativeSelectOption } from "@repo/ui/kit/NativeSelect";
import { useTaxonomies, catalogSelectSource } from "@repo/api/catalog";
import { useLocale, useTranslations } from "@repo/i18n";
import { ClubCard } from "@repo/ui/kit/ClubCard";
import type { ClubDetailData } from "@repo/ui/kit/ClubDetail";
import { Button } from "@repo/ui/kit/Button";
import { useInfiniteCatalogClubs, useCatalogClubs } from "./use-catalog";
import { CatalogState } from "./catalog-state";
import {
  ClubGallerySection,
  DiscoveryClasses,
  DiscoveryCoaches,
} from "./discovery-sections";
import type { ClubCardProps } from "@repo/ui/kit/ClubCard";
import { validCatalogPrices } from "@repo/api/catalog";
import { LocationPicker, type LocationValue } from "./location-picker";
import { CatalogFilters, type PriceFilters } from "./catalog-filters";
import { useSavedClub } from "./use-saved-club";
import { useListState } from "@repo/ui/hooks/use-list-state";
import { catalogLocationFilters } from "../../lib/catalog-location";
import {
  useAccountLocation,
  useUpdateAccountLocation,
} from "@repo/api/profile";
import { LocationExplorer } from "@repo/ui/kit/LocationExplorer";
import { preferredDiscoveryLocation } from "@repo/ui/lib/discovery-location";
import "./discovery.css";

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
  const [saved, setSaved] = useSavedClub(club.id);
  return (
    <div className="discovery-result">
      <ClubCard
        club={club}
        variant={variant}
        galleryLabel={t("gallery")}
        photoLabel={t("photo")}
        saved={saved}
        onSavedChange={setSaved}
        priority={priority}
        compareHref={`/discovery/compare?club=${club.id}`}
        compareLabel={t("compare")}
        labels={{
          save: t("save"),
          unsave: t("unsave"),
          discover: t("discover"),
        }}
      />
    </div>
  );
}
let feedSeed: number | undefined;
const subscribeFeed = () => () => {};
const readFeedSeed = () => (feedSeed ??= Math.floor(Math.random() * 3));

export function Discovery() {
  const accountArea = useAccountLocation();
  const saveArea = useUpdateAccountLocation();
  const locationsCopy = useTranslations("LocationDiscovery");
  const categories = useTaxonomies("club-categories");
  const t = useTranslations("Discovery");
  const luma = useTranslations("Luma");
  const copy = useTranslations("Copy");
  const tabs = useTranslations("DiscoveryTabs");
  const catalog = useTranslations("Catalog");
  const locale = useLocale();
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
      Object.values(v).every((x) => x === undefined || typeof x === "string"),
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
  const recommendations = useCatalogClubs();
  const recommendedClubs = recommendations.clubs;
  const showFeed =
    !search &&
    !activeCategory &&
    !Object.values(filters).some((value) => value !== undefined);
  const allClubs = validPrices ? query.clubs : [];
  const clubs = allClubs;
  const filterCount = [
    activeCategory,
    ...Object.values(currentPlace),
    ...Object.values(filters),
  ].filter(Boolean).length;
  const hasFilters = Boolean(search || filterCount);
  const seed = useSyncExternalStore(subscribeFeed, readFeedSeed, () => 0);
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
  const clubSection = (variant: ClubCardProps["variant"], title: string) =>
    recommendedClubs.length > 0 ? (
      <section
        className={`discovery-featured discovery-featured--${variant}`}
        aria-label={title}
      >
        <h2>{title}</h2>
        <div>
          {[
            ...recommendedClubs.slice(
              variant === "cinematic" ? 4 : variant === "editorial" ? 2 : 0,
            ),
            ...recommendedClubs.slice(
              0,
              variant === "cinematic" ? 4 : variant === "editorial" ? 2 : 0,
            ),
          ]
            .slice(0, 4)
            .map((club) => (
              <SavedClubCard
                key={club.id}
                club={club}
                priority={false}
                variant={variant}
              />
            ))}
        </div>
      </section>
    ) : null;
  const featuredSection = (offset: number) => {
    const club = recommendedClubs[(seed + offset) % recommendedClubs.length];
    return club ? (
      <section className="min-w-0 w-full" aria-label={club.name}>
        <ClubFeaturedCard club={club} viewLabel={t("clubs")} />
      </section>
    ) : null;
  };
  const sections = [
    <div key="portrait" className="discovery-feed-group">
      {clubSection("portrait", luma("picked"))}
      <DiscoveryClasses />
      {featuredSection(1)}
    </div>,
    <div key="editorial" className="discovery-feed-group">
      {clubSection("editorial", t("clubs"))}
      {recommendedClubs[0] && <ClubGallerySection club={recommendedClubs[0]} />}
    </div>,
    <div key="cinematic" className="discovery-feed-group">
      {clubSection(
        "cinematic",
        t("spacesToTrain"),
      )}
      {featuredSection(3)}
      <DiscoveryCoaches />
    </div>,
  ];
  const feed = sections.map(
    (_, index) => sections[(index + seed) % sections.length],
  );

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
          href="/profile"
          className="discovery-account"
          aria-label={luma("account")}
        >
          <CircleUserRound size={26} />
        </Link>
        <h1>{luma("discover")}</h1>
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
        <InputGroup className="discovery-search">
          <InputGroupAddon>
            <Search />
          </InputGroupAddon>
          <InputGroupInput
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
            }}
            placeholder={t("search")}
            aria-label={t("search")}
          />
          {search && (
            <InputGroupAddon align="inline-end">
              <InputGroupButton
                size="icon-lg"
                aria-label={t("clearSearch")}
                onClick={() => {
                  setSearch("");
                }}
              >
                <X />
              </InputGroupButton>
            </InputGroupAddon>
          )}
        </InputGroup>
      </section>

      <section
        className="grid min-w-0 gap-4"
        aria-label={locationsCopy("title")}
      >
        {accountArea.isError && !guest ? (
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
        ) : (
          <LocationExplorer
            linkToPlace={(kind, place) =>
              `/discovery/location/${kind}/${encodeURIComponent(place.id)}`
            }
            key={guest ? "guest" : (accountArea.data?.userId ?? "pending")}
            value={currentPlace}
            randomize={guest}
            ready={!accountArea.isPending}
            saving={saveArea.isPending}
            onChange={changeLocation}
            afterRows={
              showFeed
                ? { provinces: feed[0], cities: feed[1], districts: feed[2] }
                : undefined
            }
          />
        )}
        <SuccessNotice
          success={saveArea.isSuccess}
          message={copy("changesSaved")}
        />
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
      </section>

      {!validPrices && (
        <p role="alert" className="text-sm text-destructive">
          {catalog("invalidPriceRange")}
        </p>
      )}
      <div className="discovery-results-heading">
        <h2>{t("clubs")}</h2>
        <div className="flex shrink-0 items-center gap-1">
          {filterSheet}
          <Button asChild variant="ghost" size="icon-lg">
            <Link href="/saved" aria-label={tabs("saved")}>
              <Bookmark size={18} />
            </Link>
          </Button>
        </div>
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
      <DiscoveryTabBar />
    </main>
  );
}
