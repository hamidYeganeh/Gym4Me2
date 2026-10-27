import { Suspense } from "react";
import { LocationRoute } from "../../../components/discovery/location-page";
import { PageLoading } from "../../../components/luma/page-loading";

export default function Page() {
  return (
    <Suspense fallback={<PageLoading />}>
      <LocationRoute />
    </Suspense>
  );
}
