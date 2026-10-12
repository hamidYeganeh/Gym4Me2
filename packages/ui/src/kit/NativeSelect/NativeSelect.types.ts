import type { VariantProps } from "class-variance-authority";
import type * as React from "react";
import type { nativeSelectVariants } from "./NativeSelect.styles";
export type NativeSelectProps = Omit<React.ComponentProps<"select">, "size"> & {
  size?: "sm" | "default";
};

export type NativeSelectOptionProps = React.ComponentProps<"option">;

export type NativeSelectOptGroupProps = React.ComponentProps<"optgroup">;

export type NativeSelectVariants = VariantProps<typeof nativeSelectVariants>;
