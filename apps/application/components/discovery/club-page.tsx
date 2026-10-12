"use client";
import { useState } from "react";
import { ClubFeaturedCard } from "@repo/ui/kit/ClubFeaturedCard";
import { CategoryCarousel } from "./category-carousel";
import { ClubBranchCard } from "@repo/ui/kit/ClubBranchCard";
import { Carousel, CarouselContent, CarouselItem } from "@repo/ui/kit/Carousel";
import { ClubShareSheet } from "./club-share-sheet";
import { ClubGalleryPreview } from "./club-gallery-preview";
import { ClubSocialShare } from "./club-social-share";
import { ClubAvailability } from "./club-availability";
import { ClubReviews } from "./club-reviews";
import { getReviews } from "../../lib/reviews";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "@repo/i18n";
import { ClubDetail } from "@repo/ui/kit/ClubDetail";
import { toast } from "@repo/ui/kit/Sonner";
import { getClubs } from "../../lib/clubs";
import { useClubUrl } from "./use-club-url";
import { useSavedClub } from "./use-saved-club";
import { CoachesCarousel } from "./coaches-carousel";

export function ClubPage({ clubId }: { clubId: string }) {
  const [shareOpen, setShareOpen] = useState(false);
  const locale = useLocale();
  const router = useRouter();
  const t = useTranslations("Clubs");
  const club = getClubs(locale).find((item) => item.id === clubId)!;
  const recommendations = getClubs(locale)
    .filter((item) => item.id !== clubId)
    .sort(
      (a, b) =>
        Number(b.category === club.category) -
        Number(a.category === club.category),
    );
  const reviews = getReviews(locale, clubId);
  const average =
    reviews.reduce((sum, review) => sum + review.rating, 0) /
    (reviews.length || 1);
  const [saved, setSaved] = useSavedClub(clubId);
  const url = useClubUrl(clubId);
  async function share() {
    if (!url) {
      toast.info(t("shareUnavailable"));
      return;
    }
    try {
      if (navigator.share) await navigator.share({ title: club.name, url });
      else {
        await navigator.clipboard.writeText(url);
        toast.success(t("copied"));
      }
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError"))
        toast.error(t("shareFailed"));
    }
  }
  return (
    <>
      <ClubDetail
        club={{
          ...club,
          reviews: new Intl.NumberFormat(locale).format(reviews.length),
          rating: new Intl.NumberFormat(locale, {
            maximumFractionDigits: 1,
          }).format(average),
        }}
        recommendations={
          <section className="flex min-w-0 flex-col gap-4">
            <h2 className="text-2xl font-semibold">{t("recommended")}</h2>
            <Carousel
              opts={{
                align: "start",
                direction: locale === "fa" ? "rtl" : "ltr",
              }}
              aria-label={t("recommended")}
            >
              <CarouselContent>
                {recommendations.slice(0, 4).map((item) => (
                  <CarouselItem key={item.id} className="basis-[90%]">
                    <ClubFeaturedCard club={item} viewLabel={t("discover")} />
                  </CarouselItem>
                ))}
              </CarouselContent>
            </Carousel>
          </section>
        }
        categories={<CategoryCarousel locale={locale} clubId={clubId} />}
        branches={
          club.branches?.length ? (
            <section className="flex min-w-0 flex-col gap-4">
              <h2 className="text-2xl font-semibold">{t("branches")}</h2>
              <Carousel
                opts={{
                  align: "start",
                  direction: locale === "fa" ? "rtl" : "ltr",
                }}
                aria-label={t("branches")}
              >
                <CarouselContent>
                  {club.branches.map((branch) => (
                    <CarouselItem key={branch.id} className="basis-auto">
                      <ClubBranchCard
                        branch={branch}
                        viewLabel={t("viewLocation")}
                      />
                    </CarouselItem>
                  ))}
                </CarouselContent>
              </Carousel>
            </section>
          ) : undefined
        }
        galleryPreview={<ClubGalleryPreview clubId={clubId} />}
        socialShare={
          <ClubSocialShare clubId={clubId} onShare={() => setShareOpen(true)} />
        }
        availability={<ClubAvailability clubId={clubId} />}
        reviews={<ClubReviews clubId={clubId} />}
        coaches={<CoachesCarousel key={clubId} clubId={clubId} />}
        saved={saved}
        onSavedChange={setSaved}
        onShare={() => setShareOpen(true)}
        onPlanVisit={() => router.push(`/discovery/clubs/${clubId}/slots`)}
        labels={{
          back: t("back"),
          save: t("save"),
          unsave: t("unsave"),
          share: t("share"),
          photo: t("photo"),
          about: t("about"),
          amenities: t("amenities"),
          hours: t("hours"),
          distance: t("distance"),
          distanceUnavailable: t("distanceUnavailable"),
          coachCount: t("coachCount"),
          reviews: t("reviews"),
          visit: t("visit"),
          perVisit: t("perVisit"),
          gallery: t("gallery"),
          seeMore: t("seeMore"),
          seeLess: t("seeLess"),
        }}
      />
      <ClubShareSheet
        club={club}
        open={shareOpen}
        onOpenChange={setShareOpen}
        onShare={() => void share()}
        saved={saved}
        onSavedChange={setSaved}
      />
    </>
  );
}
