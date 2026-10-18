import { PageLoading } from "../../../components/luma/page-loading";
import { Suspense } from "react";
import { MockGateway } from "../../../components/luma/mock-gateway";

export default function Page() {
  return (
    <Suspense fallback={<PageLoading />}>
      <MockGateway />
    </Suspense>
  );
}
