"use client";
import { useDeferredValue, useSyncExternalStore } from "react";
import {
  Map,
  Search,
  X,
  Building2,
  Bookmark,
  CircleUserRound,
  Bell,
} from "lucide-react";
import {
  InputGroup,
  InputGroupInput,
  InputGroupAddon,
  InputGroupButton,
} from "@repo/ui/kit/InputGroup";
import { EmptyState } from "@repo/ui/account";
import { ServicesLink } from "../luma/discovery-link";
import { DiscoveryTabBar } from "./discovery-tab-bar";
import Link from "next/link";
import { FilterSheet } from "@repo/ui/kit/BottomSheet";
import { NativeSelect, NativeSelectOption } from "@repo/ui/kit/NativeSelect";
import { useTaxonomies, catalogSelectSource } from "@repo/api/catalog";
import { useLocale, useTranslations } from "@repo/i18n";
import { ClubCard } from "@repo/ui/kit/ClubCard";
import type { ClubDetailData } from "@repo/ui/kit/ClubDetail";
import { Button } from "@repo/ui/kit/Button";
import { useCatalogClubs } from "./use-catalog";
import { CatalogState } from "./catalog-state";
import { CatalogPagination } from "./catalog-pagination";
import { validCatalogPrices } from "@repo/api/catalog";
import { LocationPicker, type LocationValue } from "./location-picker";
import { CatalogFilters, type PriceFilters } from "./catalog-filters";
import { useSavedClub } from "./use-saved-club";
import { useListState } from "@repo/ui/hooks/use-list-state";
import { catalogLocationFilters } from "../../lib/catalog-location";
import "./discovery.css";

function SavedClubCard({
  club,
  priority,
  variant = "landscape",
}: {
  club: ClubDetailData;
  priority: boolean;
  variant?: "portrait" | "landscape";
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
        labels={{
          save: t("save"),
          unsave: t("unsave"),
          discover: t("discover"),
        }}
      />
      <Button asChild variant="ghost" className="discovery-compare">
        <Link href={`/discovery/compare?club=${club.id}`}>{t("compare")}</Link>
      </Button>
    </div>
  );
}
export function Discovery() {
  const categories = useTaxonomies("club-categories");
  const t = useTranslations("Discovery");
  const luma = useTranslations("Luma");
  const copy = useTranslations("Copy");
  const tabs = useTranslations("DiscoveryTabs");
  const catalog = useTranslations("Catalog");
  const locale = useLocale();
  const numbers = new Intl.NumberFormat(locale);
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
  const [page, setPage] = useListState(
    "page",
    1,
    (v): v is number => Number.isInteger(v) && Number(v) > 0,
    queryCategory,
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
  const deferredSearch = useDeferredValue(search);
  const query = useCatalogClubs({
    ...filters,
    search: deferredSearch,
    categoryId: activeCategory || undefined,
    ...catalogLocationFilters(place),
    page,
  });
  const allClubs = validPrices ? query.clubs : [];
  const clubs = allClubs;
  const filterCount = [
    activeCategory,
    ...Object.values(place),
    ...Object.values(filters),
  ].filter(Boolean).length;
  const hasFilters = Boolean(search || filterCount);
  function resetFilters() {
    setCategory("");
    setPlace({});
    setSearch("");
    setFilters({});
    setPage(1);
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
            setPlace({});
            setPage(1);
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
          value={place}
          onChange={(place) => {
            setPlace(place);
            setPage(1);
          }}
        />
        <CatalogFilters
          value={filters}
          onChange={(value) => {
            setFilters(value);
            setPage(1);
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
              setPage(1);
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
                  setPage(1);
                }}
              >
                <X />
              </InputGroupButton>
            </InputGroupAddon>
          )}
        </InputGroup>
      </section>

      {!hasFilters && clubs.length > 1 && (
        <section className="discovery-featured" aria-label={luma("picked")}>
          <h2>{luma("picked")}</h2>
          <div>
            {clubs.slice(0, 4).map((club) => (
              <SavedClubCard
                key={club.id}
                club={club}
                priority={false}
                variant="portrait"
              />
            ))}
          </div>
        </section>
      )}
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
      {validPrices && query.isError && (
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
              icon={<Building2 />}
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
          <SavedClubCard key={club.id} club={club} priority={index === 0} />
        ))}
      </section>
      <footer className="flex flex-wrap justify-between gap-3 border-t border-border pt-5 text-xs leading-6 text-muted-foreground">
        <span>{t("count", { count: numbers.format(clubs.length) })}</span>
      </footer>
      {validPrices && (
        <CatalogPagination
          page={page}
          onChange={setPage}
          next={(query.data?.length ?? 0) === 25}
          busy={query.isFetching}
        />
      )}
      <ServicesLink />
      <DiscoveryTabBar />
    </main>
  );
}
