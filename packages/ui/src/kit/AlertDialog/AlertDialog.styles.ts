import { cva } from "class-variance-authority";
export const alertDialogVariants = cva("");

export const alertDialogStyles = {
  alertDialogOverlay: cva(
    "fixed inset-0 z-50 bg-black/30 supports-backdrop-filter:backdrop-blur-sm",
  ),
  alertDialogContent: cva(
    "group/alert-dialog-content fixed top-1/2 start-1/2 z-50 grid w-full -translate-x-1/2 rtl:translate-x-1/2 -translate-y-1/2 gap-6 rounded-4xl bg-popover p-6 text-popover-foreground shadow-xl ring-1 ring-foreground/5 outline-none data-[size=default]:max-w-xs data-[size=sm]:max-w-xs data-[size=default]:sm:max-w-md",
  ),
  alertDialogHeader: cva(
    "grid grid-rows-[auto_1fr] place-items-center gap-1.5 text-center has-data-[slot=alert-dialog-media]:grid-rows-[auto_auto_1fr] has-data-[slot=alert-dialog-media]:gap-x-6 sm:group-data-[size=default]/alert-dialog-content:place-items-start sm:group-data-[size=default]/alert-dialog-content:text-start sm:group-data-[size=default]/alert-dialog-content:has-data-[slot=alert-dialog-media]:grid-rows-[auto_1fr]",
  ),
  alertDialogFooter: cva(
    "flex flex-col-reverse gap-2 group-data-[size=sm]/alert-dialog-content:grid group-data-[size=sm]/alert-dialog-content:grid-cols-2 sm:flex-row sm:justify-end",
  ),
  alertDialogMedia: cva(
    "mb-2 inline-flex size-16 items-center justify-center rounded-full bg-muted sm:group-data-[size=default]/alert-dialog-content:row-span-2 *:[svg:not([class*='size-'])]:size-8",
  ),
  alertDialogTitle: cva(
    "font-heading text-lg font-medium sm:group-data-[size=default]/alert-dialog-content:group-has-data-[slot=alert-dialog-media]/alert-dialog-content:col-start-2",
  ),
  alertDialogDescription: cva(
    "text-sm text-balance text-muted-foreground md:text-pretty *:[a]:underline *:[a]:underline-offset-3 *:[a]:hover:text-foreground",
  ),
};
