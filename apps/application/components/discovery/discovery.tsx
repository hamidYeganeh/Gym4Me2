"use client";
import {
  useDeferredValue,
  useState,
  useSyncExternalStore,
  useTransition,
} from "react";
import {
  Map,
  Search,
  X,
  UserRound,
  SlidersHorizontal,
  Bookmark,
} from "lucide-react";
import {
  InputGroup,
  InputGroupInput,
  InputGroupAddon,
  InputGroupButton,
} from "@repo/ui/kit/InputGroup";
import { ServicesLink } from "../luma/discovery-link";
import { DiscoveryTabBar } from "./discovery-tab-bar";
import Link from "next/link";
import { CategoryCarousel } from "./category-carousel";
import { useLocale, useTranslations } from "@repo/i18n";
import { useChangeLocale } from "@repo/i18n/client-provider";
import { ClubCard } from "@repo/ui/kit/ClubCard";
import type { ClubDetailData } from "@repo/ui/kit/ClubDetail";
import { AnimatedThemeToggler } from "@repo/ui/kit/AnimatedThemeToggler";
import { Button } from "@repo/ui/kit/Button";
import { BarbellHorizontalIcon, GlobeIcon } from "@repo/ui/icons";
import { useCatalogClubs } from "./use-catalog";
import { CatalogState } from "./catalog-state";
import { CatalogPagination } from "./catalog-pagination";
import { validCatalogPrices } from "@repo/api/catalog";
import { LocationPicker, type LocationValue } from "./location-picker";
import { CatalogFilters, type PriceFilters } from "./catalog-filters";
import { useSavedClub } from "./use-saved-club";
import { catalogLocationFilters } from "../../lib/catalog-location";
import "./discovery.css";

function SavedClubCard({
  club,
  priority,
}: {
  club: ClubDetailData;
  priority: boolean;
}) {
  const t = useTranslations("Clubs");
  const [saved, setSaved] = useSavedClub(club.id);
  return (
    <div className="discovery-result">
      <ClubCard
        club={club}
        variant="portrait"
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
  const t = useTranslations("Discovery");
  const home = useTranslations("Home");
  const copy = useTranslations("Copy");
  const tabs = useTranslations("DiscoveryTabs");
  const catalog = useTranslations("Catalog");
  const locale = useLocale();
  const numbers = new Intl.NumberFormat(locale);
  const changeLocale = useChangeLocale();
  const [pending, startTransition] = useTransition();
  const queryCategory = useSyncExternalStore(
    (listener) => {
      window.addEventListener("popstate", listener);
      return () => window.removeEventListener("popstate", listener);
    },
    () => new URLSearchParams(window.location.search).get("category") ?? "",
    () => "",
  );
  const [category, setCategory] = useState<string | null>(null);
  const [place, setPlace] = useState<LocationValue>({});
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const [filters, setFilters] = useState<PriceFilters>({});
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
    ...Object.values(place),
    ...Object.values(filters),
  ].filter(Boolean).length;
  return (
    <main className="discovery-page">
      <header className="discovery-header">
        <Link
          href="/"
          className="flex items-center gap-2.5 text-lg font-bold tracking-tight"
        >
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-xl text-primary-foreground">
            <BarbellHorizontalIcon />
          </span>
          <span>{home("brand")}</span>
        </Link>
        <div className="flex shrink-0 items-center gap-1.5">
          <Button asChild variant="outline" size="icon-lg" className="size-11">
            <Link href="/profile" aria-label={copy("userAccount")}>
              <UserRound />
            </Link>
          </Button>
          <Button asChild variant="outline" size="icon-lg">
            <Link href="/discovery/map" scroll={false} aria-label={t("map")}>
              <Map />
            </Link>
          </Button>
          <AnimatedThemeToggler size="icon-lg" label={home("theme")} />
          <Button
            variant="outline"
            size="icon-lg"
            className="size-11"
            aria-label={home("language")}
            disabled={pending}
            onClick={() =>
              startTransition(() => changeLocale(locale === "fa" ? "en" : "fa"))
            }
          >
            <GlobeIcon data-icon="inline-start" />
          </Button>
        </div>
      </header>
      <section className="discovery-intro">
        <p className="discovery-eyebrow">{t("eyebrow")}</p>
        <h1>{t("title")}</h1>
        <p>{t("description")}</p>
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
      <CategoryCarousel
        locale={locale}
        selected={activeCategory}
        onSelect={(value) => {
          setCategory(value);
          setPlace({});
          setPage(1);
        }}
      />
      <details className="discovery-filters">
        <summary>
          <SlidersHorizontal size={18} />
          <span>{t("filters")}</span>
          {filterCount > 0 && (
            <span className="discovery-filter-count">
              {numbers.format(filterCount)}
            </span>
          )}
        </summary>
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
      </details>
      {!validPrices && (
        <p role="alert" className="text-sm text-destructive">
          {catalog("invalidPriceRange")}
        </p>
      )}
      <div className="discovery-results-heading">
        <h2>{t("clubs")}</h2>
        <Button asChild variant="ghost">
          <Link href="/saved">
            <Bookmark size={17} />
            {tabs("saved")}
          </Link>
        </Button>
      </div>
      {(activeCategory ||
        Object.values(place).some(Boolean) ||
        search ||
        Object.keys(filters).length > 0) && (
        <Button
          variant="outline"
          className="self-start"
          onClick={() => {
            setCategory("");
            setPlace({});
            setSearch("");
            setFilters({});
            setPage(1);
          }}
        >
          {t("allClubs")}
        </Button>
      )}
      {validPrices && query.isPending && <CatalogState loading />}
      {validPrices && query.isError && (
        <CatalogState retry={() => void query.refetch()} />
      )}
      {validPrices &&
        !query.isPending &&
        !query.isError &&
        clubs.length === 0 && (
          <p role="status" className="discovery-empty">
            {t("noClubs")}
          </p>
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
