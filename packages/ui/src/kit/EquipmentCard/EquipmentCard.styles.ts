import { cva } from "class-variance-authority";

export const equipmentCardVariants = cva(
  "flex h-[152px] w-[163px] shrink-0 flex-col items-start justify-between rounded-[32px] bg-card p-4 text-start text-card-foreground",
);

export const equipmentCardStyles = {
  icon: cva(
    "flex size-12 shrink-0 items-center justify-center rounded-full bg-primary/15 text-2xl text-primary",
  ),
  content: cva("flex w-full min-w-0 flex-col gap-1"),
  label: cva("line-clamp-2 text-sm leading-[18px] font-semibold"),
  description: cva("truncate text-xs leading-4 text-muted-foreground"),
};
