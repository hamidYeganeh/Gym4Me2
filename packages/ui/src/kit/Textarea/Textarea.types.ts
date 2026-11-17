import type { textareaVariants } from "./Textarea.styles";
import type { ComponentPropsWithRef } from "react";
import type { VariantProps } from "tailwind-variants";

export type TextareaVariants = VariantProps<typeof textareaVariants>;
export type TextareaProps = Omit<ComponentPropsWithRef<"textarea">, "color"> & TextareaVariants;
