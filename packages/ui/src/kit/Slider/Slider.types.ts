import type { VariantProps } from "class-variance-authority";
import { Slider as SliderPrimitive } from "@animate-ui/react/primitives/radix-ui";
import type * as React from "react";
import type { sliderVariants } from "./Slider.styles";
export type SliderProps = React.ComponentProps<typeof SliderPrimitive.Root>;

export type SliderVariants = VariantProps<typeof sliderVariants>;
