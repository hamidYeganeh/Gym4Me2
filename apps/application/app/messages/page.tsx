import { PageLoading } from "../../components/luma/page-loading";
import { Suspense } from "react";
import { MessagesPage } from "../../components/luma/community";
export default function Page() {
  return (
    <Suspense fallback={<PageLoading />}>
      <MessagesPage />
    </Suspense>
  );
}
