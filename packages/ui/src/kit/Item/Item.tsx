import { cn } from "@repo/ui/lib/utils";
import { Slot } from "radix-ui";
import { itemMediaVariants, itemStyles, itemVariants } from "./Item.styles";
import type {
  ItemActionsProps,
  ItemContentProps,
  ItemDescriptionProps,
  ItemFooterProps,
  ItemGroupProps,
  ItemHeaderProps,
  ItemMediaProps,
  ItemProps,
  ItemSeparatorProps,
  ItemTitleProps,
} from "./Item.types";

import { Separator } from "@repo/ui/kit/Separator";

function ItemGroup({ className, ...props }: ItemGroupProps) {
  return (
    <div
      role="list"
      data-slot="item-group"
      className={cn(itemStyles.itemGroup(), className)}
      {...props}
    />
  );
}

function ItemSeparator({ className, ...props }: ItemSeparatorProps) {
  return (
    <Separator
      data-slot="item-separator"
      orientation="horizontal"
      className={cn(itemStyles.itemSeparator(), className)}
      {...props}
    />
  );
}

function Item({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: ItemProps) {
  const Comp = asChild ? Slot.Root : "div";
  return (
    <Comp
      data-slot="item"
      data-variant={variant}
      data-size={size}
      className={cn(itemVariants({ variant, size, className }))}
      {...props}
    />
  );
}

function ItemMedia({
  className,
  variant = "default",
  ...props
}: ItemMediaProps) {
  return (
    <div
      data-slot="item-media"
      data-variant={variant}
      className={cn(itemMediaVariants({ variant, className }))}
      {...props}
    />
  );
}

function ItemContent({ className, ...props }: ItemContentProps) {
  return (
    <div
      data-slot="item-content"
      className={cn(itemStyles.itemContent(), className)}
      {...props}
    />
  );
}

function ItemTitle({ className, ...props }: ItemTitleProps) {
  return (
    <div
      data-slot="item-title"
      className={cn(itemStyles.itemTitle(), className)}
      {...props}
    />
  );
}

function ItemDescription({ className, ...props }: ItemDescriptionProps) {
  return (
    <p
      data-slot="item-description"
      className={cn(itemStyles.itemDescription(), className)}
      {...props}
    />
  );
}

function ItemActions({ className, ...props }: ItemActionsProps) {
  return (
    <div
      data-slot="item-actions"
      className={cn(itemStyles.itemActions(), className)}
      {...props}
    />
  );
}

function ItemHeader({ className, ...props }: ItemHeaderProps) {
  return (
    <div
      data-slot="item-header"
      className={cn(itemStyles.itemHeader(), className)}
      {...props}
    />
  );
}

function ItemFooter({ className, ...props }: ItemFooterProps) {
  return (
    <div
      data-slot="item-footer"
      className={cn(itemStyles.itemFooter(), className)}
      {...props}
    />
  );
}

export {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemFooter,
  ItemGroup,
  ItemHeader,
  ItemMedia,
  ItemSeparator,
  ItemTitle,
};
