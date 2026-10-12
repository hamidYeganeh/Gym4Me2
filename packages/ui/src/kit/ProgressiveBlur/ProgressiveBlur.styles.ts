import { cva } from "class-variance-authority";
import type { CSSProperties } from "react";

export const GRADIENT_ANGLES = {
  top: 0,
  right: 90,
  bottom: 180,
  left: 270,
} as const;

export const progressiveBlurStyles = {
  root: cva("pointer-events-none relative rounded-[inherit]"),
  layer: cva("pointer-events-none absolute inset-0 rounded-[inherit]"),
};

export function getBlurLayerStyle(
  index: number,
  layers: number,
  angle: (typeof GRADIENT_ANGLES)[keyof typeof GRADIENT_ANGLES],
  intensity: number,
): CSSProperties {
  const segmentSize = 1 / (layers + 1);
  const stops = [index, index + 1, index + 2, index + 3].map(
    (step, stop) =>
      `rgba(255, 255, 255, ${stop === 1 || stop === 2 ? 1 : 0}) ${step * segmentSize * 100}%`,
  );
  const mask = `linear-gradient(${angle}deg, ${stops.join(", ")})`;
  // Ease into the blur to avoid a visible step at the clear edge.
  const filter = `blur(${(index * index * intensity) / (layers - 1)}px)`;
  const start = index * segmentSize * 100;
  const end = Math.max(0, 100 - (index + 3) * segmentSize * 100);
  // Bound backdrop sampling to the mask's visible band. Without this Chromium
  // can accumulate sibling filters outside their masks into one solid blur.
  const clip = {
    0: `inset(${end}% 0 ${start}% 0)`,
    90: `inset(0 ${end}% 0 ${start}%)`,
    180: `inset(${start}% 0 ${end}% 0)`,
    270: `inset(0 ${start}% 0 ${end}%)`,
  }[angle];
  return {
    clipPath: clip,
    zIndex: index,
    mask: mask,
    WebkitMask: mask,
    backdropFilter: filter,
    WebkitBackdropFilter: filter,
  };
}
