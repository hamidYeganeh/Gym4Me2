import { cn } from "@repo/ui/lib/utils";
import { Slot } from "radix-ui";
import {
  bubbleReactionsVariants,
  bubbleStyles,
  bubbleVariants,
} from "./Bubble.styles";
import type {
  BubbleContentProps,
  BubbleGroupProps,
  BubbleProps,
  BubbleReactionsProps,
} from "./Bubble.types";

function BubbleGroup({ className, ...props }: BubbleGroupProps) {
  return (
    <div
      data-slot="bubble-group"
      className={cn(bubbleStyles.bubbleGroup(), className)}
      {...props}
    />
  );
}

function Bubble({
  variant = "default",
  align = "start",
  className,
  ...props
}: BubbleProps) {
  return (
    <div
      data-slot="bubble"
      data-variant={variant}
      data-align={align}
      className={cn(bubbleVariants({ variant }), className)}
      {...props}
    />
  );
}

function BubbleContent({
  asChild = false,
  className,
  ...props
}: BubbleContentProps) {
  const Comp = asChild ? Slot.Root : "div";

  return (
    <Comp
      data-slot="bubble-content"
      className={cn(bubbleStyles.bubbleContent(), className)}
      {...props}
    />
  );
}

function BubbleReactions({
  side = "bottom",
  align = "end",
  className,
  ...props
}: BubbleReactionsProps) {
  return (
    <div
      data-slot="bubble-reactions"
      data-align={align}
      data-side={side}
      className={cn(bubbleReactionsVariants({ side, align }), className)}
      {...props}
    />
  );
}

export { Bubble, BubbleContent, BubbleGroup, BubbleReactions };
