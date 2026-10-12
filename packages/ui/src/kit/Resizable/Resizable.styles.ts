import { cva } from "class-variance-authority";
export const resizableVariants = cva("");

export const resizableStyles = {
  resizablePanelGroup: cva(
    "flex h-full w-full aria-[orientation=vertical]:flex-col",
  ),
  resizableHandle: cva(
    "relative flex w-px items-center justify-center bg-border ring-offset-background after:absolute after:inset-y-0 after:start-1/2 after:w-1 after:-translate-x-1/2 rtl:after:translate-x-1/2   focus-visible:outline-hidden aria-[orientation=horizontal]:h-px aria-[orientation=horizontal]:w-full aria-[orientation=horizontal]:after:start-0 aria-[orientation=horizontal]:after:h-1 aria-[orientation=horizontal]:after:w-full aria-[orientation=horizontal]:after:translate-x-0 rtl:aria-[orientation=horizontal]:after:-translate-x-0 aria-[orientation=horizontal]:after:-translate-y-1/2 [&[aria-orientation=horizontal]>div]:rotate-90",
  ),
  resizableHandle2: cva("z-10 flex h-6 w-1 shrink-0 rounded-lg bg-border"),
};
