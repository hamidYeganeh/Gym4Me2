import { Suspense } from "react";
import { TrainingCollaboration } from "@repo/ui/training";
export default function Page() {
  return (
    <Suspense>
      <TrainingCollaboration />
    </Suspense>
  );
}
