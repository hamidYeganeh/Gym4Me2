import { Suspense } from "react";
import { CoachingSessionNote } from "@repo/ui/account";
import { PageLoading } from "../../../components/luma/page-loading";
export default function Page() {
  return (
    <Suspense fallback={<PageLoading />}>
      <CoachingSessionNote />
    </Suspense>
  );
}
