import { PageLoading } from "../../components/luma/page-loading";
import { Suspense } from "react";
import { CheckoutPage } from "../../components/luma/checkout";
export default function Page() {
  return (
    <Suspense fallback={<PageLoading />}>
      <CheckoutPage />
    </Suspense>
  );
}
