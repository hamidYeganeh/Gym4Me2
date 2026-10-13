"use client";
import { useSearchParams } from "next/navigation";
import { ClubPage } from "./club-page";
import { ClubGallery } from "./club-gallery";
import { ClubReviews } from "./club-reviews";
import { CatalogState } from "./catalog-state";
import { useTranslations } from "@repo/i18n";
import { MobilePage } from "@repo/ui/mobile-page";
import { clubHref } from "../../lib/club-href";
export function ClubRoute() {
  const t = useTranslations("Catalog");
  const params = useSearchParams();
  const id = params.get("id");
  if (!id) return <CatalogState missing />;
  if (params.get("view") === "slots") {
    const branch = params.get("branch");
    return (
      <MobilePage
        title={t("noBooking")}
        backHref={clubHref(id, undefined, branch ? { branch } : undefined)}
      >
        <p className="text-muted-foreground">{t("noBooking")}</p>
      </MobilePage>
    );
  }
  if (params.get("view") === "gallery")
    return <ClubGallery key={id} clubId={id} />;
  if (params.get("view") === "reviews")
    return <ClubReviews key={id} clubId={id} full />;
  return <ClubPage key={id} clubId={id} />;
}
