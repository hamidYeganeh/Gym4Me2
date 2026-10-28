import { cva } from "class-variance-authority";
export const emptyMediaVariants = cva(
  "mb-2 flex shrink-0 items-center justify-center [&_:is(svg,.sandow-icon)]:pointer-events-none [&_:is(svg,.sandow-icon)]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-transparent",
        icon: "flex size-10 shrink-0 items-center justify-center rounded-xl bg-transparent text-foreground [&_:is(svg,.sandow-icon):not([class*='size-'])]:size-5",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export const emptyStyles = {
  empty: cva(
    "flex w-full min-w-0 flex-1 flex-col items-center justify-center gap-4 rounded-2xl border-0 bg-transparent px-6 py-10 text-center text-balance",
  ),
  emptyHeader: cva("flex max-w-sm flex-col items-center gap-2"),
  emptyTitle: cva(
    "font-heading text-lg font-medium tracking-tight leading-relaxed",
  ),
  emptyDescription: cva(
    "text-sm/relaxed text-muted-foreground [&>a]:underline [&>a]:underline-offset-4 [&>a:hover]:text-primary",
  ),
  emptyContent: cva(
    "flex w-full max-w-sm min-w-0 flex-col items-center gap-4 text-sm text-balance",
  ),
};
