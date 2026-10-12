import { cva } from "class-variance-authority";
export const cardVariants = cva("");

export const cardStyles = {
  card: cva(
    "group/card flex flex-col gap-(--card-spacing) overflow-hidden rounded-4xl bg-card py-(--card-spacing) text-sm text-card-foreground shadow-md ring-1 ring-foreground/5 [--card-spacing:--spacing(6)] has-[>img:first-child]:pt-0 data-[size=sm]:[--card-spacing:--spacing(4)]  *:[img:first-child]:rounded-t-4xl *:[img:last-child]:rounded-b-4xl",
  ),
  cardHeader: cva(
    "group/card-header @container/card-header grid auto-rows-min items-start gap-1.5 rounded-t-4xl px-(--card-spacing) has-data-[slot=card-action]:grid-cols-[1fr_auto] has-data-[slot=card-description]:grid-rows-[auto_auto] [.border-b]:pb-(--card-spacing)",
  ),
  cardTitle: cva("font-heading text-base font-medium"),
  cardDescription: cva("text-sm text-muted-foreground"),
  cardAction: cva(
    "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
  ),
  cardContent: cva("px-(--card-spacing)"),
  cardFooter: cva(
    "flex items-center rounded-b-4xl px-(--card-spacing) [.border-t]:pt-(--card-spacing)",
  ),
};
