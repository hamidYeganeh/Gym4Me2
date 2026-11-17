import type { labelVariants } from "./Label.styles";
import type { ComponentPropsWithRef } from "react";
import type { VariantProps } from "tailwind-variants";

export type LabelVariants = VariantProps<typeof labelVariants>;
export type LabelProps = Omit<ComponentPropsWithRef<"label">, "color"> & LabelVariants;
