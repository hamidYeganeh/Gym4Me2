import type { VariantProps } from "class-variance-authority";
import type * as React from "react";
import type { textareaVariants } from "./Textarea.styles";
export type TextareaProps = React.ComponentProps<"textarea">;

export type TextareaVariants = VariantProps<typeof textareaVariants>;
