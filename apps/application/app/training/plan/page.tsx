import { Suspense } from "react";
import { TrainingBuilder } from "@repo/ui/training";
export default function Page() {
  return (
    <Suspense>
      <TrainingBuilder />
    </Suspense>
  );
}
