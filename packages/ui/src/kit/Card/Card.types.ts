import type { VariantProps } from "class-variance-authority";
import type * as React from "react";
import type { cardVariants } from "./Card.styles";
export type CardProps = React.ComponentProps<"div"> & {
  size?: "default" | "sm";
};

export type CardHeaderProps = React.ComponentProps<"div">;

export type CardTitleProps = React.ComponentProps<"div">;

export type CardDescriptionProps = React.ComponentProps<"div">;

export type CardActionProps = React.ComponentProps<"div">;

export type CardContentProps = React.ComponentProps<"div">;

export type CardFooterProps = React.ComponentProps<"div">;

export type CardVariants = VariantProps<typeof cardVariants>;
