"use client";

import { Input as InputPrimitive } from "@base-ui/react/input";
import { cn } from "@repo/ui/lib/utils";
import { Search } from "../Search";
import { LabelInput } from "../LabelInput";
import { inputStyles } from "./Input.styles";
import type { InputProps } from "./Input.types";

function Input({ className, type, label, ...props }: InputProps) {
  if (type === "search")
    return <Search {...props} label={label} className={className} />;
  if (
    label &&
    !["file", "hidden", "checkbox", "radio", "range", "color"].includes(
      type ?? "",
    )
  )
    return (
      <LabelInput {...props} label={label} type={type} className={className} />
    );
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
