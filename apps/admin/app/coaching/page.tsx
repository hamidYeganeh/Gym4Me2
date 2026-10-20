import { Suspense } from "react";
import { CoachingOffice } from "@repo/ui/account";
export default function Page() {
  return (
    <Suspense>
      <CoachingOffice surface="admin" />
    </Suspense>
  );
}
