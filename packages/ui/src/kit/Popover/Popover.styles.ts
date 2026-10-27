import { cva } from "class-variance-authority";
export const popoverVariants = cva("");

export const popoverStyles = {
  popoverContent: cva(
    "z-50 flex w-72 origin-(--radix-popover-content-transform-origin) flex-col gap-4 rounded-3xl bg-popover p-4 text-sm text-popover-foreground shadow-lg ring-1 ring-foreground/5 outline-hidden",
  ),
  popoverHeader: cva("flex flex-col gap-1 text-sm"),
  popoverTitle: cva("text-base font-medium"),
  popoverDescription: cva("text-muted-foreground"),
};
