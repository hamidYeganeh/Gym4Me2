import type { VariantProps } from "class-variance-authority";
import type { spinnerVariants } from "./Spinner.styles";
export type SpinnerProps = React.ComponentProps<"svg">;

export type SpinnerVariants = VariantProps<typeof spinnerVariants>;
