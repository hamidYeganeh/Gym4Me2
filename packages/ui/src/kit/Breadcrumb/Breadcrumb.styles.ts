import { cva } from "class-variance-authority";
export const breadcrumbVariants = cva("");

export const breadcrumbStyles = {
  breadcrumbList: cva(
    "flex flex-wrap items-center gap-1.5 text-sm wrap-break-word text-muted-foreground sm:gap-2.5",
  ),
  breadcrumbItem: cva("inline-flex items-center gap-1.5"),
  breadcrumbLink: cva("transition-colors hover:text-foreground"),
  breadcrumbPage: cva("font-normal text-foreground"),
  breadcrumbSeparator: cva("[&>:is(svg,.sandow-icon)]:size-3.5"),
  breadcrumbSeparator2: cva("rtl:rotate-180"),
  breadcrumbEllipsis: cva(
    "flex size-5 items-center justify-center [&>:is(svg,.sandow-icon)]:size-4",
  ),
  breadcrumbEllipsis2: cva("sr-only"),
};
