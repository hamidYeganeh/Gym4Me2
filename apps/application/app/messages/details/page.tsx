import { PageLoading } from "../../../components/luma/page-loading";
import { Suspense } from "react";
import { ConversationDetails } from "../../../components/luma/community";
export default function Page() {
  return (
    <Suspense fallback={<PageLoading />}>
      <ConversationDetails />
    </Suspense>
  );
}
