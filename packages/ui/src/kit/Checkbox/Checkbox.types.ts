import type { VariantProps } from "class-variance-authority";
import { Checkbox as CheckboxPrimitive } from "@animate-ui/react/primitives/radix-ui";
import type * as React from "react";
import type { checkboxVariants } from "./Checkbox.styles";
export type CheckboxProps = React.ComponentProps<typeof CheckboxPrimitive.Root>;

export type CheckboxVariants = VariantProps<typeof checkboxVariants>;
