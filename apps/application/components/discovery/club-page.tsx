"use client";
import { ClubCoaches, ClubClassesPreview } from "./club-people-classes";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { clubHref } from "../../lib/club-href";
import { ClubFeaturedCard } from "@repo/ui/kit/ClubFeaturedCard";
import { useSelectedBranch } from "./use-selected-branch";
import { ClubBranchCard } from "@repo/ui/kit/ClubBranchCard";
import { Carousel, CarouselContent, CarouselItem } from "@repo/ui/kit/Carousel";
import { ClubShareSheet } from "./club-share-sheet";
import { ClubGalleryPreview } from "./club-gallery-preview";
import { ClubSocialShare } from "./club-social-share";
import { ClubAvailability } from "./club-availability";
import { ClubFaq } from "@repo/ui/kit/ClubFaq";
import { ClubReviews } from "./club-reviews";
import { useLocale, useTranslations } from "@repo/i18n";
import { ClubDetail } from "@repo/ui/kit/ClubDetail";
import { toast } from "@repo/ui/kit/Sileo";
import { useCatalogClub, useCatalogClubs } from "./use-catalog";
import { CatalogState } from "./catalog-state";

import { useClubUrl } from "./use-club-url";
import { useSavedClub } from "./use-saved-club";
import { ClubTariffs } from "./club-tariffs";

export function ClubPage({ clubId, initialClub, initialBranch }: { clubId: string; initialClub?: import("@repo/api/catalog").ClubDto; initialBranch?: import("@repo/api/catalog").BranchProfileDto }) {
  const [selectedBranch, setSelectedBranch] = useSelectedBranch(clubId);
  const query = useCatalogClub(clubId, selectedBranch, initialClub, initialBranch);
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
      onBranchChange={setSelectedBranch}
      active={query.data?.operatingStatus === "active"}
      faq={query.data?.faq ?? []}
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
  faq,
  active,
}: {
  club: import("@repo/ui/kit/ClubDetail").ClubDetailData;
  branches: import("@repo/api/catalog").ClubDto["branches"];
  branch: import("@repo/api/catalog").BranchProfileDto | undefined;
  branchLoading: boolean;
  branchError: boolean;
  retryBranch: () => void;
  onBranchChange: (id: string) => void;
  active: boolean;
  faq: import("@repo/api/catalog").ClubFaqDto[];
  tariffs: import("@repo/api/catalog").TariffDto[];
}) {
  const router = useRouter();
  const clubId = club.slug ?? club.id;
  const [shareOpen, setShareOpen] = useState(false);
  const locale = useLocale();
  const t = useTranslations("Clubs");
  const recommendations = useCatalogClubs()
    .clubs.filter((item) => item.id !== club.id)
    .sort(
      (a, b) =>
        Number(b.category === club.category) -
        Number(a.category === club.category),
    );
  const [saved, setSaved] = useSavedClub(club.id);
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
        branches={
          branches.length ? (
            <section className="flex min-w-0 flex-col gap-4">
              <h2 className="text-2xl font-semibold">{t("branches")}</h2>
              <div className="flex gap-3 overflow-x-auto pb-2">
                {branches.map((item) => (
                  <ClubBranchCard
                    key={item.id}
                    branch={{
                      id: item.id,
                      name: item.name,
                      address:
                        item.id === branch?.id
                          ? (branch.location.address ?? "")
                          : "",
                      photo: club.photos[0]!,
                    }}
                    viewLabel={t("branches")}
                    selected={branch?.id === item.id}
                    onSelect={() => onBranchChange(item.id)}
                  />
                ))}
              </div>
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
            <ClubClassesPreview clubId={club.id} slug={clubId} />
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
        faq={<ClubFaq items={faq} />}
        reviews={<ClubReviews clubId={clubId} branchId={branch?.id} />}
        coaches={
          branchLoading ? (
            <CatalogState loading />
          ) : branchError ? (
            <CatalogState retry={retryBranch} />
          ) : (
            <ClubCoaches branch={branch} />
          )
        }
        saved={saved}
        onSavedChange={setSaved}
        onShare={() => setShareOpen(true)}
        onPlanVisit={
          branch && active && branch.operatingStatus === "active"
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
