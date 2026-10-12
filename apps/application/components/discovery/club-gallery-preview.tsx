"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useLocale, useTranslations } from "@repo/i18n";
import { Button } from "@repo/ui/kit/Button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@repo/ui/kit/Card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@repo/ui/kit/Carousel";
import { getClubs } from "../../lib/clubs";
import { GalleryIndicators } from "./gallery-indicators";

export function ClubGalleryPreview({ clubId }: { clubId: string }) {
  const locale = useLocale();
  const t = useTranslations("Gallery");
  const photos = getClubs(locale).find((club) => club.id === clubId)!.photos;
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const [pages, setPages] = useState(1);
  const number = new Intl.NumberFormat(locale);
  useEffect(() => {
    if (!api) return;
    api.reInit();
    const update = () => {
      setCurrent(api.selectedScrollSnap());
      setPages(api.scrollSnapList().length);
    };
    update();
    api.on("select", update);
    api.on("reInit", update);
    return () => {
      api.off("select", update);
      api.off("reInit", update);
    };
  }, [api, locale]);
  return (
    <section
      className="flex min-w-0 flex-col gap-4"
      aria-label={t("sectionTitle")}
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-2xl font-semibold">{t("sectionTitle")}</h2>
        <Button asChild variant="link">
          <Link href={`/discovery/clubs/${clubId}/gallery`} scroll={false}>
            {t("seeAll")}
          </Link>
        </Button>
      </div>
      <Card size="sm" className="gap-3">
        <CardHeader className="sr-only">
          <CardTitle>{t("sectionTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <Carousel
            dir={locale === "fa" ? "rtl" : "ltr"}
            setApi={setApi}
            opts={{
              align: "start",
              containScroll: "trimSnaps",
              slidesToScroll: "auto",
              direction: locale === "fa" ? "rtl" : "ltr",
            }}
            aria-label={t("sectionTitle")}
          >
            <CarouselContent className="ms-0 gap-3">
              {photos.map((photo, index) => (
                <CarouselItem key={photo.src} className="basis-auto ps-0">
                  <Link
                    href={`/discovery/clubs/${clubId}/gallery?photo=${index}`}
                    scroll={false}
                    className="relative block size-28 overflow-hidden rounded-3xl bg-muted outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    aria-label={t("photo", {
                      number: number.format(index + 1),
                    })}
                  >
                    <Image
                      src={photo.src}
                      alt={photo.alt}
                      fill
                      sizes="112px"
                      className="object-cover"
                      unoptimized
                    />
                  </Link>
                </CarouselItem>
              ))}
            </CarouselContent>
          </Carousel>
        </CardContent>
        <CardFooter className="justify-between">
          <GalleryIndicators
            count={pages}
            current={current}
            onSelect={(index) => api?.scrollTo(index)}
            label={(index) => t("photo", { number: number.format(index + 1) })}
          />
          <p
            dir="ltr"
            className="text-sm text-muted-foreground"
            aria-live="polite"
          >
            {number.format(current + 1)}/{number.format(pages)}
          </p>
        </CardFooter>
      </Card>
    </section>
  );
}
