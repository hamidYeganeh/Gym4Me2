import { cn } from "@repo/ui/lib/utils";
import { Slot } from "radix-ui";
import { buttonGroupStyles, buttonGroupVariants } from "./ButtonGroup.styles";
import type {
  ButtonGroupProps,
  ButtonGroupSeparatorProps,
  ButtonGroupTextProps,
} from "./ButtonGroup.types";

import { Separator } from "@repo/ui/kit/Separator";

function ButtonGroup({ className, orientation, ...props }: ButtonGroupProps) {
  return (
    <div
      role="group"
      data-slot="button-group"
      data-orientation={orientation}
      className={cn(buttonGroupVariants({ orientation }), className)}
      {...props}
    />
  );
}

function ButtonGroupText({
  className,
  asChild = false,
  ...props
}: ButtonGroupTextProps) {
  const Comp = asChild ? Slot.Root : "div";

  return (
    <Comp
      className={cn(buttonGroupStyles.buttonGroupText(), className)}
      {...props}
    />
  );
}

function ButtonGroupSeparator({
  className,
  orientation = "vertical",
  ...props
}: ButtonGroupSeparatorProps) {
  return (
    <Separator
      data-slot="button-group-separator"
      orientation={orientation}
      className={cn(buttonGroupStyles.buttonGroupSeparator(), className)}
      {...props}
    />
  );
}

export { ButtonGroup, ButtonGroupSeparator, ButtonGroupText };
