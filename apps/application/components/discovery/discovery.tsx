"use client";
import { useState, useSyncExternalStore, useTransition } from "react";
import Image from "next/image";
import { Map, Search, X } from "lucide-react";
import {
  InputGroup,
  InputGroupInput,
  InputGroupAddon,
  InputGroupButton,
} from "@repo/ui/kit/InputGroup";
import { ClubList } from "./club-list";
import Link from "next/link";
import { ClubFeaturedCard } from "@repo/ui/kit/ClubFeaturedCard";
import { LocationCard } from "@repo/ui/kit/LocationCard";
import { Carousel, CarouselContent, CarouselItem } from "@repo/ui/kit/Carousel";
import { CategoryCarousel, categoryForClub } from "./category-carousel";
import { ClubShowcase } from "./club-showcase";
import { useLocale, useTranslations } from "@repo/i18n";
import { useChangeLocale } from "@repo/i18n/client-provider";
import { ClubCard } from "@repo/ui/kit/ClubCard";
import type { ClubDetailData } from "@repo/ui/kit/ClubDetail";
import { AnimatedThemeToggler } from "@repo/ui/kit/AnimatedThemeToggler";
import { Button } from "@repo/ui/kit/Button";
import { Badge } from "@repo/ui/kit/Badge";
import { BarbellHorizontalIcon, GlobeIcon } from "@repo/ui/icons";
import { getClubs } from "../../lib/clubs";
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
    <ClubCard
      club={club}
      variant="portrait"
      featuredLabel={priority ? t("featured") : undefined}
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
  );
}
export function Discovery() {
  const t = useTranslations("Discovery");
  const home = useTranslations("Home");
  const locale = useLocale();
  const changeLocale = useChangeLocale();
  const [pending, startTransition] = useTransition();
  const allClubs = getClubs(locale);
  const queryCategory = useSyncExternalStore(
    (listener) => {
      window.addEventListener("popstate", listener);
      return () => window.removeEventListener("popstate", listener);
    },
    () => new URLSearchParams(window.location.search).get("category") ?? "",
    () => "",
  );
  const [category, setCategory] = useState<string | null>(null);
  const [location, setLocation] = useState("");
  const [search, setSearch] = useState("");
  const activeCategory = category ?? queryCategory;
  const clubs = allClubs.filter(
    (club) =>
      (!activeCategory ||
        categoryForClub[club.id] === activeCategory ||
        (activeCategory === "group" &&
          categoryForClub[club.id] === "movement")) &&
      (!location || club.address === location) &&
      (!search.trim() ||
        `${club.name} ${club.address} ${club.category}`
          .toLocaleLowerCase()
          .includes(search.trim().toLocaleLowerCase())),
  );
  const fa = locale === "fa";
  return (
    <main className="flex min-h-dvh w-full flex-col gap-10 px-5 pt-[calc(1.5rem+var(--app-safe-top))] pb-[calc(2rem+var(--app-safe-bottom))] sm:px-6">
      <header className="flex items-center justify-between gap-4 border-b border-border pb-6">
        <Link
          href="/"
          className="flex items-center gap-2.5 text-lg font-bold tracking-tight"
        >
          <span className="flex size-10 items-center justify-center rounded-full bg-primary text-xl text-primary-foreground">
            <BarbellHorizontalIcon />
          </span>
          {home("brand")}
        </Link>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="icon-lg">
            <Link href="/discovery/map" scroll={false} aria-label={t("map")}><Map /></Link>
          </Button>
          <AnimatedThemeToggler size="icon-lg" label={home("theme")} />
          <Button
            variant="outline"
            disabled={pending}
            onClick={() =>
              startTransition(() => changeLocale(locale === "fa" ? "en" : "fa"))
            }
          >
            <GlobeIcon data-icon="inline-start" />
            {home("language")}
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
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t("search")}
              aria-label={t("search")}
            />
            {search && (
              <InputGroupAddon align="inline-end">
                <InputGroupButton
                  size="icon-lg"
                  aria-label={t("clearSearch")}
                  onClick={() => setSearch("")}
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
          setLocation("");
        }}
      />
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
                  list.findIndex((item) => item.address === club.address) ===
                  index,
              )
              .map((club) => (
                <CarouselItem key={club.id} className="basis-auto">
                  <LocationCard
                    name={club.address
                      .split(fa ? "،" : ",")
                      [fa ? 1 : 0]!.trim()}
                    parent={fa ? "تهران، ایران" : "Tehran, Iran"}
                    cover={club.photos[0]}
                    clubs={allClubs
                      .filter((item) => item.address === club.address)
                      .map((item) => ({
                        id: item.id,
                        name: item.name,
                        image: item.logo ?? item.photos[0].src,
                      }))}
                    countLabel={t("locationCount", {
                      count: allClubs.filter(
                        (item) => item.address === club.address,
                      ).length,
                    })}
                    onSelect={() => {
                      setLocation(club.address);
                      setCategory("");
                    }}
                  />
                </CarouselItem>
              ))}
          </CarouselContent>
        </Carousel>
      </section>
      {(activeCategory || location) && (
        <Button
          variant="outline"
          className="self-start"
          onClick={() => {
            setCategory("");
            setLocation("");
          }}
        >
          {t("allClubs")}
        </Button>
      )}
      <ClubList clubs={clubs} title={t("topClubs")} viewLabel={t("view")} />
      {clubs.length === 0 && (
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
    </main>
  );
}
