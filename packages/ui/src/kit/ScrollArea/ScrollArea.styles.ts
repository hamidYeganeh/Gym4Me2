import { cva } from "class-variance-authority";
export const scrollAreaVariants = cva("");

export const scrollAreaStyles = {
  scrollArea: cva("relative"),
  scrollArea2: cva(
    "size-full rounded-[inherit] transition-[color,box-shadow] outline-none   focus-visible:outline-none",
  ),
  scrollBar: cva(
    "flex touch-none p-px transition-colors select-none data-horizontal:h-2.5 data-horizontal:flex-col data-horizontal:border-t data-horizontal:border-t-transparent data-vertical:h-full data-vertical:w-2.5 data-vertical:border-s data-vertical:border-s-transparent",
  ),
  scrollBar2: cva("relative flex-1 rounded-full bg-border"),
};
