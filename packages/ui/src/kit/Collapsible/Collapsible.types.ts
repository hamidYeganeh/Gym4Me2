import type { VariantProps } from "class-variance-authority";
import { Collapsible as CollapsiblePrimitive } from "radix-ui";
import type { collapsibleVariants } from "./Collapsible.styles";
export type CollapsibleProps = React.ComponentProps<
  typeof CollapsiblePrimitive.Root
>;

export type CollapsibleTriggerProps = React.ComponentProps<
  typeof CollapsiblePrimitive.CollapsibleTrigger
>;

export type CollapsibleContentProps = React.ComponentProps<
  typeof CollapsiblePrimitive.CollapsibleContent
>;

export type CollapsibleVariants = VariantProps<typeof collapsibleVariants>;
