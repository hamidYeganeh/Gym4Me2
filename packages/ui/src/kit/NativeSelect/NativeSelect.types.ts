import type { VariantProps } from "class-variance-authority";
import type * as React from "react";
import type { nativeSelectVariants } from "./NativeSelect.styles";
import type { SelectOptionsSource } from "@repo/api/select-options";
export type SelectOption = {
  value: string;
  label: string;
  disabled?: boolean;
  icon?: React.ReactNode;
  image?: string;
  subtitle?: string;
  keywords?: string;
  group?: string;
};
export type NativeSelectProps = Omit<React.ComponentProps<"select">, "size"> & {
  size?: "sm" | "default";
  sheetTitle?: string;
  optionsSource?: SelectOptionsSource<SelectOption>;
  pageSize?: number;
};
export type NativeSelectOptionProps = React.ComponentProps<"option"> & {
  icon?: React.ReactNode;
  image?: string;
  subtitle?: string;
  keywords?: string;
};
export type NativeSelectOptGroupProps = React.ComponentProps<"optgroup">;
export type NativeSelectVariants = VariantProps<typeof nativeSelectVariants>;
