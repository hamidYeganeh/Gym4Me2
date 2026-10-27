import { Suspense } from "react";
import { TrainingWorkout } from "@repo/ui/training";
export default function Page() {
  return (
    <Suspense>
      <TrainingWorkout />
    </Suspense>
  );
}
