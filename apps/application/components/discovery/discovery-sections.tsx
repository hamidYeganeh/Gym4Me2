"use client";
import Image from "next/image";
import Link from "next/link";
import { useLocale, useTranslations } from "@repo/i18n";
import { useSportsQuery, type ServiceDto } from "@repo/api/sports";
import { usePracticeQuery, type CoachDirectoryDto } from "@repo/api/profile";
import type { ReactNode } from "react";
import { useApiContext } from "@repo/api/provider";
import { CoachCard } from "@repo/ui/kit/CoachCard";
import { ClassCard } from "@repo/ui/kit/ClassCard";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
} from "@repo/ui/kit/Carousel";
import { Section, amount, QueryState } from "../luma/common";
import { useSavedCoach } from "./use-saved-coach";
import { useCatalogClub } from "./use-catalog";
import type { ClubDetailData } from "@repo/ui/kit/ClubDetail";

export function ClubGallerySection({ club }: { club: ClubDetailData }) {
  const query = useCatalogClub(club.id);
  const data = query.club ?? club;
  const t = useTranslations("Clubs");
  return (
    <section
      className="discovery-gallery"
      aria-label={`${t("gallery")} · ${club.name}`}
    >
      <div className="discovery-gallery-photos">
        {data.photos.map((photo, index) => (
          <Link
            key={`${photo.src}-${index}`}
            href={club.href ?? `/discovery/clubs/${club.id}`}
            className={index === 0 ? "gallery-cover" : "gallery-photo"}
            aria-label={`${club.name} · ${t("photo")} ${index + 1}`}
          >
            <Image
              src={photo.src}
              alt={photo.alt}
              fill
              sizes={index === 0 ? "320px" : "160px"}
              unoptimized
              className="object-cover"
            />
          </Link>
        ))}
      </div>
      <Link
        className="discovery-gallery-summary"
        href={club.href ?? `/discovery/clubs/${club.id}`}
      >
        <div className="relative size-14 shrink-0 overflow-hidden rounded-2xl">
          <Image
            src={data.logo ?? data.photos[0].src}
            alt=""
            fill
            sizes="56px"
            unoptimized
            className="object-cover"
          />
        </div>
        <div>
          <h2>{club.name}</h2>
          <p>{club.address}</p>
          <p>{club.category}</p>
        </div>
      </Link>
    </section>
  );
}

function CardCarousel({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  const locale = useLocale();
  return (
    <Carousel
      aria-label={title}
      className="discovery-card-carousel"
      opts={{ direction: locale === "fa" ? "rtl" : "ltr", align: "start" }}
    >
      <div className="mb-3 flex justify-end gap-2">
        <CarouselPrevious className="static! size-9! min-h-9! translate-none!" />
        <CarouselNext className="static! size-9! min-h-9! translate-none!" />
      </div>
      <CarouselContent>{children}</CarouselContent>
    </Carousel>
  );
}

export function DiscoveryClasses() {
  const locale = useLocale();
  const t = useTranslations("Website.classes.fitness");
  const luma = useTranslations("Luma");
  const { api } = useApiContext();
  const query = useSportsQuery<ServiceDto[]>("sports/services", {
    kind: "class",
  });
  const title = locale === "fa" ? "کلاس‌های ورزشی" : "Training classes";
  return (
    <Section title={title} href="/services?kind=class">
      <QueryState query={query}>
        <CardCarousel title={title}>
          {query.data?.slice(0, 4).map((service) => {
            const occurrence = service.occurrences?.[0];
            const minutes = occurrence
              ? (Date.parse(occurrence.endAt) -
                  Date.parse(occurrence.startAt)) /
                60000
              : undefined;
            return (
              <CarouselItem key={service.id} className="basis-full!">
                <ClassCard
                  locale={locale}
                  href={`/services/detail?id=${service.id}`}
                  labels={{
                    save: t("save"),
                    unsave: t("unsave"),
                    calories: t("calories"),
                    minutes: t("minutes"),
                    score: t("score"),
                  }}
                  classItem={{
                    id: service.id,
                    title: service.title,
                    level: service.level,
                    coachName: [service.coachName, service.clubName]
                      .filter(Boolean)
                      .join(" · "),
                    minutes:
                      minutes !== undefined &&
                      Number.isFinite(minutes) &&
                      minutes > 0
                        ? Math.round(minutes)
                        : undefined,
                    priceLabel:
                      service.amountMinor === "0"
                        ? luma("free")
                        : `${amount(service.amountMinor, locale)} ${luma("toman")}`,
                    photo: service.cover
                      ? {
                          src: `${api.scope[1]}/sports/media/${encodeURIComponent(service.cover.id)}`,
                          alt: service.cover.alt ?? service.title,
                        }
                      : undefined,
                  }}
                />
              </CarouselItem>
            );
          })}
        </CardCarousel>
      </QueryState>
    </Section>
  );
}

function DiscoveryCoach({ coach }: { coach: CoachDirectoryDto }) {
  const locale = useLocale();
  const t = useTranslations("Coaches");
  const [saved, setSaved] = useSavedCoach(coach.userId);
  return (
    <CoachCard
      badgeLabel={coach.city}
      locale={locale}
      saved={saved}
      onSavedChange={setSaved}
      href={`/coaches/detail?id=${coach.userId}`}
      labels={{
        new: t("new"),
        save: t("save"),
        unsave: t("unsave"),
        certified: t("certified"),
        experience: t("experience"),
        rating: t("rating"),
      }}
      coach={{
        id: coach.userId,
        name: coach.displayName ?? (locale === "fa" ? "مربی" : "Coach"),
        specialty: coach.specialties.filter(Boolean).join(" · "),
        certified: false,
        yearsOfExperience: coach.experienceYears,
      }}
    />
  );
}

export function DiscoveryCoaches() {
  const t = useTranslations("Coaches");
  const query = usePracticeQuery<{
    items: CoachDirectoryDto[];
    hasMore: boolean;
  }>("coaching/directory", { page: 1 });
  return (
    <Section title={t("title")} href="/coaches">
      <QueryState query={query}>
        <CardCarousel title={t("title")}>
          {query.data?.items.slice(0, 4).map((coach) => (
            <CarouselItem key={coach.userId} className="basis-full!">
              <DiscoveryCoach coach={coach} />
            </CarouselItem>
          ))}
        </CardCarousel>
      </QueryState>
    </Section>
  );
}
