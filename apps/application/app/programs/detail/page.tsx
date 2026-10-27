import { Suspense } from "react";
import { PageLoading } from "../../../components/luma/page-loading";
import { PreviousProgramDetail } from "../../../components/luma/previous-program";
export default function Page() {
  return (
    <Suspense fallback={<PageLoading />}>
      <PreviousProgramDetail />
    </Suspense>
  );
}
