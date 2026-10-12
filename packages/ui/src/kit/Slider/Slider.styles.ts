import { cva } from "class-variance-authority";
export const sliderVariants = cva("");

export const sliderStyles = {
  slider: cva(
    "relative flex w-full touch-none items-center select-none data-disabled:opacity-50 data-vertical:h-full data-vertical:min-h-40 data-vertical:w-auto data-vertical:flex-col",
  ),
  slider2: cva(
    "relative grow overflow-hidden rounded-full bg-input/90 data-horizontal:h-2 data-horizontal:w-full data-vertical:h-full data-vertical:w-2",
  ),
  slider3: cva(
    "absolute bg-primary select-none data-horizontal:h-full data-vertical:w-full",
  ),
  slider4: cva(
    "block h-4 w-6 shrink-0 rounded-full bg-white shadow-md ring-1 ring-black/10 transition-[color,box-shadow,background-color] select-none not- hover:ring-4 hover:ring-ring/30   focus-visible:outline-hidden disabled:pointer-events-none disabled:opacity-50 data-vertical:h-6 data-vertical:w-4",
  ),
};
