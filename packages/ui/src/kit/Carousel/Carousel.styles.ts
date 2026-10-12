import { cva } from "class-variance-authority";
export const carouselVariants = cva("");

export const carouselStyles = {
  carousel: cva("relative"),
  carouselContent: cva("overflow-hidden"),
  carouselContent2: cva("flex"),
  carouselContent3: cva("horizontal"),
  carouselContent4: cva("-ms-4"),
  carouselContent5: cva("-mt-4 flex-col"),
  carouselItem: cva("min-w-0 shrink-0 grow-0 basis-full"),
  carouselItem2: cva("horizontal"),
  carouselItem3: cva("ps-4"),
  carouselItem4: cva("pt-4"),
  carouselPrevious: cva("absolute touch-manipulation rounded-full"),
  carouselPrevious2: cva("horizontal"),
  carouselPrevious3: cva("inset-y-0 -start-12 my-auto"),
  carouselPrevious4: cva(
    "-top-12 start-1/2 -translate-x-1/2 rtl:translate-x-1/2 rotate-90",
  ),
  carouselPrevious5: cva("rtl:rotate-180"),
  carouselPrevious6: cva("sr-only"),
  carouselNext: cva("absolute touch-manipulation rounded-full"),
  carouselNext2: cva("horizontal"),
  carouselNext3: cva("inset-y-0 -end-12 my-auto"),
  carouselNext4: cva(
    "-bottom-12 start-1/2 -translate-x-1/2 rtl:translate-x-1/2 rotate-90",
  ),
  carouselNext5: cva("rtl:rotate-180"),
  carouselNext6: cva("sr-only"),
};
