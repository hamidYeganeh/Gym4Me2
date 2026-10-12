import type { ComponentProps } from "react";

export type SlidingNumberProps = Omit<ComponentProps<"span">, "children"> & {
  value: number;
  padStart?: boolean;
  decimalSeparator?: string;
  locale?: string;
  useGrouping?: boolean;
};
