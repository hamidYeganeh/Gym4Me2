"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowUpRight,
  Heart,
  List,
  MapPin,
  Search,
  Star,
  X,
} from "lucide-react";
import { useLocale, useTranslations } from "@repo/i18n";
import { Button } from "@repo/ui/kit/Button";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@repo/ui/kit/Carousel";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/kit/Select";
import type { ClubDetailData } from "@repo/ui/kit/ClubDetail";
import { clubIds, getClubs } from "../../lib/clubs";
import { categoryForClub } from "./category-carousel";
import { useSavedClub, useSavedClubIds } from "./use-saved-club";
import { NeshanMap } from "./neshan-map";
import "./discovery-map.css";

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
      className={"discovery-map-clubCard"}
      data-selected={selected}
      aria-label={club.name}
    >
      <Link
        href={`/discovery/clubs/${club.id}`}
        scroll={false}
        className="relative w-[30%] shrink-0 overflow-hidden"
        aria-label={`${labels("discover")} · ${club.name}`}
      >
        <Image
          src={club.photos[0].src}
          alt={club.photos[0].alt}
          fill
          sizes="160px"
          className="object-cover"
          unoptimized
        />
      </Link>
      <div className="flex min-w-0 flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-2">
          <Link
            href={`/discovery/clubs/${club.id}`}
            scroll={false}
            className="min-w-0"
          >
            <h2 className="line-clamp-1 text-base font-semibold">
              {club.name}
            </h2>
            <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
              {club.category}
            </p>
          </Link>
          <Button
            variant="ghost"
            size="icon-sm"
            className="-me-2 -mt-1 shrink-0"
            aria-pressed={saved}
            aria-label={saved ? labels("unsave") : labels("save")}
            onClick={() => setSaved(!saved)}
          >
            <Heart className={saved ? "fill-primary text-primary" : ""} />
          </Button>
        </div>
        <p className="mt-3 flex items-center gap-1.5 text-xs">
          <Star className="size-3.5 fill-amber-400 text-amber-400" />
          <span className="font-semibold">{club.rating}</span>
          <span className="text-muted-foreground">
            {t("reviewCount", { count: club.reviews })}
          </span>
        </p>
        <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
          <MapPin className="size-3.5 shrink-0" />
          {club.address}
        </p>
        <div className="mt-auto flex items-end justify-between gap-2 pt-4">
          <div>
            <p className="text-base font-semibold">{club.price}</p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {t("perSession")}
            </p>
          </div>
          <Button
            asChild
            size="icon-sm"
            aria-label={`${labels("discover")} · ${club.name}`}
          >
            <Link scroll={false} href={`/discovery/clubs/${club.id}`}>
              <ArrowUpRight className="rtl:-rotate-90" />
            </Link>
          </Button>
        </div>
      </div>
    </article>
  );
}

function MapFilter({
  value,
  onChange,
  label,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
  options: [string, string][];
}) {
  const locale = useLocale();
  return (
    <Select
      value={value}
      onValueChange={onChange}
      dir={locale === "fa" ? "rtl" : "ltr"}
    >
      <SelectTrigger aria-label={label} className={"discovery-map-filter"}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent position="popper">
        {options.map(([id, text]) => (
          <SelectItem key={id} value={id}>
            {text}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function DiscoveryMap() {
  const locale = useLocale();
  const t = useTranslations("DiscoveryMap");
  const discovery = useTranslations("Discovery");
  const fa = locale === "fa";
  const allClubs = useMemo(() => getClubs(locale), [locale]);
  const savedIds = useSavedClubIds(clubIds);
  const savedKey = savedIds.join(",");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [price, setPrice] = useState("all");
  const [sort, setSort] = useState("recommended");
  const [savedOnly, setSavedOnly] = useState(false);
  const [selectedId, setSelectedId] = useState("atlas");
  const [api, setApi] = useState<CarouselApi>();
  const clubs = useMemo(() => {
    const saved = savedKey.split(",");
    const query = search.trim().toLocaleLowerCase();
    const filtered = allClubs.filter(
      (club) =>
        (!query ||
          `${club.name} ${club.address} ${club.category}`
            .toLocaleLowerCase()
            .includes(query)) &&
        (category === "all" || categoryForClub[club.id] === category) &&
        (price === "all" || club.priceValue <= Number(price)) &&
        (!savedOnly || saved.includes(club.id)),
    );
    if (sort === "priceLow")
      filtered.sort((a, b) => a.priceValue - b.priceValue);
    if (sort === "priceHigh")
      filtered.sort((a, b) => b.priceValue - a.priceValue);
    return filtered;
  }, [allClubs, category, price, savedOnly, savedKey, search, sort]);
  const activeId =
    clubs.find((club) => club.id === selectedId)?.id ?? clubs[0]?.id ?? "";
  const selectClub = useCallback(
    (id: string) => {
      setSelectedId(id);
      const index = clubs.findIndex((club) => club.id === id);
      if (index >= 0) api?.scrollTo(index);
    },
    [api, clubs],
  );

  useEffect(() => {
    if (!api) return;
    const onSelect = () => {
      const club = clubs[api.selectedScrollSnap()];
      if (club) setSelectedId(club.id);
    };
    onSelect();
    api.on("select", onSelect);
    api.on("reInit", onSelect);
    return () => {
      api.off("select", onSelect);
      api.off("reInit", onSelect);
    };
  }, [api, clubs]);

  function clearFilters() {
    setSearch("");
    setCategory("all");
    setPrice("all");
    setSavedOnly(false);
    setSort("recommended");
  }
  const count = new Intl.NumberFormat(locale).format(clubs.length);
  return (
    <main className="discovery-map-root">
      <h1 className="sr-only">{t("title")}</h1>
      <NeshanMap clubs={clubs} selectedId={activeId} onSelect={selectClub} />
      <header className={"discovery-map-header"}>
        <div className="flex items-center gap-2">
          <Button
            asChild
            variant="secondary"
            size="icon-lg"
            className={"discovery-map-roundButton"}
          >
            <Link href="/discovery" scroll={false} aria-label={t("back")}>
              <ArrowLeft className="rtl:rotate-180" />
            </Link>
          </Button>
          <div className={"discovery-map-search"}>
            <Search className="size-5 shrink-0" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={t("search")}
                aria-label={discovery("search")}
                className="h-6 w-full min-w-0 bg-transparent text-sm font-semibold outline-none placeholder:text-foreground"
              />
              <p className="text-[11px] text-muted-foreground" role="status">
                {t("results", { count })}
              </p>
            </div>
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                aria-label={discovery("clearSearch")}
                className="flex size-8 shrink-0 items-center justify-center rounded-full hover:bg-muted"
              >
                <X className="size-4" />
              </button>
            )}
          </div>
          <Button
            variant="secondary"
            size="icon-lg"
            className={"discovery-map-roundButton"}
            aria-label={t("savedOnly")}
            aria-pressed={savedOnly}
            onClick={() => setSavedOnly(!savedOnly)}
          >
            <Heart className={savedOnly ? "fill-primary text-primary" : ""} />
          </Button>
        </div>
        <div className="mt-3 flex gap-2">
          <MapFilter
            label={t("filters")}
            value={category}
            onChange={setCategory}
            options={[
              ["all", t("filters")],
              ["strength", t("strength")],
              ["movement", t("movement")],
              ["functional", t("functional")],
            ]}
          />
          <MapFilter
            label={t("price")}
            value={price}
            onChange={setPrice}
            options={[
              ["all", t("price")],
              ...[350000, 400000, 450000].map((value): [string, string] => [
                String(value),
                t("upTo", {
                  price: new Intl.NumberFormat(locale).format(value),
                }),
              ]),
            ]}
          />
          <MapFilter
            label={t("sort")}
            value={sort}
            onChange={setSort}
            options={[
              ["recommended", t("sort")],
              ["priceLow", t("priceLow")],
              ["priceHigh", t("priceHigh")],
            ]}
          />
        </div>
      </header>
      <div className={"discovery-map-bottom"}>
        <div className="mb-3 flex items-center justify-between gap-3 px-5">
          <span className={"discovery-map-sampleLabel"}>{t("sample")}</span>
          <Button
            asChild
            variant="secondary"
            size="sm"
            className="rounded-full shadow-lg"
          >
            <Link scroll={false} href="/discovery">
              <List />
              {t("list")}
            </Link>
          </Button>
        </div>
        {clubs.length ? (
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
                  <MapClubCard club={club} selected={club.id === activeId} />
                </CarouselItem>
              ))}
            </CarouselContent>
          </Carousel>
        ) : (
          <div
            className="mx-5 flex flex-col items-center gap-3 rounded-3xl bg-card p-6 text-card-foreground shadow-lg"
            role="status"
          >
            <p className="text-sm">{discovery("noClubs")}</p>
            <Button variant="outline" onClick={clearFilters}>
              {t("clearFilters")}
            </Button>
          </div>
        )}
      </div>
    </main>
  );
}
