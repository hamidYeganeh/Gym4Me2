"use client";
import { hoverCardStyles } from "./HoverCard.styles";
import type {
  HoverCardContentProps,
  HoverCardProps,
  HoverCardTriggerProps,
} from "./HoverCard.types";

import { cn } from "@repo/ui/lib/utils";
import { HoverCard as HoverCardPrimitive } from "@animate-ui/react/primitives/radix-ui";

function HoverCard({ ...props }: HoverCardProps) {
  return <HoverCardPrimitive.Root data-slot="hover-card" {...props} />;
}

function HoverCardTrigger({ ...props }: HoverCardTriggerProps) {
  return (
    <HoverCardPrimitive.Trigger data-slot="hover-card-trigger" {...props} />
  );
}

function HoverCardContent({
  className,
  align = "center",
  sideOffset = 4,
  ...props
}: HoverCardContentProps) {
  return (
    <HoverCardPrimitive.Portal data-slot="hover-card-portal">
      <HoverCardPrimitive.Content
        data-slot="hover-card-content"
        align={align}
        sideOffset={sideOffset}
        className={cn(hoverCardStyles.hoverCardContent(), className)}
        {...props}
      />
    </HoverCardPrimitive.Portal>
  );
}

export { HoverCard, HoverCardContent, HoverCardTrigger };
