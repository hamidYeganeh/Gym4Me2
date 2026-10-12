import { cva } from "class-variance-authority";

export const sandowIconVariants = cva("sandow-icon", {
  variants: {
    tone: {
      default: "text-current",
      muted: "text-muted-foreground",
      primary: "text-primary",
    },
  },
  defaultVariants: { tone: "default" },
});
