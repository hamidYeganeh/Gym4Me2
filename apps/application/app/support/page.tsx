import { PageLoading } from "../../components/luma/page-loading";
import { Suspense } from "react";
import { SupportPage } from "../../components/luma/community";
export default function Page() {
  return (
    <Suspense fallback={<PageLoading />}>
      <SupportPage />
    </Suspense>
  );
}
