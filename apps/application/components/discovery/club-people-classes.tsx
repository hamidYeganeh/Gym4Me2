"use client";
import { FitnessIllustration } from "@repo/ui/kit/FitnessIllustration";
import Link from "next/link";
import type { BranchProfileDto } from "@repo/api/catalog";
import { useSportsQuery, type ServiceDto } from "@repo/api/sports";
import { useLocale, useTranslations } from "@repo/i18n";
import { Button } from "@repo/ui/kit/Button";
import { Carousel, CarouselContent, CarouselItem } from "@repo/ui/kit/Carousel";
import { CoachCard } from "@repo/ui/kit/CoachCard";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyDescription,
} from "@repo/ui/kit/Empty";
import { Calendar1Icon } from "@repo/ui/icons";
import { ServiceCoverThumbnail } from "@repo/ui/sports-cover";
import { clubClassPath } from "../../lib/club-class-route";
import { CatalogState } from "./catalog-state";

export function ClubCoaches({ branch }: { branch?: BranchProfileDto }) {
  const locale = useLocale();
  const t = useTranslations("Coaches");
  const copy = useTranslations("ClubCollections");
  const coaches = branch?.coaches ?? [];
  return (
    <section className="flex min-w-0 flex-col gap-4">
      <h2 className="text-2xl font-semibold">{t("title")}</h2>
      {coaches.length ? (
        <Carousel
          opts={{ align: "start", direction: locale === "fa" ? "rtl" : "ltr" }}
          aria-label={t("title")}
        >
          <CarouselContent>
            {coaches.map((coach) => (
              <CarouselItem key={coach.id} className="basis-[82%] sm:basis-1/2">
                <CoachCard
                  variant="default"
                  locale={locale}
                  className="max-w-none"
                  coach={{
                    id: coach.id,
                    name: coach.displayName ?? t("fallbackName"),
                    specialty:
                      branch?.sports.find((sport) => sport.id === coach.sportId)
                        ?.name ??
                      "",
                    certified: false,
                    yearsOfExperience: 0,
                  }}
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
      ) : (
        <Empty>
          <EmptyHeader>
            <FitnessIllustration kind="coach" />
            <EmptyDescription>{copy("noCoaches")}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}
    </section>
  );
}
export function ClubClassesPreview({
  clubId,
  slug,
}: {
  clubId: string;
  slug: string;
}) {
  const locale = useLocale();
  const t = useTranslations("ClubCollections");
  const query = useSportsQuery<ServiceDto[]>("sports/services", {
    organizationId: clubId,
    kind: "class",
  });
  const classes = (query.data ?? []).filter(
    (item) => item.organizationId === clubId && item.kind === "class",
  );
  const listHref = clubClassPath(
    process.env.NEXT_PUBLIC_NATIVE_EXPORT === "true" ? clubId : slug,
  );
  return (
    <section className="flex min-w-0 flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-2xl font-semibold">{t("classes")}</h2>
        <Button asChild variant="ghost">
          <Link href={listHref}>{t("seeAll")}</Link>
        </Button>
      </div>
      {query.isPending ? (
        <CatalogState loading />
      ) : query.isError ? (
        <CatalogState retry={() => void query.refetch()} />
      ) : classes.length ? (
        <Carousel
          opts={{ align: "start", direction: locale === "fa" ? "rtl" : "ltr" }}
          aria-label={t("classes")}
        >
          <CarouselContent>
            {classes.slice(0, 6).map((item) => (
              <CarouselItem key={item.id} className="basis-[82%] sm:basis-1/2">
                <Link
                  data-zoom-exit-key={
                    item.publicId ? `class-${item.id}` : undefined
                  }
                  scroll={false}
                  href={
                    item.publicId
                      ? clubClassPath(slug, item.publicId)
                      : listHref
                  }
                  className="flex h-full flex-col gap-3 rounded-3xl bg-card p-4 text-card-foreground focus-visible:outline-2 focus-visible:outline-ring"
                >
                  <div className="grid aspect-[4/3] place-items-center overflow-hidden rounded-2xl bg-muted [&_img]:size-full [&_img]:object-cover">
                    <ServiceCoverThumbnail cover={item.cover} />
                  </div>
                  <h3 className="text-lg font-semibold">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {[item.coachName, item.sportName]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </Link>
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>
      ) : (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Calendar1Icon />
            </EmptyMedia>
            <EmptyDescription>{t("noClasses")}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}
    </section>
  );
}
