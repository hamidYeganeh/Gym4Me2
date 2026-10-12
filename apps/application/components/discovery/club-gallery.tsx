"use client";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Grid2X2,
  GalleryHorizontal,
} from "lucide-react";
import { useLocale, useTranslations } from "@repo/i18n";
import { Button } from "@repo/ui/kit/Button";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@repo/ui/kit/Carousel";
import { ToggleGroup, ToggleGroupItem } from "@repo/ui/kit/ToggleGroup";
import { ScrollArea, ScrollBar } from "@repo/ui/kit/ScrollArea";
import { cn } from "@repo/ui/lib/utils";
import { getClubs } from "../../lib/clubs";
import { GalleryIndicators } from "./gallery-indicators";

function subscribeSearch(listener: () => void) {
  window.addEventListener("popstate", listener);
  return () => window.removeEventListener("popstate", listener);
}
const getSearch = () => window.location.search;

export function ClubGallery({ clubId }: { clubId: string }) {
  const locale = useLocale();
  const t = useTranslations("Gallery");
  const club = getClubs(locale).find((item) => item.id === clubId)!;
  const photos = club.photos;
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const [grid, setGrid] = useState(false);
  const selectedPhoto = useRef(0);
  const search = useSyncExternalStore(subscribeSearch, getSearch, () => "");
  const requested = Number(new URLSearchParams(search).get("photo"));
  const initial =
    Number.isInteger(requested) && requested >= 0 && requested < photos.length
      ? requested
      : 0;
  const number = new Intl.NumberFormat(locale);

  useEffect(() => {
    selectedPhoto.current = initial;
    api?.scrollTo(initial, true);
  }, [api, initial]);

  useEffect(() => {
    if (!api || grid) return;
    const selected = selectedPhoto.current;
    api.reInit();
    api.scrollTo(selected, true);
    const update = () => {
      selectedPhoto.current = api.selectedScrollSnap();
      setCurrent(selectedPhoto.current);
    };
    update();
    api.on("select", update);
    api.on("reInit", update);
    return () => {
      api.off("select", update);
      api.off("reInit", update);
    };
  }, [api, grid]);

  function select(index: number) {
    selectedPhoto.current = index;
    setGrid(false);
    if (!grid) api?.scrollTo(index);
  }
  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col gap-5 bg-background px-5 pt-[calc(1.5rem+var(--app-safe-top))] pb-[calc(1.5rem+var(--app-safe-bottom))] text-foreground">
      <header className="grid grid-cols-[auto_1fr_auto] items-center gap-3">
        <Button asChild variant="ghost" size="icon-lg">
          <Link
            href={`/discovery/clubs/${clubId}`}
            scroll={false}
            aria-label={t("back")}
          >
            <ArrowLeft className="rtl:rotate-180" />
          </Link>
        </Button>
        <h1 className="text-center text-xl font-semibold">
          {t("title", { count: number.format(photos.length) })}
        </h1>
        <Button
          variant="ghost"
          size="icon-lg"
          aria-label={t(grid ? "slideshow" : "grid")}
          aria-pressed={grid}
          onClick={() => setGrid(!grid)}
        >
          {grid ? <GalleryHorizontal /> : <Grid2X2 />}
        </Button>
      </header>
      <p className="sr-only">{club.name}</p>
      <div className={cn("grid grid-cols-2 gap-3", !grid && "hidden")}>
        {photos.map((photo, index) => (
          <Button
            key={photo.src}
            variant="outline"
            className="relative h-auto aspect-square overflow-hidden p-0"
            aria-label={t("photo", { number: number.format(index + 1) })}
            onClick={() => select(index)}
          >
            <Image
              src={photo.src}
              alt={photo.alt}
              fill
              sizes="(max-width: 576px) 45vw, 250px"
              className="object-cover"
              unoptimized
            />
          </Button>
        ))}
      </div>
      <div className={cn("flex flex-col gap-5", grid && "hidden")}>
        <Carousel
          dir={locale === "fa" ? "rtl" : "ltr"}
          setApi={setApi}
          opts={{
            align: "start",
            startIndex: initial,
            direction: locale === "fa" ? "rtl" : "ltr",
          }}
          aria-label={t("sectionTitle")}
        >
          <CarouselContent className="ms-0">
            {photos.map((photo, index) => (
              <CarouselItem key={photo.src} className="ps-0">
                <div className="relative h-[calc(100dvh-13rem-var(--app-safe-top)-var(--app-safe-bottom))] min-h-72 overflow-hidden rounded-4xl bg-muted">
                  <Image
                    src={photo.src}
                    alt={photo.alt}
                    fill
                    sizes="(max-width: 576px) 100vw, 536px"
                    className="object-cover"
                    priority={index === initial}
                    unoptimized
                  />
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
          <div className="pointer-events-none absolute inset-x-4 top-1/2 flex -translate-y-1/2 justify-between">
            <Button
              variant="image"
              size="icon-lg"
              className="pointer-events-auto"
              disabled={!api?.canScrollPrev()}
              onClick={() => api?.scrollPrev()}
              aria-label={t("previous")}
            >
              <ChevronLeft className="rtl:rotate-180" />
            </Button>
            <Button
              variant="image"
              size="icon-lg"
              className="pointer-events-auto"
              disabled={!api?.canScrollNext()}
              onClick={() => api?.scrollNext()}
              aria-label={t("next")}
            >
              <ChevronRight className="rtl:rotate-180" />
            </Button>
          </div>
          <div className="absolute inset-x-0 bottom-3 flex justify-center">
            <div className="rounded-full bg-background/90 px-2">
              <GalleryIndicators
                count={photos.length}
                current={current}
                onSelect={(index) => api?.scrollTo(index)}
                label={(index) =>
                  t("photo", { number: number.format(index + 1) })
                }
              />
            </div>
          </div>
        </Carousel>
        <ScrollArea className="w-full" dir={locale === "fa" ? "rtl" : "ltr"}>
          <ToggleGroup
            type="single"
            value={String(current)}
            onValueChange={(value) => {
              if (value) api?.scrollTo(Number(value));
            }}
            aria-label={t("thumbnails")}
            spacing={3}
            className="pb-3"
            dir={locale === "fa" ? "rtl" : "ltr"}
          >
            {photos.map((photo, index) => (
              <ToggleGroupItem
                key={photo.src}
                value={String(index)}
                aria-label={t("photo", { number: number.format(index + 1) })}
                className="relative size-20 overflow-hidden rounded-3xl border-2 border-transparent p-0 data-[state=on]:border-primary"
              >
                <Image
                  src={photo.src}
                  alt=""
                  fill
                  sizes="80px"
                  className="object-cover"
                  unoptimized
                />
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>
    </main>
  );
}
