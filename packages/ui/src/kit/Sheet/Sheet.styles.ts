import { cva } from "class-variance-authority";
export const sheetVariants = cva("");

export const sheetStyles = {
  sheetOverlay: cva(
    "fixed inset-0 z-50 bg-black/35 duration-120 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0 motion-reduce:animate-none motion-reduce:transition-none motion-reduce:backdrop-blur-none",
  ),
  sheetContent: cva(
    "fixed z-50 flex flex-col bg-popover bg-clip-padding text-sm text-popover-foreground shadow-xl transition duration-200 ease-[cubic-bezier(.2,.8,.2,1)] data-[side=bottom]:inset-x-0 data-[side=bottom]:bottom-0 data-[side=bottom]:h-auto data-[side=bottom]:border-t data-[side=left]:inset-y-0 data-[side=left]:left-0 data-[side=left]:h-full data-[side=left]:w-3/4 data-[side=left]:border-e data-[side=right]:inset-y-0 data-[side=right]:right-0 data-[side=right]:h-full data-[side=right]:w-3/4 data-[side=right]:border-s data-[side=top]:inset-x-0 data-[side=top]:top-0 data-[side=top]:h-auto data-[side=top]:border-b data-[side=left]:sm:max-w-sm data-[side=right]:sm:max-w-sm data-open:animate-in data-open:fade-in-0 data-[side=bottom]:data-open:slide-in-from-bottom-10 data-[side=left]:data-open:slide-in-from-left-10 data-[side=right]:data-open:slide-in-from-right-10 data-[side=top]:data-open:slide-in-from-top-10 data-closed:animate-out data-closed:fade-out-0 data-[side=bottom]:data-closed:slide-out-to-bottom-10 data-[side=left]:data-closed:slide-out-to-left-10 data-[side=right]:data-closed:slide-out-to-right-10 data-[side=top]:data-closed:slide-out-to-top-10 motion-reduce:animate-none motion-reduce:transition-none",
  ),
  sheetContent2: cva("absolute top-4 end-4 bg-secondary"),
  sheetContent3: cva("sr-only"),
  sheetHeader: cva("flex flex-col gap-1.5 p-6"),
  sheetFooter: cva("mt-auto flex flex-col gap-2 p-6"),
  sheetTitle: cva("font-heading text-base font-medium text-foreground"),
  sheetDescription: cva("text-sm text-muted-foreground"),
};
