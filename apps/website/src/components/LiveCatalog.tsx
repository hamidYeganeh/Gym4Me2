"use client";
import { useLocale, useTranslations } from "@repo/i18n";
import { useClubs, type ClubSummaryDto } from "@repo/api/catalog";
import { useGrowthQuery } from "@repo/api/growth";
import { Button } from "@repo/ui/kit/Button";
import { LandingClubsSection } from "./LandingClubsSection";
import type { LandingClub } from "./LandingClubsSection/LandingClubsSection.types";
const appOrigin =
  process.env.NEXT_PUBLIC_APPLICATION_ORIGIN ||
  "https://gym4me-demo-application.vercel.app";
type LiveSession = {
  id: string;
  service_id: string;
  title: string;
  branch_name: string;
  start_at: string;
  end_at: string;
  remaining: number;
  amount_minor: string;
};
export function LiveCatalog() {
  const locale = useLocale(),
    t = useTranslations("Growth"),
    clubs = useClubs(),
    sessions = useGrowthQuery<{ items: LiveSession[] }>(
      "sports/recommendations",
    );
  const number = new Intl.NumberFormat(locale);
  const cards: LandingClub[] = (clubs.data ?? []).map((c: ClubSummaryDto) => {
    const image = c.cover?.url || "/images/club-placeholder.svg",
      href = new URL(`/discovery/club?id=${c.id}`, appOrigin).href,
      category = c.categories.map((x) => x.name).join(" · "),
      address = [
        c.mainBranch.cityName,
        c.mainBranch.districtName,
        c.mainBranch.address,
      ]
        .filter(Boolean)
        .join(" · ");
    return {
      id: c.id,
      title: c.name,
      titleLines: [c.name],
      region: category,
      description: c.shortDescription ?? "",
      coordinates: address,
      image,
      thumbnail: image,
      href,
      club: {
        id: c.id,
        href,
        name: c.name,
        category,
        address,
        price: c.startingTariff
          ? number.format(c.startingTariff.priceToman)
          : t("notAnnounced"),
        pricePeriod: c.startingTariff?.unit ?? "",
        rating:
          c.rating.average === null
            ? t("notAnnounced")
            : number.format(c.rating.average),
        reviews: number.format(c.rating.count),
        photos: [{ src: image, alt: c.cover?.alt ?? c.name }],
        facilities: ["", "", ""],
      },
    };
  });
  return (
    <>
      {cards.length ? (
        <LandingClubsSection
          key={locale + cards.map((c) => c.id).join(",")}
          items={cards}
        />
      ) : (
        <section
          id="clubs"
          className="mx-auto grid min-h-[60vh] max-w-5xl content-center gap-5 px-6 py-20"
        >
          <h2 className="text-4xl font-semibold">{t("brand")}</h2>
          <p className="text-xl">{t("liveCatalogIntro")}</p>
          <p role={clubs.error ? "alert" : "status"}>
            {clubs.error
              ? t("catalogUnavailable")
              : clubs.isLoading
                ? t("catalogLoading")
                : t("catalogEmpty")}
          </p>
          {clubs.error && (
            <Button variant="outline" onClick={() => void clubs.refetch()}>
              {t("retry")}
            </Button>
          )}
          <Button asChild>
            <a href={appOrigin}>{t("openApp")}</a>
          </Button>
        </section>
      )}
      <section id="classes" className="mx-auto grid max-w-6xl gap-6 px-6 py-16">
        <header>
          <h2 className="text-3xl font-semibold">{t("liveClasses")}</h2>
          <p className="mt-3 text-muted-foreground">{t("liveClassesHint")}</p>
        </header>
        {sessions.error ? (
          <div role="alert">
            <p>{t("catalogUnavailable")}</p>
            <Button variant="outline" onClick={() => void sessions.refetch()}>
              {t("retry")}
            </Button>
          </div>
        ) : sessions.isLoading ? (
          <p role="status">{t("catalogLoading")}</p>
        ) : !sessions.data?.items.length ? (
          <p>{t("noRecommendations")}</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {sessions.data.items.slice(0, 9).map((s) => (
              <article
                className="grid gap-3 rounded-2xl border bg-card p-5"
                key={s.id}
              >
                <h3 className="text-xl font-semibold">{s.title}</h3>
                <p>{s.branch_name}</p>
                <time dateTime={s.start_at}>
                  {new Intl.DateTimeFormat(locale === "fa" ? "fa-IR" : "en", {
                    dateStyle: "medium",
                    timeStyle: "short",
                    timeZone: "Asia/Tehran",
                  }).format(new Date(s.start_at))}
                </time>
                <p>
                  {number.format(Number(s.amount_minor) / 10)} {t("toman")}
                </p>
                <p>{t("remaining", { count: s.remaining })}</p>
                <Button asChild>
                  <a
                    href={
                      new URL(
                        `/checkout?service=${s.service_id}&occurrence=${s.id}`,
                        appOrigin,
                      ).href
                    }
                  >
                    {t("reserve")}
                  </a>
                </Button>
              </article>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
