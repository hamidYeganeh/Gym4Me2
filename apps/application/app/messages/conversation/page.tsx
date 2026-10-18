import { PageLoading } from "../../../components/luma/page-loading";
import { Suspense } from "react";
import { ConversationPage } from "../../../components/luma/community";
export default function Page() {
  return (
    <Suspense fallback={<PageLoading />}>
      <ConversationPage />
    </Suspense>
  );
}
