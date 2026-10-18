import { PageLoading } from "../../../components/luma/page-loading";
import { Suspense } from "react";
import { OrderDetail } from "../../../components/luma/bookings";
export default function Page() {
  return (
    <Suspense fallback={<PageLoading />}>
      <OrderDetail />
    </Suspense>
  );
}
