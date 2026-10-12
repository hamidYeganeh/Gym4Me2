import { Separator } from "@repo/ui/kit/Separator";
import type { VariantProps } from "class-variance-authority";
import type { buttonGroupVariants } from "./ButtonGroup.styles";
export type ButtonGroupProps = React.ComponentProps<"div"> &
  VariantProps<typeof buttonGroupVariants>;

export type ButtonGroupTextProps = React.ComponentProps<"div"> & {
  asChild?: boolean;
};

export type ButtonGroupSeparatorProps = React.ComponentProps<typeof Separator>;

export type ButtonGroupVariants = VariantProps<typeof buttonGroupVariants>;
