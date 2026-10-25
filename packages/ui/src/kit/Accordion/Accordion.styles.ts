import { cva } from "class-variance-authority";
export const accordionVariants = cva("");

export const accordionStyles = {
  accordion: cva("flex w-full flex-col overflow-hidden rounded-2xl border"),
  accordionItem: cva("not-last:border-b data-open:bg-muted/50"),
  accordionTrigger: cva("flex"),
  accordionTrigger2: cva(
    "group/accordion-trigger relative flex flex-1 items-start justify-between gap-6 border border-transparent p-4 text-start text-sm font-medium transition-[color,background-color,border-color,box-shadow,opacity] outline-none hover:underline disabled:pointer-events-none disabled:opacity-50 **:data-[slot=accordion-trigger-icon]:ms-auto **:data-[slot=accordion-trigger-icon]:size-4 **:data-[slot=accordion-trigger-icon]:text-muted-foreground",
  ),
  accordionTrigger3: cva(
    "pointer-events-none shrink-0 transition-transform group-aria-expanded/accordion-trigger:rotate-180",
  ),
  accordionTrigger4: cva(
    "pointer-events-none hidden shrink-0 group-aria-expanded/accordion-trigger:inline",
  ),
  accordionContent: cva("overflow-hidden px-4 text-sm"),
  accordionContent2: cva(
    "h-(--radix-accordion-content-height) pt-0 pb-4 [&_a]:underline [&_a]:underline-offset-3 [&_a]:hover:text-foreground [&_p:not(:last-child)]:mb-4",
  ),
};
