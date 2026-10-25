"use client";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { clubHref } from "../../lib/club-href";
import { ClubFeaturedCard } from "@repo/ui/kit/ClubFeaturedCard";
import { CategoryCarousel } from "./category-carousel";
import { Carousel, CarouselContent, CarouselItem } from "@repo/ui/kit/Carousel";
import { ClubShareSheet } from "./club-share-sheet";
import { ClubGalleryPreview } from "./club-gallery-preview";
import { ClubSocialShare } from "./club-social-share";
import { ClubAvailability } from "./club-availability";
import { ClubReviews } from "./club-reviews";
import { useLocale, useTranslations } from "@repo/i18n";
import { ClubDetail } from "@repo/ui/kit/ClubDetail";
import { toast } from "@repo/ui/kit/Sileo";
import { useCatalogClub, useCatalogClubs } from "./use-catalog";
import { CatalogState } from "./catalog-state";
import { ToggleGroup, ToggleGroupItem } from "@repo/ui/kit/ToggleGroup";
import { useClubUrl } from "./use-club-url";
import { useSavedClub } from "./use-saved-club";
import { ClubTariffs } from "./club-tariffs";

export function ClubPage({ clubId }: { clubId: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const query = useCatalogClub(clubId, params.get("branch") ?? undefined);
  if (!query.club)
    return (
      <CatalogState
        loading={query.isPending}
        missing={query.error?.status === 404}
        retry={query.isError ? () => void query.refetch() : undefined}
      />
    );
  return (
    <ClubContent
      club={query.club}
      branches={query.data?.branches ?? []}
      branch={query.branch}
      branchLoading={query.branchQuery.isPending}
      branchError={query.branchQuery.isError}
      retryBranch={() => void query.branchQuery.refetch()}
      onBranchChange={(branch) =>
        router.replace(clubHref(clubId, undefined, { branch }), {
          scroll: false,
        })
      }
      tariffs={query.data?.tariffs ?? []}
    />
  );
}
function ClubContent({
  club,
  branches,
  branch,
  branchLoading,
  branchError,
  retryBranch,
  onBranchChange,
  tariffs,
}: {
  club: import("@repo/ui/kit/ClubDetail").ClubDetailData;
  branches: import("@repo/api/catalog").ClubDto["branches"];
  branch: import("@repo/api/catalog").BranchProfileDto | undefined;
  branchLoading: boolean;
  branchError: boolean;
  retryBranch: () => void;
  onBranchChange: (id: string) => void;
  tariffs: import("@repo/api/catalog").TariffDto[];
}) {
  const router = useRouter();
  const clubId = club.id;
  const [shareOpen, setShareOpen] = useState(false);
  const locale = useLocale();
  const t = useTranslations("Clubs");
  const recommendations = useCatalogClubs()
    .clubs.filter((item) => item.id !== clubId)
    .sort(
      (a, b) =>
        Number(b.category === club.category) -
        Number(a.category === club.category),
    );
  const [saved, setSaved] = useSavedClub(clubId);
  const url = useClubUrl(clubId, branch?.id);
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
        club={club}
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
        categories={<CategoryCarousel locale={locale} />}
        branches={
          branches.length ? (
            <section className="flex min-w-0 flex-col gap-4">
              <h2 className="text-2xl font-semibold">{t("branches")}</h2>
              <ToggleGroup
                type="single"
                value={branch?.id ?? ""}
                onValueChange={(id) => {
                  if (id) onBranchChange(id);
                }}
                className="flex flex-wrap justify-start"
              >
                {branches.map((item) => (
                  <ToggleGroupItem key={item.id} value={item.id}>
                    {item.name}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </section>
          ) : undefined
        }
        galleryPreview={
          <ClubGalleryPreview
            clubId={clubId}
            branchId={branch?.id}
            photos={club.photos}
          />
        }
        socialShare={
          <ClubSocialShare clubId={clubId} onShare={() => setShareOpen(true)} />
        }
        availability={
          <>
            <ClubTariffs
              tariffs={tariffs.filter(
                (tariff) =>
                  tariff.branchId === null || tariff.branchId === branch?.id,
              )}
            />
            {branchLoading ? (
              <CatalogState loading />
            ) : branchError ? (
              <CatalogState retry={retryBranch} />
            ) : (
              <ClubAvailability branch={branch} />
            )}
          </>
        }
        reviews={<ClubReviews clubId={clubId} branchId={branch?.id} />}
        coaches={
          branch?.coaches.length ? (
            <section className="flex flex-col gap-4">
              <h2 className="text-2xl font-semibold">{t("coachCount")}</h2>
              {branch.coaches.map((coach) => (
                <article
                  key={coach.id}
                  className="rounded-2xl border border-border p-4"
                >
                  <p className="font-semibold">{coach.displayName}</p>
                  {coach.biography && (
                    <p className="mt-2 text-sm text-muted-foreground">
                      {coach.biography}
                    </p>
                  )}
                </article>
              ))}
            </section>
          ) : undefined
        }
        saved={saved}
        onSavedChange={setSaved}
        onShare={() => setShareOpen(true)}
        onPlanVisit={
          branch
            ? () =>
                router.push(clubHref(clubId, "slots", { branch: branch.id }))
            : undefined
        }
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
        branchId={branch?.id}
        open={shareOpen}
        onOpenChange={setShareOpen}
        onShare={() => void share()}
        saved={saved}
        onSavedChange={setSaved}
      />
    </>
  );
}
