"use client";
import { serviceHref } from "@repo/ui/lib/public-route";
import { useSportsQuery, type ServiceDto } from "@repo/api/sports";
import { useLocale, useTranslations } from "@repo/i18n";
import { ArrowUpRightIcon } from "@repo/ui/icons";
import { Button } from "@repo/ui/kit/Button";
import type { ClubDetailData } from "@repo/ui/kit/ClubDetail";
import { ClubFeaturedCard } from "@repo/ui/kit/ClubFeaturedCard";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { ServiceCoverThumbnail } from "@repo/ui/sports-cover";
import { getCoaches } from "../../lib/coaches";
import { ClubList } from "./club-list";
import { ClubShowcase } from "./club-showcase";
import { useCatalogClub } from "./use-catalog";

function LiveShowcase({ club }: { club: ClubDetailData }) {
  const detail = useCatalogClub(club.id);
  const locale = useLocale();
  const t = useTranslations("DiscoverySections");
  return (
    <ClubShowcase
      club={detail.club ?? club}
      locale={locale}
      viewLabel={t("viewClub")}
    />
  );
}
export function DiscoveryClubSections({ clubs }: { clubs: ClubDetailData[] }) {
  const t = useTranslations("DiscoverySections");
  const first = clubs[0];
  if (!first) return null;
  return (
    <div className="discovery-feed-group">
      <ClubFeaturedCard club={first} viewLabel={t("viewClub")} />
      <ClubList
        clubs={clubs.slice(0, 3)}
        title={t("clubs")}
        viewLabel={t("viewClub")}
        seeAllHref={process.env.NEXT_PUBLIC_NATIVE_EXPORT === "true" ? "/discovery" : "/discovery/clubs"}
        seeAllLabel={t("seeAll")}
      />
      <LiveShowcase club={clubs[1] ?? first} />
    </div>
  );
}
function StackList({
  title,
  href,
  items,
}: {
  title: string;
  href: string;
  items: {
    id: string;
    title: string;
    subtitle: string;
    href: string;
    photo?: { src: string; alt: string };
    thumbnail?: ReactNode;
    motionKey?: string;
  }[];
}) {
  const t = useTranslations("DiscoverySections");
  if (!items.length) return null;
  return (
    <section className="flex min-w-0 flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">{title}</h2>
        <Button asChild variant="ghost">
          <Link href={href}>{t("seeAll")}</Link>
        </Button>
      </div>
      <ul className="flex flex-col gap-4">
        {items.slice(0, 3).map((item) => (
          <li key={item.id}>
            <Link
              href={item.href}
              data-zoom-exit-key={item.motionKey}
              className="flex items-center gap-4 rounded-2xl focus-visible:outline-ring"
            >
              {item.thumbnail && (
                <span className="grid size-20 shrink-0 place-items-center overflow-hidden rounded-2xl bg-muted [&_img]:size-full [&_img]:object-cover">
                  {item.thumbnail}
                </span>
              )}
              {item.photo && (
                <span className="relative size-20 shrink-0 overflow-hidden rounded-2xl bg-muted">
                  <Image
                    src={item.photo.src}
                    alt={item.photo.alt}
                    fill
                    sizes="80px"
                    unoptimized
                    className="object-cover"
                  />
                </span>
              )}
              <span className="flex min-w-0 flex-1 flex-col gap-2">
                <strong>{item.title}</strong>
                <span className="text-xs text-muted-foreground">
                  {item.subtitle}
                </span>
              </span>
              <ArrowUpRightIcon />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
export function DiscoveryPeopleSections() {
  const locale = useLocale();
  const t = useTranslations("DiscoverySections");
  const coaches = getCoaches(locale, "atlas");
  const coach = coaches[0]!;
  const classes = useSportsQuery<ServiceDto[]>("sports/services", {
    kind: "class",
  });
  return (
    <div className="discovery-feed-group">
      <ClubShowcase
        club={{
          id: coach.id,
          name: coach.name,
          photos: coach.photos ?? [],
          category: coach.specialty,
          href: `/discovery/coaches/${coach.id}`,
        }}
        locale={locale}
        viewLabel={t("viewCoach")}
      />
      <StackList
        title={t("coaches")}
        href={process.env.NEXT_PUBLIC_NATIVE_EXPORT === "true" ? "/coaches" : "/discovery/coaches"}
        items={coaches.map((c) => ({
          id: c.id,
          motionKey: `coach-${c.id}`,
          title: c.name,
          subtitle: c.specialty,
          photo: c.photo,
          href: `/discovery/coaches/${c.id}`,
        }))}
      />
      <StackList
        title={t("classes")}
        href={process.env.NEXT_PUBLIC_NATIVE_EXPORT === "true" ? "/services?kind=class" : "/discovery/classes"}
        items={(classes.data ?? [])
          .filter((c) => c.kind === "class" && Boolean(c.publicId))
          .map((c) => ({
            id: c.id,
            motionKey: `class-${c.id}`,
            title: c.title,
            subtitle: [c.clubName, c.branchName].filter(Boolean).join(" · "),
            thumbnail: <ServiceCoverThumbnail cover={c.cover} />,
            href: serviceHref(c.publicId),
          }))}
      />
    </div>
  );
}
