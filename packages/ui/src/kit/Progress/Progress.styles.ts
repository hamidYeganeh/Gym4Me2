import { cva } from "class-variance-authority";
export const progressVariants = cva("");

export const progressStyles = {
  progress: cva(
    "relative flex h-3 w-full items-center overflow-x-hidden rounded-full bg-muted",
  ),
  progress2: cva("size-full flex-1 bg-primary"),
};
