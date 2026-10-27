import type { InputProps } from "../Input";

export type SmoothInputProps = Omit<InputProps, "render"> & {
  /** Class applied to the positioning container; className styles the input. */
  wrapperClassName?: string;
  /** Use the browser caret even when the system allows animation. */
  reducedMotion?: boolean;
};
