import { cva } from "class-variance-authority";
export const dialogVariants = cva("");

export const dialogStyles = {
  dialogOverlay: cva(
    "fixed inset-0 isolate z-50 bg-black/30 duration-100 supports-backdrop-filter:backdrop-blur-sm data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0",
  ),
  dialogContent: cva(
    "fixed top-1/2 start-1/2 z-50 grid w-full max-w-[calc(100%-2rem)] -translate-x-1/2 rtl:translate-x-1/2 -translate-y-1/2 gap-6 rounded-4xl bg-popover p-6 text-sm text-popover-foreground shadow-xl ring-1 ring-foreground/5 duration-100 outline-none sm:max-w-md  data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
  ),
  dialogContent2: cva("absolute top-4 end-4 bg-secondary"),
  dialogContent3: cva("sr-only"),
  dialogHeader: cva("flex flex-col gap-1.5"),
  dialogFooter: cva("flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"),
  dialogTitle: cva("font-heading text-base leading-none font-medium"),
  dialogDescription: cva(
    "text-sm text-muted-foreground *:[a]:underline *:[a]:underline-offset-3 *:[a]:hover:text-foreground",
  ),
};
