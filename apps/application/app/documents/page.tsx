import { PageLoading } from "../../components/luma/page-loading";
import { Suspense } from "react";
import { DocumentsPage } from "../../components/luma/documents";
export default function Page() {
  return (
    <Suspense fallback={<PageLoading />}>
      <DocumentsPage />
    </Suspense>
  );
}
