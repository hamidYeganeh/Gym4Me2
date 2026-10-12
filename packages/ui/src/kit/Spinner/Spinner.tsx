import { cn } from "@repo/ui/lib/utils";
import { Loader2Icon } from "lucide-react";
import { spinnerStyles } from "./Spinner.styles";
import type { SpinnerProps } from "./Spinner.types";

function Spinner({ className, ...props }: SpinnerProps) {
  return (
    <Loader2Icon
      data-slot="spinner"
      role="status"
      aria-label="Loading"
      className={cn(spinnerStyles.spinner(), className)}
      {...props}
    />
  );
}

export { Spinner };
