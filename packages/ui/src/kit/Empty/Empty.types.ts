import type { VariantProps } from "class-variance-authority";
import type { emptyMediaVariants } from "./Empty.styles";
export type EmptyProps = React.ComponentProps<"div">;

export type EmptyHeaderProps = React.ComponentProps<"div">;

export type EmptyMediaProps = React.ComponentProps<"div"> &
  VariantProps<typeof emptyMediaVariants>;

export type EmptyTitleProps = React.ComponentProps<"div">;

export type EmptyDescriptionProps = React.ComponentProps<"p">;

export type EmptyContentProps = React.ComponentProps<"div">;

export type EmptyMediaVariants = VariantProps<typeof emptyMediaVariants>;
