import type { HTMLMotionProps } from "motion/react";
import type { GRADIENT_ANGLES } from "./ProgressiveBlur.styles";

export type ProgressiveBlurDirection = keyof typeof GRADIENT_ANGLES;
export type ProgressiveBlurProps = Omit<HTMLMotionProps<"div">, "children"> & {
  direction?: ProgressiveBlurDirection;
  blurLayers?: number;
  blurIntensity?: number;
};
