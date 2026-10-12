import type { VariantProps } from "class-variance-authority";
import { Progress as ProgressPrimitive } from "radix-ui";
import type * as React from "react";
import type { progressVariants } from "./Progress.styles";
export type ProgressProps = React.ComponentProps<typeof ProgressPrimitive.Root>;

export type ProgressVariants = VariantProps<typeof progressVariants>;
