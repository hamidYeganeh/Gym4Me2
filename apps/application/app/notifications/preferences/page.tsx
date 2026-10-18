import { PageLoading } from "../../../components/luma/page-loading";
import { Suspense } from "react";
import { NotificationPreferences } from "../../../components/luma/community";
export default function Page() {
  return (
    <Suspense fallback={<PageLoading />}>
      <NotificationPreferences />
    </Suspense>
  );
}
