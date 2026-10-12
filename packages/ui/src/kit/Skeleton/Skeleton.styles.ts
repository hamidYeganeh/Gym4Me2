import { cva } from "class-variance-authority";
export const skeletonVariants = cva("");

export const skeletonStyles = {
  skeleton: cva("animate-pulse rounded-2xl bg-muted"),
};
