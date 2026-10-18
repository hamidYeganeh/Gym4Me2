import { PageLoading } from "../../components/luma/page-loading";
import { Suspense } from "react";
import { ServicesPage } from "../../components/luma/services";
export default function Page() {
  return (
    <Suspense fallback={<PageLoading />}>
      <ServicesPage />
    </Suspense>
  );
}
