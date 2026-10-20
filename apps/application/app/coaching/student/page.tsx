import { Suspense } from "react";
import { StudentAssessment } from "@repo/ui/account";
import { PageLoading } from "../../../components/luma/page-loading";
export default function Page() {
  return (
    <Suspense fallback={<PageLoading />}>
      <StudentAssessment />
    </Suspense>
  );
}
