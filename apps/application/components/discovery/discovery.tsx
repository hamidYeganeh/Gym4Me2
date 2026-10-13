"use client";
import {
  useDeferredValue,
  useState,
  useSyncExternalStore,
  useTransition,
} from "react";
import Image from "next/image";
import { Map, Search, X, UserRound } from "lucide-react";
import {
  InputGroup,
  InputGroupInput,
  InputGroupAddon,
  InputGroupButton,
} from "@repo/ui/kit/InputGroup";
import { DiscoveryTabBar } from "./discovery-tab-bar";
import { ClubList } from "./club-list";
import Link from "next/link";
import { ClubFeaturedCard } from "@repo/ui/kit/ClubFeaturedCard";
import { LocationCard } from "@repo/ui/kit/LocationCard";
import { Carousel, CarouselContent, CarouselItem } from "@repo/ui/kit/Carousel";
import { CategoryCarousel } from "./category-carousel";
import { ClubShowcase } from "./club-showcase";
import { useLocale, useTranslations } from "@repo/i18n";
import { useChangeLocale } from "@repo/i18n/client-provider";
import { ClubCard } from "@repo/ui/kit/ClubCard";
import type { ClubDetailData } from "@repo/ui/kit/ClubDetail";
import { AnimatedThemeToggler } from "@repo/ui/kit/AnimatedThemeToggler";
import { Button } from "@repo/ui/kit/Button";
import { Badge } from "@repo/ui/kit/Badge";
import { BarbellHorizontalIcon, GlobeIcon } from "@repo/ui/icons";
import { useCatalogClubs } from "./use-catalog";
import { CatalogState } from "./catalog-state";
import { CatalogPagination } from "./catalog-pagination";
import { validCatalogPrices } from "@repo/api/catalog";
import { LocationPicker, type LocationValue } from "./location-picker";
import { CatalogFilters, type PriceFilters } from "./catalog-filters";
import { useSavedClub } from "./use-saved-club";

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
    <div className="grid gap-3">
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
      <Button asChild variant="outline" className="w-fit">
        <Link href={`/discovery/compare?club=${club.id}`}>{t("compare")}</Link>
      </Button>
    </div>
  );
}
export function Discovery() {
  const t = useTranslations("Discovery");
  const home = useTranslations("Home");
  const copy = useTranslations("Copy");
  const locale = useLocale();
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
  const location = place.cityId ?? "";
  const district = place.districtId ?? "";
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
    cityId: location || undefined,
    districtId: district || undefined,
    page,
  });
  const allClubs = validPrices ? query.clubs : [];
  const clubs = allClubs;
  const fa = locale === "fa";
  return (
    <main className="flex min-h-dvh w-full flex-col gap-10 px-5 pt-[calc(1.5rem+var(--app-safe-top))] pb-[calc(8rem+var(--app-safe-bottom))] sm:px-6">
      <header className="flex items-center justify-between gap-4 border-b border-border pb-6">
        <Link
          href="/"
          className="flex items-center gap-2.5 text-lg font-bold tracking-tight"
        >
          <span className="flex size-10 items-center justify-center rounded-full bg-primary text-xl text-primary-foreground">
            <BarbellHorizontalIcon />
          </span>
          <span className="max-[360px]:sr-only">{home("brand")}</span>
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
      <section className="relative isolate flex min-h-80 flex-col justify-end gap-5 overflow-hidden rounded-4xl p-6 text-image-foreground">
        <Image
          src="/images/clubs/training.png"
          alt=""
          fill
          sizes="576px"
          className="object-cover"
          priority
          unoptimized
        />
        <div className="absolute inset-0 bg-linear-to-t from-image-surface/95 via-image-surface/40 to-image-surface/10" />
        <div className="relative flex flex-col items-start gap-3">
          <Badge>{t("eyebrow")}</Badge>
          <h1 className="text-3xl font-semibold leading-tight">{t("title")}</h1>
          <p className="text-sm text-image-foreground/80">{t("description")}</p>
        </div>
        <div className="relative rounded-full bg-background p-1 text-foreground">
          <InputGroup className="h-12 rounded-full">
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
        </div>
      </section>
      <section className="relative -mt-16 flex items-center justify-between gap-4 rounded-3xl border-8 border-background bg-card p-5 text-card-foreground">
        <div className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">{t("heroPromo")}</h2>
          <p className="text-sm text-muted-foreground">
            {t("heroPromoDescription")}
          </p>
          <Button asChild size="sm" className="self-start">
            <a href="#discovery-clubs">{t("view")}</a>
          </Button>
        </div>
        <span className="flex size-16 shrink-0 items-center justify-center rounded-full bg-primary/15 text-3xl text-primary">
          <BarbellHorizontalIcon />
        </span>
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
      {allClubs.some((club) => club.cityId) && (
        <section className="flex min-w-0 flex-col gap-4">
          <h2 className="text-xl font-semibold">{t("locations")}</h2>
          <Carousel
            opts={{ align: "start", direction: fa ? "rtl" : "ltr" }}
            aria-label={t("locations")}
          >
            <CarouselContent>
              {allClubs
                .filter(
                  (club, index, list) =>
                    club.cityId &&
                    list.findIndex((item) => item.cityId === club.cityId) ===
                      index,
                )
                .map((club) => (
                  <CarouselItem key={club.id} className="basis-auto">
                    <LocationCard
                      name={club.cityName ?? club.address}
                      parent=""
                      cover={club.photos[0]}
                      clubs={allClubs
                        .filter((item) => item.cityId === club.cityId)
                        .map((item) => ({
                          id: item.id,
                          name: item.name,
                          image: item.logo ?? item.photos[0].src,
                        }))}
                      countLabel={t("locationCount", {
                        count: allClubs.filter(
                          (item) => item.cityId === club.cityId,
                        ).length,
                      })}
                      onSelect={() => {
                        const branch = query.data?.find(
                          (item) => item.id === club.id,
                        )?.mainBranch;
                        setPlace({
                          countryId: branch?.countryId ?? undefined,
                          provinceId: branch?.provinceId ?? undefined,
                          cityId: club.cityId ?? undefined,
                        });
                        setPage(1);
                        setCategory("");
                      }}
                    />
                  </CarouselItem>
                ))}
            </CarouselContent>
          </Carousel>
        </section>
      )}
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
      <ClubList clubs={clubs} title={t("clubs")} viewLabel={t("view")} />
      {validPrices &&
        !query.isPending &&
        !query.isError &&
        clubs.length === 0 && (
          <p role="status" className="text-sm text-muted-foreground">
            {t("noClubs")}
          </p>
        )}
      {clubs[0] && <ClubFeaturedCard club={clubs[0]} viewLabel={t("view")} />}
      <section aria-label={t("images")} className="flex flex-col gap-8">
        {clubs.map((club) => (
          <ClubShowcase
            key={club.id}
            club={club}
            locale={locale}
            viewLabel={t("view")}
          />
        ))}
      </section>
      <section
        id="discovery-clubs"
        aria-label={t("clubs")}
        className="grid grid-cols-1 gap-6"
      >
        {clubs.map((club, index) => (
          <SavedClubCard key={club.id} club={club} priority={index === 0} />
        ))}
      </section>
      <footer className="flex flex-wrap justify-between gap-3 border-t border-border pt-5 text-xs leading-6 text-muted-foreground">
        <span>{t("count", { count: clubs.length })}</span>
      </footer>
      {validPrices && (
        <CatalogPagination
          page={page}
          onChange={setPage}
          next={(query.data?.length ?? 0) === 25}
          busy={query.isFetching}
        />
      )}
      <DiscoveryTabBar />
    </main>
  );
}
