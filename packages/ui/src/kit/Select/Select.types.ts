import type {
  selectItemIndicatorVariants,
  selectItemTextVariants,
  selectItemVariants,
  selectPopupVariants,
  selectTriggerVariants,
  selectValueVariants,
} from "./Select.styles";
import type SelectGroup from "./SelectGroup";
import type SelectGroupLabel from "./SelectGroupLabel";
import type SelectIcon from "./SelectIcon";
import type SelectLabel from "./SelectLabel";
import type SelectList from "./SelectList";
import type SelectPortal from "./SelectPortal";
import type SelectPositioner from "./SelectPositioner";
import type SelectScrollDownArrow from "./SelectScrollDownArrow";
import type SelectScrollUpArrow from "./SelectScrollUpArrow";
import type SelectSeparator from "./SelectSeparator";
import type { Select as Primitive } from "@base-ui/react/select";
import type { ComponentProps, ComponentPropsWithRef } from "react";
import type { VariantProps } from "tailwind-variants";

export type SelectProps<Value, Multiple extends boolean | undefined = false> = Primitive.Root.Props<
  Value,
  Multiple
>;

export type SelectGroupProps = ComponentProps<typeof SelectGroup>;

export type SelectGroupLabelProps = ComponentProps<typeof SelectGroupLabel>;

export type SelectIconProps = ComponentProps<typeof SelectIcon>;

export type SelectItemVariants = VariantProps<typeof selectItemVariants>;

export type SelectItemProps = Omit<
  ComponentPropsWithRef<typeof Primitive.Item>,
  keyof SelectItemVariants
> &
  SelectItemVariants;

export type SelectItemIndicatorVariants = VariantProps<typeof selectItemIndicatorVariants>;

export type SelectItemIndicatorProps = Omit<
  ComponentPropsWithRef<typeof Primitive.ItemIndicator>,
  keyof SelectItemIndicatorVariants
> &
  SelectItemIndicatorVariants;

export type SelectItemTextVariants = VariantProps<typeof selectItemTextVariants>;

export type SelectItemTextProps = Omit<
  ComponentPropsWithRef<typeof Primitive.ItemText>,
  keyof SelectItemTextVariants
> &
  SelectItemTextVariants;

export type SelectLabelProps = ComponentProps<typeof SelectLabel>;

export type SelectListProps = ComponentProps<typeof SelectList>;

export type SelectPopupVariants = VariantProps<typeof selectPopupVariants>;

export type SelectPopupProps = Omit<
  ComponentPropsWithRef<typeof Primitive.Popup>,
  keyof SelectPopupVariants
> &
  SelectPopupVariants;

export type SelectPortalProps = ComponentProps<typeof SelectPortal>;

export type SelectPositionerProps = ComponentProps<typeof SelectPositioner>;

export type SelectScrollDownArrowProps = ComponentProps<typeof SelectScrollDownArrow>;

export type SelectScrollUpArrowProps = ComponentProps<typeof SelectScrollUpArrow>;

export type SelectSeparatorProps = ComponentProps<typeof SelectSeparator>;

export type SelectTriggerVariants = VariantProps<typeof selectTriggerVariants>;

export type SelectTriggerProps = Omit<
  ComponentPropsWithRef<typeof Primitive.Trigger>,
  keyof SelectTriggerVariants
> &
  SelectTriggerVariants;

export type SelectValueVariants = VariantProps<typeof selectValueVariants>;

export type SelectValueProps = Omit<
  ComponentPropsWithRef<typeof Primitive.Value>,
  keyof SelectValueVariants
> &
  SelectValueVariants;
