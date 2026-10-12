import { cva } from "class-variance-authority";
export const nativeSelectVariants = cva("");

export const nativeSelectStyles = {
  nativeSelect: cva(
    "group/native-select relative w-fit has-[select:disabled]:opacity-50",
  ),
  nativeSelect2: cva(
    "h-9 w-full min-w-0 appearance-none rounded-3xl border border-transparent bg-input/50 py-1 pe-8 ps-3 text-sm transition-[color,box-shadow,background-color] outline-none select-none selection:bg-primary selection:text-primary-foreground placeholder:text-muted-foreground    disabled:pointer-events-none disabled:cursor-not-allowed aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 data-[size=sm]:h-8  ",
  ),
  nativeSelect3: cva(
    "pointer-events-none absolute top-1/2 end-2.5 size-4 -translate-y-1/2 text-muted-foreground select-none",
  ),
  nativeSelectOption: cva("bg-[Canvas] text-[CanvasText]"),
  nativeSelectOptGroup: cva("bg-[Canvas] text-[CanvasText]"),
};
