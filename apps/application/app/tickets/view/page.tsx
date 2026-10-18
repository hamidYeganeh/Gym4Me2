import { PageLoading } from "../../../components/luma/page-loading";
import { Suspense } from "react";
import { TicketPage } from "../../../components/luma/ticket";
export default function Page() {
  return (
    <Suspense fallback={<PageLoading />}>
      <TicketPage />
    </Suspense>
  );
}
