import { cva } from "class-variance-authority";
export const choiceOptionCardVariants = cva(
  "relative w-full rounded-[24px] bg-muted text-foreground",
);
export const choiceOptionCardStyles = {
  choice: cva(
    "flex h-auto min-h-18 w-full justify-start gap-3 rounded-[24px] p-4 text-start whitespace-normal data-[state=on]:bg-primary/10 data-[state=on]:ring-1 data-[state=on]:ring-primary",
    { variants: { info: { true: "pe-14", false: "" } } },
  ),
  note: cva("flex min-h-18 items-center gap-3 p-4", {
    variants: { info: { true: "pe-14", false: "" } },
  }),
  switchRoot: cva("flex min-h-18 items-center gap-3 p-4"),
  icon: cva(
    "flex size-12 shrink-0 items-center justify-center rounded-full bg-background text-xl text-primary",
  ),
  content: cva("flex min-w-0 flex-1 flex-col gap-1"),
  label: cva("text-sm font-semibold"),
  description: cva("text-sm leading-6 font-normal text-muted-foreground"),
  supporting: cva("shrink-0 text-sm font-normal text-muted-foreground"),
  info: cva("absolute top-1/2 end-3 -translate-y-1/2"),
};
