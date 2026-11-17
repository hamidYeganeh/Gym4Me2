import type { separatorVariants } from "./Separator.styles";
import type { ComponentPropsWithRef } from "react";
import type { VariantProps } from "tailwind-variants";

export type SeparatorVariants = VariantProps<typeof separatorVariants>;
export type SeparatorProps = ComponentPropsWithRef<"div"> &
  SeparatorVariants & {
    decorative?: boolean;
  };
