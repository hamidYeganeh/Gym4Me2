import { Suspense } from "react";
import { CoachingWorkspace } from "@repo/ui/account";
import { PageLoading } from "../../components/luma/page-loading";

export default function Page() {
  return (
    <Suspense fallback={<PageLoading />}>
      <CoachingWorkspace />
    </Suspense>
  );
}
