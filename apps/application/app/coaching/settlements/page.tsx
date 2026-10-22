import { Suspense } from "react";
import { AdvancedBusinessPanel } from "@repo/ui/advanced-business";
export default function Page() {
  return (
    <Suspense>
      <AdvancedBusinessPanel surface="coach" />
    </Suspense>
  );
}
