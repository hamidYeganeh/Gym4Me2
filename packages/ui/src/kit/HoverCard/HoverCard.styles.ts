import { cva } from "class-variance-authority";
export const hoverCardVariants = cva("");

export const hoverCardStyles = {
  hoverCardContent: cva(
    "z-50 w-72 origin-(--radix-hover-card-content-transform-origin) rounded-3xl bg-popover p-4 text-sm text-popover-foreground shadow-lg ring-1 ring-foreground/5 outline-hidden",
  ),
};
