import { PageLoading } from "../../components/luma/page-loading";
import { Suspense } from "react";
import { MembershipCardPage } from "../../components/luma/ticket";
export default function Page() {
  return (
    <Suspense fallback={<PageLoading />}>
      <MembershipCardPage />
    </Suspense>
  );
}
