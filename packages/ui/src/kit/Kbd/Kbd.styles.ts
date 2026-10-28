import { cva } from "class-variance-authority";
export const kbdVariants = cva("");

export const kbdStyles = {
  kbd: cva(
    "pointer-events-none inline-flex h-5.5 w-fit min-w-5.5 items-center justify-center gap-1 rounded-lg bg-muted px-1.5 font-sans text-xs font-medium text-muted-foreground select-none in-data-[slot=input-group]:bg-input in-data-[slot=tooltip-content]:bg-background/20 in-data-[slot=tooltip-content]:text-background  [&_:is(svg,.sandow-icon):not([class*='size-'])]:size-3",
  ),
  kbdGroup: cva("inline-flex items-center gap-1"),
};
