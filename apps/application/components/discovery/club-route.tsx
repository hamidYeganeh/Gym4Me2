"use client";
import { useSearchParams } from "next/navigation";
import { ClubPage } from "./club-page";
import { ClubGallery } from "./club-gallery";
import { ClubReviews } from "./club-reviews";
import { CatalogState } from "./catalog-state";
import { ServicesPage } from "../luma/services";
import { clubHref } from "../../lib/club-href";
export function ClubRoute() {
  const params = useSearchParams();
  const id = params.get("id");
  if (!id) return <CatalogState missing />;
  if (params.get("view") === "slots") {
    const branch = params.get("branch");
    return (
      <ServicesPage
        organizationId={id}
        branchId={branch ?? undefined}
        back={clubHref(id, undefined, branch ? { branch } : undefined)}
      />
    );
  }
  if (params.get("view") === "gallery")
    return <ClubGallery key={id} clubId={id} />;
  if (params.get("view") === "reviews")
    return <ClubReviews key={id} clubId={id} full />;
  return <ClubPage key={id} clubId={id} />;
}
