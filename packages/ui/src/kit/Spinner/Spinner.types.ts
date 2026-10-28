import type { VariantProps } from "class-variance-authority";
import type { spinnerVariants } from "./Spinner.styles";
export type SpinnerProps = React.ComponentProps<"span">;

export type SpinnerVariants = VariantProps<typeof spinnerVariants>;
