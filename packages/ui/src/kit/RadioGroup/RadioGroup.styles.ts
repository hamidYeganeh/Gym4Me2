import { cva } from "class-variance-authority";
export const radioGroupVariants = cva("");

export const radioGroupStyles = {
  radioGroup: cva("grid w-full gap-3"),
  radioGroupItem: cva(
    "group/radio-group-item peer relative flex aspect-square size-4 shrink-0 rounded-full border border-transparent bg-input/90 outline-none group-has-[:focus-visible]/field-label:border-transparent group-has-[:focus-visible]/field-label:ring-0 after:absolute after:-inset-x-3 after:-inset-y-2    disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20   data-checked:bg-primary data-checked:text-primary-foreground ",
  ),
  radioGroupItem2: cva("flex size-4 items-center justify-center"),
  radioGroupItem3: cva(
    "absolute top-1/2 start-1/2 size-2 -translate-x-1/2 rtl:translate-x-1/2 -translate-y-1/2 rounded-full bg-primary-foreground ",
  ),
};
