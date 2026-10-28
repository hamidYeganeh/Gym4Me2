import { cva } from "class-variance-authority";
export const paginationVariants = cva("");

export const paginationStyles = {
  pagination: cva("mx-auto flex w-full justify-center"),
  paginationContent: cva("flex items-center gap-1"),
  paginationPrevious: cva("ps-2!"),
  paginationPrevious2: cva("rtl:rotate-180"),
  paginationPrevious3: cva("hidden sm:block"),
  paginationNext: cva("pe-2!"),
  paginationNext2: cva("hidden sm:block"),
  paginationNext3: cva("rtl:rotate-180"),
  paginationEllipsis: cva(
    "flex size-9 items-center justify-center [&_:is(svg,.sandow-icon):not([class*='size-'])]:size-4",
  ),
  paginationEllipsis2: cva("sr-only"),
};
