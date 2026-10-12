"use client";
import { motion } from "motion/react";
import { cn } from "../../lib/utils";
import {
  GRADIENT_ANGLES,
  getBlurLayerStyle,
  progressiveBlurStyles as s,
} from "./ProgressiveBlur.styles";
import type { ProgressiveBlurProps } from "./ProgressiveBlur.types";

/** Decorative masked blur, increasing toward the requested edge. */
export function ProgressiveBlur({
  direction = "bottom",
  blurLayers = 8,
  blurIntensity = 0.25,
  className,
  ...props
}: ProgressiveBlurProps) {
  const layers = Number.isFinite(blurLayers)
    ? Math.min(16, Math.max(2, Math.floor(blurLayers)))
    : 8;
  const intensity = Number.isFinite(blurIntensity)
    ? Math.max(0, blurIntensity)
    : 0.25;
  return (
    <motion.div
      {...props}
      aria-hidden="true"
      className={cn(s.root(), className)}
      data-slot="progressive-blur"
    >
      {Array.from({ length: layers }, (_, index) => (
        <div
          key={index}
          className={s.layer()}
          style={getBlurLayerStyle(
            index,
            layers,
            GRADIENT_ANGLES[direction],
            intensity,
          )}
        />
      ))}
    </motion.div>
  );
}
