import type { VariantProps } from "class-variance-authority";
import { Label as LabelPrimitive } from "radix-ui";
import type * as React from "react";
import type { labelVariants } from "./Label.styles";
export type LabelProps = React.ComponentProps<typeof LabelPrimitive.Root>;

export type LabelVariants = VariantProps<typeof labelVariants>;
