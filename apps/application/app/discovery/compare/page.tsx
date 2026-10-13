import { Suspense } from "react";
import { ClubComparison } from "../../../components/discovery/club-comparison";
import { CatalogState } from "../../../components/discovery/catalog-state";
export default function Page() { return <Suspense fallback={<CatalogState loading />}><ClubComparison /></Suspense>; }
