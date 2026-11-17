import type { itemSlots } from "./Item.styles";
import type { ComponentPropsWithRef } from "react";
import type { VariantProps } from "tailwind-variants";

export type ItemProps = ComponentPropsWithRef<"div"> &
  VariantProps<typeof itemSlots> & { asChild?: boolean };
export type ItemGroupProps = ComponentPropsWithRef<"div">;
export type ItemSeparatorProps = ComponentPropsWithRef<"hr">;
export type ItemMediaProps = ComponentPropsWithRef<"div"> & VariantProps<typeof itemSlots>;
export type ItemContentProps = ComponentPropsWithRef<"div">;
export type ItemTitleProps = ComponentPropsWithRef<"div">;
export type ItemDescriptionProps = ComponentPropsWithRef<"p">;
export type ItemActionsProps = ComponentPropsWithRef<"div">;
export type ItemHeaderProps = ComponentPropsWithRef<"div">;
export type ItemFooterProps = ComponentPropsWithRef<"div">;
