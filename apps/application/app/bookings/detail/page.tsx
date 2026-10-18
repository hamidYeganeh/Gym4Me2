import { PageLoading } from "../../../components/luma/page-loading";
import { Suspense } from "react";
import { BookingDetail } from "../../../components/luma/bookings";
export default function Page() {
  return (
    <Suspense fallback={<PageLoading />}>
      <BookingDetail />
    </Suspense>
  );
}
