import { PageLoading } from "../../components/luma/page-loading";
import { Suspense } from "react";
import { NotificationsPage } from "../../components/luma/community";
export default function Page() {
  return (
    <Suspense fallback={<PageLoading />}>
      <NotificationsPage />
    </Suspense>
  );
}
