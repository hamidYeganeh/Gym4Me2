import type {
  selectItemIndicatorVariants,
  selectItemTextVariants,
  selectItemVariants,
  selectPopupVariants,
  selectTriggerVariants,
  selectValueVariants,
} from "./AnimatedSelect.styles";
import type AnimatedSelectGroup from "./AnimatedSelectGroup";
import type AnimatedSelectGroupLabel from "./AnimatedSelectGroupLabel";
import type AnimatedSelectIcon from "./AnimatedSelectIcon";
import type AnimatedSelectLabel from "./AnimatedSelectLabel";
import type AnimatedSelectList from "./AnimatedSelectList";
import type AnimatedSelectPortal from "./AnimatedSelectPortal";
import type AnimatedSelectPositioner from "./AnimatedSelectPositioner";
import type AnimatedSelectScrollDownArrow from "./AnimatedSelectScrollDownArrow";
import type AnimatedSelectScrollUpArrow from "./AnimatedSelectScrollUpArrow";
import type AnimatedSelectSeparator from "./AnimatedSelectSeparator";
import type { Select as Primitive } from "@animate-ui/react/primitives/base-ui/select";
import type { ComponentProps, ComponentPropsWithRef } from "react";
import type { VariantProps } from "tailwind-variants";

export type AnimatedSelectProps<
  Value,
  Multiple extends boolean | undefined = false,
> = Primitive.Root.Props<Value, Multiple>;

export type AnimatedSelectGroupProps = ComponentProps<typeof AnimatedSelectGroup>;

export type AnimatedSelectGroupLabelProps = ComponentProps<typeof AnimatedSelectGroupLabel>;

export type AnimatedSelectIconProps = ComponentProps<typeof AnimatedSelectIcon>;

export type AnimatedSelectItemVariants = VariantProps<typeof selectItemVariants>;

export type AnimatedSelectItemProps = Omit<
  ComponentPropsWithRef<typeof Primitive.Item>,
  keyof AnimatedSelectItemVariants
> &
  AnimatedSelectItemVariants;

export type AnimatedSelectItemIndicatorVariants = VariantProps<typeof selectItemIndicatorVariants>;

export type AnimatedSelectItemIndicatorProps = Omit<
  ComponentPropsWithRef<typeof Primitive.ItemIndicator>,
  keyof AnimatedSelectItemIndicatorVariants
> &
  AnimatedSelectItemIndicatorVariants;

export type AnimatedSelectItemTextVariants = VariantProps<typeof selectItemTextVariants>;

export type AnimatedSelectItemTextProps = Omit<
  ComponentPropsWithRef<typeof Primitive.ItemText>,
  keyof AnimatedSelectItemTextVariants
> &
  AnimatedSelectItemTextVariants;

export type AnimatedSelectLabelProps = ComponentProps<typeof AnimatedSelectLabel>;

export type AnimatedSelectListProps = ComponentProps<typeof AnimatedSelectList>;

export type AnimatedSelectPopupVariants = VariantProps<typeof selectPopupVariants>;

export type AnimatedSelectPopupProps = Omit<
  ComponentPropsWithRef<typeof Primitive.Popup>,
  keyof AnimatedSelectPopupVariants
> &
  AnimatedSelectPopupVariants;

export type AnimatedSelectPortalProps = ComponentProps<typeof AnimatedSelectPortal>;

export type AnimatedSelectPositionerProps = ComponentProps<typeof AnimatedSelectPositioner>;

export type AnimatedSelectScrollDownArrowProps = ComponentProps<
  typeof AnimatedSelectScrollDownArrow
>;

export type AnimatedSelectScrollUpArrowProps = ComponentProps<typeof AnimatedSelectScrollUpArrow>;

export type AnimatedSelectSeparatorProps = ComponentProps<typeof AnimatedSelectSeparator>;

export type AnimatedSelectTriggerVariants = VariantProps<typeof selectTriggerVariants>;

export type AnimatedSelectTriggerProps = Omit<
  ComponentPropsWithRef<typeof Primitive.Trigger>,
  keyof AnimatedSelectTriggerVariants
> &
  AnimatedSelectTriggerVariants;

export type AnimatedSelectValueVariants = VariantProps<typeof selectValueVariants>;

export type AnimatedSelectValueProps = Omit<
  ComponentPropsWithRef<typeof Primitive.Value>,
  keyof AnimatedSelectValueVariants
> &
  AnimatedSelectValueVariants;

type SelectOption<Value extends string> = { value: Value; label: string };

export type AnimatedSelectControlProps<Value extends string> = {
  items: SelectOption<Value>[];
  value: Value;
  onChange: (value: Value) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  name?: string;
  triggerProps?: AnimatedSelectTriggerProps;
};
