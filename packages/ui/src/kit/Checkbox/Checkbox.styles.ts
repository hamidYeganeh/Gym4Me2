import { cva } from "class-variance-authority";
export const checkboxVariants = cva("");

export const checkboxStyles = {
  checkbox: cva(
    "peer relative flex size-5 shrink-0 items-center justify-center rounded-[5px] border border-border bg-background transition-shadow outline-none group-has-disabled/field:opacity-50 group-has-[:focus-visible]/field-label:ring-0 group-has-[:focus-visible]/field-label:not-data-[state=checked]:border-transparent after:absolute after:-inset-x-3 after:-inset-y-2    disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 aria-invalid:aria-checked:border-primary   data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground group-has-[:focus-visible]/field-label:data-[state=checked]:border-primary ",
  ),
  checkbox2: cva(
    "grid place-content-center text-current transition-none [&>svg]:size-3.5",
  ),
};
