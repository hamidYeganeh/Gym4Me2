import { PageLoading } from "../../components/luma/page-loading";
import { Suspense } from "react";
import { WaitlistPage } from "../../components/luma/bookings";
export default function Page() {
  return (
    <Suspense fallback={<PageLoading />}>
      <WaitlistPage />
    </Suspense>
  );
}
