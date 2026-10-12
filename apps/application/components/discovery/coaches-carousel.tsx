"use client";
import { useSavedCoach } from "./use-saved-coach";
import type { CoachSummary } from "@repo/ui/kit/CoachCard";
import { useLocale, useTranslations } from "@repo/i18n";
import { CoachCard } from "@repo/ui/kit/CoachCard";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@repo/ui/kit/Carousel";
import { getCoaches } from "../../lib/coaches";

function LinkedCoach({ coach }: { coach: CoachSummary }) {
  const locale = useLocale();
  const t = useTranslations("Coaches");
  const [saved, setSaved] = useSavedCoach(coach.id);
  return (
    <CoachCard
      coach={coach}
      href={`/discovery/coaches/${coach.id}`}
      locale={locale}
      saved={saved}
      onSavedChange={setSaved}
      labels={{
        new: t("new"),
        save: t("save"),
        unsave: t("unsave"),
        certified: t("certified"),
        experience: t("experience"),
        rating: t("rating"),
      }}
    />
  );
}
export function CoachesCarousel({ clubId }: { clubId: string }) {
  const locale = useLocale();
  const t = useTranslations("Coaches");
  return (
    <section aria-label={t("title")} className="flex min-w-0 flex-col gap-3">
      <Carousel
        opts={{ align: "start", direction: locale === "fa" ? "rtl" : "ltr" }}
        aria-label={t("title")}
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-2xl font-semibold tracking-tight">
            {t("title")}
          </h2>
          <div className="flex shrink-0 gap-2">
            <CarouselPrevious
              size="icon-lg"
              className="static m-0"
              aria-label={t("previous")}
            />
            <CarouselNext
              size="icon-lg"
              className="static m-0"
              aria-label={t("next")}
            />
          </div>
        </div>
        <CarouselContent>
          {getCoaches(locale, clubId).map((coach) => (
            <CarouselItem
              key={coach.id}
              className="basis-[85%] min-[480px]:basis-2/3"
              aria-label={coach.name}
            >
              <LinkedCoach coach={coach} />
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>
    </section>
  );
}
