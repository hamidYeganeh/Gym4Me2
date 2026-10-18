import { PageLoading } from "../../../components/luma/page-loading";
import { Suspense } from "react";
import { ServiceDetail } from "../../../components/luma/services";
export default function Page() {
  return (
    <Suspense fallback={<PageLoading />}>
      <ServiceDetail />
    </Suspense>
  );
}
