"use client";
import { DiscoveryContentSections } from "@repo/ui/discovery-content";

import { catalogSelectSource, useTaxonomies } from "@repo/api/catalog";
import { useLocale, useTranslations } from "@repo/i18n";
import {
  ChevronLeftIcon as ChevronLeft,
  PaperPlaneDiagonalIcon as Navigation,

  StarFullIcon as Star,
} from "@repo/ui/icons";
import { FilterSheet } from "@repo/ui/kit/BottomSheet";
import { Button } from "@repo/ui/kit/Button";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@repo/ui/kit/Carousel";
import type { ClubDetailData } from "@repo/ui/kit/ClubDetail";
import { Field, FieldLabel } from "@repo/ui/kit/Field";
import { Search } from "@repo/ui/kit/Search";
import { Like } from "@repo/ui/kit/Like";
import { NativeSelect, NativeSelectOption } from "@repo/ui/kit/NativeSelect";
import { Slider } from "@repo/ui/kit/Slider";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useDeferredValue, useEffect, useState } from "react";
import { CatalogMap } from "./catalog-map";
import { CatalogPagination } from "./catalog-pagination";
import "./discovery-map.css";
import { useCatalogClubs } from "./use-catalog";
import { useSavedClub } from "./use-saved-club";

function MapClubCard({
  club,
  selected,
}: {
  club: ClubDetailData;
  selected: boolean;
}) {
  const t = useTranslations("DiscoveryMap");
  const labels = useTranslations("Clubs");
  const [saved, setSaved] = useSavedClub(club.id);
  return (
    <article
      className="discovery-map-clubCard"
      data-selected={selected}
      aria-label={club.name}
    >
      <Image
        src={club.photos[0].src}
        alt=""
        fill
        sizes="(max-width: 576px) 92vw, 500px"
        className="object-cover"
        unoptimized
      />
      <div className="discovery-map-cardShade" aria-hidden="true" />
      <div className="relative mt-auto flex items-end gap-3 p-5">
        <Link
          href={club.href ?? `/discovery/clubs/${club.id}`}
          scroll={false}
          className="relative size-14 shrink-0 overflow-hidden rounded-xl"
          aria-label={`${labels("discover")} · ${club.name}`}
        >
          <Image
            src={club.photos[0].src}
            alt=""
            fill
            sizes="56px"
            className="object-cover"
            unoptimized
          />
        </Link>
        <Link
          href={club.href ?? `/discovery/clubs/${club.id}`}
          scroll={false}
          className="flex min-w-0 flex-1 flex-col gap-1.5 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <h2 className="line-clamp-2 text-lg font-semibold leading-7">
            {club.name}
          </h2>
          <p className="line-clamp-1 text-xs">
            {club.category} · {club.address}
          </p>
          <p className="flex flex-wrap items-center gap-2 text-xs">
            <Star className="size-3 shrink-0 text-rating" fill="currentColor" />
            <span>
              {club.rating} {t("reviewCount", { count: club.reviews })}
            </span>
            <span>· {club.price}</span>
          </p>
        </Link>
        <Like
          variant="image"
          size="icon"
          aria-pressed={saved}
          aria-label={saved ? labels("unsave") : labels("save")}
          onClick={() => setSaved(!saved)}
        ></Like>
      </div>
    </article>
  );
}

function MapFilter({
  value,
  onChange,
  label,
  options,
  optionsSource,
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
  options: [string, string][];
  optionsSource?: React.ComponentProps<typeof NativeSelect>["optionsSource"];
}) {
  return (
    <Field>
      <FieldLabel>{label}</FieldLabel>
      <NativeSelect
        value={value}
        sheetTitle={label}
        optionsSource={optionsSource}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map(([id, text]) => (
          <NativeSelectOption key={id} value={id}>
            {text}
          </NativeSelectOption>
        ))}
      </NativeSelect>
    </Field>
  );
}

export function DiscoveryMap() {
  const locale = useLocale();
  const t = useTranslations("DiscoveryMap");
  const discovery = useTranslations("Discovery");
  const copy = useTranslations("Copy");
  const fa = locale === "fa";
  const categories = useTaxonomies("club-categories");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [price, setPrice] = useState<number[]>([0, 1000000]);
  const [appliedPrice, setAppliedPrice] = useState<number[]>([0, 1000000]);
  const priceActive = appliedPrice[0] > 0 || appliedPrice[1] < 1000000;
  const [sort, setSort] = useState("recommended");
  const [selectedId, setSelectedId] = useState("");
  const [api, setApi] = useState<CarouselApi>();
  const [page, setPage] = useState(1);
  const [recenter, setRecenter] = useState(0);
  const query = useCatalogClubs({
    search: useDeferredValue(search),
    categoryId: category === "all" ? undefined : category,
    minPrice: priceActive ? appliedPrice[0] : undefined,
    maxPrice: appliedPrice[1] < 1000000 ? appliedPrice[1] : undefined,
    unit: priceActive || sort !== "recommended" ? "visit" : undefined,
    sort:
      sort === "priceLow"
        ? "priceLow"
        : sort === "priceHigh"
          ? "priceHigh"
          : "recent",
    page,
  });
  const clubs = query.clubs;
  const activeId = clubs.find((club) => club.id === selectedId)?.id ?? "";
  const selectClub = useCallback(
    (id: string) => {
      setSelectedId(id);
      const index = clubs.findIndex((club) => club.id === id);
      if (index >= 0) api?.scrollTo(index);
    },
    [api, clubs],
  );

  useEffect(() => {
    if (!api || !selectedId) return;
    const onSelect = () => {
      const club = clubs[api.selectedScrollSnap()];
      if (club) setSelectedId(club.id);
    };
    api.on("select", onSelect);
    api.on("reInit", onSelect);
    return () => {
      api.off("select", onSelect);
      api.off("reInit", onSelect);
    };
  }, [api, clubs, selectedId]);

  const count = new Intl.NumberFormat(locale).format(clubs.length);
  return (
    <main className="discovery-map-root" data-panel-open={Boolean(activeId)}>
      <h1 className="sr-only">{t("title")}</h1>
      <CatalogMap
        clubs={clubs}
        selectedId={activeId}
        onSelect={selectClub}
        recenter={recenter}
      />
      <aside className="absolute inset-x-5 top-28 z-10 max-h-[30dvh] overflow-auto rounded-2xl bg-background/95"><DiscoveryContentSections page="map" /></aside>
      <header className="discovery-map-header">
        <div className="discovery-map-heading flex items-center gap-3">
          <Button
            asChild
            variant="secondary"
            size="icon-lg"
            className="discovery-map-roundButton"
          >
            <Link href="/discovery" scroll={false} aria-label={t("back")}>
              <ChevronLeft className="rtl:rotate-180" />
            </Link>
          </Button>
          <Search onClear={() => { setSearch(""); setPage(1); }} className="discovery-map-search"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder={t("search")}
              aria-label={discovery("search")}
            />
        </div>
      </header>
      <div className={"discovery-map-bottom"}>
        <CatalogPagination
          page={page}
          onChange={setPage}
          next={(query.data?.length ?? 0) === 25}
          busy={query.isFetching}
        />
        <div className="discovery-map-toolbar mb-3 flex flex-wrap items-center justify-end gap-2 px-5">
          <span className="sr-only" role="status">
            {t("results", { count })}
          </span>
          <FilterSheet
            count={
              [category !== "all", priceActive, sort !== "recommended"].filter(
                Boolean,
              ).length
            }
          >
            <MapFilter
              label={copy("categories")}
              value={category}
              optionsSource={catalogSelectSource("club-categories")}
              onChange={(value) => {
                setCategory(value);
                setPage(1);
              }}
              options={[
                ["all", t("allClubs")],
                ...(categories.data ?? []).map((item): [string, string] => [
                  item.id,
                  item.name,
                ]),
              ]}
            />
            <Field>
              <FieldLabel id="map-price-label">{t("pricePerVisit")}</FieldLabel>
              <Slider
                thumbLabels={[t("minimumPrice"), t("maximumPrice")]}
                aria-labelledby="map-price-label"
                min={0}
                max={1000000}
                step={10000}
                value={price}
                onValueChange={setPrice}
                onValueCommit={(value) => {
                  setAppliedPrice(value);
                  setPage(1);
                }}
              />
              <div className="flex justify-between gap-4 text-sm text-muted-foreground">
                <span>
                  {t("minimum")}:{" "}
                  {new Intl.NumberFormat(locale).format(price[0])} {t("toman")}
                </span>
                <span>
                  {t("maximum")}:{" "}
                  {price[1] === 1000000
                    ? t("anyPrice")
                    : new Intl.NumberFormat(locale).format(price[1]) +
                      ` ${t("toman")}`}
                </span>
              </div>
            </Field>
            <MapFilter
              label={t("sort")}
              value={sort}
              onChange={(value) => {
                setSort(value);
                setPage(1);
              }}
              options={[
                ["recommended", t("newest")],
                ["priceLow", t("priceLow")],
                ["priceHigh", t("priceHigh")],
              ]}
            />
          </FilterSheet>
          <Button
            variant="secondary"
            size="icon-lg"
            className="discovery-map-roundButton"
            aria-label={t("recenter")}
            onClick={() => setRecenter((value) => value + 1)}
          >
            <Navigation />
          </Button>
        </div>
        <div
          className="discovery-map-panel-region"
          data-open={Boolean(activeId)}
        >
          <div className="discovery-map-panel-clip">
            <div
              className="t-panel-slide"
              data-open={Boolean(activeId)}
              aria-hidden={!activeId}
              inert={!activeId}
            >
              {clubs.length > 0 && !query.isError ? (
                <Carousel
                  key={`${clubs.map((club) => club.id).join(",")}:${locale}`}
                  setApi={setApi}
                  opts={{
                    align: "center",
                    direction: fa ? "rtl" : "ltr",
                    containScroll: false,
                  }}
                  aria-label={t("clubs")}
                >
                  <CarouselContent className="ms-0 gap-3 pb-3">
                    {clubs.map((club) => (
                      <CarouselItem
                        key={club.id}
                        className="basis-[92%] ps-0 sm:basis-[86%]"
                      >
                        <MapClubCard
                          club={club}
                          selected={club.id === activeId}
                        />
                      </CarouselItem>
                    ))}
                  </CarouselContent>
                </Carousel>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
