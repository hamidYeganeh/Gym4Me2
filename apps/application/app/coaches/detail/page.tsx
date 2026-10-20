import { Suspense } from "react";
import { CoachingDirectory } from "@repo/ui/account";
import { PageLoading } from "../../../components/luma/page-loading";
export default function Page() {
  return (
    <Suspense fallback={<PageLoading />}>
      <CoachingDirectory detail />
    </Suspense>
  );
}
