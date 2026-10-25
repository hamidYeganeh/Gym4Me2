"use client";

import { Input as InputPrimitive } from "@base-ui/react/input";
import { cn } from "@repo/ui/lib/utils";
import { inputStyles } from "./Input.styles";
import type { InputProps } from "./Input.types";

function Input({ className, type, ...props }: InputProps) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(inputStyles.input(), className)}
      {...props}
    />
  );
}

export { Input };
