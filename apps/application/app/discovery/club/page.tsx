import { Suspense } from "react";
import { ClubRoute } from "../../../components/discovery/club-route";
import { CatalogState } from "../../../components/discovery/catalog-state";
export default function Page() {
  return (
    <Suspense fallback={<CatalogState loading />}>
      <ClubRoute />
    </Suspense>
  );
}
