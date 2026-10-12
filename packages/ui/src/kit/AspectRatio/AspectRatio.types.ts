import type { VariantProps } from "class-variance-authority";
import { AspectRatio as AspectRatioPrimitive } from "radix-ui";
import type { aspectRatioVariants } from "./AspectRatio.styles";
export type AspectRatioProps = React.ComponentProps<
  typeof AspectRatioPrimitive.Root
>;

export type AspectRatioVariants = VariantProps<typeof aspectRatioVariants>;
