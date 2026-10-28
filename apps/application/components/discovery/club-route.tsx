"use client";
import { useSearchParams } from "next/navigation";
import { ClubPage } from "./club-page";
import { ClubGallery } from "./club-gallery";
import { ClubReviews } from "./club-reviews";
import { CatalogState } from "./catalog-state";
import { ClubReservation } from "./club-reservation";

export function ClubRoute() {
  const params = useSearchParams();
  const id = params.get("id");
  if (!id) return <CatalogState missing />;
  if (params.get("view") === "slots") return <ClubReservation clubId={id} />;
  if (params.get("view") === "gallery")
    return <ClubGallery key={id} clubId={id} />;
  if (params.get("view") === "reviews")
    return <ClubReviews key={id} clubId={id} full />;
  return <ClubPage key={id} clubId={id} />;
}
