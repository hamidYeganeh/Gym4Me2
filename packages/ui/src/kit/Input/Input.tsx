import { cn } from "@repo/ui/lib/utils";
import { inputStyles } from "./Input.styles";
import type { InputProps } from "./Input.types";

function Input({ className, type, ...props }: InputProps) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(inputStyles.input(), className)}
      {...props}
    />
  );
}

export { Input };
