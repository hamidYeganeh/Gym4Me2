"use client";

import { useLocale, useTranslations } from "@repo/i18n";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@repo/ui/kit/Carousel";
import Link from "next/link";
import { Button } from "@repo/ui/kit/Button";
import { CoachCard } from "@repo/ui/kit/CoachCard";
import { coachHref } from "@repo/ui/lib/public-route";
import { getCoaches } from "../../lib/coaches";
import "./popular-coaches.css";

export function PopularCoaches() {
  const t = useTranslations("Coaches");
  const locale = useLocale();
  const sections = useTranslations("DiscoverySections");
  // Use the existing illustrative profiles and their valid detail routes.
  const coaches = getCoaches(locale, "atlas");
  return (
    <section className="popular-coaches" aria-label={t("popular")}>
      <Carousel
        opts={{
          align: "start",
          containScroll: "trimSnaps",
          direction: locale === "fa" ? "rtl" : "ltr",
        }}
        aria-label={t("popular")}
      >
        <div className="popular-coaches-heading">
          <div>
            <h2>{t("popular")}</h2>
            <p>{t("sample")}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost">
              <Link
                href={
                  process.env.NEXT_PUBLIC_NATIVE_EXPORT === "true"
                    ? "/coaches"
                    : "/discovery/coaches"
                }
              >
                {sections("seeAll")}
              </Link>
            </Button>
            <CarouselPrevious
              className="static m-0"
              size="icon-lg"
              aria-label={t("previous")}
            />
            <CarouselNext
              className="static m-0"
              size="icon-lg"
              aria-label={t("next")}
            />
          </div>
        </div>
        <CarouselContent className="popular-coaches-track">
          {coaches.map((coach) => (
            <CarouselItem
              key={coach.id}
              className="popular-coaches-slide"
              aria-label={coach.name}
            >
              <CoachCard
                variant="portrait"
                coach={coach}
                locale={locale}
                href={coachHref(coach.id)}
                className="max-w-none"
                labels={{
                  new: t("new"),
                  save: t("save"),
                  unsave: t("unsave"),
                  certified: t("certified"),
                  experience: t("experience"),
                  rating: t("rating"),
                }}
              />
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>
    </section>
  );
}
