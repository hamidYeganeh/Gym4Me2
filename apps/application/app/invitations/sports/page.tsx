import { PageLoading } from "../../../components/luma/page-loading";
import { Suspense } from "react";
import { SportsInvitations } from "../../../components/luma/community";
export default function Page() {
  return (
    <Suspense fallback={<PageLoading />}>
      <SportsInvitations />
    </Suspense>
  );
}
