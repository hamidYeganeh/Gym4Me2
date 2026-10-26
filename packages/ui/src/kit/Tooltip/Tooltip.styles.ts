import { cva } from "class-variance-authority";
export const tooltipVariants = cva("");

export const tooltipStyles = {
  tooltipContent: cva(
    "z-50 inline-flex w-fit max-w-xs origin-(--radix-tooltip-content-transform-origin) items-center gap-1.5 rounded-xl bg-foreground px-3 py-1.5 text-xs text-background has-data-[slot=kbd]:pe-1.5 **:data-[slot=kbd]:relative **:data-[slot=kbd]:isolate **:data-[slot=kbd]:z-50 **:data-[slot=kbd]:rounded-lg",
  ),
  tooltipContent2: cva(
    "z-50 size-2.5 translate-y-[calc(-50%_-_2px)] rotate-45 rounded-[2px] bg-foreground fill-foreground data-[side=left]:translate-x-[-1.5px] rtl:data-[side=left]:-translate-x-[-1.5px] data-[side=right]:translate-x-[1.5px] rtl:data-[side=right]:-translate-x-[1.5px]",
  ),
};
