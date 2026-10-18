import { PageLoading } from "../../components/luma/page-loading";
import { Suspense } from "react";
import { OrdersPage } from "../../components/luma/bookings";
export default function Page() {
  return (
    <Suspense fallback={<PageLoading />}>
      <OrdersPage />
    </Suspense>
  );
}
