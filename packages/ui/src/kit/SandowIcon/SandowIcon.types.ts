import type { VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";
import type { sandowIconVariants } from "./SandowIcon.styles";

export type SandowIconVariants = VariantProps<typeof sandowIconVariants>;
export type SandowIconProps = Omit<ComponentProps<"span">, "children"> &
  SandowIconVariants & {
    /** Omit for decorative icons. Provide a localized label for standalone icons. */
    label?: string;
  };
export type SandowIconLayer = readonly [codepoint: number, opacity: number];
