import { PageLoading } from "../../../components/luma/page-loading";
import { Suspense } from "react";
import { PaymentStatus } from "../../../components/luma/checkout";
export default function Page() {
  return (
    <Suspense fallback={<PageLoading />}>
      <PaymentStatus />
    </Suspense>
  );
}
