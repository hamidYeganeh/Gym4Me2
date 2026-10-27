"use client";
import { radioGroupStyles } from "./RadioGroup.styles";
import type { RadioGroupItemProps, RadioGroupProps } from "./RadioGroup.types";

import { cn } from "@repo/ui/lib/utils";
import { RadioGroup as RadioGroupPrimitive } from "@animate-ui/react/primitives/radix-ui";

function RadioGroup({ className, ...props }: RadioGroupProps) {
  return (
    <RadioGroupPrimitive.Root
      data-slot="radio-group"
      className={cn(radioGroupStyles.radioGroup(), className)}
      {...props}
    />
  );
}

function RadioGroupItem({ className, ...props }: RadioGroupItemProps) {
  return (
    <RadioGroupPrimitive.Item
      data-slot="radio-group-item"
      className={cn(radioGroupStyles.radioGroupItem(), className)}
      {...props}
    >
      <RadioGroupPrimitive.Indicator
        data-slot="radio-group-indicator"
        className={radioGroupStyles.radioGroupItem2()}
      >
        <span className={radioGroupStyles.radioGroupItem3()} />
      </RadioGroupPrimitive.Indicator>
    </RadioGroupPrimitive.Item>
  );
}

export { RadioGroup, RadioGroupItem };
