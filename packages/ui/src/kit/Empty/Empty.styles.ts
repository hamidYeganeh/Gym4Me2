import { cva } from "class-variance-authority";
export const emptyMediaVariants = cva(
  "mb-2 flex shrink-0 items-center justify-center [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-transparent",
        icon: "flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted text-foreground [&_svg:not([class*='size-'])]:size-5",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export const emptyStyles = {
  empty: cva(
    "flex w-full min-w-0 flex-1 flex-col items-center justify-center gap-4 rounded-2xl border-dashed p-12 text-center text-balance",
  ),
  emptyHeader: cva("flex max-w-sm flex-col items-center gap-2"),
  emptyTitle: cva("font-heading text-lg font-medium tracking-tight"),
  emptyDescription: cva(
    "text-sm/relaxed text-muted-foreground [&>a]:underline [&>a]:underline-offset-4 [&>a:hover]:text-primary",
  ),
  emptyContent: cva(
    "flex w-full max-w-sm min-w-0 flex-col items-center gap-4 text-sm text-balance",
  ),
};
