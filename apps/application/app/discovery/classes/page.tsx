import { Suspense } from "react";
import { ServicesPage } from "../../../components/luma/services";
import { PageLoading } from "../../../components/luma/page-loading";
export default function Page() {
  return (
    <Suspense fallback={<PageLoading />}>
      <ServicesPage fixedKind="class" />
    </Suspense>
  );
}
