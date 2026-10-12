import { cva } from "class-variance-authority";
export const popoverVariants = cva("");

export const popoverStyles = {
  popoverContent: cva(
    "z-50 flex w-72 origin-(--radix-popover-content-transform-origin) flex-col gap-4 rounded-3xl bg-popover p-4 text-sm text-popover-foreground shadow-lg ring-1 ring-foreground/5 outline-hidden duration-100 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2  data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
  ),
  popoverHeader: cva("flex flex-col gap-1 text-sm"),
  popoverTitle: cva("text-base font-medium"),
  popoverDescription: cva("text-muted-foreground"),
};
