import { Button } from "@repo/ui/kit/Button";
import type { InputProps } from "@repo/ui/kit/Input";
import type { VariantProps } from "class-variance-authority";
import type * as React from "react";
import type {
  inputGroupAddonVariants,
  inputGroupButtonVariants,
} from "./InputGroup.styles";
export type InputGroupProps = React.ComponentProps<"div">;

export type InputGroupAddonProps = React.ComponentProps<"div"> &
  VariantProps<typeof inputGroupAddonVariants>;

export type InputGroupButtonProps = Omit<
  React.ComponentProps<typeof Button>,
  "size"
> &
  VariantProps<typeof inputGroupButtonVariants>;

export type InputGroupTextProps = React.ComponentProps<"span">;

export type InputGroupInputProps = InputProps;

export type InputGroupTextareaProps = React.ComponentProps<"textarea">;

export type InputGroupAddonVariants = VariantProps<
  typeof inputGroupAddonVariants
>;

export type InputGroupButtonVariants = VariantProps<
  typeof inputGroupButtonVariants
>;
