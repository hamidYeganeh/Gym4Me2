"use client";
import { switchStyles } from "./Switch.styles";
import type { SwitchProps } from "./Switch.types";

import { cn } from "@repo/ui/lib/utils";
import { Switch as SwitchPrimitive } from "radix-ui";

function Switch({ className, size = "default", ...props }: SwitchProps) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      data-size={size}
      className={cn(switchStyles.switch(), className)}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={switchStyles.switch2()}
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
