import { cn } from "@repo/ui/lib/utils";
import { textareaStyles } from "./Textarea.styles";
import type { TextareaProps } from "./Textarea.types";

function Textarea({ className, ...props }: TextareaProps) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(textareaStyles.textarea(), className)}
      {...props}
    />
  );
}

export { Textarea };
